import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from practice_models import LearningContent
from services.practice.content_generator import (
    STREAM_CACHE_MARKER,
    generate_learning_content,
    stream_learning_content,
    has_valid_revision,
    has_valid_structured_notes,
    has_valid_stream_notes,
    split_revision_payload,
)
from services.authorization import require_student

logger = logging.getLogger("chatbot")

import threading
bg_generation_lock = threading.Lock()
class _GenerationJob:
    """A process-local stream buffer that survives a browser navigation."""

    def __init__(self):
        self.condition = threading.Condition()
        self.chunks = []
        self.done = False
        self.error = None
        self.cancel_event = threading.Event()

generation_jobs = {}
generation_jobs_lock = threading.Lock()

def _run_generation_job(job, student_id: int, topic: str, subject: Optional[str], key: str):
    from database import SessionLocal

    local_db = SessionLocal()
    try:
        for chunk in stream_learning_content(
            student_id,
            topic,
            local_db,
            subject=subject,
            cancel_event=job.cancel_event,
        ):
            with job.condition:
                job.chunks.append(chunk)
                job.condition.notify_all()
    except Exception as exc:
        job.error = exc
        logger.error(f"[StreamContent] Background generation failed for '{topic}': {exc}")
    finally:
        local_db.close()
        with job.condition:
            job.done = True
            job.condition.notify_all()
        with generation_jobs_lock:
            if generation_jobs.get(key) is job:
                generation_jobs.pop(key, None)

def _stream_generation_job(job):
    cursor = 0
    while True:
        with job.condition:
            while cursor >= len(job.chunks) and not job.done:
                job.condition.wait(timeout=1)
            pending = job.chunks[cursor:]
            cursor = len(job.chunks)
            done = job.done

        for chunk in pending:
            yield chunk

        if done:
            return


def _get_generation_job(student_id: int, topic: str, subject: Optional[str], key: str, replace: bool = False):
    with generation_jobs_lock:
        if replace and key in generation_jobs:
            generation_jobs[key].cancel_event.set()
            generation_jobs.pop(key, None)

        job = generation_jobs.get(key)
        if job is None:
            job = _GenerationJob()
            generation_jobs[key] = job
            threading.Thread(
                target=_run_generation_job,
                args=(job, student_id, topic, subject, key),
                daemon=True,
            ).start()
        return job

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
            # Question banks are student-scoped. Never reuse another student's
            # private practice bank.
            cached = bg_db.query(AICache).filter(
                AICache.student_id == student_id,
                AICache.topic.ilike(topic),
                AICache.action_type == "master_question_bank"
            ).first()
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

@router.api_route("/clear_content_cache", methods=["GET", "DELETE"])
def clear_content_cache(student_id: int = Query(...), db: Session = Depends(get_db)):
    """Delete only the active student's cached learning content."""
    require_student(student_id, db)
    count = db.query(LearningContent).filter(LearningContent.student_id == student_id).delete()
    db.commit()
    return {"deleted": count}

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

def _resolve_cached_subject(student_id: int, topic: Optional[str], subject: Optional[str], db: Session) -> Optional[str]:
    """Recover the original summary scope when an older link omitted subject."""
    if subject or not topic:
        return subject

    cached_subject = (
        db.query(LearningContent.subject)
        .filter(
            LearningContent.student_id == student_id,
            LearningContent.topic == topic,
            LearningContent.subject.isnot(None),
            LearningContent.subject != "",
        )
        .order_by(LearningContent.id.desc())
        .first()
    )
    return cached_subject[0] if cached_subject and cached_subject[0] else subject

@router.get("/content")
def get_learning_content_endpoint(
    student_id: int,
    topic: Optional[str] = None,
    subject: Optional[str] = None,
    force: Optional[bool] = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Fetch ONLY the generated LLM content for a topic (which may be slow if not cached)."""
    require_student(student_id, db)
    if not topic:
        return {"notesResponse": [], "revision": {}}
        
    subject = resolve_standard_subject(topic, subject)
    subject = _resolve_cached_subject(student_id, topic, subject, db)
        
    cached = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == topic
    ).first()
    
    if cached and not has_valid_revision(cached.revision):
        logger.info(f"INVALIDATING incomplete revision cache: topic='{topic}', subject='{subject}'")
        db.delete(cached)
        db.commit()
        cached = None

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
        is_old_format = not (
            has_valid_structured_notes(cached.content)
            or has_valid_stream_notes(cached.content)
        )
        if subject and ("keshav" in cached_str.lower() or "placement policy" in cached_str.lower() or "deregistered" in cached_str.lower()):
            logger.warning(f"CACHE INVALIDATED (Resume/Policy Leak detected): topic='{topic}', subject='{subject}'")
            is_old_format = True

        if "could not be generated" not in cached_str and not is_old_format:
            clean_content, embedded_revision = split_revision_payload(cached.content, topic, subject)
            logger.info(f"CACHE HIT: topic='{topic}', subject='{subject}'")
            import threading
            threading.Thread(target=pre_generate_questions_bg, args=(student_id, topic, subject), daemon=True).start()
            return {
                "notesResponse": {
                    "success": True,
                    "generatedBy": "AI Assistant (Cached)",
                    "status": "Personal Study Guide",
                    "topic": topic,
                    "content": clean_content
                },
                "revision": cached.revision or embedded_revision
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
async def stream_content(
    request: Request,
    student_id: int,
    topic: Optional[str] = None,
    subject: Optional[str] = None,
    bypass_cache: Optional[bool] = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Stream learning content progressively. Detects client disconnect to abort LLM generation."""
    require_student(student_id, db)
    if not topic:
        return {"error": "Topic is required"}
        
    subject = resolve_standard_subject(topic or "", subject)
    subject = _resolve_cached_subject(student_id, topic, subject, db)
        
    cached = None
    # Ensure bypass_cache is treated as true if it's the boolean True or the string "true"
    is_bypass = bypass_cache is True or str(bypass_cache).lower() == "true"
    if not is_bypass:
        cached = db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.subject == subject,
            LearningContent.topic == topic
        ).first()
        
    if cached and not has_valid_revision(cached.revision):
        logger.info(f"INVALIDATING incomplete revision stream cache: topic='{topic}', subject='{subject}'")
        db.delete(cached)
        db.commit()
        cached = None

    # Structured legacy notes and completed streamed text are both valid. Only
    # empty/error text should be removed before deciding whether to regenerate.
    if cached and isinstance(cached.content, str) and not has_valid_stream_notes(cached.content):
        logger.info(f"INVALIDATING unusable summary cache: topic='{topic}', subject='{subject}'")
        db.delete(cached)
        db.commit()
        cached = None

    if cached:
        # Only pre-generate questions for cached (instant) topics to avoid overloading
        import threading as _threading
        _threading.Thread(target=pre_generate_questions_bg, args=(student_id, topic, subject), daemon=True).start()

        def generate_cached():
            content = cached.content
            embedded_revision = None
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
                cached_text = str(content)
                if cached_text.lstrip().startswith(STREAM_CACHE_MARKER):
                    cached_text = cached_text.lstrip()[len(STREAM_CACHE_MARKER):].lstrip()
                md_content, embedded_revision = split_revision_payload(cached_text, topic, subject)

            yield md_content
            yield "\n\n---REVISION---\n"
            yield json.dumps(embedded_revision or cached.revision)
            
        return StreamingResponse(
            generate_cached(), 
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )

    # When regenerating, delete old cache so the new stream replaces it
    if is_bypass:
        db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.topic == topic
        ).delete()
        db.commit()

    key = f"{student_id}:{subject or ''}:{topic}"
    job = _get_generation_job(student_id, topic, subject, key, replace=is_bypass)
    return StreamingResponse(
        _stream_generation_job(job),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
    )
