from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from sqlalchemy import func

router = APIRouter(prefix="/performance", tags=["performance"])

# Static data for the Performance Sidebar
SIDEBAR_DATA = {
    "insights": [
        {
            "id": 1,
            "color": "yellow",
            "iconName": "Timer",
            "text": "You perform 23% better in morning sessions. Try shifting study time to 8–10 AM."
        },
        {
            "id": 2,
            "color": "purple",
            "iconName": "Activity",
            "text": "Pattern: you rush formula derivation steps — take 10s more per numeric question."
        },
        {
            "id": 3,
            "color": "green",
            "iconName": "Network",
            "text": "Accuracy spikes after concept revision. Do a 15-min review before each practice session."
        },
        {
            "id": 4,
            "color": "yellow",
            "iconName": "Timer",
            "text": "Your strongest window is post 8 PM for conceptual topics. Night reading works for you."
        }
    ],
    "weakTopics": [
        {
            "name": "Wave Optics",
            "subject": "Physics",
            "questionsCount": 14,
            "percentage": 38
        },
        {
            "name": "Calculus",
            "subject": "Mathematics",
            "questionsCount": 22,
            "percentage": 42
        },
        {
            "name": "Electrostatics",
            "subject": "Physics",
            "questionsCount": 18,
            "percentage": 51
        },
        {
            "name": "Electrochemistry",
            "subject": "Chemistry",
            "questionsCount": 11,
            "percentage": 55
        }
    ],
    "statCards": [
        {
            "title": "Expected JEE Score",
            "value": "187 / 300",
            "subtitle": "Based on 30-day trend",
            "color": "purple"
        },
        {
            "title": "Projected Rank",
            "value": "~4,200",
            "subtitle": "If improvement holds",
            "color": "green"
        },
        {
            "title": "Readiness",
            "value": "68%",
            "subtitle": "Exam in 47 days",
            "color": "yellow"
        }
    ],
    "actionCards": [
        {
            "title": "Practice Wave Optics",
            "subtitle": "Target 60%+ accuracy",
            "tag": "Urgent",
            "color": "red"
        },
        {
            "title": "Revise Calculus Basics",
            "subtitle": "Integration fundamentals",
            "tag": "Today",
            "color": "purple"
        },
        {
            "title": "Take Full Mock Test",
            "subtitle": "Chemistry + Maths",
            "tag": "Scheduled",
            "color": "yellow"
        }
    ],
    "readiness": [
        {
            "subject": "Physics readiness",
            "value": 84
        },
        {
            "subject": "Maths readiness",
            "value": 58
        },
        {
            "subject": "Chemistry readiness",
            "value": 72
        }
    ]
}

from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db
from practice_models import (
    TopicPerformance,
    BehavioralInsight,
    UserPerformance,
    QuizHistory,
)
from typing import Optional
from services.analytics_engine import (
    calculate_student_metrics,
    calculate_subject_metrics,
    calculate_readiness,
    calculate_topic_metrics,
    get_activity_snapshot,
    calculate_study_streak_metrics,
    get_student_subjects,
)
from services.authorization import require_student

@router.get("/sidebar")
async def get_performance_sidebar(student_id: int = Query(...), db: Session = Depends(get_db)):
    """Return student performance sidebar data from live topic and activity records."""
    require_student(student_id, db)
    all_perfs = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id
    ).all()
    topic_metrics = [
        (perf, calculate_topic_metrics(perf))
        for perf in all_perfs
        if (perf.sessions or 0) > 0 or (perf.questions_attempted or 0) > 0
    ]
    weak_topics = [
        {
            "name": perf.topic,
            "subject": perf.subject or "General",
            "questionsCount": metrics["questions_attempted"],
            "percentage": round(metrics["accuracy"]),
        }
        for perf, metrics in sorted(topic_metrics, key=lambda item: item[1]["accuracy"])[:4]
    ]

    subjects = get_student_subjects(student_id, db)
    readiness = []
    for subject in subjects:
        metrics = calculate_subject_metrics(student_id, subject, db)
        readiness.append({
            "subject": f"{subject} readiness",
            "value": calculate_readiness(
                metrics.get("exposure", 0.0),
                metrics.get("average_confidence", 0.0),
                metrics.get("last_activity_at"),
            ),
        })

    db_insights = db.query(BehavioralInsight).filter(
        BehavioralInsight.student_id == student_id
    ).order_by(BehavioralInsight.detected_at.desc()).limit(4).all()
    insights = [
        {
            "id": insight.id,
            "color": "yellow" if index % 2 == 0 else "purple",
            "iconName": "Activity" if index % 2 == 0 else "Timer",
            "text": f"{insight.title}: {insight.description or 'Review this pattern in your next practice session.'}",
        }
        for index, insight in enumerate(db_insights)
    ]

    overall = calculate_student_metrics(student_id, db)
    activity = get_activity_snapshot([student_id], db)
    if not insights:
        if weak_topics:
            insights.append({
                "id": "weak-topic",
                "color": "yellow",
                "iconName": "Activity",
                "text": f"{weak_topics[0]['name']} is currently at {weak_topics[0]['percentage']}% accuracy. Review it before the next quiz.",
            })
        elif not activity["active_7d"]:
            insights.append({
                "id": "reengage",
                "color": "purple",
                "iconName": "Timer",
                "text": "No quiz or practice activity was recorded in the last 7 days. Start a short session to refresh your progress.",
            })
        else:
            insights.append({
                "id": "steady",
                "color": "green",
                "iconName": "Activity",
                "text": f"Your current readiness is {overall.get('overall_readiness', 0)}%. Keep practicing to make the signal more reliable.",
            })

    action_cards = [
        {
            "title": f"Practice {topic['name']}",
            "subtitle": f"Build accuracy from {topic['percentage']}% toward 70%+",
            "tag": "Recommended",
            "color": "red",
        }
        for topic in weak_topics[:3]
    ]
    return {
        "insights": insights,
        "weakTopics": weak_topics,
        "statCards": [
            {
                "title": "Overall Readiness",
                "value": f"{overall.get('overall_readiness', 0)}%",
                "subtitle": "Exposure, confidence, recency and roadmap progress",
                "color": "purple",
            },
            {
                "title": "Average Confidence",
                "value": f"{overall.get('overall_confidence', 0)}%",
                "subtitle": "Answer accuracy plus repeated practice",
                "color": "green",
            },
            {
                "title": "Question Accuracy",
                "value": f"{overall.get('overall_accuracy', 0)}%",
                "subtitle": f"{overall.get('correct_answers', 0)} of {overall.get('questions_attempted', 0)} correct",
                "color": "yellow",
            },
        ],
        "actionCards": action_cards,
        "readiness": readiness,
    }

# Static data for the main Performance Page
MAIN_DATA = {
    "stats": [
        {
            "title": "Overall Accuracy",
            "value": "71%",
            "subtitle": "284 of 400 correct",
            "badge": "+4.2%",
            "iconName": "Target",
            "valueColor": "text-indigo-400",
            "iconColor": "text-indigo-400"
        },
        {
            "title": "Improvement",
            "value": "+18%",
            "subtitle": "vs. last 7 days",
            "badge": "Fastest in Physics",
            "iconName": "TrendingUp",
            "valueColor": "text-emerald-400",
            "iconColor": "text-emerald-400"
        },
        {
            "title": "Study Streak",
            "value": "12 days",
            "subtitle": "Personal best: 18",
            "badge": "Keep it going!",
            "iconName": "Flame",
            "valueColor": "text-amber-400",
            "iconColor": "text-amber-400"
        },
        {
            "title": "Topics Mastered",
            "value": "34",
            "subtitle": "of 61 total topics",
            "badge": "+3 this week",
            "iconName": "BookOpen",
            "valueColor": "text-cyan-400",
            "iconColor": "text-cyan-400"
        }
    ],
    "mastery": [
        {
            "id": "physics",
            "subject": "Physics",
            "iconName": "Atom",
            "progress": 64,
            "progressColor": "from-indigo-500 to-violet-500",
            "topics": [
                {"name": "Mechanics", "progress": 88, "status": "strong"},
                {"name": "Thermodynamics", "progress": 74, "status": "strong"},
                {"name": "Wave Optics", "progress": 38, "status": "weak"},
                {"name": "Electrostatics", "progress": 51, "status": "weak"}
            ]
        }
    ],
    "trend": {
        "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "accuracy": [62, 67, 65, 70, 68, 74, 72],
        "practiceVolume": [52, 61, 58, 67, 71, 78, 75]
    }
}

@router.get("/main")
async def get_performance_main(student_id: int = Query(...), db: Session = Depends(get_db)):
    require_student(student_id, db)
    # Auto-repair: fix TopicPerformance records that lost their quiz data
    from practice_models import PracticeQuestion, PracticeSession
    from services.analytics_engine import get_topic_status as _gts
    broken = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.questions_attempted == 0
    ).all()
    for bp in broken:
        hist = db.query(PracticeQuestion).join(PracticeSession).filter(
            PracticeQuestion.student_answer.isnot(None),
            PracticeSession.student_id == bp.student_id,
            PracticeQuestion.topic == bp.topic,
            PracticeQuestion.is_correct.isnot(None)
        ).all()
        if hist:
            att = len(hist)
            cor = sum(1 for q in hist if q.is_correct)
            acc = (cor / att * 100) if att > 0 else 0.0
            ses = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == bp.student_id,
                PracticeQuestion.topic == bp.topic,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).distinct().count()
            bp.questions_attempted = att
            bp.correct_answers = cor
            bp.accuracy = acc
            bp.sessions = ses
            bp.status = _gts(ses, att, acc)
    
    # Auto-recover: find orphaned quiz topics (answered questions but NO TopicPerformance row)
    from sqlalchemy import distinct as sql_distinct
    all_answered_topics = db.query(sql_distinct(PracticeQuestion.topic)).join(PracticeSession).filter(
        PracticeSession.student_id == student_id,
        PracticeQuestion.student_answer.isnot(None),
        PracticeQuestion.is_correct.isnot(None)
    ).all()
    existing_tp_topics = set(
        t[0] for t in db.query(TopicPerformance.topic).filter(
            TopicPerformance.student_id == student_id
        ).all()
    )
    for (topic_name,) in all_answered_topics:
        if topic_name not in existing_tp_topics:
            hist = db.query(PracticeQuestion).join(PracticeSession).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == topic_name,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).all()
            att = len(hist)
            cor = sum(1 for q in hist if q.is_correct)
            acc = (cor / att * 100) if att > 0 else 0.0
            ses = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == topic_name,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).distinct().count()
            first_q = hist[0] if hist else None
            resolved_subject = first_q.subtopic if first_q and first_q.subtopic else "General"
            try:
                import json as _json, os as _os
                st_path = _os.path.join(_os.path.dirname(__file__), "..", "config", "subject_topics.json")
                if _os.path.exists(st_path):
                    with open(st_path, "r") as f:
                        st_data = _json.load(f)
                    for sn, tl in st_data.items():
                        if topic_name in tl:
                            resolved_subject = sn
                            break
            except Exception:
                pass
            new_tp = TopicPerformance(
                student_id=student_id,
                topic=topic_name,
                subject=resolved_subject,
                sessions=ses,
                questions_attempted=att,
                correct_answers=cor,
                accuracy=acc,
                status=_gts(ses, att, acc)
            )
            db.add(new_tp)
    
    db.commit()
    
    # Use the shared student metric model for every performance card.
    all_perfs = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id
    ).all()
    overall = calculate_student_metrics(student_id, db)
    user_performance = db.query(UserPerformance).filter(
        UserPerformance.student_id == student_id
    ).first()

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    def quiz_accuracy(start_at, end_at=None):
        query = db.query(
            func.sum(QuizHistory.correct_answers),
            func.sum(QuizHistory.questions_attempted),
        ).filter(
            QuizHistory.student_id == student_id,
            QuizHistory.questions_attempted > 0,
            QuizHistory.created_at >= start_at,
        )
        if end_at is not None:
            query = query.filter(QuizHistory.created_at < end_at)
        correct, questions = query.first()
        return (
            float(correct or 0) / float(questions) * 100
            if questions else None
        )

    recent_accuracy = quiz_accuracy(seven_days_ago)
    previous_accuracy = quiz_accuracy(fourteen_days_ago, seven_days_ago)
    improvement = (
        round(recent_accuracy - previous_accuracy, 1)
        if recent_accuracy is not None and previous_accuracy is not None
        else 0.0
    )
    streak_metrics = calculate_study_streak_metrics(student_id, db)
    current_streak = streak_metrics["current_streak"]
    longest_streak = streak_metrics["longest_streak"]
    mastered_count = overall.get("mastered_topics", 0)
    total_count = overall.get("total_topics", 0)

    stats = [
        {
            "title": "Overall Accuracy",
            "value": f"{overall.get('overall_accuracy', 0)}%",
            "subtitle": f"{overall.get('correct_answers', 0)} of {overall.get('questions_attempted', 0)} correct",
            "badge": f"{improvement:+g}% vs previous 7 days",
            "iconName": "Target",
            "valueColor": "text-indigo-400",
            "iconColor": "text-indigo-400",
        },
        {
            "title": "Improvement",
            "value": f"{improvement:+g}%",
            "subtitle": "last 7 days vs the preceding 7 days",
            "badge": "Live quiz accuracy",
            "iconName": "TrendingUp",
            "valueColor": "text-emerald-400",
            "iconColor": "text-emerald-400",
        },
        {
            "title": "Study Streak",
            "value": f"{current_streak} days",
            "subtitle": f"Personal best: {longest_streak} days",
            "badge": "Keep it going!" if current_streak else "Start a streak",
            "iconName": "Flame",
            "valueColor": "text-amber-400",
            "iconColor": "text-amber-400",
        },
        {
            "title": "Topics Mastered",
            "value": str(mastered_count),
            "subtitle": f"of {total_count} curriculum topics",
            "badge": "Shared mastery rule",
            "iconName": "BookOpen",
            "valueColor": "text-cyan-400",
            "iconColor": "text-cyan-400",
        },
    ]

    subjects = get_student_subjects(student_id, db)
    if not subjects:
        subjects = list(dict.fromkeys(
            perf.subject or "General"
            for perf in all_perfs
        ))
    colors = [
        "from-indigo-500 to-violet-500",
        "from-purple-500 to-fuchsia-500",
        "from-cyan-500 to-sky-500",
        "from-emerald-500 to-teal-500",
        "from-amber-500 to-orange-500",
    ]
    mastery = []
    for index, subject in enumerate(subjects):
        subject_metrics = calculate_subject_metrics(student_id, subject, db)
        subject_key = subject.casefold()
        subject_perfs = [
            perf for perf in all_perfs
            if not perf.subject
            or perf.subject.strip().casefold() == subject_key
        ]
        topics = []
        for perf in sorted(subject_perfs, key=lambda item: item.topic):
            topic_metrics = calculate_topic_metrics(perf)
            if topic_metrics["sessions"] == 0 and topic_metrics["questions_attempted"] == 0:
                continue
            topics.append({
                "name": perf.topic,
                "progress": round(topic_metrics["accuracy"]),
                "status": (
                    "strong"
                    if topic_metrics["status"] == "STRONG"
                    else "weak"
                    if topic_metrics["status"] == "WEAK"
                    else "learning"
                ),
            })
        mastery.append({
            "id": subject.lower().replace(" ", "-"),
            "subject": subject,
            "iconName": "BookOpen" if index % 2 == 0 else "Activity",
            "progress": round(subject_metrics.get("average_accuracy", 0.0)),
            "progressColor": colors[index % len(colors)],
            "topics": topics,
        })

    trend_labels = []
    trend_accuracy = []
    trend_volume = []
    for offset in range(6, -1, -1):
        day_start = (now - timedelta(days=offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)
        correct, questions = db.query(
            func.sum(QuizHistory.correct_answers),
            func.sum(QuizHistory.questions_attempted),
        ).filter(
            QuizHistory.student_id == student_id,
            QuizHistory.questions_attempted > 0,
            QuizHistory.created_at >= day_start,
            QuizHistory.created_at < day_end,
        ).first()
        trend_labels.append(day_start.strftime("%a"))
        trend_accuracy.append(
            round(float(correct or 0) / float(questions) * 100, 1)
            if questions else None
        )
        trend_volume.append(int(questions or 0))

    return {
        "stats": stats,
        "mastery": mastery,
        "trend": {
            "labels": trend_labels,
            "accuracy": trend_accuracy,
            "practiceVolume": trend_volume,
        },
    }
