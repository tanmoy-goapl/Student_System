from fastapi import APIRouter

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
from practice_models import TopicPerformance, BehavioralInsight
from typing import Optional

@router.get("/sidebar")
async def get_performance_sidebar(student_id: int = 3, db: Session = Depends(get_db)):
    # 1. Fetch performance data
    all_perfs = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
    
    # 2. Compute weak topics
    sorted_perfs = sorted(all_perfs, key=lambda x: x.accuracy or 0.0)
    weak_topics = []
    for p in sorted_perfs[:4]:
        weak_topics.append({
            "name": p.topic,
            "subject": p.subject or "General",
            "questionsCount": p.questions_attempted or 0,
            "percentage": round(p.accuracy or 0.0)
        })
    if not weak_topics:
        weak_topics = SIDEBAR_DATA["weakTopics"]
        
    # 3. Compute readiness by subject
    subject_readiness = {}
    for p in all_perfs:
        subj = p.subject or "General"
        if subj not in subject_readiness:
            subject_readiness[subj] = []
        subject_readiness[subj].append(p.accuracy or 0.0)
        
    readiness = []
    for subj, accs in subject_readiness.items():
        avg_acc = sum(accs) / len(accs) if accs else 0.0
        readiness.append({
            "subject": f"{subj} readiness",
            "value": round(avg_acc)
        })
    if not readiness:
        readiness = SIDEBAR_DATA["readiness"]
        
    # 4. Fetch behavioral insights
    insights = []
    db_insights = db.query(BehavioralInsight).filter(BehavioralInsight.student_id == student_id).all()
    for idx, ins in enumerate(db_insights[:4]):
        insights.append({
            "id": ins.id,
            "color": "yellow" if idx % 2 == 0 else "purple",
            "iconName": "Activity" if idx % 2 == 0 else "Timer",
            "text": f"{ins.title}: {ins.description}"
        })
    if not insights:
        insights = SIDEBAR_DATA["insights"]
        
    return {
        "insights": insights,
        "weakTopics": weak_topics,
        "statCards": SIDEBAR_DATA["statCards"],
        "actionCards": SIDEBAR_DATA["actionCards"],
        "readiness": readiness
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
async def get_performance_main(student_id: int = 3, db: Session = Depends(get_db)):
    # Auto-repair: fix TopicPerformance records that lost their quiz data
    from practice_models import PracticeQuestion, PracticeSession
    from services.analytics_engine import get_topic_status as _gts
    broken = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.questions_attempted == 0
    ).all()
    for bp in broken:
        hist = db.query(PracticeQuestion).join(PracticeSession).filter(
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
                PracticeQuestion.is_correct.isnot(None)
            ).all()
            att = len(hist)
            cor = sum(1 for q in hist if q.is_correct)
            acc = (cor / att * 100) if att > 0 else 0.0
            ses = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == topic_name,
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
    
    # 1. Fetch performance data
    all_perfs = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
    
    # 2. Compute overall stats
    questions_attempted = sum((p.questions_attempted or 0) for p in all_perfs)
    correct_answers = sum((p.correct_answers or 0) for p in all_perfs)
    overall_accuracy = (correct_answers / questions_attempted * 100) if questions_attempted > 0 else 0.0
    
    mastered_count = len([p for p in all_perfs if (p.accuracy or 0.0) >= 80])
    total_count = len(all_perfs)
    
    stats = [
        {
            "title": "Overall Accuracy",
            "value": f"{round(overall_accuracy)}%",
            "subtitle": f"{correct_answers} of {questions_attempted} correct",
            "badge": "+4.2%" if questions_attempted > 0 else "0%",
            "iconName": "Target",
            "valueColor": "text-indigo-400",
            "iconColor": "text-indigo-400"
        },
        {
            "title": "Improvement",
            "value": "+18%" if questions_attempted > 0 else "0%",
            "subtitle": "vs. last 7 days",
            "badge": "Steady progress",
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
            "value": str(mastered_count),
            "subtitle": f"of {total_count} total topics" if total_count > 0 else "0 total topics",
            "badge": "Keep learning!",
            "iconName": "BookOpen",
            "valueColor": "text-cyan-400",
            "iconColor": "text-cyan-400"
        }
    ]
    
    # 3. Compute subject mastery
    colors = ["from-indigo-500 to-violet-500", "from-purple-500 to-fuchsia-500", "from-cyan-500 to-sky-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500"]
    subj_topics = {}
    for p in all_perfs:
        subj = p.subject or "General"
        if subj not in subj_topics:
            subj_topics[subj] = []
        subj_topics[subj].append(p)
        
    mastery = []
    for idx, (subj, topics_list) in enumerate(subj_topics.items()):
        subj_accs = [p.accuracy or 0.0 for p in topics_list]
        avg_acc = sum(subj_accs) / len(subj_accs) if subj_accs else 0.0
        
        mastery.append({
            "id": subj.lower().replace(" ", "-"),
            "subject": subj,
            "iconName": "BookOpen" if idx % 2 == 0 else "Activity",
            "progress": round(avg_acc),
            "progressColor": colors[idx % len(colors)],
            "topics": [
                {
                    "name": p.topic,
                    "progress": round(p.accuracy or 0.0),
                    "status": "strong" if (p.accuracy or 0.0) >= 70 else "weak"
                }
                for p in topics_list
            ]
        })
        
    if not mastery:
        mastery = MAIN_DATA["mastery"]
        
    return {
        "stats": stats,
        "mastery": mastery,
        "trend": MAIN_DATA["trend"]
    }

