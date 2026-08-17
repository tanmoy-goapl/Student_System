from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import json
import re

from practice_models import TopicPerformance, QuizHistory, PracticeSession, UserPerformance, BehavioralInsight, PracticeQuestion
from services.analytics_engine import (
    calculate_topic_metrics, get_student_subjects, get_predefined_topics, calculate_student_metrics
)

def calculate_priority_score(confidence: float, accuracy: float, days_since_practice: int) -> float:
    """
    Computes priority_score:
    priority_score = (100 - confidence) * 0.5 + (100 - accuracy) * 0.3 + min(days_since_practice * 2, 20)
    """
    return round((100 - confidence) * 0.5 + (100 - accuracy) * 0.3 + min(days_since_practice * 2, 20), 2)

def calculate_exam_readiness(student_id: int, db: Session) -> dict:
    """
    Computes preparation readiness from the shared live learning signal.
    """
    metrics = calculate_student_metrics(student_id, db)
    readiness = round(
        metrics.get("overall_readiness", metrics.get("overall_progress", 0.0)),
        2,
    )
    
    # Calculate weekly change based on sessions in last 7 days
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.student_id == student_id,
        PracticeSession.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    weekly_change = round(min(recent_sessions * 0.6, 12.0), 1)
    
    return {
        "readiness_percentage": readiness,
        "weekly_change": weekly_change
    }

def calculate_dashboard_health(readiness: float) -> str:
    """
    Returns dashboard health color mapping:
    GREEN (>80), YELLOW (60-80), RED (<60)
    """
    if readiness > 80:
        return "GREEN"
    if readiness >= 60:
        return "YELLOW"
    return "RED"

def calculate_weak_topics(student_id: int, db: Session) -> dict:
    """
    Returns weak topic counts, critical topics, and weak topic list.
    """
    subjects = get_student_subjects(student_id, db)
    weak_topics_list = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            if metrics["status"] == "WEAK":
                # Compute days since practice
                days = 30
                if metrics["last_practiced_at"]:
                    days = (datetime.utcnow() - metrics["last_practiced_at"]).days
                
                priority = calculate_priority_score(metrics["confidence"], metrics["accuracy"], days)
                
                weak_topics_list.append({
                    "topic": topic,
                    "subject": subj,
                    "accuracy": metrics["accuracy"],
                    "confidence": metrics["confidence"],
                    "last_practiced": metrics["last_practiced_at"].isoformat() if metrics["last_practiced_at"] else None,
                    "days_since_practice": days,
                    "priority_score": priority,
                    "reason": "Accuracy below 50% or learning progress stagnant."
                })
                
    # Sort by priority score descending
    weak_topics_list = sorted(weak_topics_list, key=lambda x: x["priority_score"], reverse=True)
    critical_topics = [t for t in weak_topics_list if t["accuracy"] < 40 or t["priority_score"] > 60]
    
    return {
        "weak_topic_count": len(weak_topics_list),
        "critical_topic_count": len(critical_topics),
        "weak_topics": weak_topics_list
    }

def calculate_study_streak(student_id: int, db: Session) -> dict:
    """
    Analyzes QuizHistory and PracticeSession to determine current/best streaks and last active date.
    """
    quiz_dates = db.query(QuizHistory.created_at).filter(QuizHistory.student_id == student_id).all()
    session_dates = db.query(PracticeSession.created_at).filter(PracticeSession.student_id == student_id).all()
    
    all_dates = sorted(list({d[0].date() for d in quiz_dates + session_dates if d[0]}))
    
    current_streak = 0
    best_streak = 0
    last_active = None
    
    if all_dates:
        last_active = all_dates[-1]
        today = datetime.utcnow().date()
        
        # Calculate current streak
        if last_active == today or last_active == today - timedelta(days=1):
            current_streak = 1
            check_date = last_active
            for i in range(len(all_dates) - 2, -1, -1):
                if all_dates[i] == check_date - timedelta(days=1):
                    current_streak += 1
                    check_date = all_dates[i]
                else:
                    break
        
        # Calculate best streak
        temp_streak = 1
        best_streak = 1
        for i in range(1, len(all_dates)):
            if all_dates[i] == all_dates[i - 1] + timedelta(days=1):
                temp_streak += 1
            else:
                best_streak = max(best_streak, temp_streak)
                temp_streak = 1
        best_streak = max(best_streak, temp_streak)
    
    # Save/update UserPerformance table so it stays synced
    perf = db.query(UserPerformance).filter(UserPerformance.student_id == student_id).first()
    if perf:
        perf.current_streak = current_streak
        perf.longest_streak = max(perf.longest_streak, best_streak)
        if last_active:
            perf.last_practiced = datetime.combine(last_active, datetime.min.time())
        db.commit()

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "last_active": last_active.isoformat() if last_active else None
    }

def calculate_topics_covered(student_id: int, db: Session) -> dict:
    """
    Returns covered topics (sessions > 0) vs total available topics in curriculum.
    """
    subjects = get_student_subjects(student_id, db)
    total_topics = 0
    covered_topics = 0
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        total_topics += len(predefined)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined),
            TopicPerformance.sessions > 0
        ).count()
        covered_topics += performances

    exposure = round((covered_topics / total_topics * 100), 2) if total_topics > 0 else 0.0

    return {
        "covered_topics": covered_topics,
        "total_topics": total_topics,
        "exposure": exposure
    }

def generate_study_plan(student_id: int, db: Session) -> list:
    """
    Generates a personalized daily study plan (no fake times).
    Sorted by Priority Score: Weak topics first, then low confidence, then unstarted.
    """
    subjects = get_student_subjects(student_id, db)
    all_topics = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            days = 30
            if metrics["last_practiced_at"]:
                days = (datetime.utcnow() - metrics["last_practiced_at"]).days
            
            priority = calculate_priority_score(metrics["confidence"], metrics["accuracy"], days)
            
            # Recommendation reason
            if metrics["status"] == "WEAK":
                reason = "Targeted review: Accuracy is critically low in this topic."
            elif metrics["status"] == "LEARNING" and metrics["confidence"] < 50:
                reason = "Confidence boost: More practice needed to reinforce concept stability."
            elif metrics["status"] == "NOT_STARTED":
                reason = "Syllabus coverage: You haven't started this required curriculum topic."
            else:
                reason = "Spacing revision: Review past concepts to prevent long-term memory decay."

            all_topics.append({
                "topic": topic,
                "subject": subj,
                "status": metrics["status"],
                "confidence": metrics["confidence"],
                "accuracy": metrics["accuracy"],
                "last_practiced": metrics["last_practiced_at"].isoformat() if metrics["last_practiced_at"] else None,
                "days_since_practice": days,
                "priority_score": priority,
                "reason": reason
            })
            
    # Sort study plan by priority score descending
    sorted_plan = sorted(all_topics, key=lambda x: x["priority_score"], reverse=True)
    
    # Take top 3-5 sessions
    study_plan_items = []
    durations = ["45 min", "30 min", "40 min", "35 min", "50 min"]
    
    for idx, item in enumerate(sorted_plan[:4]):
        study_plan_items.append({
            "topic": item["topic"],
            "subject": item["subject"],
            "duration": durations[idx % len(durations)],
            "action": "Practice Session",
            "last_practiced": item["last_practiced"],
            "days_since_practice": item["days_since_practice"],
            "priority_score": item["priority_score"],
            "reason": item["reason"]
        })
        
    return study_plan_items

def generate_ai_alerts(student_id: int, db: Session) -> list:
    """
    Triggers dynamic alerts with priorities and reasons:
    - no activity > 5 days
    - confidence drop (any topic confidence < 40%)
    - weak topics threshold (more than 3 weak topics)
    - revision overdue (> 7 days for mastered)
    """
    alerts = []
    
    # 1. Inactivity check
    streak_data = calculate_study_streak(student_id, db)
    if streak_data["last_active"]:
        last_active_date = datetime.fromisoformat(streak_data["last_active"]).date()
        days_inactive = (datetime.utcnow().date() - last_active_date).days
        if days_inactive > 5:
            alerts.append({
                "title": "Study Gap Warning",
                "description": f"You haven't practiced in {days_inactive} days. Revision is recommended.",
                "severity": "high"
            })
            
    # 2. Topic performance evaluations
    subjects = get_student_subjects(student_id, db)
    weak_count = 0
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        for p in performances:
            metrics = calculate_topic_metrics(p)
            if metrics["status"] == "WEAK":
                weak_count += 1
                if metrics["confidence"] < 40 and p.sessions >= 2:
                    alerts.append({
                        "title": f"Confidence Drop: {p.topic}",
                        "description": f"Your confidence score dropped to {metrics['confidence']}%. Practice is recommended.",
                        "severity": "high"
                    })
            
            if metrics["status"] == "STRONG" and p.last_practiced_at:
                days_since = (datetime.utcnow() - p.last_practiced_at).days
                if days_since > 7:
                    alerts.append({
                        "title": f"Revision Overdue: {p.topic}",
                        "description": f"Mastered {p.topic} was last reviewed {days_since} days ago.",
                        "severity": "medium"
                    })

    if weak_count > 3:
        alerts.append({
            "title": "Weak Topic Overload",
            "description": f"You currently have {weak_count} weak topics in your list. Target weak-mode reviews.",
            "severity": "medium"
        })

    # Default upcoming exam alert
    alerts.append({
        "title": "Upcoming Semester Exam",
        "description": "Semester exams are approaching in 12 days. Focus on high priority topics.",
        "severity": "medium"
    })

    return alerts

def generate_adaptive_engine(student_id: int, db: Session) -> dict:
    """
    Evaluates global performance metrics and recent questions to recommend adaptive parameters:
    - accuracy > 80 -> hard
    - accuracy 50-80 -> medium
    - accuracy < 50 -> easy
    """
    metrics = calculate_student_metrics(student_id, db)
    accuracy = metrics.get("overall_accuracy", 0.0)
    
    if accuracy > 80:
        recommended_difficulty = "hard"
    elif accuracy >= 50:
        recommended_difficulty = "medium"
    else:
        recommended_difficulty = "easy"

    # Learning pace based on recent time spent
    recent_qs = db.query(PracticeQuestion).join(PracticeSession).filter(
        PracticeSession.student_id == student_id,
        PracticeQuestion.time_spent_seconds != None
    ).order_by(PracticeQuestion.answered_at.desc()).limit(10).all()
    
    avg_time = sum(q.time_spent_seconds for q in recent_qs) / len(recent_qs) if recent_qs else 15
    if avg_time < 10:
        learning_pace = "fast"
    elif avg_time > 25:
        learning_pace = "slow"
    else:
        learning_pace = "normal"

    # Focus topic: top item from weak topics or unstarted
    weak_data = calculate_weak_topics(student_id, db)
    focus_topic = None
    if weak_data["weak_topics"]:
        focus_topic = weak_data["weak_topics"][0]["topic"]
    else:
        # Get first unstarted topic
        subjects = get_student_subjects(student_id, db)
        for subj in subjects:
            predefined = get_predefined_topics(student_id, subj, db)
            p = db.query(TopicPerformance).filter(
                TopicPerformance.student_id == student_id,
                TopicPerformance.topic.in_(predefined),
                TopicPerformance.sessions == 0
            ).first()
            if p:
                focus_topic = p.topic
                break
                
    return {
        "recommended_difficulty": recommended_difficulty,
        "learning_pace": learning_pace,
        "focus_topic": focus_topic or "Core Syllabus Principles",
        "next_question_difficulty": recommended_difficulty
    }

def generate_suggested_next(student_id: int, db: Session) -> list:
    """
    Suggested next actions based on DB analytics. Returns 4 adaptive cards with priorities.
    """
    subjects = get_student_subjects(student_id, db)
    weak_topics = []
    all_topics = []

    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            days = 30
            if metrics["last_practiced_at"]:
                days = (datetime.utcnow() - metrics["last_practiced_at"]).days
            
            priority = calculate_priority_score(metrics["confidence"], metrics["accuracy"], days)
            
            item = {
                "topic": topic,
                "subject": subj,
                "confidence": metrics["confidence"],
                "accuracy": metrics["accuracy"],
                "days_since_practice": days,
                "priority_score": priority,
                "status": metrics["status"]
            }
            all_topics.append(item)
            if metrics["status"] == "WEAK":
                weak_topics.append(item)

    # Sort topics to suggest appropriate actions
    sorted_weak = sorted(weak_topics, key=lambda x: x["priority_score"], reverse=True)
    sorted_all = sorted(all_topics, key=lambda x: x["priority_score"], reverse=True)

    focus_practice = sorted_weak[0] if sorted_weak else (sorted_all[0] if sorted_all else None)
    review_mistake = sorted_weak[-1] if len(sorted_weak) > 1 else (sorted_all[0] if sorted_all else None)
    
    unstarted = [t for t in sorted_all if t["days_since_practice"] >= 30 and t["status"] == "NOT_STARTED"]
    learn_topic = unstarted[0] if unstarted else (sorted_all[0] if sorted_all else None)

    actions = []
    
    # 1. Continue Practice
    if focus_practice:
        actions.append({
            "title": "Continue Practice",
            "topic": focus_practice["topic"],
            "subject": focus_practice["subject"],
            "action_url": f"/practice?topic={focus_practice['topic']}",
            "days_since_practice": focus_practice["days_since_practice"],
            "priority_score": focus_practice["priority_score"],
            "reason": f"Active weak area requires revision. Priority score {focus_practice['priority_score']}."
        })
    else:
        actions.append({
            "title": "Continue Practice",
            "topic": "Syllabus Core Concepts",
            "subject": "Core Curriculum",
            "action_url": "/practice",
            "days_since_practice": 30,
            "priority_score": 50.0,
            "reason": "Get started with your curriculum baseline diagnostic."
        })

    # 2. Review Mistakes
    if review_mistake:
        actions.append({
            "title": "Review Mistakes",
            "topic": review_mistake["topic"],
            "subject": review_mistake["subject"],
            "action_url": f"/practice?mode=weakness&topic={review_mistake['topic']}",
            "days_since_practice": review_mistake["days_since_practice"],
            "priority_score": review_mistake["priority_score"],
            "reason": f"System caught error patterns in {review_mistake['topic']}."
        })

    # 3. Go to Learning
    if learn_topic:
        actions.append({
            "title": "Learn Topic",
            "topic": learn_topic["topic"],
            "subject": learn_topic["subject"],
            "action_url": f"/learning?topic={learn_topic['topic']}&subject={learn_topic['subject']}",
            "days_since_practice": learn_topic["days_since_practice"],
            "priority_score": learn_topic["priority_score"],
            "reason": "Unstarted required curriculum topic."
        })

    # 4. Take Quiz
    if sorted_all:
        strong_topic = next((t for t in sorted_all if t["status"] == "STRONG"), sorted_all[0])
        actions.append({
            "title": "Take Quiz",
            "topic": strong_topic["topic"],
            "subject": strong_topic["subject"],
            "action_url": f"/practice?topic={strong_topic['topic']}",
            "days_since_practice": strong_topic["days_since_practice"],
            "priority_score": strong_topic["priority_score"],
            "reason": "Verify your long-term memory retention."
        })

    # Sort actions by priority score descending
    return sorted(actions, key=lambda x: x["priority_score"], reverse=True)

def calculate_revision_queue(student_id: int, db: Session) -> list:
    """
    Revision Queue returns:
    - topics not revised recently (days > 3)
    - forgotten topics (accuracy drop / weak status)
    - mastered topics needing review
    Sorted by Priority Score.
    """
    subjects = get_student_subjects(student_id, db)
    queue = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            
            # If not practiced at all, skip from revision queue (needs initial learning instead)
            if metrics["sessions"] == 0:
                continue
                
            days = (datetime.utcnow() - metrics["last_practiced_at"]).days if metrics["last_practiced_at"] else 30
            priority = calculate_priority_score(metrics["confidence"], metrics["accuracy"], days)
            
            # Determine reason
            if metrics["status"] == "WEAK":
                reason = "Forgotten topic: Accuracy is low, review recommended."
            elif metrics["status"] == "STRONG" and days > 7:
                reason = "Mastery retention: Prevent decay by completing a spacing practice."
            elif days > 3:
                reason = "Overdue revision: Topic hasn't been practiced recently."
            else:
                continue # Practiced recently and in learning/good shape: no urgent review needed
                
            queue.append({
                "topic": topic,
                "subject": subj,
                "confidence": metrics["confidence"],
                "accuracy": metrics["accuracy"],
                "last_practiced": metrics["last_practiced_at"].isoformat() if metrics["last_practiced_at"] else None,
                "days_since_practice": days,
                "priority_score": priority,
                "reason": reason
            })
            
    # Sort by priority score descending
    return sorted(queue, key=lambda x: x["priority_score"], reverse=True)

def calculate_focus_score(student_id: int, db: Session) -> float:
    """
    Computes a focus score (0-100) based on:
    - recent activity (number of practice sessions in last 7 days)
    - study streak
    - number of active topics (learning topics count)
    """
    streak_data = calculate_study_streak(student_id, db)
    streak = streak_data["current_streak"]
    
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.student_id == student_id,
        PracticeSession.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    subjects = get_student_subjects(student_id, db)
    active_topics = 0
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        active_topics += db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined),
            TopicPerformance.status == "LEARNING"
        ).count()
        
    # Calculate score
    score = (recent_sessions * 10) + (streak * 15) + (active_topics * 5)
    return float(min(max(score, 10.0), 100.0))

def calculate_overdue_topics(student_id: int, db: Session) -> list:
    subjects = get_student_subjects(student_id, db)
    overdue = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            if metrics["sessions"] > 0 and metrics["last_practiced_at"]:
                days = (datetime.utcnow() - metrics["last_practiced_at"]).days
                if metrics["status"] == "STRONG" and days > 7:
                    overdue.append({
                        "topic": topic,
                        "subject": subj,
                        "type": "revision",
                        "days": days,
                        "reason": f"{topic} has not been revised for {days} days."
                    })
                elif days >= 5:
                    overdue.append({
                        "topic": topic,
                        "subject": subj,
                        "type": "overdue",
                        "days": days,
                        "reason": f"{topic} not practiced for {days} days."
                    })
    return overdue

def calculate_due_quizzes(student_id: int, db: Session) -> list:
    subjects = get_student_subjects(student_id, db)
    due_quizzes = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            if metrics["sessions"] > 0:
                quiz_count = db.query(QuizHistory).filter(
                    QuizHistory.student_id == student_id,
                    QuizHistory.topic == topic
                ).count()
                if quiz_count == 0:
                    due_quizzes.append({
                        "topic": topic,
                        "subject": subj,
                        "reason": f"{topic} quiz is pending."
                    })
    return due_quizzes

def calculate_pending_dues(student_id: int, db: Session) -> dict:
    overdue_list = calculate_overdue_topics(student_id, db)
    quiz_list = calculate_due_quizzes(student_id, db)
    
    subjects = get_student_subjects(student_id, db)
    unique_due_topics = set()
    reasons = []
    
    # 1. Unfinished learning & low confidence
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        
        for p in performances:
            metrics = calculate_topic_metrics(p)
            topic = p.topic
            
            if metrics["status"] == "LEARNING":
                unique_due_topics.add(topic)
                reasons.append(f"{topic} learning incomplete.")
            
            if metrics["sessions"] > 0 and metrics["confidence"] < 40:
                unique_due_topics.add(topic)
                reasons.append(f"{topic} confidence dropped recently.")
                
            if metrics["sessions"] > 0 and metrics["last_practiced_at"]:
                days = (datetime.utcnow() - metrics["last_practiced_at"]).days
                if days >= 5:
                    unique_due_topics.add(topic)
                    reasons.append(f"{topic} not practiced for {days} days.")
            
    # 2. Overdue revision
    revision_due_count = 0
    for o in overdue_list:
        unique_due_topics.add(o["topic"])
        reasons.append(o["reason"])
        if o["type"] == "revision":
            revision_due_count += 1
            
    # 3. Pending quizzes
    for q in quiz_list:
        unique_due_topics.add(q["topic"])
        reasons.append(q["reason"])
        
    return {
        "total": len(unique_due_topics),
        "revision_due": revision_due_count,
        "quiz_due": len(quiz_list),
        "reasons": list(set(reasons))  # Unique list of reasons
    }

def calculate_todays_focus(student_id: int, db: Session) -> dict:
    subjects = get_student_subjects(student_id, db)
    all_topics = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        
        for topic in predefined:
            p = perf_map.get(topic)
            metrics = calculate_topic_metrics(p)
            days = 30
            if metrics["last_practiced_at"]:
                days = (datetime.utcnow() - metrics["last_practiced_at"]).days
            
            priority = calculate_priority_score(metrics["confidence"], metrics["accuracy"], days)
            all_topics.append({
                "topic": topic,
                "subject": subj,
                "confidence": metrics["confidence"],
                "accuracy": metrics["accuracy"],
                "days_since_practice": days,
                "priority_score": priority,
                "status": metrics["status"]
            })
            
    if not all_topics:
        return {
            "topic": "Core Syllabus",
            "reason": "Start your practice sessions.",
            "confidence": 0,
            "estimated_time": 30
        }
        
    # Sort by priority score descending
    all_topics = sorted(all_topics, key=lambda x: x["priority_score"], reverse=True)
    top = all_topics[0]
    
    # Construct human readable reason
    if top["status"] == "NOT_STARTED":
        reason = f"Required curriculum topic not started yet."
    elif top["status"] == "WEAK":
        reason = f"Accuracy is low ({round(top['accuracy'])}%)."
    elif top["days_since_practice"] >= 5:
        reason = f"Last practiced {top['days_since_practice']} days ago."
    else:
        reason = f"Confidence is currently {round(top['confidence'])}%."
        
    # Estimated time
    est_time = 35
    if top["status"] == "WEAK":
        est_time = 45
    elif top["status"] == "NOT_STARTED":
        est_time = 30
        
    return {
        "topic": top["topic"],
        "reason": reason,
        "confidence": round(top["confidence"]),
        "estimated_time": est_time
    }
