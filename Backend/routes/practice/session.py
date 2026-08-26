import logging
import threading
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from practice_models import PracticeSession, PracticeQuestion
from services.practice.topic_extractor import extract_topics_from_documents
from services.practice.question_generator import generate_questions, _normalise_quiz_item
from services.practice.session_manager import (
    get_adaptive_difficulty,
    update_topic_performance,
    get_session_stats,
    finalize_session_history
)
from services.practice.analytics import get_weakness_topics_for_quiz
from services.authorization import require_student

logger = logging.getLogger("chatbot")

router = APIRouter()

_session_generation_lock = threading.Lock()
_session_generation_jobs: set[int] = set()
_session_generation_errors: dict[int, str] = {}
_INITIAL_GENERATION_BATCH_SIZE = 3
_CONTINUATION_GENERATION_BATCH_SIZE = 5


def _public_question(question: PracticeQuestion) -> dict:
    """Serialize a question without exposing the answer to the quiz client."""
    return {
        "id": question.id,
        "topic": question.topic,
        "subtopic": question.subtopic,
        "difficulty": question.difficulty,
        "question": question.question_text,
        "options": question.options,
    }


def _question_key(question: str) -> str:
    """Return a stable key used to avoid repeating a question in one session."""
    return " ".join(str(question or "").strip().casefold().split())


def _get_generation_error(session_id: int) -> Optional[str]:
    with _session_generation_lock:
        return _session_generation_errors.get(session_id)


def _clear_generation_error(session_id: int) -> None:
    with _session_generation_lock:
        _session_generation_errors.pop(session_id, None)


def _set_generation_error(session_id: int, error: str) -> None:
    with _session_generation_lock:
        _session_generation_errors[session_id] = error


def _generation_status(session: PracticeSession, available_count: int) -> str:
    """Describe availability separately from the requested target count."""
    target_count = max(1, int(session.question_count or 5))
    if available_count <= 0:
        return "generating" if session.is_active else "failed"
    if available_count >= target_count:
        return "ready" if session.is_active else "complete"
    if _get_generation_error(session.id):
        return "partial_failed"
    return "partial"


def _session_payload(session: PracticeSession, questions: list[PracticeQuestion]) -> dict:
    """Build the common response used by start, status, and replenishment APIs."""
    available_count = len(questions)
    generation_status = _generation_status(session, available_count)
    target_count = max(1, int(session.question_count or available_count or 5))
    return {
        "session_id": session.id,
        "mode": session.mode,
        "topic": session.topic,
        "difficulty": session.difficulty,
        "is_active": bool(session.is_active),
        "status": "generating" if generation_status in ("generating", "partial") else generation_status,
        "generation_status": generation_status,
        "question_count": target_count,
        "total_questions": target_count,
        "available_questions": available_count,
        "generation_complete": generation_status in ("ready", "complete"),
        "questions": [_public_question(question) for question in questions],
    }


def _persist_generated_questions(
    db: Session,
    session: PracticeSession,
    raw_questions: list[dict],
    topic: str,
    difficulty: str,
) -> int:
    """Validate, de-duplicate, and commit one generated batch."""
    existing = db.query(PracticeQuestion.question_text).filter(
        PracticeQuestion.session_id == session.id
    ).all()
    seen = {_question_key(row.question_text) for row in existing if row.question_text}
    added = 0

    for raw_question in raw_questions or []:
        if not isinstance(raw_question, dict):
            continue
        question_text = str(raw_question.get("question", "")).strip()
        question_key = _question_key(question_text)
        if not question_key or question_key in seen:
            continue
        options = raw_question.get("options")
        correct_answer = str(raw_question.get("correct_answer", "")).strip().upper()
        if not isinstance(options, list) or len(options) < 4 or correct_answer not in ("A", "B", "C", "D"):
            continue

        db.add(PracticeQuestion(
            session_id=session.id,
            topic=str(raw_question.get("topic") or topic).strip() or topic,
            subtopic=str(raw_question.get("subtopic") or "General").strip() or "General",
            difficulty=str(raw_question.get("difficulty") or difficulty).strip().lower(),
            question_text=question_text,
            options=options[:4],
            correct_answer=correct_answer,
            explanation=str(raw_question.get("explanation") or "").strip(),
        ))
        seen.add(question_key)
        added += 1

    if added:
        db.commit()
    return added


def _generate_session_questions(
    session_id: int,
    student_id: int,
    topic: str,
    difficulty: str,
    mode: str,
    question_count: int,
) -> None:
    """Generate a first batch, then replenish the session in the background."""
    worker_db = SessionLocal()
    no_progress_attempts = 0
    try:
        while True:
            session = worker_db.query(PracticeSession).filter(
                PracticeSession.id == session_id
            ).first()
            if not session or not session.is_active:
                return

            existing_count = worker_db.query(PracticeQuestion).filter(
                PracticeQuestion.session_id == session_id
            ).count()
            target_count = max(1, int(session.question_count or question_count or 5))
            if existing_count >= target_count:
                _clear_generation_error(session_id)
                logger.info(
                    "[Practice] Background generation completed for session %s (%s questions)",
                    session_id,
                    existing_count,
                )
                return

            generation_topic = session.topic or topic or "General"
            generation_difficulty = session.difficulty or difficulty or "mixed"
            if generation_difficulty in ("mixed", "adaptive"):
                generation_difficulty = get_adaptive_difficulty(
                    session.student_id,
                    generation_topic,
                    worker_db,
                )
            batch_size = _INITIAL_GENERATION_BATCH_SIZE if existing_count == 0 else _CONTINUATION_GENERATION_BATCH_SIZE
            batch_size = min(batch_size, target_count - existing_count)

            raw_questions = generate_questions(
                student_id=session.student_id,
                topic=generation_topic,
                difficulty=generation_difficulty,
                count=batch_size,
                db=worker_db,
                mode=session.mode or mode,
            )
            if not raw_questions:
                raise RuntimeError("No valid practice questions were generated")

            added_count = _persist_generated_questions(
                worker_db,
                session,
                raw_questions[:batch_size],
                generation_topic,
                generation_difficulty,
            )
            if added_count <= 0:
                no_progress_attempts += 1
                if no_progress_attempts >= 2:
                    raise RuntimeError("Generated questions were invalid or duplicates")
                continue

            no_progress_attempts = 0
            logger.info(
                "[Practice] Background generation added %s questions to session %s",
                added_count,
                session_id,
            )
    except Exception as exc:
        worker_db.rollback()
        logger.error("[Practice] Background generation failed for session %s: %s", session_id, exc)
        failed = worker_db.query(PracticeSession).filter(
            PracticeSession.id == session_id
        ).first()
        if failed:
            available_count = worker_db.query(PracticeQuestion).filter(
                PracticeQuestion.session_id == session_id
            ).count()
            if available_count:
                # A partial bank is still usable. Let the student finish the
                # questions already committed instead of losing the session.
                failed.question_count = available_count
                failed.ended_at = None
                worker_db.commit()
                _clear_generation_error(session_id)
                logger.warning(
                    "[Practice] Continuing session %s with %s available questions after partial generation failure",
                    session_id,
                    available_count,
                )
            else:
                failed.is_active = False
                failed.ended_at = datetime.utcnow()
                worker_db.commit()
                _set_generation_error(session_id, str(exc))
    finally:
        worker_db.close()
        with _session_generation_lock:
            _session_generation_jobs.discard(session_id)


def _queue_session_generation(
    session_id: int,
    student_id: int,
    topic: str,
    difficulty: str,
    mode: str,
    question_count: int,
) -> None:
    with _session_generation_lock:
        if session_id in _session_generation_jobs:
            return
        _session_generation_jobs.add(session_id)
    _clear_generation_error(session_id)

    threading.Thread(
        target=_generate_session_questions,
        args=(session_id, student_id, topic, difficulty, mode, question_count),
        daemon=True,
        name=f"practice-session-{session_id}",
    ).start()


def _maybe_queue_session_generation(
    session: PracticeSession,
    available_count: int,
) -> None:
    target_count = max(1, int(session.question_count or 5))
    if (
        not session.is_active
        or available_count >= target_count
        or _get_generation_error(session.id)
    ):
        return
    _queue_session_generation(
        session.id,
        session.student_id,
        session.topic or "General",
        session.difficulty,
        session.mode,
        target_count,
    )

class StartSessionRequest(BaseModel):
    student_id: int
    mode: str = "topic"         # topic | weakness | exam | revision
    topic: Optional[str] = None
    difficulty: str = "mixed"   # easy | medium | hard | mixed
    question_count: int = 5

def _stored_questions_match_requested_level(
    questions: list[PracticeQuestion],
    topic: str,
    difficulty: str,
) -> bool:
    """Keep old active sessions from resurfacing invalid medium/hard items."""
    if difficulty not in ("medium", "hard"):
        return True

    for question in questions:
        validated = _normalise_quiz_item(
            {
                "topic": question.topic or topic,
                "subtopic": question.subtopic,
                "difficulty": question.difficulty,
                "question": question.question_text,
                "options": question.options,
                "correct_answer": question.correct_answer,
                "explanation": question.explanation,
            },
            topic,
            difficulty,
            question.subtopic,
        )
        if not validated:
            return False
    return True


class SubmitAnswerRequest(BaseModel):
    student_id: int
    question_id: int
    answer: str                 # "A", "B", "C", "D"
    time_spent: int = 0         # seconds


@router.post("/session/start")
def start_session(req: StartSessionRequest, db: Session = Depends(get_db)):
    """Start a new practice session, or resume the active one if it exists."""
    require_student(req.student_id, db)
    try:
        logger.info(f"[Practice] Starting/resuming session: mode={req.mode}, topic={req.topic}, difficulty={req.difficulty}")
        requested_count = max(1, min(int(req.question_count or 5), 20))
        requested_difficulty = (req.difficulty or "mixed").strip().lower()
        if requested_difficulty not in ("easy", "medium", "hard", "mixed", "adaptive"):
            requested_difficulty = "mixed"

        # Check for an active session for this student/topic, but never resume a
        # different explicitly selected difficulty.
        if req.mode == "topic" and req.topic:
            existing_query = db.query(PracticeSession).filter(
                PracticeSession.student_id == req.student_id,
                PracticeSession.topic == req.topic,
                PracticeSession.is_active == True
            )
            if requested_difficulty in ("easy", "medium", "hard"):
                existing_query = existing_query.filter(
                    PracticeSession.difficulty == requested_difficulty
                )
            existing_session = existing_query.first()
            if existing_session:
                existing_questions = db.query(PracticeQuestion).filter(
                    PracticeQuestion.session_id == existing_session.id
                ).order_by(PracticeQuestion.id.asc()).all()
                if existing_questions and requested_difficulty in ("medium", "hard") and not _stored_questions_match_requested_level(
                    existing_questions, req.topic, requested_difficulty
                ):
                    logger.info(
                        "[Practice] Retiring stale %s session %s before starting a validated batch",
                        requested_difficulty,
                        existing_session.id,
                    )
                    existing_session.is_active = False
                    existing_session.ended_at = datetime.utcnow()
                    db.commit()
                    existing_questions = []
                if existing_questions:
                    if existing_session.question_count != requested_count:
                        existing_session.question_count = requested_count
                        db.commit()
                    _maybe_queue_session_generation(existing_session, len(existing_questions))
                    logger.info(f"[Practice] Resuming existing active session {existing_session.id} for topic='{req.topic}'")
                    return _session_payload(existing_session, existing_questions[:requested_count])
                if existing_session.is_active:
                    existing_session.question_count = requested_count
                    db.commit()
                    _maybe_queue_session_generation(existing_session, 0)
                    return _session_payload(existing_session, [])

        # Determine which topics to use based on mode
        if req.mode == "weakness":
            weak_topics = get_weakness_topics_for_quiz(req.student_id, db, limit=3)
            if not weak_topics:
                # No performance data yet — extract topics and pick first ones
                topics_data = extract_topics_from_documents(req.student_id, db)
                all_topics = []
                for subj in topics_data.get("subjects", []):
                    for t in subj.get("topics", []):
                        all_topics.append(t["name"])
                weak_topics = all_topics[:3] if all_topics else ["General"]

            topic_for_gen = ", ".join(weak_topics)
            difficulty = "easy"  # weakness mode starts easy
        elif req.mode == "exam":
            # Exam mode: use all topics
            topics_data = extract_topics_from_documents(req.student_id, db)
            all_topics = []
            for subj in topics_data.get("subjects", []):
                for t in subj.get("topics", []):
                    all_topics.append(t["name"])
            topic_for_gen = ", ".join(all_topics[:5]) if all_topics else "General"
            difficulty = "mixed"
        elif req.mode == "revision":
            weak_topics = get_weakness_topics_for_quiz(req.student_id, db, limit=5)
            topic_for_gen = ", ".join(weak_topics) if weak_topics else (req.topic or "General")
            difficulty = "easy"
        else:
            # Topic-based mode
            topic_for_gen = req.topic or "General"
            difficulty = requested_difficulty
            
        if difficulty == "mixed" or difficulty == "adaptive":
            difficulty = get_adaptive_difficulty(req.student_id, topic_for_gen, db)

        # Resume background work for weakness/exam/revision sessions as well.
        if not (req.mode == "topic" and req.topic):
            existing_session = db.query(PracticeSession).filter(
                PracticeSession.student_id == req.student_id,
                PracticeSession.mode == req.mode,
                PracticeSession.topic == topic_for_gen,
                PracticeSession.is_active == True,
            ).order_by(PracticeSession.created_at.desc()).first()
            if existing_session:
                existing_questions = db.query(PracticeQuestion).filter(
                    PracticeQuestion.session_id == existing_session.id
                ).order_by(PracticeQuestion.id.asc()).all()
                if existing_questions:
                    if existing_session.question_count != requested_count:
                        existing_session.question_count = requested_count
                        db.commit()
                    _maybe_queue_session_generation(existing_session, len(existing_questions))
                    return _session_payload(existing_session, existing_questions[:requested_count])
                existing_session.question_count = requested_count
                db.commit()
                _maybe_queue_session_generation(existing_session, 0)
                return _session_payload(existing_session, [])

        # Create session record
        session = PracticeSession(
            student_id=req.student_id,
            mode=req.mode,
            topic=topic_for_gen,
            difficulty=difficulty,
            question_count=requested_count,
            is_active=True,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        _queue_session_generation(
            session.id,
            session.student_id,
            session.topic or "General",
            session.difficulty,
            session.mode,
            requested_count,
        )

        return _session_payload(session, [])
    except Exception as e:
        logger.error(f"[Practice] CRASH in start_session: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/answer")
def submit_answer(session_id: int, req: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit an answer for a question and get feedback."""
    require_student(req.student_id, db)
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.student_id == req.student_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    question = db.query(PracticeQuestion).filter(PracticeQuestion.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.session_id != session_id:
        raise HTTPException(status_code=400, detail="Question does not belong to this session")

    # A retry after a lost response must not count the same answer twice.
    if question.student_answer is not None:
        if question.is_correct is None or question.answered_at is None:
            raise HTTPException(
                status_code=409,
                detail="Question has already been submitted",
            )
        return {
            "is_correct": bool(question.is_correct),
            "correct_answer": question.correct_answer,
            "explanation": question.explanation,
            "stats": get_session_stats(session, db),
        }

    # Record the answer
    is_correct = req.answer.upper() == question.correct_answer.upper()
    question.student_answer = req.answer.upper()
    question.is_correct = is_correct
    question.time_spent_seconds = req.time_spent
    question.answered_at = datetime.utcnow()

    # Update session stats
    if is_correct:
        session.correct_answers += 1

    db.commit()

    # Update topic performance
    update_topic_performance(
        student_id=session.student_id,
        topic=question.topic,
        is_correct=is_correct,
        db=db,
        session_id=session_id,
        subject=question.subtopic,
    )
    # Get updated session stats
    stats = get_session_stats(session, db)

    return {
        "is_correct": is_correct,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "stats": stats,
    }


@router.get("/session/{session_id}/status")
def session_status(
    session_id: int,
    student_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Get live session statistics."""
    require_student(student_id, db)
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.student_id == student_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = db.query(PracticeQuestion).filter(
        PracticeQuestion.session_id == session.id
    ).order_by(PracticeQuestion.id.asc()).all()
    _maybe_queue_session_generation(session, len(questions))

    response = _session_payload(session, questions)
    response.update(get_session_stats(session, db))
    target_count = max(1, int(session.question_count or len(questions) or 5))
    response["question_count"] = target_count
    response["total_questions"] = target_count
    response["available_questions"] = len(questions)
    return response


@router.post("/session/{session_id}/next-batch")
def next_batch(
    session_id: int,
    student_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Ensure background replenishment is running and return currently available questions."""
    require_student(student_id, db)
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.student_id == student_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = db.query(PracticeQuestion).filter(
        PracticeQuestion.session_id == session.id
    ).order_by(PracticeQuestion.id.asc()).all()
    existing_count = len(questions)
    target_count = max(1, int(session.question_count or 5))

    if existing_count >= target_count:
        if session.is_active:
            session.is_active = False
            session.ended_at = datetime.utcnow()
            finalize_session_history(session, db)
            db.commit()
        response = _session_payload(session, questions)
        response["questions"] = []
        response["session_complete"] = True
        response["stats"] = get_session_stats(session, db)
        return response

    # A failed empty worker can be retried by the next interaction.
    if not session.is_active and existing_count == 0 and _get_generation_error(session.id):
        session.is_active = True
        session.ended_at = None
        db.commit()
        _clear_generation_error(session.id)

    _maybe_queue_session_generation(session, existing_count)
    response = _session_payload(session, questions)
    response["session_complete"] = False
    response["stats"] = get_session_stats(session, db)
    return response
