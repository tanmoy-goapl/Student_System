from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import json

from practice_models import TopicPerformance, PracticeQuestion, PracticeSession, BehavioralInsight, UserPerformance, QuizHistory
from services.analytics_engine import calculate_topic_metrics, get_predefined_topics, get_student_subjects

def get_student_recommendations(student_id: int, db: Session) -> dict:
    """
    Selects lowest confidence topics, highest exam priority topics, and topics not practiced recently
    to return a personalized Mentor AI message.
    """
    subjects = get_student_subjects(student_id, db)
    all_topics_perf = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        for topic in predefined:
            perf = perf_map.get(topic)
            metrics = calculate_topic_metrics(perf)
            all_topics_perf.append({
                "topic": topic,
                "subject": subj,
                "confidence": metrics.get("confidence", 0.0),
                "accuracy": metrics["accuracy"],
                "sessions": metrics["sessions"],
                "last_practiced_at": metrics.get("last_practiced_at")
            })

    if not all_topics_perf:
        return {
            "title": "Mentor AI • Now",
            "message": "Welcome! Start by practicing any topic to get AI-driven recommendations.",
            "primaryAction": "Start First Session",
            "secondaryAction": "View Syllabus",
            "recommended_topic": None
        }

    # 1. Lowest confidence topic (must have some sessions, otherwise it's unstarted)
    attempted_topics = [t for t in all_topics_perf if t["sessions"] > 0]
    unstarted_topics = [t for t in all_topics_perf if t["sessions"] == 0]
    
    lowest_conf_topic = None
    if attempted_topics:
        lowest_conf_topic = min(attempted_topics, key=lambda x: x["confidence"])

    # 2. Topic not practiced recently
    oldest_topic = None
    attempted_with_date = [t for t in attempted_topics if t["last_practiced_at"]]
    if attempted_with_date:
        oldest_topic = min(attempted_with_date, key=lambda x: x["last_practiced_at"])

    # 3. High priority / Next unstarted topic
    next_topic = unstarted_topics[0] if unstarted_topics else (attempted_topics[0] if attempted_topics else None)

    # Formulate recommendation
    if lowest_conf_topic and lowest_conf_topic["confidence"] < 60:
        recommended = lowest_conf_topic
        message = f"Your confidence in {recommended['topic']} is low ({recommended['confidence']}%). Let's do a focus session to boost your understanding."
        action = "Practice Weak Topic"
    elif oldest_topic and oldest_topic["last_practiced_at"] < (datetime.utcnow() - timedelta(days=3)):
        recommended = oldest_topic
        message = f"You haven't reviewed {recommended['topic']} since {recommended['last_practiced_at'].strftime('%b %d')}. Revision is highly recommended."
        action = "Resume Practice"
    elif next_topic:
        recommended = next_topic
        message = f"Ready to learn something new? We recommend starting {recommended['topic']} in {recommended['subject']}."
        action = "Start Topic"
    else:
        recommended = all_topics_perf[0]
        message = "Keep up the consistent practice! Let's do a quick quiz to test your readiness."
        action = "Take Quiz"

    return {
        "title": "Mentor AI • Now",
        "message": message,
        "primaryAction": action,
        "secondaryAction": "See Full Plan",
        "recommended_topic": recommended["topic"] if recommended else None
    }

def get_study_plan(student_id: int, db: Session) -> dict:
    """
    Generates 3 to 5 study sessions for today based on weak topics, confidence levels,
    last practiced timestamps, and exam date constraints.
    """
    subjects = get_student_subjects(student_id, db)
    all_topics_perf = []
    
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        for topic in predefined:
            perf = perf_map.get(topic)
            metrics = calculate_topic_metrics(perf)
            all_topics_perf.append({
                "topic": topic,
                "subject": subj,
                "confidence": metrics.get("confidence", 0.0),
                "accuracy": metrics["accuracy"],
                "sessions": metrics["sessions"],
                "last_practiced_at": metrics.get("last_practiced_at"),
                "status": metrics["status"]
            })

    # Sort topics to find the ones needing the most attention
    # We prioritize Weak status, then lower confidence, then unstarted
    def get_sort_key(t):
        if t["status"] == "WEAK":
            return (0, t["confidence"], t["last_practiced_at"] or datetime.min)
        if t["status"] == "LEARNING":
            return (1, t["confidence"], t["last_practiced_at"] or datetime.min)
        if t["status"] == "NOT_STARTED":
            return (2, 0, datetime.min)
        return (3, t["confidence"], t["last_practiced_at"] or datetime.min)

    sorted_topics = sorted(all_topics_perf, key=get_sort_key)
    
    sessions = []
    times = ["9:00 AM", "11:30 AM", "2:30 PM", "5:00 PM", "8:00 PM"]
    durations = ["45 min", "30 min", "40 min", "35 min", "50 min"]
    colors = ["violet", "cyan", "emerald", "rose", "amber"]

    # Select top 3-4 topics to build the study plan
    for idx, t in enumerate(sorted_topics[:4]):
        sessions.append({
            "id": t["topic"].lower().replace(" ", "-"),
            "title": f"{t['topic']} Focus Session",
            "time": times[idx % len(times)],
            "duration": durations[idx % len(durations)],
            "tag": t["subject"],
            "tagColor": colors[idx % len(colors)],
            "completed": t["status"] == "STRONG"
        })

    if not sessions:
        # Fallback empty study plan
        sessions = [
            {
                "id": "intro",
                "title": "Introduction & Diagnostic Quiz",
                "time": "9:00 AM",
                "duration": "30 min",
                "tag": "General",
                "tagColor": "violet",
                "completed": False
            }
        ]

    return {
        "totalSessions": len(sessions),
        "sessions": sessions
    }

def get_ai_alerts(student_id: int, db: Session) -> list:
    """
    Triggers alerts based on:
    - Confidence dropped (< 50%)
    - Inactivity (> 5 days)
    - Exam approaching (< 14 days)
    - Revision overdue (strong topics not practiced in > 7 days)
    """
    alerts = []
    
    # 1. Check inactivity
    user_perf = db.query(UserPerformance).filter(UserPerformance.student_id == student_id).first()
    if user_perf and user_perf.last_practiced:
        days_inactive = (datetime.utcnow() - user_perf.last_practiced).days
        if days_inactive > 5:
            alerts.append({
                "id": "inactivity-alert",
                "title": "Study Streak At Risk",
                "subtitle": f"You haven't practiced in {days_inactive} days. Let's resume today to stay on track!",
                "iconName": "Flame",
                "remark": "weak"
            })
            
    # 2. Check confidence drop and revision overdue
    subjects = get_student_subjects(student_id, db)
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        for p in performances:
            metrics = calculate_topic_metrics(p)
            # Confidence Drop
            if metrics["status"] == "WEAK" and metrics.get("confidence", 0.0) < 40 and metrics["sessions"] >= 2:
                alerts.append({
                    "id": f"low-confidence-{p.topic}",
                    "title": f"Confidence Warning: {p.topic}",
                    "subtitle": f"Your confidence is currently at {metrics['confidence']}%. Additional practice is recommended.",
                    "iconName": "LineChart",
                    "remark": "weak"
                })
            # Revision Overdue
            if metrics["status"] == "STRONG" and p.last_practiced_at:
                days_since_practice = (datetime.utcnow() - p.last_practiced_at).days
                if days_since_practice > 7:
                    alerts.append({
                        "id": f"revision-overdue-{p.topic}",
                        "title": f"Revision Overdue: {p.topic}",
                        "subtitle": f"You mastered {p.topic} but haven't reviewed it in {days_since_practice} days. Keep it fresh!",
                        "iconName": "RefreshCcw",
                        "remark": "medium"
                    })

    # 3. Exam approaching (Mock: assume exam in 12 days)
    alerts.append({
        "id": "exam-approaching",
        "title": "Exam Approaching",
        "subtitle": "Your Semester Exam is in 12 days. Focus on strengthening your remaining weak areas.",
        "iconName": "Calendar",
        "remark": "neutral"
    })

    return alerts

def get_behavioral_insights(student_id: int, db: Session) -> list:
    """
    Detects behavioral insights from student quiz logs and question speeds:
    - repeated mistakes
    - rapid guessing (< 5 seconds average)
    - topic avoidance
    - confidence stagnation
    """
    insights = []

    # 1. Repeated Mistakes (pull from behavioral_insights table or simulate based on weak topics)
    db_insights = db.query(BehavioralInsight).filter(BehavioralInsight.student_id == student_id).all()
    for bi in db_insights:
        insights.append({
            "id": f"db-{bi.id}",
            "type": bi.insight_type,
            "title": bi.title,
            "description": bi.description or "",
            "iconName": "AlertTriangle",
            "severity": "high" if bi.frequency > 3 else "medium"
        })

    # 2. Rapid Guessing (check PracticeQuestion logs)
    recent_questions = db.query(PracticeQuestion).join(PracticeSession).filter(
        PracticeSession.student_id == student_id,
        PracticeQuestion.time_spent_seconds != None
    ).order_by(PracticeQuestion.answered_at.desc()).limit(20).all()

    if recent_questions:
        fast_answers = [q for q in recent_questions if q.time_spent_seconds < 5]
        if len(fast_answers) / len(recent_questions) >= 0.3:
            insights.append({
                "id": "rapid-guessing",
                "type": "guessing",
                "title": "Rapid Guessing Detected",
                "description": "You are answering questions very quickly (under 5s). Take time to read questions thoroughly for better accuracy.",
                "iconName": "Zap",
                "severity": "medium"
            })

    # 3. Topic Avoidance
    subjects = get_student_subjects(student_id, db)
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        perf_map = {p.topic: p for p in performances}
        
        attempted_count = sum(1 for t in predefined if t in perf_map and perf_map[t].sessions > 0)
        unattempted_topics = [t for t in predefined if t not in perf_map or perf_map[t].sessions == 0]
        
        if attempted_count >= 3 and unattempted_topics:
            insights.append({
                "id": f"avoidance-{subj}",
                "type": "avoidance",
                "title": "Topic Avoidance",
                "description": f"You are practicing most topics in {subj} but avoiding {unattempted_topics[0]}. Try starting it today!",
                "iconName": "BookOpenText",
                "severity": "medium"
            })
            break

    # 4. Confidence Stagnation
    for subj in subjects:
        predefined = get_predefined_topics(student_id, subj, db)
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined)
        ).all()
        for p in performances:
            metrics = calculate_topic_metrics(p)
            if p.sessions >= 5 and metrics.get("confidence", 0.0) < 50:
                insights.append({
                    "id": f"stagnation-{p.topic}",
                    "type": "stagnation",
                    "title": "Stagnant Confidence",
                    "description": f"You have practiced {p.topic} for {p.sessions} sessions, but confidence remains low. Consider reviewing the notes or textbook material.",
                    "iconName": "LineChart",
                    "severity": "high"
                })
                break

    if not insights:
        insights.append({
            "id": "healthy-habits",
            "type": "conceptual_gap",
            "title": "Steady Progress",
            "description": "No major negative patterns detected. Your practice speed and accuracy show healthy learning habits.",
            "iconName": "Trophy",
            "severity": "low"
        })

    return insights

def get_next_actions(student_id: int, db: Session) -> list:
    """
    Returns 4 adaptive Suggested Next Actions based on student history.
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
        for p in performances:
            metrics = calculate_topic_metrics(p)
            all_topics.append({
                "topic": p.topic,
                "subject": subj,
                "confidence": metrics.get("confidence", 0.0),
                "sessions": metrics["sessions"],
                "status": metrics["status"]
            })
            if metrics["status"] == "WEAK":
                weak_topics.append(p.topic)

    # 1. Continue Practice
    practice_topic = weak_topics[0] if weak_topics else (all_topics[0]["topic"] if all_topics else "Operating System basics")
    
    # 2. Review Mistakes
    review_topic = weak_topics[-1] if len(weak_topics) > 1 else (all_topics[0]["topic"] if all_topics else "Operating System basics")
    
    # 3. Learn Topic
    unstarted = [t for t in all_topics if t["sessions"] == 0]
    learn_topic = unstarted[0]["topic"] if unstarted else "Advanced System Calls"

    return [
        {
            "id": "resume-learning",
            "title": "Continue Practice",
            "subtitle": f"Focus on {practice_topic}",
            "action": "Go",
            "iconName": "Play",
            "iconClassName": "text-violet-400 bg-violet-500/10 border border-violet-500/20",
            "cardClassName": "from-[#171B4B] via-[#10153A] to-[#0B102B] border-violet-500/20",
        },
        {
            "id": "fix-weak-areas",
            "title": "Review Mistakes",
            "subtitle": f"Targeting {review_topic}",
            "action": "Go",
            "iconName": "Target",
            "iconClassName": "text-rose-400 bg-rose-500/10 border border-rose-500/20",
            "cardClassName": "from-[#3A1320] via-[#24111D] to-[#151019] border-rose-500/20",
        },
        {
            "id": "practice-test",
            "title": "Learn Topic",
            "subtitle": f"Next: {learn_topic}",
            "action": "Go",
            "iconName": "NotebookPen",
            "iconClassName": "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
            "cardClassName": "from-[#062A3B] via-[#071F2D] to-[#081722] border-cyan-500/20",
        },
        {
            "id": "quick-revision",
            "title": "Take Quiz",
            "subtitle": "Test readiness",
            "action": "Go",
            "iconName": "RefreshCw",
            "iconClassName": "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
            "cardClassName": "from-[#0E3324] via-[#0B241B] to-[#081A14] border-emerald-500/20",
        },
    ]
