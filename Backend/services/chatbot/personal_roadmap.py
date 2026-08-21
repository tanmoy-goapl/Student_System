import logging
from sqlalchemy.orm import Session

from roadmap_models import LearnerPreferences, UserGoal

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
    """Start the same background roadmap flow used by the direct dashboard."""
    return start_personalized_roadmap_generation(student_id, db)

def start_personalized_roadmap_generation(student_id: int, db: Session) -> dict:
    """Create the goal immediately and finish the expensive roadmap work in a worker."""
    prefs = get_learner_preferences(student_id, db)
    if not prefs:
        return {"content": "Preferences not found. Please setup preferences first."}

    duration_map = {
        "1 week": "1 week",
        "1 month": "4 weeks",
        "2 months": "8 weeks",
        "3 months": "12 weeks",
    }
    duration_str = duration_map.get(str(prefs.time_frame).lower(), "6 weeks")
    goal_title = str(prefs.goal or "Personal learning").strip()
    profile_context = (
        f"Requested learning focus: {prefs.goal}\n"
        f"Available time: {prefs.time_frame}\n"
        f"Current proficiency: {prefs.proficiency}\n"
        f"Daily study time: {prefs.daily_time}\n"
        f"Learning style: {prefs.learning_style}\n"
        f"Use uploaded documents: {prefs.use_documents}\n"
    )
    use_documents_requested = str(prefs.use_documents or "").lower() not in {"no", "none"}

    goal_record = UserGoal(
        student_id=student_id,
        goal_type="custom",
        title=f"{goal_title} Roadmap",
        description=profile_context,
        status="generating",
    )
    db.add(goal_record)
    db.commit()
    db.refresh(goal_record)

    from database import SessionLocal
    from services.roadmap.roadmap_engine import (
        build_student_document_context,
        generate_roadmap_from_llm,
        persist_generated_roadmap,
    )
    import threading

    goal_id = goal_record.id

    def bg_task():
        bg_db = SessionLocal()
        try:
            use_documents = use_documents_requested
            material_context = (
                build_student_document_context(student_id, bg_db, focus_topic=goal_title)
                if use_documents else ""
            )
            roadmap_json = generate_roadmap_from_llm(
                goal_title,
                duration_str,
                material_context,
                profile_context,
            )
            persist_generated_roadmap(bg_db, student_id, goal_id, roadmap_json)
            logger.info("[PersonalRoadmap] Background roadmap completed for student %s", student_id)
        except Exception as exc:
            logger.error("[PersonalRoadmap] Background roadmap failed: %s", exc, exc_info=True)
            failed_goal = bg_db.query(UserGoal).filter(UserGoal.id == goal_id).first()
            if failed_goal:
                failed_goal.status = "failed"
                bg_db.commit()
        finally:
            bg_db.close()

    threading.Thread(target=bg_task, daemon=True).start()

    return {
        "content": (
            f"### 🚀 Roadmap generation started\n\n"
            f"**{goal_title}** is being built in the background using your learning preferences"
            f" and the requested timeframe ({prefs.time_frame}).\n\n"
            "You can continue using Mentor AI. The completed roadmap will appear in your Personal Dashboard."
        ),
        "intent": "ROADMAP_CREATION",
        "roadmap_metadata": {
            "title": f"{goal_title} Roadmap",
            "duration": prefs.time_frame,
            "weeks": 0,
            "tasks": 0,
            "status": "generating",
        },
    }
