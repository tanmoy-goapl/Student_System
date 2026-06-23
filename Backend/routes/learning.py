import json
import logging
import os
import glob
import re
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from practice_models import TopicPerformance, LearningContent
from services.practice_engine import extract_topics_from_documents, generate_learning_content

router = APIRouter(prefix="/learning", tags=["learning"])
logger = logging.getLogger("chatbot")

@router.get("/data")
def get_learning_data(student_id: int = 1, topic: Optional[str] = None, subject: Optional[str] = None, roadmap_id: Optional[int] = None, source: Optional[str] = "courses", db: Session = Depends(get_db)):
    """Fetch dynamic learning data based on documents and curriculum."""
    
    # 1. Build Sidebar Data
    sidebar_data = []

    # 1c. Roadmap Tasks
    from roadmap_models import LearningRoadmap, DailyTask
    from sqlalchemy import desc
    if roadmap_id:
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == roadmap_id, LearningRoadmap.student_id == student_id).first()
    else:
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == student_id).order_by(desc(LearningRoadmap.created_at)).first()
    if roadmap:
        all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
        
        # Determine the lowest week number that has pending tasks
        active_week = 1
        pending_weeks = [t.week_number for t in all_tasks if t.status != "completed" and t.week_number is not None]
        if pending_weeks:
            active_week = min(pending_weeks)
        else:
            active_week = 9999 # All completed
            
        # Group tasks by week
        weeks = {}
        for t in all_tasks:
            wn = t.week_number or 1
            if wn not in weeks:
                weeks[wn] = []
            weeks[wn].append(t)
                
        subjects = []
        for wn in sorted(weeks.keys()):
            is_locked = wn > active_week
            status_text = "(Locked)" if is_locked else "(Unlocked)"
            
            topics_list = []
            # Sort by day number
            weeks[wn].sort(key=lambda x: x.day_number or 0)
            for t in weeks[wn]:
                day_title = t.topic
                if t.day_number:
                    if str(day_title).lower().startswith(f"day {t.day_number}:"):
                        day_title = str(day_title).replace(f":", " -", 1)
                    elif not str(day_title).lower().startswith("day"):
                        day_title = f"Day {t.day_number} - {t.topic}"
                topics_list.append({
                    "id": t.topic, 
                    "title": day_title, 
                    "locked": is_locked, 
                    "subtopics": t.subtopics if t.subtopics else []
                })
                
            subjects.append({
                "id": f"roadmap-week-{wn}",
                "title": f"Week {wn} {status_text}",
                "color": "#64748b" if is_locked else "#3b82f6",
                "topics": topics_list,
                "locked": is_locked
            })
            
        if subjects:
            sidebar_data.append({
                "id": "roadmap",
                "title": f"Roadmap: {roadmap.title}",
                "remark": "constructive",
                "subjects": subjects
            })
    
    # 1a. Document-derived topics
    try:
        topics_data = extract_topics_from_documents(student_id, db)
    except Exception as e:
        logger.warning(f"Failed to extract topics from documents: {e}")
        topics_data = {"subjects": []}
    doc_subjects = []
    colors = ["#a78bfa", "#f43f5e", "#14b8a6", "#f97316", "#3b82f6"]
    for idx, subj in enumerate(topics_data.get("subjects", [])):
        color = colors[idx % len(colors)]
        doc_subjects.append({
            "id": f"doc-{idx}",
            "title": subj.get("name", "Document"),
            "color": color,
            "topics": [
                {"id": t["name"], "title": t["name"]} 
                for t in subj.get("topics", [])
            ]
        })
        
    if doc_subjects:
        sidebar_data.append({
            "id": "documents",
            "title": "Your Uploaded Document Topics",
            "remark": "neutral",
            "subjects": doc_subjects
        })
        
    # 1b. Curriculum topics
    curriculum_subjects = []
    try:
        with open("config/default_curriculum.json", "r") as f:
            default_curr = json.load(f)
            
        subject_topics = {}
        try:
            with open("config/subject_topics.json", "r") as f:
                subject_topics = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load subject_topics: {e}")
            
        current_sem_num = default_curr.get("current_semester", 3)
        history_topics = []

        for sem in default_curr.get("semesters", []):
            sem_num_match = re.search(r'semester-(\d+)', sem["id"])
            sem_num = int(sem_num_match.group(1)) if sem_num_match else 1
            
            if sem_num > current_sem_num:
                # Hide future semesters
                continue

            topics_list = []
            subjects = sem.get("subjects", {})
            for subject_name, fallback_topics in subjects.items():
                # Use curated topics if available, else fallback
                actual_topics = subject_topics.get(subject_name, fallback_topics)
                topics_list.append({
                    "id": subject_name,
                    "title": subject_name,
                    "subtopics": actual_topics
                })
                
            if sem_num < current_sem_num:
                history_topics.extend(topics_list)
            else:
                curriculum_subjects.append({
                    "id": sem["id"],
                    "title": sem["title"],
                    "color": sem.get("color", "#14b8a6"),
                    "topics": topics_list
                })
                
        if history_topics:
            pass # Removed history topics based on user preference to only show current topics
    except Exception as e:
        logger.error(f"Failed to load curriculum: {e}")

    sidebar_data.append({
        "id": "curriculum",
        "title": "Your Course Curriculum",
        "remark": "neutral",
        "subjects": curriculum_subjects
    })
    
    # Select default topic if none provided
    selected_topic = topic
    
    if source == "courses" and selected_topic:
        topic_found = False
        for subj in curriculum_subjects:
            for t in subj.get("topics", []):
                if t["id"] == selected_topic or (t.get("subtopics") and selected_topic in t["subtopics"]):
                    topic_found = True
                    break
            if topic_found:
                break
        if not topic_found:
            selected_topic = None
            
    elif source == "personal" and selected_topic:
        topic_found = False
        roadmap_subjects = [c for c in sidebar_data if c["id"] == "roadmap"]
        if roadmap_subjects:
            for subj in roadmap_subjects[0].get("subjects", []):
                for t in subj.get("topics", []):
                    if t["id"] == selected_topic or (t.get("subtopics") and selected_topic in t["subtopics"]):
                        topic_found = True
                        break
                if topic_found:
                    break
        if not topic_found:
            selected_topic = None

    if not selected_topic:
        if source == "courses":
            if curriculum_subjects and curriculum_subjects[0].get("topics"):
                first_topic = curriculum_subjects[0]["topics"][0]
                if first_topic.get("subtopics"):
                    selected_topic = first_topic["subtopics"][0]
                else:
                    selected_topic = first_topic["id"]
        else:
            roadmap_subjects = [c for c in sidebar_data if c["id"] == "roadmap"]
            if roadmap_subjects and roadmap_subjects[0].get("subjects"):
                # Pick the first unlocked topic
                unlocked_subjects = [s for s in roadmap_subjects[0]["subjects"] if not s.get("topics", []) or not s.get("topics", [])[0].get("locked", False)]
                if unlocked_subjects and unlocked_subjects[0].get("topics"):
                    # If there are subtopics, pick the first subtopic, otherwise pick the topic
                    first_topic = unlocked_subjects[0]["topics"][0]
                    if first_topic.get("subtopics"):
                        selected_topic = first_topic["subtopics"][0]
                    else:
                        selected_topic = first_topic["id"]
                elif roadmap_subjects[0].get("subjects") and roadmap_subjects[0]["subjects"][0].get("topics"):
                    selected_topic = roadmap_subjects[0]["subjects"][0]["topics"][0]["id"]
                    
            if not selected_topic:
                if doc_subjects and doc_subjects[0].get("topics"):
                    selected_topic = doc_subjects[0]["topics"][0]["id"]
                elif curriculum_subjects and curriculum_subjects[0].get("topics"):
                    selected_topic = curriculum_subjects[0]["topics"][0]["id"]
        
        if not selected_topic:
            selected_topic = "General Topic"
            
    # 2. Get Performance Data for Header and Right Sidebar
    perf = db.query(TopicPerformance).filter_by(student_id=student_id, topic=selected_topic).first()
    
    accuracy = round(perf.accuracy, 1) if perf else 0.0
    difficulty = (perf.current_difficulty.capitalize()) if perf else "Mixed"
    total_attempts = perf.total_attempts if perf else 0
    if perf:
        from services.practice_engine import get_mastery_level
        mastery = get_mastery_level(perf.accuracy, perf.total_attempts)
    else:
        mastery = "weak"
    
    # Check if this topic is completed in the roadmap (checking parent topic or checking subtopics list)
    is_completed = False
    if roadmap:
        from roadmap_models import DailyTask
        task = None
        all_tasks = db.query(DailyTask).filter(
            DailyTask.roadmap_id == roadmap.id
        ).all()
        for t in all_tasks:
            if t.topic == selected_topic:
                task = t
                break
            if t.subtopics and isinstance(t.subtopics, list) and selected_topic in t.subtopics:
                task = t
                break
        if task and task.status == "completed":
            is_completed = True
    
    header_response = {
        "success": True,
        "data": {
            "category": "Topic",
            "status": f"{mastery.capitalize()} Topic",
            "is_completed": is_completed,
            "title": selected_topic,
            "subtitle": "Learning Mode",
            "stats": [
                {
                    "label": "Difficulty",
                    "value": difficulty,
                    "valueColor": "text-amber-400" if difficulty == "Hard" else "text-cyan-400",
                },
                {
                    "label": "Attempts",
                    "value": str(total_attempts),
                    "valueColor": "text-purple-400",
                },
                {
                    "label": "Accuracy",
                    "value": f"{accuracy}%",
                    "valueColor": "text-rose-400" if accuracy < 50 else "text-green-400",
                },
            ],
        },
    }
    
    right_sidebar_data = {
        "success": True,
        "data": {
            "understandingLevel": {
                "mainPercentage": accuracy,
                "status": mastery,
                "skillBreakdown": [
                    {"id": "conceptual", "label": "Conceptual", "percentage": accuracy, "color": "#a78bfa"},
                    {"id": "problem-solving", "label": "Problem Solving", "percentage": accuracy * 0.8, "color": "#f87171"},
                ],
                "baselineText": f"Based on {total_attempts} practice attempts",
            },
            "commonMistakes": {
                "mistakes": [
                    {"id": "m1", "text": "Review fundamentals for better accuracy.", "severity": "medium"}
                ],
            },
            "aiSuggestions": {
                "suggestions": [
                    {"id": "s1", "label": f"Practice {selected_topic}", "iconName": "BookOpen", "color": "indigo"},
                    {"id": "s2", "label": "Take a short quiz", "iconName": "Zap", "color": "amber"},
                ],
            },
            "relatedDocuments": {
                "documents": [
                    {"id": "d1", "title": "Reference Material", "type": "pdf", "iconName": "FileText"}
                ],
            },
            "timeSpent": {
                "metrics": [
                    {"id": "t1", "label": "Attempts", "value": str(total_attempts), "color": "text-blue-400"},
                ],
                "comparison": {"value": "", "trend": "neutral", "text": "Start practicing to see trends"},
            },
        },
    }
    
    # Check cache first for immediate return
    cached_content = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == selected_topic
    ).first()

    if cached_content and "could not be generated" not in str(cached_content.content):
        logger.info(f"CACHE HIT (Fast Return): topic='{selected_topic}', subject='{subject}'")
        notes_response = {
            "success": True,
            "generatedBy": "AI Assistant (Cached)",
            "status": "Personal Study Guide",
            "topic": selected_topic,
            "content": cached_content.content
        }
    else:
        notes_response = {
            "success": True,
            "generatedBy": "AI Assistant",
            "status": "Loading content...",
            "topic": selected_topic,
            "content": []
        }
    
    learning_assistant_response = {
        "success": True,
        "data": {
            "revision": {"title": "Quick Revision", "points": []},
            "actions": [
                {"id": 'simpler', "label": 'Explain Simpler', "iconName": 'Lightbulb', "variant": 'primary'},
                {"id": 'example', "label": 'Give Example', "iconName": 'FlaskConical', "variant": 'cyan'},
                {"id": 'summary', "label": 'Summarize', "iconName": 'FileText', "variant": 'purple'},
            ],
            "relatedConcepts": [
                {"id": '1', "label": "Practice makes perfect"},
            ],
            "learningActions": [
                {"id": 'practice_topic', "label": 'Practice Topic', "subLabel": 'Solve problems', "iconName": 'Pen', "variant": 'neutral'},
            ]
        },
    }

    return {
        "sidebarData": sidebar_data,
        "notesResponse": notes_response,
        "headerResponse": header_response,
        "learningAssistantResponse": learning_assistant_response,
        "rightSidebarData": right_sidebar_data,
        "selectedTopic": selected_topic
    }

@router.get("/content")
def get_learning_content(student_id: int = 1, topic: Optional[str] = None, subject: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch ONLY the generated LLM content for a topic (which may be slow if not cached)."""
    if not topic:
        return {"notesResponse": [], "revision": {}}
        
    if subject == "undefined" or subject == "null":
        subject = None
        
    # Check cache first
    cached = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == topic
    ).first()
    
    if cached:
        # Prevent poison cache: if it contains our error string, ignore it and regenerate
        cached_str = str(cached.content)
        if "could not be generated" not in cached_str:
            logger.info(f"CACHE HIT: topic='{topic}', subject='{subject}'")
            return {
                "notesResponse": {
                    "success": True,
                    "generatedBy": "AI Assistant (Cached)",
                    "status": "Personal Study Guide",
                    "topic": topic,
                    "content": cached.content
                },
                "revision": cached.revision
            }
        
    # Generate content if not cached
    content_data = generate_learning_content(student_id, topic, db, subject=subject)
    
    # Save to cache
    logger.info(f"CACHE MISS: topic='{topic}', subject='{subject}'")
    if "could not be generated" not in str(content_data["notesResponse"]):
        new_cache = LearningContent(
            student_id=student_id,
            subject=subject,
            topic=topic,
            content=content_data["notesResponse"],
            revision=content_data["revision"]
        )
        db.add(new_cache)
        db.commit()
    
    return {
        "notesResponse": {
            "success": True,
            "generatedBy": "AI Assistant",
            "status": "Personal Study Guide",
            "topic": topic,
            "content": content_data["notesResponse"]
        },
        "revision": content_data["revision"]
    }
