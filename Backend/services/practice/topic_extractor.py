import json
import logging
import os
import re
import threading
from typing import Optional
from sqlalchemy.orm import Session

from models import Document
from practice_models import CustomTopic, TopicPerformance
from chroma_store import query_chunks
from services.analytics_engine import get_topic_status
from services.practice.base import _practice_llm_call, CACHE_FILE

logger = logging.getLogger("chatbot")

def load_topics_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                data = json.load(f)
                cache = {}
                for k, v in data.items():
                    parts = k.strip("()").split(", ")
                    student_id = int(parts[0])
                    if len(parts) > 1 and parts[1].strip():
                        doc_ids = tuple(int(x.strip("(),")) for x in parts[1:] if x.strip("(),"))
                    else:
                        doc_ids = ()
                    cache[(student_id, doc_ids)] = v
                return cache
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to load topics cache from disk: {e}")
    return {}

def save_topics_cache(cache):
    try:
        data = {}
        for k, v in cache.items():
            key_str = f"({k[0]}, {', '.join(str(x) for x in k[1])})"
            data[key_str] = v
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"[PracticeEngine] Failed to save topics cache to disk: {e}")

_TOPICS_CACHE = load_topics_cache()

def register_topics_in_db(student_id: int, data: dict, db: Session):
    """Synchronizes extracted subjects/topics/subtopics into SQL CustomTopic & TopicPerformance."""
    try:
        from practice_models import CustomTopic, TopicPerformance
        from models import Document
        
        docs = db.query(Document).filter(Document.student_id == student_id).all()
        active_doc_subjects = set(d.subject for d in docs if d.subject)
        
        current_subject_topics = {}
        for subj in data.get("subjects", []):
            subject_name = subj.get("name", "Document Subject")
            if subject_name not in current_subject_topics:
                current_subject_topics[subject_name] = set()
            for topic in subj.get("topics", []):
                topic_name = topic.get("name")
                if topic_name:
                    current_subject_topics[subject_name].add(topic_name)
                    
        if active_doc_subjects:
            db.query(CustomTopic).filter(
                CustomTopic.student_id == student_id,
                CustomTopic.subject_name != "General Topics",
                ~CustomTopic.subject_name.in_(list(active_doc_subjects))
            ).delete(synchronize_session=False)
        else:
            db.query(CustomTopic).filter(
                CustomTopic.student_id == student_id,
                CustomTopic.subject_name != "General Topics"
            ).delete(synchronize_session=False)
        
        for subject_name, valid_topics in current_subject_topics.items():
            if valid_topics:
                db.query(CustomTopic).filter(
                    CustomTopic.student_id == student_id,
                    CustomTopic.subject_name == subject_name,
                    ~CustomTopic.topic_name.in_(list(valid_topics))
                ).delete(synchronize_session=False)
            else:
                db.query(CustomTopic).filter(
                    CustomTopic.student_id == student_id,
                    CustomTopic.subject_name == subject_name
                ).delete(synchronize_session=False)
            
        from classroom_models import StudentClass, ClassCurriculum
        enrolled = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
        c_ids = [c.class_id for c in enrolled]
        dynamic_subjects = set()
        if c_ids:
            curriculums = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(c_ids)).all()
            for c in curriculums:
                if c.subject_name:
                    dynamic_subjects.add(c.subject_name)
                    
        static_subjects = set()
        try:
            config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "config", "default_curriculum.json")
            if os.path.exists(config_path):
                with open(config_path, "r") as f:
                    curr_data = json.load(f)
                current_sem_num = curr_data.get("current_semester", 3)
                current_sem_data = next(
                    (sem for sem in curr_data.get("semesters", []) if sem.get("id") == f"semester-{current_sem_num}"),
                    None
                )
                if current_sem_data:
                    for subj_name in current_sem_data.get("subjects", {}).keys():
                        static_subjects.add(subj_name)
        except Exception:
            pass

        core_subjects = {"Computer Science", "Engineering Mathematics", "General Aptitude", "General Topics"}
        valid_subjects = list(active_doc_subjects) + list(core_subjects) + list(dynamic_subjects) + list(static_subjects)
        
        db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            ~TopicPerformance.subject.in_(valid_subjects),
            TopicPerformance.questions_attempted == 0
        ).delete(synchronize_session=False)
        
        for subject_name, valid_topics in current_subject_topics.items():
            if valid_topics:
                db.query(TopicPerformance).filter(
                    TopicPerformance.student_id == student_id,
                    TopicPerformance.subject == subject_name,
                    ~TopicPerformance.topic.in_(list(valid_topics)),
                    TopicPerformance.questions_attempted == 0
                ).delete(synchronize_session=False)
            else:
                db.query(TopicPerformance).filter(
                    TopicPerformance.student_id == student_id,
                    TopicPerformance.subject == subject_name,
                    TopicPerformance.questions_attempted == 0
                ).delete(synchronize_session=False)
            
        for subject_name, topics in current_subject_topics.items():
            for topic_name in topics:
                existing_ct = db.query(CustomTopic).filter(
                    CustomTopic.student_id == student_id,
                    CustomTopic.topic_name == topic_name,
                    CustomTopic.subject_name == subject_name
                ).first()
                if not existing_ct:
                    new_ct = CustomTopic(
                        student_id=student_id,
                        topic_name=topic_name,
                        subject_name=subject_name
                    )
                    db.add(new_ct)

                existing_tp = db.query(TopicPerformance).filter(
                    TopicPerformance.student_id == student_id,
                    TopicPerformance.topic == topic_name
                ).first()
                if not existing_tp:
                    from practice_models import PracticeQuestion, PracticeSession
                    history_qs = db.query(PracticeQuestion).join(PracticeSession).filter(
                        PracticeSession.student_id == student_id,
                        PracticeQuestion.topic == topic_name,
                        PracticeQuestion.is_correct.isnot(None)
                    ).all()
                    
                    attempted = len(history_qs)
                    correct = sum(1 for q in history_qs if q.is_correct)
                    accuracy = (correct / attempted * 100) if attempted > 0 else 0.0
                    
                    sessions_count = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                        PracticeSession.student_id == student_id,
                        PracticeQuestion.topic == topic_name,
                        PracticeQuestion.is_correct.isnot(None)
                    ).distinct().count()
                    
                    status = get_topic_status(sessions_count, attempted, accuracy)
                    
                    new_tp = TopicPerformance(
                        student_id=student_id,
                        subject=subject_name,
                        topic=topic_name,
                        sessions=sessions_count,
                        questions_attempted=attempted,
                        correct_answers=correct,
                        accuracy=accuracy,
                        status=status
                    )
                    db.add(new_tp)
        db.commit()
        logger.info(f"[PracticeEngine] Synchronized document custom topics for student {student_id}")
    except Exception as db_err:
        logger.error(f"[PracticeEngine] Failed to synchronize topics in db: {db_err}")
        db.rollback()

def extract_topics_from_documents(student_id: int, db: Session) -> dict:
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        return {"subjects": []}

    doc_ids = sorted([d.id for d in docs])
    cache_key = str(student_id) + "_" + "_".join(map(str, doc_ids))
    
    cache_file = "data/topics_cache.json"
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                disk_cache = json.load(f)
                if cache_key in disk_cache:
                    cached_data = disk_cache[cache_key]
                    from database import SessionLocal
                    def sync_bg():
                        bg_db = SessionLocal()
                        try:
                            register_topics_in_db(student_id, cached_data, bg_db)
                        except Exception as e:
                            logger.error(f"[TopicExtractor] Background sync failed: {e}")
                        finally:
                            bg_db.close()
                    threading.Thread(target=sync_bg, daemon=True).start()
                    return cached_data
        except Exception:
            pass

    # Extract doc info while the main thread session is active to prevent DetachedInstanceError in background thread
    doc_info = [{"id": d.id, "filename": d.filename} for d in docs]

    def generate_and_save():
        try:
            doc_names = {d["id"]: d["filename"] for d in doc_info}
            all_text_snippets = []
            for doc in doc_info:
                results = query_chunks("overview summary topics chapters", top_k=5, allowed_doc_ids=[doc["id"]])
                if results and results.get("documents") and results["documents"][0]:
                    for chunk_text in results["documents"][0]:
                        all_text_snippets.append(f"[{doc['filename']}]: {chunk_text[:500]}")
            if not all_text_snippets:
                return
            combined_context = "\n\n".join(all_text_snippets[:20])
            system_prompt = """You are an educational content analyzer.
Given document excerpts from a student's study materials, extract a structured hierarchy of subjects, topics, and subtopics.
RULES:
- Identify the subject
- Identify major topics
- Identify subtopics
- Estimate difficulty and importance
Return ONLY valid JSON.
{"subjects": [{"name":"Subject", "topics":[{"name":"Topic", "subtopics":[], "difficulty":"medium", "importance":"high"}]}]}"""
            user_prompt = f"Analyze these document excerpts and extract the educational topic structure:\n\n{combined_context}"
            response = _practice_llm_call(system_prompt, user_prompt, max_tokens=2048)
            if response:
                import re
                json_match = re.search(r"\{.*\}", response, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                    
                    disk_cache = {}
                    if os.path.exists(cache_file):
                        try:
                            with open(cache_file, "r") as f:
                                disk_cache = json.load(f)
                        except Exception:
                            pass
                    disk_cache[cache_key] = data
                    os.makedirs("data", exist_ok=True)
                    with open(cache_file, "w") as f:
                        json.dump(disk_cache, f)

                    from database import SessionLocal
                    bg_db = SessionLocal()
                    try:
                        register_topics_in_db(student_id, data, bg_db)
                    finally:
                        bg_db.close()
        except Exception as e:
            logger.error(f"Background topic extraction failed: {e}")

    threading.Thread(target=generate_and_save).start()
    
    return {"subjects": [{"name": "Processing Documents...", "topics": [{"name": "Check back later", "subtopics": []}]}]}
