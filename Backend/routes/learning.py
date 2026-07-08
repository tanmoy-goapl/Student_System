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
def get_learning_data(student_id: int = 1, topic: Optional[str] = None, subject: Optional[str] = None, roadmap_id: Optional[int] = None, source: Optional[str] = "courses", class_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Fetch dynamic learning data based on documents and curriculum."""
    import json
    
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
                    day_title = f"Day {t.day_number}: {t.topic}"
                
                topics_list.append({
                    "id": t.topic,
                    "title": day_title,
                    "completed": t.status == "completed"
                })
            
            subjects.append({
                "id": f"week-{wn}",
                "title": f"Week {wn} {status_text}",
                "color": "#f97316", # orange
                "topics": topics_list
            })
            
        sidebar_data.append({
            "id": "roadmap",
            "title": "Your Learning Roadmap",
            "remark": "Recommended",
            "subjects": subjects
        })
    
    # 1a. Document-based topics
    from models import Document
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    
    # group topics by subject or source
    doc_subjects = []
    colors = ["#60a5fa", "#a78bfa", "#14b8a6", "#f97316", "#ec4899"]
    extracted = extract_topics_from_documents(student_id, db)
    for i, subj in enumerate(extracted.get("subjects", [])):
        color = colors[i % len(colors)]
        doc_subjects.append({
            "id": f"doc-subj-{i}",
            "title": subj.get("name", "Document Subject"),
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
    history_topics = []
    
    if class_id:
        from classroom_models import ClassCurriculum
        curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
        if curr and curr.curriculum_json:
            units = curr.curriculum_json.get("units", [])
            
            for i, unit in enumerate(units):
                color = colors[i % len(colors)]
                unit_topics = [{"id": t, "title": t} for t in unit.get("topics", [])]
                curriculum_subjects.append({
                    "id": f"unit-{i}",
                    "title": unit.get("title", f"Unit {i+1}"),
                    "color": color,
                    "topics": unit_topics
                })
    else:
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            default_curr_path = os.path.join(base_dir, "config", "default_curriculum.json")
            subject_topics_path = os.path.join(base_dir, "config", "subject_topics.json")
            
            with open(default_curr_path, "r") as f:
                default_curr = json.load(f)
                
            subject_topics = {}
            try:
                with open(subject_topics_path, "r") as f:
                    subject_topics = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load subject_topics: {e}")
                
            current_sem_num = default_curr.get("current_semester", 3)
            
            # 1. Load dynamic curriculums
            dynamic_subjects = set()
            if student_id:
                try:
                    from classroom_models import StudentClass, ClassCurriculum
                    enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
                    c_ids = [c.class_id for c in enrolled_classes]
                    if c_ids:
                        curriculums = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(c_ids)).all()
                        for curr in curriculums:
                            if curr.curriculum_json and "units" in curr.curriculum_json:
                                subject_name_curr = curr.subject_name or f"Class {curr.class_id}"
                                dynamic_subjects.add(subject_name_curr)
                                
                                subject_topic_items = []
                                for unit in curr.curriculum_json["units"]:
                                    unit_title = unit.get("title", "Unit")
                                    unit_topics = unit.get("topics", [])
                                    subject_topic_items.append({
                                        "id": f"{subject_name_curr}-{unit_title}",
                                        "title": unit_title,
                                        "subtopics": unit_topics
                                    })
                                    
                                curriculum_subjects.append({
                                    "id": subject_name_curr.lower().replace(" ", "-"),
                                    "title": subject_name_curr,
                                    "color": "#14b8a6",
                                    "topics": subject_topic_items
                                })
                except Exception as e:
                    logger.error(f"Failed to inject dynamic curriculums: {e}")
            # 2. Load static curriculum for the current semester
            if not dynamic_subjects:
                current_sem_data = next(
                    (sem for sem in default_curr.get("semesters", []) if sem.get("id") == f"semester-{current_sem_num}"),
                    None
                )
                if current_sem_data:
                    for idx, (subj_name, topics_list) in enumerate(current_sem_data.get("subjects", {}).items()):
                        # Skip if this subject is already loaded dynamically
                        if subj_name in dynamic_subjects:
                            continue
                            
                        sub_data = subject_topics.get(subj_name, [])
                        if sub_data:
                            formatted_topics = []
                            for t in sub_data:
                                formatted_topics.append({
                                    "id": t,
                                    "title": t,
                                    "subtopics": []
                                })
                            sub_data = formatted_topics
                        else:
                            sub_data = [{
                                "id": f"{subj_name.lower().replace(' ', '-')}-unit-1",
                                "title": "Core Concepts",
                                "subtopics": topics_list
                            }]
                            
                        curriculum_subjects.append({
                            "id": subj_name.lower().replace(" ", "-"),
                            "title": subj_name,
                            "color": current_sem_data.get("color", "#14b8a6"),
                            "topics": sub_data
                        })
        except Exception as e:
            logger.error(f"Failed to load curriculum: {e}")

    if curriculum_subjects and not class_id:
        sidebar_data.append({
            "id": "current",
            "title": "Current Semester Topics",
            "remark": "neutral",
            "subjects": curriculum_subjects
        })
    elif curriculum_subjects and class_id:
        sidebar_data.append({
            "id": "class",
            "title": "Class Curriculum",
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
    
    # Self-healing: if no TopicPerformance exists but quiz history does, recover it
    if not perf and student_id:
        from practice_models import PracticeQuestion, PracticeSession
        hist_count = db.query(PracticeQuestion).join(PracticeSession).filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.topic == selected_topic,
            PracticeQuestion.is_correct.isnot(None)
        ).count()
        if hist_count > 0:
            history_qs = db.query(PracticeQuestion).join(PracticeSession).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == selected_topic,
                PracticeQuestion.is_correct.isnot(None)
            ).all()
            attempted = len(history_qs)
            correct = sum(1 for q in history_qs if q.is_correct)
            acc = (correct / attempted * 100) if attempted > 0 else 0.0
            sess = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == selected_topic,
                PracticeQuestion.is_correct.isnot(None)
            ).distinct().count()
            from services.analytics_engine import get_topic_status
            perf = TopicPerformance(
                student_id=student_id,
                topic=selected_topic,
                subject=subject or "General",
                sessions=sess,
                questions_attempted=attempted,
                correct_answers=correct,
                accuracy=acc,
                status=get_topic_status(sess, attempted, acc)
            )
            db.add(perf)
            db.commit()
            db.refresh(perf)
    from services.analytics_engine import calculate_topic_metrics
    metrics = calculate_topic_metrics(perf)
    
    accuracy = metrics["accuracy"]
    confidence = metrics.get("confidence", 0.0)
    questions_attempted = metrics.get("questions_attempted", 0)
    difficulty = (perf.current_difficulty.capitalize()) if perf else "Mixed"
    sessions = metrics["sessions"]
    status = metrics["status"]
    
    # Check if this topic is completed in the roadmap (checking parent topic or checking subtopics list)
    is_completed = False
    if roadmap:
        from roadmap_models import DailyTask
        task = None
        is_subtopic = False
        all_tasks = db.query(DailyTask).filter(
            DailyTask.roadmap_id == roadmap.id
        ).all()
        for t in all_tasks:
            if t.topic == selected_topic:
                task = t
                break
            if t.subtopics and isinstance(t.subtopics, list) and selected_topic in t.subtopics:
                task = t
                is_subtopic = True
                break
        
        # Only use task.status for parent topics. Subtopics must have a perf record.
        if task and task.status == "completed" and not is_subtopic:
            is_completed = True

    if perf:
        is_completed = True

    if not perf and is_completed:
        accuracy = 10.0
        status = "LEARNING"
        sessions = 1
    
    header_response = {
        "success": True,
        "data": {
            "category": "Topic",
            "status": f"{status.capitalize()}" if perf else ("Learning" if is_completed else "Not Started"),
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
                    "label": "Sessions",
                    "value": str(sessions),
                    "trend": "+1",
                    "trendUp": True
                },
                {
                    "label": "Questions",
                    "value": str(questions_attempted),
                },
                {
                    "label": "Accuracy",
                    "value": f"{accuracy}%",
                    "valueColor": "text-rose-400" if accuracy < 50 else "text-green-400",
                },
                {
                    "label": "Confidence",
                    "value": f"{confidence}%",
                    "valueColor": "text-indigo-400",
                },
            ],
        },
    }
    
    right_sidebar_data = {
        "success": True,
        "data": {
            "understandingLevel": {
                "mainPercentage": accuracy,
                "status": status,
                "confidence": confidence,
                "skillBreakdown": [
                    {"id": "conceptual", "label": "Conceptual", "percentage": accuracy if perf else (20.0 if is_completed else 0.0), "color": "#a78bfa"},
                    {"id": "problem-solving", "label": "Problem Solving", "percentage": round(accuracy * 0.8, 2) if perf else 0.0, "color": "#f87171"},
                ],
            },
            "analytics": {
                "status": status,
                "score": int(perf.accuracy) if perf else (50 if is_completed else 0),
                "trend": "up",
                "trendValue": "+5%",
                "baselineText": f"Based on {sessions} sessions" if perf else ("Based on reading completion" if is_completed else "Start practicing to see trends"),
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
                    {"id": "t1", "label": "Sessions", "value": str(sessions), "color": "text-blue-400"},
                    {"id": "t2", "label": "Accuracy", "value": f"{int(perf.accuracy)}%" if perf else ("50%" if is_completed else "0%"), "color": "text-green-400"},
                ],
                "comparison": {
                    "value": "+1 session" if perf and sessions > 0 else "+0 session",
                    "trend": "up" if perf and sessions > 0 else "neutral",
                    "text": "vs last week"
                }
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
    
    # Dynamic related concepts
    related_list = []
    try:
        # First, check if we can get the topics of the current subject from get_predefined_topics
        from services.analytics_engine import get_predefined_topics
        resolved_subject = subject
        if not resolved_subject and perf:
            resolved_subject = perf.subject
            
        if not resolved_subject:
            from classroom_models import ClassCurriculum, StudentClass
            enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
            class_ids = [c.class_id for c in enrolled_classes]
            if class_ids:
                curr_currs = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(class_ids)).all()
                for c in curr_currs:
                    if c.curriculum_json and "units" in c.curriculum_json:
                        for unit in c.curriculum_json["units"]:
                            if selected_topic in unit.get("topics", []):
                                resolved_subject = c.subject_name
                                break
                    if resolved_subject:
                        break
        
        if resolved_subject:
            topics = get_predefined_topics(student_id, resolved_subject, db)
            if selected_topic in topics:
                idx = topics.index(selected_topic)
                if idx > 0:
                    related_list.append({"topic": topics[idx-1], "relation": "Prerequisite"})
                if idx < len(topics) - 1:
                    related_list.append({"topic": topics[idx+1], "relation": "Next Topic"})
        if not related_list:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            subject_topics_path = os.path.join(base_dir, "config", "subject_topics.json")
            with open(subject_topics_path, "r") as f:
                subject_topics = json.load(f)
            for subj, topics in subject_topics.items():
                if selected_topic in topics:
                    idx = topics.index(selected_topic)
                    if idx > 0:
                        related_list.append({"topic": topics[idx-1], "relation": "Prerequisite"})
                    if idx < len(topics) - 1:
                        related_list.append({"topic": topics[idx+1], "relation": "Next Topic"})
                    for t in topics:
                        if t != selected_topic and t not in [r["topic"] for r in related_list]:
                            related_list.append({"topic": t, "relation": "Related Topic"})
                    break

        # Fallback 1: If related_list has fewer than 4 topics, get other topics from the resolved subject
        if len(related_list) < 4 and resolved_subject:
            topics = get_predefined_topics(student_id, resolved_subject, db)
            for t in topics:
                if t != selected_topic and t not in [r["topic"] for r in related_list]:
                    related_list.append({"topic": t, "relation": "Related Topic"})
                    if len(related_list) >= 4:
                        break

        # Fallback 2: If still fewer than 4, get topics the student has previously practiced
        if len(related_list) < 4:
            other_perfs = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).limit(10).all()
            for p in other_perfs:
                if p.topic != selected_topic and p.topic not in [r["topic"] for r in related_list]:
                    related_list.append({"topic": p.topic, "relation": "Related Topic"})
                    if len(related_list) >= 4:
                        break

        # Fallback 3: Standard computer science concepts
        if len(related_list) < 4:
            standard_topics = [
                "Introduction to Operating Systems",
                "Process Scheduling",
                "Memory Management",
                "Deadlocks"
            ]
            for t in standard_topics:
                if t != selected_topic and t not in [r["topic"] for r in related_list]:
                    related_list.append({"topic": t, "relation": "Related Topic"})
                    if len(related_list) >= 4:
                        break
    except Exception as e:
        logger.error(f"Failed to load related concepts: {e}")
    
    related_concepts_formatted = []
    for idx, r in enumerate(related_list[:4]):
        related_concepts_formatted.append({
            "id": str(idx + 1),
            "label": f"{r['topic']} ({r['relation']})",
            "topic": r["topic"],
            "relation": r["relation"]
        })

    learning_assistant_response = {
        "success": True,
        "data": {
            "revision": {"title": "Quick Revision", "points": []},
            "actions": [
                {"id": 'simpler', "label": 'Explain Simpler', "iconName": 'Lightbulb', "variant": 'primary'},
                {"id": 'example', "label": 'Give Example', "iconName": 'FlaskConical', "variant": 'cyan'},
                {"id": 'summary', "label": 'Summarize', "iconName": 'FileText', "variant": 'purple'},
            ],
            "relatedConcepts": related_concepts_formatted,
            "learningActions": [
                {"id": 'practice_topic', "label": 'Practice Topic', "subLabel": 'Solve problems', "iconName": 'Pen', "variant": 'neutral'},
                {"id": 'take_quiz', "label": 'Take Quiz', "subLabel": 'Test your memory', "iconName": 'Zap', "variant": 'amber'},
                {"id": 'add_revision', "label": 'Add Revision', "subLabel": 'Schedule for later', "iconName": 'Bookmark', "variant": 'purple'},
                {"id": 'view_notes', "label": 'View Notes', "subLabel": 'Study details', "iconName": 'BookOpen', "variant": 'primary'},
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

from fastapi.responses import StreamingResponse

@router.get("/stream_content")
def stream_content(topic: Optional[str] = None, student_id: int = 1, subject: Optional[str] = None, db: Session = Depends(get_db)):
    """Stream learning content progressively."""
    if not topic:
        return {"error": "Topic is required"}
        
    # Check cache first
    cached = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == topic
    ).first()
    
    if cached:
        # If cached, we can just yield the cached content
        import json
        
        def generate_cached():
            # If the cached content is an array (old format), convert to string
            content = cached.content
            if isinstance(content, list):
                # Try to map old JSON format to Markdown
                md_content = f"# {topic}\n\n"
                for block in content:
                    if block.get("type") == "heading":
                        md_content += f"### {block.get('text')}\n\n"
                    elif block.get("type") == "paragraph":
                        md_content += f"{block.get('text')}\n\n"
                    elif block.get("type") == "highlight":
                        md_content += f"> **{block.get('title')}**: {block.get('text')}\n\n"
                    elif block.get("type") == "code_block":
                        md_content += f"```{block.get('language')}\n{block.get('code')}\n```\n\n"
                    else:
                        md_content += f"{block.get('text')}\n\n"
            else:
                md_content = str(content)
                
            yield md_content
            yield "\n\n---REVISION---\n"
            yield json.dumps(cached.revision)
            
        return StreamingResponse(generate_cached(), media_type="text/event-stream")

    from services.practice_engine import stream_learning_content
    return StreamingResponse(
        stream_learning_content(student_id, topic, db, subject=subject),
        media_type="text/event-stream"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  AI ACTIONS & RELATED CONCEPTS SCHEMAS & ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════
from pydantic import BaseModel

class ExplainRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class ExampleRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class SummarizeRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class CheatSheetRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class SaveNotesRequest(BaseModel):
    student_id: int
    topic_name: str
    generated_notes: str

class AddRevisionRequest(BaseModel):
    student_id: int
    topic_name: str
    priority: Optional[str] = "high"


@router.post("/explain")
def explain_topic(req: ExplainRequest):
    from routes.chat import _call_llm
    prompt = f"""You are an expert tutor explaining a technical concept.
Explain the topic "{req.topic_name}" in very simple language for a beginner.
Provide:
1. A simplified explanation in plain English.
2. A couple of simple examples.
3. The key take-away idea.

Format your response as a valid JSON object with EXACTLY the following keys:
"simplified_explanation": "A string explaining the concept simply.",
"examples": ["example 1", "example 2"],
"key_idea": "The main takeaway in one sentence."

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Explain simpler: {req.topic_name}")
        import json
        import re
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in explain_topic: {e}")
        return {
            "success": True, 
            "data": {
                "simplified_explanation": f"Concept explanation for {req.topic_name} in simple terms.",
                "examples": [f"Visualizing {req.topic_name} using standard analogies."],
                "key_idea": f"Simplifying {req.topic_name}."
            }
        }


@router.post("/examples")
def give_examples(req: ExampleRequest):
    from routes.chat import _call_llm
    prompt = f"""You are an expert instructor.
Provide 3 real-world, highly relatable examples or scenarios for the concept "{req.topic_name}".
Also list practical applications where this concept is used.

Format your response as a valid JSON object with EXACTLY the following keys:
"examples": [
    {{"title": "Example Title", "description": "Relatable scenario explanation."}},
    ...
],
"practical_applications": ["Application 1", "Application 2"]

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Give examples for: {req.topic_name}")
        import json
        import re
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in give_examples: {e}")
        return {
            "success": True,
            "data": {
                "examples": [
                    {"title": f"Scenario for {req.topic_name}", "description": "Real world analogy."}
                ],
                "practical_applications": [f"Standard implementation of {req.topic_name}."]
            }
        }


@router.post("/summarize")
def summarize_topic(req: SummarizeRequest):
    from routes.chat import _call_llm
    prompt = f"""You are an educational assistant.
Summarize "{req.topic_name}" for quick exam revision.
Provide 5 concise bullet points covering key facts, definitions, and exam notes.

Format your response as a valid JSON object with EXACTLY the following keys:
"summary_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
"important_concepts": ["Concept A", "Concept B"]

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Summarize topic: {req.topic_name}")
        import json
        import re
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in summarize_topic: {e}")
        return {
            "success": True,
            "data": {
                "summary_points": [f"Revision point for {req.topic_name}"],
                "important_concepts": [req.topic_name]
            }
        }


@router.get("/related/{topic}")
def get_related_concepts(topic: str, student_id: int = 1, db: Session = Depends(get_db)):
    # Look for other topics in the same subject
    try:
        import json
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        subject_topics_path = os.path.join(base_dir, "config", "subject_topics.json")
        with open(subject_topics_path, "r") as f:
            subject_topics = json.load(f)
        for subj, topics in subject_topics.items():
            if topic in topics:
                idx = topics.index(topic)
                related = []
                if idx > 0:
                    related.append({"topic": topics[idx-1], "relation": "Prerequisite"})
                if idx < len(topics) - 1:
                    related.append({"topic": topics[idx+1], "relation": "Next Topic"})
                for t in topics:
                    if t != topic and t not in [r["topic"] for r in related]:
                        related.append({"topic": t, "relation": "Related Topic"})
                return related[:4]
    except Exception as e:
        logger.error(f"Error reading subject_topics: {e}")
        
    return [
        {"topic": "Process Scheduling", "relation": "Next Topic"},
        {"topic": "Kernel Mode", "relation": "Prerequisite"}
    ]


@router.post("/cheatsheet")
def get_cheatsheet(req: CheatSheetRequest):
    from routes.chat import _call_llm
    prompt = f"""You are a technical interviewer.
Provide 3-5 high-yield interview cheat sheet points for "{req.topic_name}".
Highlight key technical details, interview questions, and must-know facts.

Format your response as a valid JSON object with EXACTLY the following keys:
"bullets": ["Point 1", "Point 2", "Point 3", "Point 4"]

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Interview cheatsheet for: {req.topic_name}")
        import json
        import re
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in get_cheatsheet: {e}")
        return {
            "success": True,
            "data": {
                "bullets": [
                    f"{req.topic_name} is critical for system performance.",
                    "Understand time complexity of core algorithms."
                ]
            }
        }


@router.post("/save-notes")
def save_notes(req: SaveNotesRequest, db: Session = Depends(get_db)):
    from practice_models import UserNote
    new_note = UserNote(
        student_id=req.student_id,
        topic=req.topic_name,
        notes=req.generated_notes
    )
    db.add(new_note)
    db.commit()
    return {"success": True, "message": "Notes saved."}


@router.post("/revision")
def add_to_revision(req: AddRevisionRequest, db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    from practice_models import TopicPerformance
    
    perf = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == req.student_id,
        TopicPerformance.topic == req.topic_name
    ).first()
    
    overdue_date = datetime.utcnow() - timedelta(days=10)
    
    if perf:
        perf.accuracy = min(perf.accuracy, 30.0)
        perf.status = "WEAK"
        perf.last_practiced_at = overdue_date
        perf.sessions = max(perf.sessions, 1)
    else:
        perf = TopicPerformance(
            student_id=req.student_id,
            topic=req.topic_name,
            subject="General",
            sessions=1,
            questions_attempted=5,
            correct_answers=1,
            accuracy=20.0,
            status="WEAK",
            last_practiced_at=overdue_date,
            current_difficulty="easy"
        )
        db.add(perf)
        
    db.commit()
    return {"success": True, "message": "Added to revision."}
