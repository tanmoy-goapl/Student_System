from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import json
import re

from practice_models import TopicPerformance, RevisionItem, QuizHistory, PracticeSession, UserPerformance, BehavioralInsight, PracticeQuestion
from services.analytics_engine import (
    calculate_topic_metrics, get_student_subjects, get_predefined_topics,
    calculate_student_metrics, calculate_study_streak_metrics
)

def calculate_priority_score(confidence: float, accuracy: float, days_since_practice: int) -> float:
    """
    Computes priority_score:
    priority_score = (100 - confidence) * 0.5 + (100 - accuracy) * 0.3 + min(days_since_practice * 2, 20)
    """
    return round((100 - confidence) * 0.5 + (100 - accuracy) * 0.3 + min(days_since_practice * 2, 20), 2)

def calculate_exam_readiness(student_id: int, db: Session) -> dict:
    """
    Return the shared readiness signal and a measured seven-day accuracy change.
    """
    metrics = calculate_student_metrics(student_id, db)
    readiness = round(metrics.get("overall_readiness", 0.0), 2)

    now = datetime.utcnow()
    recent_start = now - timedelta(days=7)
    previous_start = now - timedelta(days=14)
    recent_rows = db.query(QuizHistory).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.questions_attempted > 0,
        QuizHistory.created_at >= recent_start,
    ).all()
    previous_rows = db.query(QuizHistory).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.questions_attempted > 0,
        QuizHistory.created_at >= previous_start,
        QuizHistory.created_at < recent_start,
    ).all()

    def accuracy(rows):
        questions = sum(max(int(row.questions_attempted or 0), 0) for row in rows)
        correct = sum(
            min(max(int(row.correct_answers or 0), 0), max(int(row.questions_attempted or 0), 0))
            for row in rows
        )
        return (correct / questions * 100.0) if questions else None

    recent_accuracy = accuracy(recent_rows)
    previous_accuracy = accuracy(previous_rows)
    weekly_change = round(recent_accuracy - previous_accuracy, 1) if (
        recent_accuracy is not None and previous_accuracy is not None
    ) else 0.0

    return {
        "readiness_percentage": readiness,
        "weekly_change": weekly_change,
        "overall_accuracy": round(metrics.get("overall_accuracy", 0.0), 1),
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
    """Persist the shared answered-activity streak calculation for home consumers."""
    streak_data = calculate_study_streak_metrics(student_id, db)
    perf = db.query(UserPerformance).filter(
        UserPerformance.student_id == student_id
    ).first()
    if perf:
        perf.current_streak = streak_data["current_streak"]
        perf.longest_streak = max(
            int(perf.longest_streak or 0),
            streak_data["best_streak"],
        )
        perf.last_practiced = streak_data.get("last_active_at")
        db.commit()

    return {
        "current_streak": streak_data["current_streak"],
        "best_streak": streak_data["best_streak"],
        "last_active": streak_data["last_active"],
    }

def calculate_topics_covered(student_id: int, db: Session) -> dict:
    """
    Return attempted curriculum coverage from the shared student metric.
    """
    metrics = calculate_student_metrics(student_id, db)
    return {
        "covered_topics": metrics.get("attempted_topics", 0),
        "total_topics": metrics.get("total_topics", 0),
        "exposure": round(metrics.get("overall_exposure", 0.0), 2),
    }


def generate_study_plan(
    student_id: int,
    db: Session,
    excluded_keys: set[tuple[str, str]] | None = None,
) -> list:
    """
    Generates the learning portion of the daily plan.

    Revision is intentionally a separate workflow. Topics already present in
    the revision queue, and the single topic used by Today's Focus, are not
    repeated here.
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
            if metrics["status"] == "NOT_STARTED":
                reason = "New learning: You haven't started this required curriculum topic."
            elif metrics["status"] == "LEARNING":
                reason = "Continue learning: Build understanding before moving to revision."
            else:
                reason = "Continue active coursework: Reinforce this topic while it is current."

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
            
    # Keep the daily plan separate from the revision queue. Revision queue items
    # are already practiced topics that need spaced review; the daily plan should
    # focus on learning new curriculum topics or continuing active learning.
    revision_keys = {
        (str(item.get("subject", "")).strip().lower(), str(item.get("topic", "")).strip().lower())
        for item in calculate_revision_queue(student_id, db)
    }
    excluded_keys = excluded_keys or set()
    non_revision_topics = [
        item for item in all_topics
        if (
            item["subject"].strip().lower(),
            item["topic"].strip().lower(),
        ) not in revision_keys
        and (
            item["subject"].strip().lower(),
            item["topic"].strip().lower(),
        ) not in excluded_keys
    ]
    active_learning_topics = [
        item for item in non_revision_topics
        if item["status"] in {"NOT_STARTED", "LEARNING"}
    ]
    sorted_plan = sorted(
        active_learning_topics or non_revision_topics,
        key=lambda x: x["priority_score"],
        reverse=True,
    )

    study_plan_items = []
    durations = ["45 min", "30 min", "40 min", "35 min", "50 min"]

    for idx, item in enumerate(sorted_plan[:4]):
        study_plan_items.append({
            "topic": item["topic"],
            "subject": item["subject"],
            "duration": durations[idx % len(durations)],
            "action": "Learning Session" if item["status"] == "NOT_STARTED" else "Practice Session",
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
    """Return both automatic recommendations and explicitly requested revisions.

    Explicit revision requests are stored separately from TopicPerformance so
    adding a topic for review never changes accuracy, confidence, or recency.
    """
    subjects = get_student_subjects(student_id, db)
    queue_by_key = {}

    def key_for(subject: str, topic: str):
        return ((subject or "").strip().casefold(), (topic or "").strip().casefold())

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

            # A topic that has never been practiced needs initial learning,
            # unless the student explicitly added it to the revision queue.
            if metrics["sessions"] == 0:
                continue

            days = (
                (datetime.utcnow() - metrics["last_practiced_at"]).days
                if metrics["last_practiced_at"] else 30
            )
            priority = calculate_priority_score(
                metrics["confidence"], metrics["accuracy"], days
            )

            if metrics["status"] == "WEAK":
                reason = "Forgotten topic: Accuracy is low, review recommended."
            elif metrics["status"] == "STRONG" and days > 7:
                reason = "Mastery retention: Prevent decay by completing a spacing practice."
            elif days > 3:
                reason = "Overdue revision: Topic hasn't been practiced recently."
            else:
                continue

            queue_by_key[key_for(subj, topic)] = {
                "topic": topic,
                "subject": subj,
                "confidence": metrics["confidence"],
                "accuracy": metrics["accuracy"],
                "last_practiced": metrics["last_practiced_at"].isoformat() if metrics["last_practiced_at"] else None,
                "days_since_practice": days,
                "priority_score": priority,
                "reason": reason,
                "source": "automatic",
                "revision_item_id": None,
                "priority": "adaptive",
            }

    # Explicit requests are authoritative and also support topics outside the
    # enrolled curriculum (for example personal-roadmap or custom topics).
    explicit_items = db.query(RevisionItem).filter(
        RevisionItem.student_id == student_id,
        RevisionItem.status == "pending",
    ).all()
    priority_boost = {"low": 0, "medium": 10, "high": 20}
    for item in explicit_items:
        performance = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic == item.topic,
        ).first()
        metrics = calculate_topic_metrics(performance)
        days = (
            (datetime.utcnow() - metrics["last_practiced_at"]).days
            if metrics["last_practiced_at"] else 0
        )
        subject = (
            item.subject
            or (performance.subject if performance and performance.subject else "Personal topics")
        )

        # Remove an automatic copy of the same topic before inserting the
        # explicit item, so the student sees one clear queue entry.
        for existing_key, existing_item in list(queue_by_key.items()):
            if existing_item["topic"].strip().casefold() == item.topic.strip().casefold():
                queue_by_key.pop(existing_key, None)

        base_priority = calculate_priority_score(
            metrics["confidence"], metrics["accuracy"], days
        )
        queue_by_key[key_for(subject, item.topic)] = {
            "topic": item.topic,
            "subject": subject,
            "confidence": metrics["confidence"],
            "accuracy": metrics["accuracy"],
            "last_practiced": metrics["last_practiced_at"].isoformat() if metrics["last_practiced_at"] else None,
            "days_since_practice": days,
            "priority_score": min(100.0, round(base_priority + priority_boost.get(item.priority, 20), 2)),
            "reason": f"Added to your revision queue ({item.priority} priority).",
            "source": "manual",
            "revision_item_id": item.id,
            "priority": item.priority,
        }

    return sorted(
        queue_by_key.values(),
        key=lambda item: (-item["priority_score"], item["topic"].casefold()),
    )

def calculate_focus_score(student_id: int, db: Session) -> float:
    """
    Computes a focus score (0-100) based on:
    - recent activity (number of practice sessions in last 7 days)
    - study streak
    - number of active topics (learning topics count)
    """
    streak_data = calculate_study_streak(student_id, db)
    streak = streak_data["current_streak"]
    
    recent_sessions = (
        db.query(PracticeSession.id)
        .join(PracticeQuestion, PracticeQuestion.session_id == PracticeSession.id)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.answered_at >= datetime.utcnow() - timedelta(days=7),
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.answered_at.isnot(None),
            PracticeQuestion.is_correct.isnot(None),
        )
        .distinct()
        .count()
    )
    
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
                    QuizHistory.topic == topic,
                    QuizHistory.questions_attempted > 0,
                ).count()
                if quiz_count == 0:
                    due_quizzes.append({
                        "topic": topic,
                        "subject": subj,
                        "reason": f"{topic} quiz is pending."
                    })
    return due_quizzes

def calculate_pending_dues(student_id: int, db: Session) -> dict:
    quiz_list = calculate_due_quizzes(student_id, db)
    revision_queue = calculate_revision_queue(student_id, db)
    subjects = get_student_subjects(student_id, db)
    unique_due_topics = set()
    reasons = []

    # Unfinished learning and low-confidence signals remain separate from the
    # explicit revision queue, but contribute to the same pending total.
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()

        for performance in performances:
            metrics = calculate_topic_metrics(performance)
            topic = performance.topic

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

    # Every explicit or automatic revision queue entry is a real revision due.
    for item in revision_queue:
        unique_due_topics.add(item["topic"])
        reasons.append(item["reason"])

    for quiz in quiz_list:
        unique_due_topics.add(quiz["topic"])
        reasons.append(quiz["reason"])

    return {
        "total": len(unique_due_topics),
        "revision_due": len(revision_queue),
        "quiz_due": len(quiz_list),
        "reasons": list(dict.fromkeys(reasons)),
    }

def calculate_pending_tasks(student_id: int, db: Session) -> list:
    """Return one actionable entry per topic contributing to pending dues."""
    subjects = get_student_subjects(student_id, db)
    tasks = {}
    task_rank = {"learning": 1, "practice": 2, "revision": 3, "quiz": 4}

    def add_task(topic, subject, task_type, reason, priority_score, days_since_practice, action_url):
        if not topic:
            return

        existing = tasks.get(topic)
        if existing is None:
            tasks[topic] = {
                "topic": topic,
                "subject": subject or "General",
                "task_type": task_type,
                "task_types": {task_type},
                "reason": reason,
                "reasons": [reason],
                "days_since_practice": days_since_practice,
                "priority_score": round(priority_score, 2),
                "action_url": action_url,
            }
            return

        if reason not in existing["reasons"]:
            existing["reasons"].append(reason)
        existing["task_types"].add(task_type)
        if task_rank.get(task_type, 0) > task_rank.get(existing["task_type"], 0):
            existing["task_type"] = task_type
            existing["action_url"] = action_url
        if priority_score > existing["priority_score"]:
            existing["priority_score"] = round(priority_score, 2)
            existing["days_since_practice"] = days_since_practice

    for subject in subjects:
        predefined = get_predefined_topics(student_id, subject, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {performance.topic: performance for performance in performances}

        for topic in predefined:
            metrics = calculate_topic_metrics(perf_map.get(topic))
            days = (
                (datetime.utcnow() - metrics["last_practiced_at"]).days
                if metrics["last_practiced_at"] else 30
            )
            priority = calculate_priority_score(
                metrics["confidence"], metrics["accuracy"], days
            )

            if metrics["status"] == "LEARNING":
                add_task(
                    topic, subject, "learning",
                    "Learning is incomplete.",
                    priority, days,
                    f"/learning?topic={topic}&subject={subject}",
                )
            if metrics["sessions"] > 0 and metrics["confidence"] < 40:
                add_task(
                    topic, subject, "practice",
                    "Confidence is below the practice threshold.",
                    priority, days,
                    f"/practice?mode=weakness&topic={topic}",
                )
            if metrics["sessions"] > 0 and metrics["last_practiced_at"] and days >= 5:
                add_task(
                    topic, subject, "revision",
                    f"Not practiced for {days} days.",
                    priority, days,
                    f"/practice?topic={topic}",
                )

    for overdue in calculate_overdue_topics(student_id, db):
        add_task(
            overdue["topic"], overdue["subject"], overdue["type"],
            overdue["reason"], 75.0 + min(overdue.get("days", 0), 20),
            overdue.get("days", 0),
            f"/practice?topic={overdue['topic']}",
        )

    for quiz in calculate_due_quizzes(student_id, db):
        add_task(
            quiz["topic"], quiz["subject"], "quiz",
            quiz["reason"], 85.0, 0,
            f"/practice?topic={quiz['topic']}",
        )

    # Include explicit revision requests, including personal/custom topics that
    # are not represented in the enrolled curriculum.
    for revision in calculate_revision_queue(student_id, db):
        add_task(
            revision["topic"], revision["subject"], "revision",
            revision["reason"], revision["priority_score"],
            revision["days_since_practice"],
            f"/practice?topic={revision['topic']}",
        )

    result = []
    for task in tasks.values():
        task["task_types"] = sorted(task["task_types"])
        task["reason"] = " ".join(task.pop("reasons")[:2])
        result.append(task)

    return sorted(
        result,
        key=lambda item: (-item["priority_score"], item["topic"].lower()),
    )
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
            "subject": "",
            "status": "NOT_STARTED",
            "reason": "Start your learning sessions.",
            "confidence": 0,
            "estimated_time": 30
        }
        
    # Today's Focus should not compete with the revision queue. Prefer a topic
    # that needs learning or active coursework; use a revision topic only when
    # there is no other curriculum work available.
    revision_keys = {
        (str(item.get("subject", "")).strip().lower(), str(item.get("topic", "")).strip().lower())
        for item in calculate_revision_queue(student_id, db)
    }
    non_revision_topics = [
        item for item in all_topics
        if (item["subject"].strip().lower(), item["topic"].strip().lower()) not in revision_keys
    ]
    active_topics = [
        item for item in non_revision_topics
        if item["status"] in {"NOT_STARTED", "LEARNING"}
    ]
    ranked_topics = sorted(
        active_topics or non_revision_topics or all_topics,
        key=lambda x: x["priority_score"],
        reverse=True,
    )
    top = ranked_topics[0]
    
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
        "subject": top["subject"],
        "status": top["status"],
        "reason": reason,
        "confidence": round(top["confidence"]),
        "estimated_time": est_time
    }
