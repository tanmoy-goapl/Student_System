import logging
from datetime import datetime
from sqlalchemy.orm import Session

from practice_models import PracticeQuestion, TopicPerformance, BehavioralInsight

logger = logging.getLogger("chatbot")


def get_weak_topics(student_id: int, db: Session) -> list[dict]:
    """Return topics sorted by accuracy ascending (weakest first)."""
    perfs = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.sessions >= 1)
        .order_by(TopicPerformance.accuracy.asc())
        .all()
    )

    return [
        {
            "topic": p.topic,
            "subject": p.subject or "General",
            "accuracy": round(p.accuracy, 1),
            "sessions": p.sessions,
            "status": p.status,
            "current_difficulty": p.current_difficulty,
        }
        for p in perfs
    ]


def get_weakness_topics_for_quiz(student_id: int, db: Session, limit: int = 3) -> list[str]:
    """Get the weakest topic names for weakness-based quiz generation."""
    weak = get_weak_topics(student_id, db)
    if not weak:
        return []
    return [w["topic"] for w in weak[:limit]]


def detect_behavioral_patterns(student_id: int, db: Session) -> list[dict]:
    """Analyze recent answers to identify behavioral patterns."""
    recent = (
        db.query(PracticeQuestion)
        .join(PracticeQuestion.session)  # Join with PracticeSession
        .filter(PracticeQuestion.session.has(student_id=student_id))
        .filter(PracticeQuestion.student_answer.isnot(None))
        .order_by(PracticeQuestion.answered_at.desc())
        .limit(50)
        .all()
    )

    if len(recent) < 3:
        return []

    insights = []
    wrong_answers = [q for q in recent if not q.is_correct]
    fast_wrong = [q for q in wrong_answers if q.time_spent_seconds and q.time_spent_seconds < 10]
    slow_answers = [q for q in recent if q.time_spent_seconds and q.time_spent_seconds > 120]

    if len(fast_wrong) >= 3:
        insights.append({
            "type": "guessing",
            "title": "Possible guessing detected",
            "description": f"You answered {len(fast_wrong)} questions incorrectly in under 10 seconds. Slow down and think through the options.",
            "frequency": len(fast_wrong),
        })

    if len(slow_answers) >= 3:
        insights.append({
            "type": "time_pressure",
            "title": "Time management needed",
            "description": f"You spent over 2 minutes on {len(slow_answers)} questions. Practice similar problems to build speed.",
            "frequency": len(slow_answers),
        })

    topic_errors = {}
    for q in wrong_answers:
        topic_errors[q.topic] = topic_errors.get(q.topic, 0) + 1

    for topic_name, error_count in topic_errors.items():
        if error_count >= 3:
            insights.append({
                "type": "repeated_error",
                "title": f"Recurring mistakes in {topic_name}",
                "description": f"You've made {error_count} errors in {topic_name}. Consider reviewing the fundamentals before practicing more.",
                "frequency": error_count,
            })

    total = len(recent)
    correct = len([q for q in recent if q.is_correct])
    accuracy = (correct / total) * 100 if total > 0 else 0

    if accuracy < 40:
        insights.append({
            "type": "conceptual_gap",
            "title": "Low overall accuracy",
            "description": f"Your recent accuracy is {accuracy:.0f}%. Focus on understanding core concepts before attempting harder questions.",
            "frequency": total - correct,
        })

    for insight in insights:
        existing = (
            db.query(BehavioralInsight)
            .filter(BehavioralInsight.student_id == student_id)
            .filter(BehavioralInsight.insight_type == insight["type"])
            .first()
        )
        if existing:
            existing.title = insight["title"]
            existing.description = insight["description"]
            existing.frequency = insight["frequency"]
            existing.detected_at = datetime.utcnow()
        else:
            db.add(BehavioralInsight(
                student_id=student_id,
                insight_type=insight["type"],
                title=insight["title"],
                description=insight["description"],
                frequency=insight["frequency"],
            ))

    db.commit()
    return insights


def get_stored_insights(student_id: int, db: Session) -> list[dict]:
    """Get persisted behavioral insights."""
    insights = (
        db.query(BehavioralInsight)
        .filter(BehavioralInsight.student_id == student_id)
        .order_by(BehavioralInsight.detected_at.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "type": insight.insight_type,
            "title": insight.title,
            "description": insight.description,
            "frequency": insight.frequency,
        }
        for insight in insights
    ]
