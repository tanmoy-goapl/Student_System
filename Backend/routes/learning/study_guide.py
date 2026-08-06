import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from practice_models import LearningContent
from services.practice.content_generator import generate_learning_content, stream_learning_content

logger = logging.getLogger("chatbot")

import threading
bg_generation_lock = threading.Lock()

def pre_generate_questions_bg(student_id: int, topic: str, subject: Optional[str]):
    """Pre-generate the master question bank in the background."""
    # Attempt to acquire lock without blocking Uvicorn worker threads
    acquired = bg_generation_lock.acquire(blocking=False)
    if not acquired:
        logger.info(f"[BGTask] Another background quiz generation is already active. Skipping pre-generation for '{topic}' to save resources.")
        return
        
    try:
        from database import SessionLocal
        from services.practice.question_generator import generate_master_question_bank
        from practice_models import AICache
        bg_db = SessionLocal()
        cached = None
        try:
            # Check if there is already a student-specific or shared cache (case-insensitive)
            cached = bg_db.query(AICache).filter(
                AICache.topic.ilike(topic),
                AICache.action_type == "master_question_bank"
            ).first()
            
            # If a shared cache exists but not cloned for this student, clone it instantly
            if cached and cached.student_id != student_id:
                try:
                    clone = AICache(
                        student_id=student_id,
                        topic=topic,
                        action_type="master_question_bank",
                        content=cached.content
                    )
                    bg_db.add(clone)
                    bg_db.commit()
                    logger.info(f"[BGTask] Cloned shared question bank for topic '{topic}' to student {student_id}")
                except Exception as e:
                    bg_db.rollback()
                    logger.error(f"[BGTask] Failed to clone shared question bank: {e}")
        except Exception as e:
            logger.error(f"[BGTask] Failed to check master question bank cache: {e}")
        finally:
            bg_db.close()
            
        if not cached:
            generate_master_question_bank(student_id, topic)
            
    except Exception as e:
        logger.error(f"[BGTask] Failed to pre-generate master question bank: {e}")
    finally:
        bg_generation_lock.release()

router = APIRouter()

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
            import os
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

@router.get("/content")
def get_learning_content_endpoint(
    student_id: int = 1,
    topic: Optional[str] = None,
    subject: Optional[str] = None,
    force: Optional[bool] = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Fetch ONLY the generated LLM content for a topic (which may be slow if not cached)."""
    if not topic:
        return {"notesResponse": [], "revision": {}}
        
    subject = resolve_standard_subject(topic, subject)
        
    cached = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == topic
    ).first()
    
    if not cached and subject:
        cached = db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.topic == topic
        ).first()
    
    if force:
        logger.info(f"FORCE REGENERATION: Deleting all cached content for topic='{topic}'")
        db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.topic == topic
        ).delete()
        
        # Delete question bank cache on regeneration
        from practice_models import AICache
        db.query(AICache).filter(
            AICache.student_id == student_id,
            AICache.topic == topic,
            AICache.action_type == "master_question_bank"
        ).delete()
        db.commit()
        return {"success": True, "message": "Cache cleared successfully"}
    
    is_old_format = False
    if cached:
        cached_str = str(cached.content)
        # Check case-insensitively to prevent minor casing differences from invalidating valid caches
        is_old_format = isinstance(cached.content, list) or ("why is it important" not in cached_str.lower() and "how does it work" not in cached_str.lower())
        if subject and ("keshav" in cached_str.lower() or "placement policy" in cached_str.lower() or "deregistered" in cached_str.lower()):
            logger.warning(f"CACHE INVALIDATED (Resume/Policy Leak detected): topic='{topic}', subject='{subject}'")
            is_old_format = True

        if "could not be generated" not in cached_str and not is_old_format:
            logger.info(f"CACHE HIT: topic='{topic}', subject='{subject}'")
            import threading
            threading.Thread(target=pre_generate_questions_bg, args=(student_id, topic, subject), daemon=True).start()
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
        elif is_old_format:
            logger.info(f"CACHE INVALIDATED (Old format): topic='{topic}', subject='{subject}'. Forcing regeneration...")
            db.delete(cached)
            # Delete question bank cache on old format invalidation
            from practice_models import AICache
            db.query(AICache).filter(
                AICache.student_id == student_id,
                AICache.topic == topic,
                AICache.action_type == "master_question_bank"
            ).delete()
            db.commit()
            cached = None
        
    content_data = generate_learning_content(student_id, topic, db, subject=subject)
    
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
    
    import threading
    threading.Thread(target=pre_generate_questions_bg, args=(student_id, topic, subject), daemon=True).start()
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

@router.get("/stream_content")
def stream_content(
    topic: Optional[str] = None,
    student_id: int = 1,
    subject: Optional[str] = None,
    bypass_cache: Optional[bool] = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Stream learning content progressively."""
    if not topic:
        return {"error": "Topic is required"}
        
    subject = resolve_standard_subject(topic or "", subject)
        
    cached = None
    # Ensure bypass_cache is treated as true if it's the boolean True or the string "true"
    is_bypass = bypass_cache is True or str(bypass_cache).lower() == "true"
    if not is_bypass:
        cached = db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.subject == subject,
            LearningContent.topic == topic
        ).first()
        
        if not cached:
            cached = db.query(LearningContent).filter(
                LearningContent.topic == topic
            ).first()
    
    import threading
    threading.Thread(target=pre_generate_questions_bg, args=(student_id, topic, subject), daemon=True).start()
    if cached:
        def generate_cached():
            content = cached.content
            if isinstance(content, list):
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
            
        return StreamingResponse(
            generate_cached(), 
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )

    return StreamingResponse(
        stream_learning_content(student_id, topic, db, subject=subject),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
    )
