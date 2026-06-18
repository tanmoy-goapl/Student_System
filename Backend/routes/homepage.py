from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import copy

router = APIRouter(prefix="/homepage", tags=["homepage"])

HOMEPAGE_DATA = {
    "examOverview": [
        {
            "id": "readiness",
            "title": "Exam Readiness",
            "value": "62%",
            "subtitle": "+ 4% this week",
            "iconName": "Target",
            "iconClassName": "text-violet-400 bg-violet-500/10 border border-violet-500/20",
        },
        {
            "id": "weak-topics",
            "title": "Weak Topics",
            "value": "7",
            "subtitle": "3 critical",
            "iconName": "TriangleAlert",
            "iconClassName": "text-amber-400 bg-amber-500/10 border border-amber-500/20",
        },
        {
            "id": "days-left",
            "title": "Days to Exam",
            "value": "12",
            "subtitle": "JEE Main 2025",
            "iconName": "CalendarDays",
            "iconClassName": "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
        }
    ],
    "mentorCard": {
        "title": "Mentor AI • Now",
        "message": "You need to focus on Wave Optics and Calculus today. These are your two most critical weak areas before the exam.",
        "primaryAction": "Start Focus Session",
        "secondaryAction": "See Full Plan",
        "logo": "mentor-logo.png"
    },
    "weaknessMap": {
        "subjects": [
            {
                "id": "physics",
                "subject": "Physics",
                "color": "violet",
                "expanded": True,
                "topics": [
                    {"id": "wave-optics", "name": "Wave Optics", "strength": "weak"},
                    {"id": "electrostatics", "name": "Electrostatics", "strength": "weak"},
                    {"id": "current-electricity", "name": "Current Electricity", "strength": "medium"},
                    {"id": "mechanics", "name": "Mechanics", "strength": "strong"},
                    {"id": "thermodynamics", "name": "Thermodynamics", "strength": "medium"}
                ]
            },
            {
                "id": "mathematics",
                "subject": "Mathematics",
                "color": "violet",
                "expanded": False,
                "topics": [
                    {"id": "limits-derivatives", "name": "Limits & Derivatives", "strength": "weak"},
                    {"id": "integration", "name": "Integration", "strength": "weak"},
                    {"id": "vectors-3d", "name": "Vectors & 3D", "strength": "medium"},
                    {"id": "probability", "name": "Probability", "strength": "strong"},
                    {"id": "matrices", "name": "Matrices", "strength": "medium"}
                ]
            },
            {
                "id": "chemistry",
                "subject": "Chemistry",
                "color": "cyan",
                "expanded": False,
                "topics": [
                    {"id": "organic-reactions", "name": "Organic Reactions", "strength": "weak"},
                    {"id": "chemical-bonding", "name": "Chemical Bonding", "strength": "medium"},
                    {"id": "coordination-compounds", "name": "Coordination Compounds", "strength": "weak"},
                    {"id": "thermochemistry", "name": "Thermochemistry", "strength": "strong"},
                    {"id": "periodic-table", "name": "Periodic Table", "strength": "strong"}
                ]
            }
        ]
    },
    "studyPlan": {
        "totalSessions": 3,
        "sessions": [
            {
                "id": "wave-optics",
                "title": "Wave Optics – Interference",
                "time": "9:00 AM",
                "duration": "45 min",
                "tag": "Physics",
                "tagColor": "violet",
                "completed": False
            },
            {
                "id": "limits-derivatives",
                "title": "Limits & Derivatives",
                "time": "10:00 AM",
                "duration": "40 min",
                "tag": "Calculus",
                "tagColor": "violet",
                "completed": False
            },
            {
                "id": "organic-reactions",
                "title": "Organic Chemistry — Reactions",
                "time": "11:00 AM",
                "duration": "35 min",
                "tag": "Chemistry",
                "tagColor": "emerald",
                "completed": True
            }
        ]
    },
    "performanceSnapshots": [
        {
            "id": "overall-accuracy",
            "title": "Overall Accuracy",
            "value": "67%",
            "subtitle": "+3% improvement this week",
            "iconName": "Target",
            "iconClassName": "text-violet-300 bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]",
            "valueClassName": "text-violet-200",
            "cardClassName": "border-violet-500/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0F1020] to-[#090B1A]"
        },
        {
            "id": "study-streak",
            "title": "Study Streak",
            "value": "9 Days",
            "subtitle": "Personal best: 14 days",
            "iconName": "Flame",
            "iconClassName": "text-orange-300 bg-orange-500/10 border border-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.15)]",
            "valueClassName": "text-orange-200",
            "cardClassName": "border-orange-500/10 bg-gradient-to-br from-orange-500/[0.08] via-[#0F1020] to-[#090B1A]"
        },
        {
            "id": "topics-covered",
            "title": "Topics Covered",
            "value": "34 / 72",
            "subtitle": "Physics: 12 · Math: 15 · Chem: 7",
            "iconName": "BookOpenText",
            "iconClassName": "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
            "valueClassName": "text-cyan-200",
            "cardClassName": "border-cyan-500/10 bg-gradient-to-br from-cyan-500/[0.08] via-[#0F1020] to-[#090B1A]"
        },
        {
            "id": "badges-earned",
            "title": "Badges Earned",
            "value": "12",
            "subtitle": "2 new achievements unlocked",
            "iconName": "Trophy",
            "iconClassName": "text-amber-300 bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.15)]",
            "valueClassName": "text-amber-200",
            "cardClassName": "border-amber-500/10 bg-gradient-to-br from-amber-500/[0.08] via-[#0F1020] to-[#090B1A]"
        }
    ],
    "aiAlerts": [
        {
            "id": "revision-overdue",
            "title": "Revision Overdue",
            "subtitle": "You haven't revised Wave Optics in 3 days. Risk of forgetting is high.",
            "iconName": "RefreshCcw",
            "remark": "medium"
        },
        {
            "id": "accuracy-drop",
            "title": "Accuracy Drop Detected",
            "subtitle": "Your accuracy in Calculus dropped from 74% to 58% this week.",
            "iconName": "LineChart",
            "remark": "weak"
        },
        {
            "id": "exam-reminder",
            "title": "Exam in 12 Days",
            "subtitle": "Only 3 of 7 weak topics have been addressed. Accelerate your pace.",
            "iconName": "Calendar",
            "remark": "neutral"
        }
    ]
}

@router.get("/data")
async def get_homepage_data(student_id: int | None = None, db: Session = Depends(get_db)):
    from practice_models import UserPerformance
    data = copy.deepcopy(HOMEPAGE_DATA)
    if student_id:
        perf = db.query(UserPerformance).filter(UserPerformance.student_id == student_id).first()
        
        accuracy = round(perf.lifetime_accuracy) if perf else 0
        streak = perf.current_streak if perf else 0
        badges = perf.badges_earned if perf else 0

        # Query distinct topics practiced by this student
        from practice_models import QuizHistory, CustomTopic
        from services.practice_engine import extract_topics_from_documents
        import json, os
        
        # 1. Get subjects & their topics (Always load both curriculum and document topics if present)
        topics_data = extract_topics_from_documents(student_id, db)
        subj_list = []
        
        if topics_data and topics_data.get("subjects"):
            for s in topics_data.get("subjects", []):
                subj_list.append({
                    "title": s["name"],
                    "topics": [t["name"] for t in s.get("topics", [])]
                })
        
        # Load 8-semester curriculum
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "config", "default_curriculum.json"
        )
        try:
            with open(config_path, "r") as f:
                curriculum_data = json.load(f)
            for sem in curriculum_data.get("semesters", []):
                subj_list.append({
                    "title": sem["title"],
                    "topics": sem.get("topics", [])
                })
        except Exception:
            pass  # No fallback if file fails
        
        # Merge custom topics
        custom_topics = db.query(CustomTopic).filter(CustomTopic.student_id == student_id).all()
        for ct in custom_topics:
            matched = False
            for s in subj_list:
                if s["title"].lower() == ct.subject_name.lower():
                    if ct.topic_name not in s["topics"]:
                        s["topics"].append(ct.topic_name)
                    matched = True
                    break
            if not matched:
                subj_list.append({
                    "title": ct.subject_name,
                    "topics": [ct.topic_name]
                })

        quiz_topics = db.query(QuizHistory.topic).filter(QuizHistory.student_id == student_id).distinct().all()
        practiced_set = {t[0] for t in quiz_topics if t[0]}

        total_topics_available = sum(len(s["topics"]) for s in subj_list)
        total_topics_practiced = len(practiced_set)

        breakdown_parts = []
        for s in subj_list:
            practiced_in_subj = sum(1 for t in s["topics"] if t in practiced_set)
            if practiced_in_subj > 0:
                short_name = s["title"]
                # Abbreviate semester titles
                if short_name.startswith("Semester"):
                    short_name = f"Sem {short_name.split()[-1]}"
                breakdown_parts.append(f"{short_name}: {practiced_in_subj}")

        breakdown_str = " · ".join(breakdown_parts[:4])
        
        for snap in data.get("performanceSnapshots", []):
            if snap["id"] == "overall-accuracy":
                snap["value"] = f"{accuracy}%"
                snap["subtitle"] = "Lifetime accuracy"
            elif snap["id"] == "study-streak":
                snap["value"] = f"{streak} Days"
                snap["subtitle"] = f"Personal best: {perf.longest_streak if perf else 0} days"
            elif snap["id"] == "topics-covered":
                snap["value"] = f"{total_topics_practiced} / {total_topics_available}"
                snap["subtitle"] = breakdown_str if breakdown_str else "No topics practiced yet"
            elif snap["id"] == "badges-earned":
                snap["value"] = f"{badges}"
                snap["subtitle"] = "Keep practicing to earn more"
                
    return data

AI_ACTIONS = [
    {
        "id": "resume-learning",
        "title": "Resume Learning",
        "subtitle": "Wave optics Ch.3",
        "action": "Go",
        "iconName": "Play",
        "iconClassName": "text-violet-400 bg-violet-500/10 border border-violet-500/20",
        "cardClassName": "from-[#171B4B] via-[#10153A] to-[#0B102B] border-violet-500/20",
    },
    {
        "id": "fix-weak-areas",
        "title": "Fix Weak Areas",
        "subtitle": "7 topics pending",
        "action": "Go",
        "iconName": "Target",
        "iconClassName": "text-rose-400 bg-rose-500/10 border border-rose-500/20",
        "cardClassName": "from-[#3A1320] via-[#24111D] to-[#151019] border-rose-500/20",
    },
    {
        "id": "practice-test",
        "title": "Take Practice Test",
        "subtitle": "Full mock – 3hr",
        "action": "Go",
        "iconName": "NotebookPen",
        "iconClassName": "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
        "cardClassName": "from-[#062A3B] via-[#071F2D] to-[#081722] border-cyan-500/20",
    },
    {
        "id": "quick-revision",
        "title": "Quick Revision",
        "subtitle": "Last 5 topics",
        "action": "Go",
        "iconName": "RefreshCw",
        "iconClassName": "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
        "cardClassName": "from-[#0E3324] via-[#0B241B] to-[#081A14] border-emerald-500/20",
    },
]

@router.get("/ai-actions")
def get_ai_actions():
    """Return the static AI Actions card data."""
    return AI_ACTIONS
