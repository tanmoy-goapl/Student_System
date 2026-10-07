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
from roadmap_models import LearningRoadmap, DailyTask, UserGoal
from services.authorization import require_student

router = APIRouter(prefix="/analytics", tags=["analytics"])

from services.analytics_engine import (
    calculate_topic_metrics,
    calculate_subject_metrics,
    calculate_student_metrics,
    calculate_study_streak_metrics,
    get_predefined_topics,
    get_student_subjects
)

@router.get("/debug/{student_id}")
def debug_analytics(student_id: int, db: Session = Depends(get_db)):
    require_student(student_id, db)
    all_topics = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
    result = []
    for t in all_topics:
        metrics = calculate_topic_metrics(t)
        result.append({
            "topic": t.topic,
            "subject": t.subject,
            "sessions": t.sessions,
            "questions_attempted": t.questions_attempted,
            "correct_answers": t.correct_answers,
            "accuracy": metrics["accuracy"],
            "status": metrics["status"]
        })
    return result

@router.get("/data/{student_id}")
async def get_analytics_data(student_id: int, db: Session = Depends(get_db)):
    require_student(student_id, db)
    # Verify user exists
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Overview & UserPerformance
    up = db.query(UserPerformance).filter(UserPerformance.student_id == student_id).first()
    
    # 2. TopicPerformance
    all_topics = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
    
    student_stats = calculate_student_metrics(student_id, db)
    subjects = get_student_subjects(student_id, db)
    today = datetime.utcnow()
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    current_week_start = today_start - timedelta(days=6)
    previous_week_start = current_week_start - timedelta(days=7)
    streak_metrics = calculate_study_streak_metrics(student_id, db, now=today)

    course_topic_names = set()
    for subject in subjects:
        course_topic_names.update(
            topic.strip().casefold()
            for topic in get_predefined_topics(student_id, subject, db)
            if isinstance(topic, str) and topic.strip()
        )

    scoped_topic_rows = {}
    for topic_row in all_topics:
        topic_name = (topic_row.topic or "").strip()
        if not topic_name:
            continue
        if course_topic_names and topic_name.casefold() not in course_topic_names:
            continue
        key = topic_name.casefold()
        current = scoped_topic_rows.get(key)
        row_last = topic_row.last_practiced_at
        current_last = current.last_practiced_at if current else None
        if getattr(row_last, "tzinfo", None) is not None:
            row_last = row_last.replace(tzinfo=None)
        if getattr(current_last, "tzinfo", None) is not None:
            current_last = current_last.replace(tzinfo=None)
        if current is None or (
            int(topic_row.questions_attempted or 0),
            int(topic_row.sessions or 0),
            row_last or datetime.min,
        ) > (
            int(current.questions_attempted or 0),
            int(current.sessions or 0),
            current_last or datetime.min,
        ):
            scoped_topic_rows[key] = topic_row

    analytics_topics = list(scoped_topic_rows.values())

    
    completed_topics_count = 0
    completed_topics_list = []
    mastered_topics_list = []
    
    weak_topics = []
    medium_topics = []
    strong_topics = []
    
    for t in analytics_topics:
        metrics = calculate_topic_metrics(t)
        status = metrics["status"]
        is_practiced = metrics["sessions"] >= 1 or metrics["questions_attempted"] > 0

        if is_practiced:
            completed_topics_count += 1
            completed_topics_list.append(t.topic)

            if status == "STRONG":
                mastered_topics_list.append(t.topic)

            # Weakness analysis only includes topics with real activity.
            if metrics["accuracy"] < 50:
                weak_topics.append({"topic": t.topic, "accuracy": round(metrics["accuracy"])})
            elif metrics["accuracy"] <= 75:
                medium_topics.append({"topic": t.topic, "accuracy": round(metrics["accuracy"])})
            else:
                strong_topics.append({"topic": t.topic, "accuracy": round(metrics["accuracy"])})

    # Sort weakness
    weak_topics.sort(key=lambda x: x["accuracy"])
    medium_topics.sort(key=lambda x: x["accuracy"])
    strong_topics.sort(key=lambda x: x["accuracy"], reverse=True)

    # 3. Weekly Activity Chart (last seven calendar days)
    last_7_days = [
        (current_week_start + timedelta(days=offset)).strftime("%Y-%m-%d")
        for offset in range(7)
    ]

    # Initialize weekly stats
    weekly_activity_dict = {
        day: {
            "date": datetime.strptime(day, "%Y-%m-%d").strftime("%a"),
            "quiz_attempts": 0,
            "questions_attempted": 0,
            "correct": 0,
        }
        for day in last_7_days
    }

    # Query completed quiz history only; generated or abandoned sessions do not count.
    recent_quizzes = db.query(QuizHistory).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.questions_attempted > 0,
        QuizHistory.created_at >= current_week_start,
        QuizHistory.created_at < tomorrow_start,
    ).all()
    for q in recent_quizzes:
        created_at = q.created_at
        if getattr(created_at, "tzinfo", None) is not None:
            created_at = created_at.replace(tzinfo=None)
        if not created_at:
            continue
        day_str = created_at.strftime("%Y-%m-%d")
        if day_str in weekly_activity_dict:
            questions = max(int(q.questions_attempted or 0), 0)
            correct = min(max(int(q.correct_answers or 0), 0), questions)
            weekly_activity_dict[day_str]["quiz_attempts"] += 1
            weekly_activity_dict[day_str]["questions_attempted"] += questions
            weekly_activity_dict[day_str]["correct"] += correct

    weekly_activity = []
    for day in last_7_days:
        data = weekly_activity_dict[day]
        acc = (
            data["correct"] / data["questions_attempted"] * 100
            if data["questions_attempted"] > 0
            else 0
        )
        weekly_activity.append({
            "date": data["date"],
            "quizAttempts": data["quiz_attempts"],
            "questionsAttempted": data["questions_attempted"],
            "accuracy": round(acc)
        })

    # 4. Learning Velocity
    # This week vs last week
    fourteen_days_ago = previous_week_start
    all_recent_quizzes = db.query(QuizHistory).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.questions_attempted > 0,
        QuizHistory.created_at >= fourteen_days_ago,
        QuizHistory.created_at < tomorrow_start,
    ).all()

    this_week_quiz_attempts = 0
    this_week_questions = 0
    this_week_correct = 0
    last_week_quiz_attempts = 0
    last_week_questions = 0
    last_week_correct = 0

    for q in all_recent_quizzes:
        created_at = q.created_at
        if getattr(created_at, "tzinfo", None) is not None:
            created_at = created_at.replace(tzinfo=None)
        if not created_at:
            continue
        questions = max(int(q.questions_attempted or 0), 0)
        correct = min(max(int(q.correct_answers or 0), 0), questions)
        if created_at >= current_week_start:
            this_week_quiz_attempts += 1
            this_week_questions += questions
            this_week_correct += correct
        else:
            last_week_quiz_attempts += 1
            last_week_questions += questions
            last_week_correct += correct
            
    this_week_acc = (this_week_correct / this_week_questions * 100) if this_week_questions > 0 else 0
    last_week_acc = (last_week_correct / last_week_questions * 100) if last_week_questions > 0 else 0
    acc_improvement = round(this_week_acc - last_week_acc)

    # Topics completed this week
    topics_completed_this_week = 0
    for t in analytics_topics:
        last_practiced_at = t.last_practiced_at
        if getattr(last_practiced_at, "tzinfo", None) is not None:
            last_practiced_at = last_practiced_at.replace(tzinfo=None)
        if last_practiced_at and last_practiced_at >= current_week_start:
            metrics = calculate_topic_metrics(t)
            if metrics["sessions"] >= 1 or metrics["questions_attempted"] > 0:
                topics_completed_this_week += 1

    learning_velocity = {
        "topicsCompletedThisWeek": topics_completed_this_week,
        "quizAttemptsThisWeek": this_week_quiz_attempts,
        "questionsAttemptedThisWeek": this_week_questions,
        "accuracyImprovement": acc_improvement
    }

    total_quiz_attempts = db.query(func.count(QuizHistory.id)).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.questions_attempted > 0,
    ).scalar() or 0

    # 5. Active Roadmaps
    active_roadmaps = db.query(LearningRoadmap).join(
        UserGoal, LearningRoadmap.goal_id == UserGoal.id
    ).filter(
        LearningRoadmap.student_id == student_id,
        UserGoal.status == "active",
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
    subject_performance = []
    for subj in subjects:
        metrics = calculate_subject_metrics(student_id, subj, db)
        subject_performance.append({
            "subject": subj,
            "progress": metrics["progress"],
            "attemptedTopics": metrics["attempted_topics"],
            "completedTopics": metrics["mastered_topics"],
            "remainingTopics": max(metrics["total_topics"] - metrics["mastered_topics"], 0),
            "totalTopics": metrics["total_topics"],
            "averageAccuracy": metrics["average_accuracy"],
            "averageConfidence": metrics.get("average_confidence", 0.0),
            "exposure": metrics.get("exposure", 0.0)
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
            "currentStreak": streak_metrics["current_streak"],
            "averageAccuracy": student_stats["overall_accuracy"],
            "averageConfidence": student_stats.get("overall_confidence", 0.0),
            "exposure": student_stats.get("overall_exposure", 0.0),
            "totalQuizAttempts": int(total_quiz_attempts),
            "topicsCompleted": completed_topics_count,
            "topicsCompletedList": completed_topics_list,
            "masteredTopics": len(mastered_topics_list),
            "masteredTopicsList": mastered_topics_list,
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
