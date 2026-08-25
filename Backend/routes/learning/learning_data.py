import json
import logging
import os
import re
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from practice_models import RevisionItem, TopicPerformance, LearningContent
from services.practice.topic_extractor import extract_topics_from_documents
from services.practice.content_generator import has_valid_revision, split_revision_payload
from services.authorization import require_student

logger = logging.getLogger("chatbot")

router = APIRouter()

_DEFAULT_CURRICULUM_CACHE = None
_SUBJECT_TOPICS_CACHE = None

def _clean_topic_label(topic: str) -> str:
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", topic)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    return cleaned.strip()

def resolve_standard_subject(topic: str, current_subject: Optional[str] = None) -> Optional[str]:
    if current_subject and current_subject != "undefined" and current_subject != "null":
        subj_lower = current_subject.lower()
        if not subj_lower.startswith("week") and not subj_lower.startswith("unit"):
            if "operating system" in subj_lower or subj_lower == "os":
                return "Operating Systems"
            elif "machine learning" in subj_lower or subj_lower == "ml":
                return "Machine Learning"
            elif "artificial intelligence" in subj_lower or subj_lower == "ai":
                return "Artificial Intelligence"
            elif "data structure" in subj_lower or subj_lower == "dsa":
                return "Data Structures and Algorithms"
            elif "computer network" in subj_lower or subj_lower == "cn":
                return "Computer Networks"
            elif "programming" in subj_lower:
                return "Programming Fundamentals"

    import re
    clean_topic = re.sub(r'^Day\s*\d+\s*:\s*', '', topic or '').strip()

    if topic:
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            p = os.path.join(base_dir, "config", "subject_topics.json")
            if os.path.exists(p):
                with open(p, "r") as f:
                    subject_topics = json.load(f)
                for subj, topics in subject_topics.items():
                    if any(t.lower() == clean_topic.lower() for t in topics):
                        return subj
        except Exception as e:
            logger.error(f"Failed to lookup subject by topic: {e}")

    if current_subject == "undefined" or current_subject == "null" or not current_subject:
        return None
    return current_subject


def _get_revision_status(student_id: int, topic: Optional[str], db: Session) -> dict:
    if not topic:
        return {"is_queued": False, "priority": None, "item_id": None}

    item = db.query(RevisionItem).filter(
        RevisionItem.student_id == student_id,
        RevisionItem.topic == topic,
        RevisionItem.status == "pending",
    ).first()
    return {
        "is_queued": bool(item),
        "priority": item.priority if item else None,
        "item_id": item.id if item else None,
    }


@router.get("/data")
def get_learning_data(
    student_id: int,
    topic: Optional[str] = None,
    subject: Optional[str] = None,
    roadmap_id: Optional[int] = None,
    source: Optional[str] = "courses",
    class_id: Optional[int] = None,
    skip_sidebar: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    require_student(student_id, db)
    subject = resolve_standard_subject(topic or "", subject)

    sidebar_data = []

    # Fast path: skip sidebar computation when only switching topics
    if skip_sidebar and topic:
        selected_topic = topic
        # Jump directly to topic performance + content (skip sidebar building)
        perf = db.query(TopicPerformance).filter_by(student_id=student_id, topic=selected_topic).first()
        
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
        
        is_completed = False
        if perf:
            is_completed = True
        
        header_response = {
            "success": True,
            "data": {
                "category": "Topic",
                "status": f"{status.capitalize()}" if perf else ("Learning" if is_completed else "Not Started"),
                "is_completed": is_completed,
                "title": selected_topic,
                "subtitle": "Learning Mode",
                "stats": [
                    {"label": "Difficulty", "value": difficulty, "valueColor": "text-amber-400" if difficulty == "Hard" else "text-cyan-400"},
                    {"label": "Sessions", "value": str(sessions), "trend": "+1", "trendUp": True},
                    {"label": "Questions", "value": str(questions_attempted)},
                    {"label": "Accuracy", "value": f"{accuracy}%", "valueColor": "text-rose-400" if accuracy < 50 else "text-green-400"},
                    {"label": "Confidence", "value": f"{confidence}%", "valueColor": "text-indigo-400"},
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
                "commonMistakes": {"mistakes": [{"id": "m1", "text": "Review fundamentals for better accuracy.", "severity": "medium"}]},
                "aiSuggestions": {"suggestions": [
                    {"id": "s1", "label": f"Practice {selected_topic}", "iconName": "BookOpen", "color": "indigo"},
                ]},
                "relatedDocuments": {"documents": [{"id": "d1", "title": "Reference Material", "type": "pdf", "iconName": "FileText"}]},
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
        
        # Check for cached content
        cached_content = db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.subject == subject,
            LearningContent.topic == selected_topic
        ).first()
        
        if cached_content and not has_valid_revision(cached_content.revision):
            logger.info(f"INVALIDATING incomplete revision cache: topic='{selected_topic}', subject='{subject}'")
            db.delete(cached_content)
            db.commit()
            cached_content = None

        is_old_format = False
        if cached_content:
            cached_str = str(cached_content.content)
            is_old_format = isinstance(cached_content.content, list) or ("why is it important" not in cached_str.lower() and "how does it work" not in cached_str.lower())
            if subject and ("keshav" in cached_str.lower() or "placement policy" in cached_str.lower() or "deregistered" in cached_str.lower()):
                is_old_format = True

        cached_display_content, embedded_revision = split_revision_payload(
            cached_content.content, selected_topic, subject
        ) if cached_content else (None, None)
        
        if cached_content and "could not be generated" not in str(cached_display_content) and not is_old_format:
            notes_response = {
                "success": True,
                "generatedBy": "AI Assistant (Cached)",
                "status": "Personal Study Guide",
                "topic": selected_topic,
                "content": cached_display_content
            }
        else:
            notes_response = {
                "success": True,
                "generatedBy": "AI Assistant",
                "status": "Loading content...",
                "topic": selected_topic,
                "content": []
            }
        
        revision_source = cached_content.revision if cached_content and cached_content.revision else embedded_revision
        revision_points = []
        if revision_source:
            if isinstance(revision_source, dict):
                revision_points = revision_source.get("points", [])
            elif isinstance(revision_source, list):
                revision_points = revision_source
        
        learning_assistant_response = {
            "success": True,
            "data": {
                "revision": {"title": "Quick Revision", "points": revision_points},
                "revisionStatus": _get_revision_status(student_id, selected_topic, db),
                "actions": [
                    {"id": 'simpler', "label": 'Explain Simpler', "iconName": 'Lightbulb', "variant": 'primary'},
                    {"id": 'example', "label": 'Give Example', "iconName": 'FlaskConical', "variant": 'cyan'},
                    {"id": 'flashcard', "label": 'Flashcards', "iconName": 'BookOpen', "variant": 'purple'},
                ],
                "relatedConcepts": [],
                "learningActions": [
                    {"id": 'practice_topic', "label": 'Practice Topic', "subLabel": 'Solve problems', "iconName": 'Pen', "variant": 'neutral'},
                    {"id": 'take_quiz', "label": 'Take Quiz', "subLabel": 'Test your memory', "iconName": 'Zap', "variant": 'amber'},
                    {"id": 'add_revision', "label": 'Add Revision', "subLabel": 'Schedule for later', "iconName": 'Bookmark', "variant": 'purple'},
                    {"id": 'view_notes', "label": 'View Notes', "subLabel": 'Study details', "iconName": 'BookOpen', "variant": 'primary'},
                ]
            },
        }
        
        return {
            "notesResponse": notes_response,
            "headerResponse": header_response,
            "learningAssistantResponse": learning_assistant_response,
            "rightSidebarData": right_sidebar_data,
            "selectedTopic": selected_topic,
            "selectedSubject": subject
        }

    # 1c. Roadmap Tasks
    from roadmap_models import LearningRoadmap, DailyTask
    import logging
    logger = logging.getLogger("chatbot")
    logger.info(f"[get_learning_data] Requested roadmap_id={roadmap_id}, student_id={student_id}")
    roadmaps_list = []
    roadmap = None
    if roadmap_id:
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == roadmap_id, LearningRoadmap.student_id == student_id).first()
        if roadmap:
            roadmaps_list.append(roadmap)
    else:
        if source == "personal":
            roadmaps_list = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == student_id).order_by(desc(LearningRoadmap.created_at)).all()

    for roadmap in roadmaps_list:
        logger.info(f"[get_learning_data] Retrieved roadmap id={roadmap.id}, title='{roadmap.title}'")
        all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
        
        active_week = 1
        pending_weeks = [t.week_number for t in all_tasks if t.status != "completed" and t.week_number is not None]
        if pending_weeks:
            active_week = min(pending_weeks)
        else:
            active_week = 9999
            
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
            weeks[wn].sort(key=lambda x: x.day_number or 0)
            for t in weeks[wn]:
                day_title = t.topic
                if t.day_number:
                    # Only prepend "Day X: " if t.topic doesn't already start with "Day X:" case-insensitively
                    prefix = f"Day {t.day_number}:"
                    if not t.topic.strip().lower().startswith(prefix.lower()):
                        day_title = f"{prefix} {t.topic}"
                
                topics_list.append({
                    "id": t.topic,
                    "title": day_title,
                    "completed": t.status == "completed"
                })
            
            subjects.append({
                "id": f"week-{wn}-{roadmap.id}",
                "title": f"Week {wn}",
                "color": "#f97316",
                "topics": topics_list
            })
            
        sidebar_data.append({
            "id": f"roadmap-{roadmap.id}",
            "title": roadmap.title,
            "remark": "Recommended",
            "subjects": subjects
        })
    
    # 1a. Document-based topics
    from models import Document
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    
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
        
    if doc_subjects and source == "personal":
        sidebar_data.append({
            "id": "documents",
            "title": "Your Uploaded Document Topics",
            "remark": "neutral",
            "subjects": doc_subjects
        })
        
    # 1b. Curriculum topics
    curriculum_subjects = []
    
    if class_id:
        from classroom_models import ClassCurriculum
        curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
        if curr and curr.curriculum_json:
            units = curr.curriculum_json.get("units", [])
            
            for i, unit in enumerate(units):
                color = colors[i % len(colors)]
                unit_topics = [{"id": _clean_topic_label(t), "title": _clean_topic_label(t)} for t in unit.get("topics", [])]
                curriculum_subjects.append({
                    "id": f"unit-{i}",
                    "title": unit.get("title", f"Unit {i+1}"),
                    "color": color,
                    "topics": unit_topics
                })
    else:
        global _DEFAULT_CURRICULUM_CACHE, _SUBJECT_TOPICS_CACHE
        try:
            if '_DEFAULT_CURRICULUM_CACHE' not in globals() or _DEFAULT_CURRICULUM_CACHE is None:
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                default_curr_path = os.path.join(base_dir, "config", "default_curriculum.json")
                with open(default_curr_path, "r") as f:
                    _DEFAULT_CURRICULUM_CACHE = json.load(f)
            default_curr = _DEFAULT_CURRICULUM_CACHE
                
            if '_SUBJECT_TOPICS_CACHE' not in globals() or _SUBJECT_TOPICS_CACHE is None:
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                subject_topics_path = os.path.join(base_dir, "config", "subject_topics.json")
                try:
                    with open(subject_topics_path, "r") as f:
                        _SUBJECT_TOPICS_CACHE = json.load(f)
                except Exception as e:
                    logger.error(f"Failed to load subject_topics: {e}")
                    _SUBJECT_TOPICS_CACHE = {}
            subject_topics = _SUBJECT_TOPICS_CACHE
                
            current_sem_num = default_curr.get("current_semester", 3)
            
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
                                    unit_topics = [_clean_topic_label(t) for t in unit.get("topics", [])]
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
            if not dynamic_subjects:
                current_sem_data = next(
                    (sem for sem in default_curr.get("semesters", []) if sem.get("id") == f"semester-{current_sem_num}"),
                    None
                )
                if current_sem_data:
                    for idx, (subj_name, topics_list) in enumerate(current_sem_data.get("subjects", {}).items()):
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
    
    selected_topic = topic
    roadmap_categories = [
        category for category in sidebar_data
        if str(category.get("id", "")) == "roadmap"
        or str(category.get("id", "")).startswith("roadmap-")
    ]
    personal_topic_categories = roadmap_categories + [
        category for category in sidebar_data
        if category.get("id") == "documents"
    ]
    
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
        for category in personal_topic_categories:
            for subj in category.get("subjects", []):
                for t in subj.get("topics", []):
                    if t["id"] == selected_topic or (t.get("subtopics") and selected_topic in t["subtopics"]):
                        topic_found = True
                        break
                if topic_found:
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
            for roadmap_category in roadmap_categories:
                if not roadmap_category.get("subjects"):
                    continue
                unlocked_subjects = [
                    s for s in roadmap_category["subjects"]
                    if not s.get("topics", []) or not s.get("topics", [])[0].get("locked", False)
                ]
                candidate_subjects = unlocked_subjects or roadmap_category["subjects"]
                if candidate_subjects and candidate_subjects[0].get("topics"):
                    first_topic = candidate_subjects[0]["topics"][0]
                    if first_topic.get("subtopics"):
                        selected_topic = first_topic["subtopics"][0]
                    else:
                        selected_topic = first_topic["id"]
                    break

            if not selected_topic:
                if doc_subjects and doc_subjects[0].get("topics"):
                    selected_topic = doc_subjects[0]["topics"][0]["id"]
                elif curriculum_subjects and curriculum_subjects[0].get("topics"):
                    selected_topic = curriculum_subjects[0]["topics"][0]["id"]
        
        if not selected_topic:
            selected_topic = "General Topic"
            
    perf = db.query(TopicPerformance).filter_by(student_id=student_id, topic=selected_topic).first()
    
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
    
    is_completed = False
    if not roadmap and selected_topic:
        from roadmap_models import DailyTask
        t_task = db.query(DailyTask).join(LearningRoadmap).filter(
            LearningRoadmap.student_id == student_id,
            DailyTask.topic == selected_topic
        ).first()
        if t_task:
            roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == t_task.roadmap_id).first()

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
    
    cached_content = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == selected_topic
    ).first()
    

    if cached_content and not has_valid_revision(cached_content.revision):
        logger.info(f"INVALIDATING incomplete revision cache: topic='{selected_topic}', subject='{subject}'")
        db.delete(cached_content)
        db.commit()
        cached_content = None

    is_old_format = False
    if cached_content:
        cached_str = str(cached_content.content)
        # Check case-insensitively to prevent minor casing differences from invalidating valid caches
        is_old_format = isinstance(cached_content.content, list) or ("why is it important" not in cached_str.lower() and "how does it work" not in cached_str.lower())
        if subject and ("keshav" in cached_str.lower() or "placement policy" in cached_str.lower() or "deregistered" in cached_str.lower()):
            logger.warning(f"CACHE INVALIDATED (Resume/Policy Leak detected): topic='{selected_topic}', subject='{subject}'")
            is_old_format = True

    cached_display_content, embedded_revision = split_revision_payload(
        cached_content.content, selected_topic, subject
    ) if cached_content else (None, None)

    if cached_content and "could not be generated" not in str(cached_display_content) and not is_old_format:
        logger.info(f"CACHE HIT (Fast Return): topic='{selected_topic}', subject='{subject}'")
        notes_response = {
            "success": True,
            "generatedBy": "AI Assistant (Cached)",
            "status": "Personal Study Guide",
            "topic": selected_topic,
            "content": cached_display_content
        }
    else:
        if cached_content and is_old_format:
            logger.info(f"CACHE INVALIDATED (Old format): topic='{selected_topic}', subject='{subject}'")
            db.delete(cached_content)
            # Delete question bank cache on old format invalidation
            from practice_models import AICache
            db.query(AICache).filter(
                AICache.student_id == student_id,
                AICache.topic == selected_topic,
                AICache.action_type == "master_question_bank"
            ).delete()
            db.commit()
        notes_response = {
            "success": True,
            "generatedBy": "AI Assistant",
            "status": "Loading content...",
            "topic": selected_topic,
            "content": []
        }
    
    related_list = []
    try:
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
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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

        if len(related_list) < 4 and resolved_subject:
            topics = get_predefined_topics(student_id, resolved_subject, db)
            for t in topics:
                if t != selected_topic and t not in [r["topic"] for r in related_list]:
                    related_list.append({"topic": t, "relation": "Related Topic"})
                    if len(related_list) >= 4:
                        break

        if len(related_list) < 4:
            other_perfs = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).limit(10).all()
            for p in other_perfs:
                if p.topic != selected_topic and p.topic not in [r["topic"] for r in related_list]:
                    related_list.append({"topic": p.topic, "relation": "Related Topic"})
                    if len(related_list) >= 4:
                        break

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

    revision_source = cached_content.revision if cached_content and cached_content.revision else embedded_revision
    revision_points = []
    if revision_source:
        if isinstance(revision_source, dict):
            revision_points = revision_source.get("points", [])
        elif isinstance(revision_source, list):
            revision_points = revision_source

    learning_assistant_response = {
        "success": True,
        "data": {
            "revision": {"title": "Quick Revision", "points": revision_points},
            "revisionStatus": _get_revision_status(student_id, selected_topic, db),
            "actions": [
                {"id": 'simpler', "label": 'Explain Simpler', "iconName": 'Lightbulb', "variant": 'primary'},
                {"id": 'example', "label": 'Give Example', "iconName": 'FlaskConical', "variant": 'cyan'},
                {"id": 'flashcard', "label": 'Flashcards', "iconName": 'BookOpen', "variant": 'purple'},

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
        "selectedTopic": selected_topic,
        "selectedSubject": subject
    }
