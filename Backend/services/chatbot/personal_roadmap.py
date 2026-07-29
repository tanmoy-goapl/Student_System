import json
import logging
import re
from datetime import datetime
from sqlalchemy.orm import Session

from models import User, ChatMessage, Document
from roadmap_models import LearnerPreferences, UserGoal, LearningRoadmap, DailyTask
from services.roadmap.roadmap_engine import _roadmap_llm_call, _balance_json, _fallback_roadmap

logger = logging.getLogger(__name__)

# Onboarding steps definition
ONBOARDING_STEPS = [
    {
        "field": "goal",
        "question": "What is your goal?",
        "options": [
            "Semester Study",
            "Placement / Interview",
            "Competitive Exam",
            "Learn a New Skill",
            "Build Projects"
        ]
    },
    {
        "field": "time_frame",
        "question": "How much time do you have?",
        "options": [
            "1 Week",
            "1 Month",
            "2 Months",
            "3 Months",
            "Custom"
        ]
    },
    {
        "field": "proficiency",
        "question": "What is your current proficiency?",
        "options": [
            "Beginner",
            "Basic",
            "Intermediate",
            "Advanced"
        ]
    },
    {
        "field": "daily_time",
        "question": "How much time can you study every day?",
        "options": [
            "30 mins",
            "1 hour",
            "2 hours",
            "3+ hours"
        ]
    },
    {
        "field": "learning_style",
        "question": "How do you prefer learning?",
        "options": [
            "Theory",
            "Practical",
            "Visual",
            "Mixed"
        ]
    },
    {
        "field": "use_documents",
        "question": "Should I use your uploaded documents while creating your roadmap?",
        "options": [
            "Yes",
            "No",
            "Only Uploaded Notes"
        ]
    }
]

def get_learner_preferences(student_id: int, db: Session) -> LearnerPreferences:
    return db.query(LearnerPreferences).filter(LearnerPreferences.student_id == student_id).first()

def reset_learner_preferences(student_id: int, db: Session):
    prefs = get_learner_preferences(student_id, db)
    if not prefs:
        prefs = LearnerPreferences(student_id=student_id)
        db.add(prefs)
    
    prefs.goal = None
    prefs.time_frame = None
    prefs.proficiency = None
    prefs.daily_time = None
    prefs.learning_style = None
    prefs.use_documents = None
    prefs.onboarding_active = True
    db.commit()
    return prefs

def is_onboarding_active(student_id: int, db: Session) -> bool:
    prefs = get_learner_preferences(student_id, db)
    return prefs is not None and prefs.onboarding_active

def handle_preferences_onboarding(student_id: int, message: str, db: Session) -> dict:
    prefs = get_learner_preferences(student_id, db)
    if not prefs:
        prefs = LearnerPreferences(student_id=student_id, onboarding_active=True)
        db.add(prefs)
        db.commit()

    message_clean = message.strip()
    
    if message_clean.lower() != "update learning preferences" and message_clean.lower() != "create a personalized roadmap":
        # Save the answer to the first empty field
        for step in ONBOARDING_STEPS:
            field = step["field"]
            if getattr(prefs, field) is None:
                setattr(prefs, field, message_clean)
                db.commit()
                break

    # Re-evaluate empty fields
    next_step = None
    for step in ONBOARDING_STEPS:
        field = step["field"]
        if getattr(prefs, field) is None:
            next_step = step
            break

    if next_step:
        return {
            "content": f"📝 **Learning Setup ({ONBOARDING_STEPS.index(next_step) + 1}/6)**\n\n{next_step['question']}",
            "options": next_step["options"]
        }
    else:
        summary = (
            f"### 📋 Learning Preferences Summary\n\n"
            f"• **Goal:** {prefs.goal}\n"
            f"• **Timeline:** {prefs.time_frame}\n"
            f"• **Level:** {prefs.proficiency}\n"
            f"• **Study Time:** {prefs.daily_time}\n"
            f"• **Learning Style:** {prefs.learning_style}\n"
            f"• **Use Documents:** {prefs.use_documents}\n\n"
            f"Everything looks good. Shall I generate your personalized roadmap?"
        )
        return {
            "content": summary,
            "options": ["Generate Roadmap", "Edit Answers"]
        }

def generate_personalized_roadmap(student_id: int, db: Session) -> dict:
    prefs = get_learner_preferences(student_id, db)
    if not prefs:
        return {"content": "Preferences not found. Please setup preferences first."}

    # Fetch uploaded docs
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    doc_list = ", ".join([d.filename for d in docs]) if docs else "None uploaded"

    # Define durations
    duration_map = {
        "1 week": "1 week",
        "1 month": "4 weeks",
        "2 months": "8 weeks",
        "3 months": "12 weeks"
    }
    duration_str = duration_map.get(str(prefs.time_frame).lower(), "6 weeks")

    system_prompt = f"""You are an expert curriculum designer. Create a highly personalized learning roadmap.
    
    Student Profile:
    - Goal: {prefs.goal}
    - Available Time: {prefs.time_frame}
    - Current Proficiency: {prefs.proficiency}
    - Study Time Daily: {prefs.daily_time}
    - Learning Style: {prefs.learning_style}
    - Integrated Documents: {prefs.use_documents} (Available: {doc_list})
    
    Adapt the language, descriptions, and pace to match a student with "{prefs.proficiency}" level.
    If the goal is placement or interview-focused, make it rigorous and include technical topics, DS&A, and system design.
    
    You MUST generate exactly the number of weeks corresponding to the duration ({duration_str}).
    Provide exactly 5 achievable learning units (Days) for each week.
    
    Output strictly in the following JSON format without Markdown formatting or code blocks.
    CRITICAL JSON RULES:
    1. DO NOT add any comments (// or /*).
    2. ALL keys MUST be enclosed in double quotes (").
    3. Use ONLY double quotes ("), never single quotes (').
    
    {{
        "title": "Catchy Roadmap Title matching Student's Goal",
        "weeks": [
            {{
                "week_number": 1,
                "focus_area": "Focus Area Title",
                "days": [
                    {{"day_number": 1, "topic": "Day 1: Topic Name", "description": "Topic description...", "subtopics": ["Subtopic 1", "Subtopic 2"]}},
                    ...
                ]
            }}
        ]
    }}
    """

    user_prompt = f"Goal: {prefs.goal}. Keep descriptions brief to fit complete JSON."
    
    logger.info(f"[PersonalRoadmap] Generating personalized roadmap for student {student_id}")
    content = _roadmap_llm_call(system_prompt, user_prompt)
    
    if not content:
        roadmap_json = _fallback_roadmap("LLM call returned empty response")
    else:
        try:
            content_str = content.strip()
            if content_str.startswith("```json"):
                content_str = content_str[7:]
            elif content_str.startswith("```"):
                content_str = content_str[3:]
            if content_str.endswith("```"):
                content_str = content_str[:-3]
            content_str = _balance_json(content_str.strip())
            roadmap_json = json.loads(content_str)
            if not isinstance(roadmap_json, dict):
                roadmap_json = _fallback_roadmap(f"Parsed object type was {type(roadmap_json).__name__}, expected dictionary.")
        except Exception as e:
            logger.error(f"[PersonalRoadmap] Failed to parse roadmap JSON: {e}")
            roadmap_json = _fallback_roadmap(str(e))

    # Save to Database
    title = roadmap_json.get("title") or f"Roadmap for {prefs.goal}"
    goal_record = UserGoal(
        student_id=student_id,
        goal_type="custom",
        title=title,
        description=f"Personalized: Goal={prefs.goal}, Proficiency={prefs.proficiency}, Style={prefs.learning_style}"
    )
    db.add(goal_record)
    db.commit()
    db.refresh(goal_record)

    weeks = roadmap_json.get("weeks") or []
    tasks_count = sum(len((w.get("days") or []) if isinstance(w, dict) else []) for w in weeks)

    roadmap = LearningRoadmap(
        student_id=student_id,
        goal_id=goal_record.id,
        title=title,
        roadmap_data=roadmap_json
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    for week in weeks:
        if not isinstance(week, dict):
            continue
        wn = week.get("week_number", 1)
        days = week.get("days") or []
        for day in days:
            if not isinstance(day, dict):
                continue
            db.add(DailyTask(
                roadmap_id=roadmap.id,
                task_type="learning",
                topic=day.get("topic", f"Day {day.get('day_number', 1)}"),
                description=day.get("description", ""),
                assigned_date=datetime.utcnow(),
                week_number=wn,
                day_number=day.get("day_number", 1),
                subtopics=day.get("subtopics") or []
            ))
    db.commit()

    success_msg = (
        f"### 🚀 Personalized Roadmap Created Successfully!\n\n"
        f"**{title}**\n\n"
        f"Based on your preferences:\n"
        f"- **Goal:** {prefs.goal}\n"
        f"- **Duration:** {len(weeks)} weeks ({prefs.time_frame})\n"
        f"- **Proficiency:** {prefs.proficiency}\n"
        f"- **Daily Time:** {prefs.daily_time}\n"
        f"- **Learning Style:** {prefs.learning_style}\n\n"
        f"Click below to open your personalized roadmap dashboard."
    )

    return {
        "content": success_msg,
        "intent": "ROADMAP_CREATION",
        "roadmap_metadata": {
            "title": title,
            "duration": prefs.time_frame,
            "weeks": len(weeks),
            "tasks": tasks_count
        }
    }
