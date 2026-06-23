from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
import json
import os
from datetime import datetime, timedelta

from database import get_db
from models import User
from practice_models import UserPerformance, TopicPerformance, QuizHistory
from roadmap_models import LearningRoadmap, DailyTask

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/data/{student_id}")
async def get_analytics_data(student_id: int, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Overview & UserPerformance
    up = db.query(UserPerformance).filter(UserPerformance.student_id == student_id).first()
    
    # 2. TopicPerformance
    all_topics = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
    
    completed_topics_count = 0
    mastered_topics_count = 0
    
    weak_topics = []
    medium_topics = []
    strong_topics = []
    
    for t in all_topics:
        # User defined rules:
        # Completed: (accuracy >= 70 AND attempts >= 2) OR mastery_level == "strong"
        # Mastered: accuracy >= 85 AND mastery_level == "strong"
        
        from services.practice_engine import get_mastery_level
        actual_mastery = get_mastery_level(t.accuracy, t.total_attempts)
        is_completed = (t.accuracy >= 70 and t.total_attempts >= 2) or (actual_mastery == "strong")
        is_mastered = (t.accuracy >= 85 and actual_mastery == "strong")
        
        if is_completed:
            completed_topics_count += 1
        if is_mastered:
            mastered_topics_count += 1
            
        # Weakness analysis (User rules: < 50% Weak, 50-75% Medium, > 75% Strong)
        if t.accuracy < 50:
            weak_topics.append({"topic": t.topic, "accuracy": round(t.accuracy)})
        elif t.accuracy <= 75:
            medium_topics.append({"topic": t.topic, "accuracy": round(t.accuracy)})
        else:
            strong_topics.append({"topic": t.topic, "accuracy": round(t.accuracy)})

    # Sort weakness
    weak_topics.sort(key=lambda x: x["accuracy"])
    medium_topics.sort(key=lambda x: x["accuracy"])
    strong_topics.sort(key=lambda x: x["accuracy"], reverse=True)

    # 3. Weekly Activity Chart (last 7 days)
    today = datetime.utcnow()
    last_7_days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    
    # Initialize weekly stats
    weekly_activity_dict = {day: {"date": datetime.strptime(day, "%Y-%m-%d").strftime("%a"), "attempts": 0, "correct": 0} for day in last_7_days}
    
    # Query quiz history
    seven_days_ago = today - timedelta(days=7)
    recent_quizzes = db.query(QuizHistory).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.created_at >= seven_days_ago
    ).all()
    
    for q in recent_quizzes:
        day_str = q.created_at.strftime("%Y-%m-%d")
        if day_str in weekly_activity_dict:
            weekly_activity_dict[day_str]["attempts"] += q.questions_attempted
            weekly_activity_dict[day_str]["correct"] += q.correct_answers

    weekly_activity = []
    for day in last_7_days:
        data = weekly_activity_dict[day]
        acc = (data["correct"] / data["attempts"] * 100) if data["attempts"] > 0 else 0
        weekly_activity.append({
            "date": data["date"],
            "attempts": data["attempts"],
            "accuracy": round(acc)
        })

    # 4. Learning Velocity
    # This week vs last week
    fourteen_days_ago = today - timedelta(days=14)
    all_recent_quizzes = db.query(QuizHistory).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.created_at >= fourteen_days_ago
    ).all()

    this_week_attempts = 0
    this_week_correct = 0
    last_week_attempts = 0
    last_week_correct = 0

    for q in all_recent_quizzes:
        if q.created_at >= seven_days_ago:
            this_week_attempts += q.questions_attempted
            this_week_correct += q.correct_answers
        else:
            last_week_attempts += q.questions_attempted
            last_week_correct += q.correct_answers
            
    this_week_acc = (this_week_correct / this_week_attempts * 100) if this_week_attempts > 0 else 0
    last_week_acc = (last_week_correct / last_week_attempts * 100) if last_week_attempts > 0 else 0
    acc_improvement = round(this_week_acc - last_week_acc)

    # Topics completed this week
    topics_completed_this_week = 0
    for t in all_topics:
        if t.last_practiced and t.last_practiced >= seven_days_ago:
            from services.practice_engine import get_mastery_level
            actual_mastery = get_mastery_level(t.accuracy, t.total_attempts)
            if (t.accuracy >= 70 and t.total_attempts >= 2) or (actual_mastery == "strong"):
                topics_completed_this_week += 1

    learning_velocity = {
        "topicsCompletedThisWeek": topics_completed_this_week,
        "quizAttemptsThisWeek": this_week_attempts,
        "accuracyImprovement": acc_improvement
    }

    # 5. Active Roadmaps
    active_roadmaps = db.query(LearningRoadmap).filter(
        LearningRoadmap.student_id == student_id
    ).all()
    
    roadmap_performance = []
    for rm in active_roadmaps:
        tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == rm.id).all()
        pending_tasks = [t for t in tasks if t.status == "pending"]
        completed_tasks_count = len(tasks) - len(pending_tasks)
        
        current_week = 1
        current_day = 1
        if pending_tasks:
            pending_tasks.sort(key=lambda x: (x.week_number or 999, x.day_number or 999))
            next_task = pending_tasks[0]
            current_week = next_task.week_number or 1
            current_day = next_task.day_number or 1
        elif tasks:
            tasks.sort(key=lambda x: (x.week_number or 0, x.day_number or 0), reverse=True)
            current_week = tasks[0].week_number or 1
            current_day = tasks[0].day_number or 1

        roadmap_performance.append({
            "roadmapName": rm.title,
            "currentWeek": current_week,
            "currentDay": current_day,
            "progress": round((completed_tasks_count / len(tasks) * 100) if tasks else 0),
            "remainingTasks": len(pending_tasks)
        })

    # 6. Subject Performance
    # Total topics comes from subject_topics.json
    subject_topics_path = os.path.join(
        os.path.dirname(__file__), "..", "config", "subject_topics.json"
    )
    subject_topics = {}
    try:
        with open(subject_topics_path, "r") as f:
            subject_topics = json.load(f)
    except Exception:
        pass

    subject_stats = {}
    for t in all_topics:
        if not t.subject:
            continue
        if t.subject not in subject_stats:
            subject_stats[t.subject] = {"completed": 0, "total_acc": 0, "count": 0}
            
        subject_stats[t.subject]["total_acc"] += t.accuracy
        subject_stats[t.subject]["count"] += 1
        
        from services.practice_engine import get_mastery_level
        actual_mastery = get_mastery_level(t.accuracy, t.total_attempts)
        is_completed = (t.accuracy >= 70 and t.total_attempts >= 2) or (actual_mastery == "strong")
        if is_completed:
            subject_stats[t.subject]["completed"] += 1

    subject_performance = []
    for subj_name, stats in subject_stats.items():
        total_topics = len(subject_topics.get(subj_name, []))
        if total_topics == 0:
            total_topics = max(stats["count"], 1)
            
        progress = (stats["completed"] / total_topics * 100) if total_topics > 0 else 0
        avg_acc = stats["total_acc"] / stats["count"] if stats["count"] > 0 else 0
        
        subject_performance.append({
            "subject": subj_name,
            "progress": round(progress),
            "completedTopics": stats["completed"],
            "remainingTopics": max(total_topics - stats["completed"], 0),
            "totalTopics": total_topics,
            "averageAccuracy": round(avg_acc)
        })

    # 7. Recommendations
    recommendations = []
    if weak_topics:
        recommendations.append(f"Study {weak_topics[0]['topic']} next to improve your weak areas.")
    
    if roadmap_performance and roadmap_performance[0]["remainingTasks"] > 0:
        rm = roadmap_performance[0]
        recommendations.append(f"Finish Week {rm['currentWeek']} Day {rm['currentDay']} of '{rm['roadmapName']}'.")
        
    for subj in subject_performance:
        if 0 < subj["progress"] < 100:
            recommendations.append(f"Practice {subj['subject']} to reach 100% completion.")
            break

    if not recommendations:
        recommendations.append("Start a new topic to build your knowledge base.")

    return {
        "overview": {
            "currentStreak": up.current_streak if up else 0,
            "averageAccuracy": round(up.lifetime_accuracy) if up else 0,
            "totalQuizAttempts": up.total_questions_attempted if up else 0,
            "topicsCompleted": completed_topics_count,
            "masteredTopics": mastered_topics_count,
            "activeRoadmaps": len(active_roadmaps)
        },
        "weeklyActivity": weekly_activity,
        "subjectPerformance": subject_performance,
        "roadmapPerformance": roadmap_performance,
        "weaknessAnalysis": {
            "weak": weak_topics,
            "medium": medium_topics,
            "strong": strong_topics
        },
        "learningVelocity": learning_velocity,
        "recommendations": recommendations
    }
