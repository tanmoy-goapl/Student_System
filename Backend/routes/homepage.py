from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db

from services.homepage_engine import (
    calculate_exam_readiness,
    calculate_dashboard_health,
    calculate_weak_topics,
    calculate_study_streak,
    calculate_topics_covered,
    generate_study_plan,
    generate_ai_alerts,
    generate_adaptive_engine,
    generate_suggested_next,
    calculate_revision_queue,
    calculate_focus_score,
    calculate_pending_dues,
    calculate_todays_focus
)
from services.recommendation_engine import get_behavioral_insights

router = APIRouter(prefix="/homepage", tags=["homepage"])


@router.get("/data")
async def get_homepage_data(student_id: int | None = None, db: Session = Depends(get_db)):
    if not student_id:
        # Default fallback / mock student id if not supplied
        student_id = 3

    # Calculate all metrics dynamically
    readiness_data = calculate_exam_readiness(student_id, db)
    health = calculate_dashboard_health(readiness_data["readiness_percentage"])
    streak_data = calculate_study_streak(student_id, db)
    covered_data = calculate_topics_covered(student_id, db)
    study_plan = generate_study_plan(student_id, db)
    alerts = generate_ai_alerts(student_id, db)
    behavioral_insights = get_behavioral_insights(student_id, db)
    revision_queue = calculate_revision_queue(student_id, db)
    focus_score = calculate_focus_score(student_id, db)
    adaptive_engine = generate_adaptive_engine(student_id, db)
    suggested_next = generate_suggested_next(student_id, db)

    # New planner mode computations
    pending_dues = calculate_pending_dues(student_id, db)
    todays_focus = calculate_todays_focus(student_id, db)

    # Health color mapping for Readiness
    readiness_color_map = {
        "GREEN": "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
        "YELLOW": "text-amber-400 bg-amber-500/10 border border-amber-500/20",
        "RED": "text-rose-400 bg-rose-500/10 border border-rose-500/20"
    }
    readiness_class = readiness_color_map.get(health, readiness_color_map["RED"])

    # Days remaining calculation
    days_left = 12
    if days_left < 7:
        days_color = "text-rose-400 bg-rose-500/10 border border-rose-500/20"
    elif days_left < 15:
        days_color = "text-amber-400 bg-amber-500/10 border border-amber-500/20"
    else:
        days_color = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"

    # 1. Exam Overview Metrics
    exam_overview = [
        {
            "id": "readiness",
            "title": "Exam Readiness",
            "value": f"{readiness_data['readiness_percentage']}%",
            "subtitle": f"+ {readiness_data['weekly_change']}% this week",
            "iconName": "Target",
            "iconClassName": readiness_class,
        },
        {
            "id": "pending-dues",
            "title": "Pending Dues",
            "value": f"{pending_dues['total']} Pending",
            "subtitle": f"{pending_dues['revision_due']} Revisions, {pending_dues['quiz_due']} Quiz Due",
            "iconName": "TriangleAlert",
            "iconClassName": "text-rose-400 bg-rose-500/10 border border-rose-500/20",
        },
        {
            "id": "days-left",
            "title": "Days to Exam",
            "value": f"{days_left}",
            "subtitle": "Semester Exam",
            "iconName": "CalendarDays",
            "iconClassName": days_color,
        }
    ]

    # 2. Mentor Card (recommends highest priority Suggested Next action)
    mentor_card = {
        "title": "Today's Focus",
        "message": f"Revise {todays_focus['topic']}",
        "primaryAction": "Start Session",
        "secondaryAction": "See Plan",
        "recommended_topic": todays_focus["topic"],
        "action_url": f"/practice?topic={todays_focus['topic']}"
    }

    # 3. Performance Snapshots
    from practice_models import UserPerformance
    perf = db.query(UserPerformance).filter(UserPerformance.student_id == student_id).first()
    accuracy = round(perf.lifetime_accuracy) if perf else 0

    performance_snapshots = [
        {
            "id": "overall-accuracy",
            "title": "Overall Accuracy",
            "value": f"{accuracy}%",
            "subtitle": "Lifetime accuracy",
            "iconName": "Target",
            "iconClassName": "text-violet-300 bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]",
            "valueClassName": "text-violet-200",
            "cardClassName": "border-violet-500/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0F1020] to-[#090B1A]"
        },
        {
            "id": "study-streak",
            "title": "Study Streak",
            "value": f"{streak_data['current_streak']} Days",
            "subtitle": f"Personal best: {streak_data['best_streak']} days",
            "iconName": "Flame",
            "iconClassName": "text-orange-300 bg-orange-500/10 border border-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.15)]",
            "valueClassName": "text-orange-200",
            "cardClassName": "border-orange-500/10 bg-gradient-to-br from-orange-500/[0.08] via-[#0F1020] to-[#090B1A]"
        },
        {
            "id": "topics-covered",
            "title": "Topics Covered",
            "value": f"{covered_data['covered_topics']} / {covered_data['total_topics']}",
            "subtitle": f"Syllabus attempted: {covered_data['exposure']}%",
            "iconName": "BookOpenText",
            "iconClassName": "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
            "valueClassName": "text-cyan-200",
            "cardClassName": "border-cyan-500/10 bg-gradient-to-br from-cyan-500/[0.08] via-[#0F1020] to-[#090B1A]"
        },
        {
            "id": "focus-score",
            "title": "Focus Score",
            "value": f"{focus_score}",
            "subtitle": "Recent activity index",
            "iconName": "Activity",
            "iconClassName": "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
            "valueClassName": "text-emerald-200",
            "cardClassName": "border-emerald-500/10 bg-gradient-to-br from-[#10B981]/[0.08] via-[#0F1020] to-[#090B1A]"
        }
    ]

    # Map alerts icons
    mapped_alerts = []
    icon_map = {
        "Study Gap Warning": "RefreshCcw",
        "Confidence Drop": "LineChart",
        "Revision Overdue": "RefreshCcw",
        "Weak Topic Overload": "TriangleAlert",
        "Upcoming Semester Exam": "Calendar"
    }
    for a in alerts:
        # Match prefix or title
        icon_name = "Calendar"
        for k, v in icon_map.items():
            if k in a["title"]:
                icon_name = v
                break
        mapped_alerts.append({
            "id": a["title"].lower().replace(" ", "-"),
            "title": a["title"],
            "subtitle": a["description"],
            "iconName": icon_name,
            "remark": "weak" if a["severity"] == "high" else ("medium" if a["severity"] == "medium" else "neutral")
        })

    return {
        "examOverview": exam_overview,
        "mentorCard": mentor_card,
        "studyPlan": {
            "totalSessions": len(study_plan),
            "sessions": [
                {
                    "id": s["topic"].lower().replace(" ", "-"),
                    "topic": s["topic"],
                    "title": f"{s['topic']} ({s['duration']})",
                    "time": s["reason"],
                    "duration": s["duration"],
                    "tag": s["subject"],
                    "tagColor": "violet",
                    "completed": False
                } for s in study_plan
            ]
        },
        "performanceSnapshots": performance_snapshots,
        "aiAlerts": mapped_alerts,
        "aiBehavioralInsights": behavioral_insights,
        "revisionQueue": revision_queue,
        "adaptiveEngine": adaptive_engine,
        "dashboard_health": health,
        "pending_dues": pending_dues,
        "todays_focus": todays_focus
    }

@router.get("/ai-actions")
def get_ai_actions(student_id: int | None = None, db: Session = Depends(get_db)):
    if not student_id:
        student_id = 3
    suggested = generate_suggested_next(student_id, db)
    
    icon_map = {
        "Continue Practice": "Play",
        "Review Mistakes": "Target",
        "Learn Topic": "NotebookPen",
        "Take Quiz": "RefreshCw"
    }
    colors = {
        "Continue Practice": {"icon": "text-violet-400 bg-violet-500/10 border border-violet-500/20", "card": "from-[#171B4B] via-[#10153A] to-[#0B102B] border-violet-500/20"},
        "Review Mistakes": {"icon": "text-rose-400 bg-rose-500/10 border border-rose-500/20", "card": "from-[#3A1320] via-[#24111D] to-[#151019] border-rose-500/20"},
        "Learn Topic": {"icon": "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20", "card": "from-[#062A3B] via-[#071F2D] to-[#081722] border-cyan-500/20"},
        "Take Quiz": {"icon": "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20", "card": "from-[#0E3324] via-[#0B241B] to-[#081A14] border-emerald-500/20"}
    }
    
    mapped_actions = []
    for s in suggested:
        c = colors.get(s["title"], colors["Take Quiz"])
        mapped_actions.append({
            "id": s["title"].lower().replace(" ", "-"),
            "title": s["title"],
            "subtitle": f"{s['topic']} ({s['reason']})",
            "action": "Go",
            "iconName": icon_map.get(s["title"], "RefreshCw"),
            "iconClassName": c["icon"],
            "cardClassName": c["card"]
        })
        
    return mapped_actions

@router.get("/debug/{student_id}")
def get_homepage_debug(student_id: int, db: Session = Depends(get_db)):
    readiness_data = calculate_exam_readiness(student_id, db)
    health = calculate_dashboard_health(readiness_data["readiness_percentage"])
    weak_data = calculate_weak_topics(student_id, db)
    streak_data = calculate_study_streak(student_id, db)
    covered_data = calculate_topics_covered(student_id, db)
    study_plan = generate_study_plan(student_id, db)
    alerts = generate_ai_alerts(student_id, db)
    behavioral_insights = get_behavioral_insights(student_id, db)
    revision_queue = calculate_revision_queue(student_id, db)
    focus_score = calculate_focus_score(student_id, db)
    adaptive_engine = generate_adaptive_engine(student_id, db)
    suggested_next = generate_suggested_next(student_id, db)
    
    return {
        "exam_readiness": readiness_data,
        "dashboard_health": health,
        "streak": streak_data,
        "alerts": alerts,
        "weak_topics": weak_data,
        "study_plan": study_plan,
        "revision_queue": revision_queue,
        "focus_score": focus_score,
        "adaptive_engine": adaptive_engine,
        "suggested_next": suggested_next,
        "behavioral_insights": behavioral_insights
    }
