import logging
import threading
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from practice_models import PracticeSession, PracticeQuestion
from services.practice.topic_extractor import extract_topics_from_documents
from services.practice.question_generator import generate_questions
from services.practice.session_manager import (
    get_adaptive_difficulty,
    update_topic_performance,
    get_session_stats,
    finalize_session_history
)
from services.practice.analytics import get_weakness_topics_for_quiz

logger = logging.getLogger("chatbot")

router = APIRouter()

_session_generation_lock = threading.Lock()
_session_generation_jobs: set[int] = set()


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


def _generate_session_questions(
    session_id: int,
    student_id: int,
    topic: str,
    difficulty: str,
    mode: str,
    question_count: int,
) -> None:
    """Generate and persist a session's questions independently of the browser."""
    worker_db = SessionLocal()
    try:
        session = worker_db.query(PracticeSession).filter(
            PracticeSession.id == session_id
        ).first()
        if not session or not session.is_active:
            return

        raw_questions = generate_questions(
            student_id=student_id,
            topic=topic,
            difficulty=difficulty,
            count=question_count,
            db=worker_db,
            mode=mode,
        )
        if not raw_questions:
            raise RuntimeError("No valid practice questions were generated")

        existing_count = worker_db.query(PracticeQuestion).filter(
            PracticeQuestion.session_id == session_id
        ).count()
        if existing_count:
            return

        for question in raw_questions[:question_count]:
            worker_db.add(PracticeQuestion(
                session_id=session_id,
                topic=question["topic"],
                subtopic=question.get("subtopic", "General"),
                difficulty=question.get("difficulty", difficulty),
                question_text=question["question"],
                options=question["options"],
                correct_answer=question["correct_answer"],
                explanation=question.get("explanation", ""),
            ))

        # If the material cannot support the requested count, make the actual
        # count authoritative so the session does not wait for an impossible batch.
        session.question_count = min(question_count, len(raw_questions))
        worker_db.commit()
        logger.info(
            "[Practice] Background generation completed for session %s (%s questions)",
            session_id,
            len(raw_questions[:question_count]),
        )
    except Exception as exc:
        worker_db.rollback()
        logger.error("[Practice] Background generation failed for session %s: %s", session_id, exc)
        failed = worker_db.query(PracticeSession).filter(
            PracticeSession.id == session_id
        ).first()
        if failed:
            failed.is_active = False
            failed.ended_at = datetime.utcnow()
            worker_db.commit()
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

    threading.Thread(
        target=_generate_session_questions,
        args=(session_id, student_id, topic, difficulty, mode, question_count),
        daemon=True,
        name=f"practice-session-{session_id}",
    ).start()

class StartSessionRequest(BaseModel):
    student_id: int
    mode: str = "topic"         # topic | weakness | exam | revision
    topic: Optional[str] = None
    difficulty: str = "mixed"   # easy | medium | hard | mixed
    question_count: int = 5

class SubmitAnswerRequest(BaseModel):
    question_id: int
    answer: str                 # "A", "B", "C", "D"
    time_spent: int = 0         # seconds


@router.post("/session/start")
def start_session(req: StartSessionRequest, db: Session = Depends(get_db)):
    """Start a new practice session, or resume the active one if it exists."""
    try:
        logger.info(f"[Practice] Starting/resuming session: mode={req.mode}, topic={req.topic}, difficulty={req.difficulty}")
        requested_count = max(1, min(int(req.question_count or 5), 20))

        # Check for existing active session for this student and topic to support instant refresh recovery
        # Check for existing active session for this student and topic to support instant refresh recovery
        if req.mode == "topic" and req.topic:
            existing_session = db.query(PracticeSession).filter(
                PracticeSession.student_id == req.student_id,
                PracticeSession.topic == req.topic,
                PracticeSession.is_active == True
            ).first()
            if existing_session:
                existing_questions = db.query(PracticeQuestion).filter(
                    PracticeQuestion.session_id == existing_session.id
                ).order_by(PracticeQuestion.id.asc()).all()
                if existing_questions:
                    logger.info(f"[Practice] Resuming existing active session {existing_session.id} for topic='{req.topic}'")
                    return {
                        "session_id": existing_session.id,
                        "mode": existing_session.mode,
                        "topic": existing_session.topic,
                        "difficulty": existing_session.difficulty,
                        "status": "ready",
                        "generation_status": "ready",
                        "question_count": existing_session.question_count or len(existing_questions),
                        "total_questions": existing_session.question_count or len(existing_questions),
                        "questions": [_public_question(pq) for pq in existing_questions],
                    }
                if existing_session.is_active:
                    existing_session.question_count = requested_count
                    db.commit()
                    _queue_session_generation(
                        existing_session.id,
                        existing_session.student_id,
                        existing_session.topic or "General",
                        existing_session.difficulty,
                        existing_session.mode,
                        requested_count,
                    )
                    return {
                        "session_id": existing_session.id,
                        "mode": existing_session.mode,
                        "topic": existing_session.topic,
                        "difficulty": existing_session.difficulty,
                        "status": "generating",
                        "generation_status": "generating",
                        "question_count": requested_count,
                        "total_questions": requested_count,
                        "questions": [],
                    }

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
            difficulty = req.difficulty
            
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
                    return {
                        "session_id": existing_session.id,
                        "mode": existing_session.mode,
                        "topic": existing_session.topic,
                        "difficulty": existing_session.difficulty,
                        "status": "ready",
                        "generation_status": "ready",
                        "question_count": existing_session.question_count or len(existing_questions),
                        "total_questions": existing_session.question_count or len(existing_questions),
                        "questions": [_public_question(question) for question in existing_questions],
                    }
                existing_session.question_count = requested_count
                db.commit()
                _queue_session_generation(
                    existing_session.id,
                    existing_session.student_id,
                    existing_session.topic or "General",
                    existing_session.difficulty,
                    existing_session.mode,
                    requested_count,
                )
                return {
                    "session_id": existing_session.id,
                    "mode": existing_session.mode,
                    "topic": existing_session.topic,
                    "difficulty": existing_session.difficulty,
                    "status": "generating",
                    "generation_status": "generating",
                    "question_count": requested_count,
                    "total_questions": requested_count,
                    "questions": [],
                }

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

        return {
            "session_id": session.id,
            "mode": session.mode,
            "topic": session.topic,
            "difficulty": difficulty,
            "status": "generating",
            "generation_status": "generating",
            "question_count": requested_count,
            "total_questions": session.question_count,
            "questions": [],
        }
    except Exception as e:
        logger.error(f"[Practice] CRASH in start_session: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/answer")
def submit_answer(session_id: int, req: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit an answer for a question and get feedback."""
    session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    question = db.query(PracticeQuestion).filter(PracticeQuestion.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.session_id != session_id:
        raise HTTPException(status_code=400, detail="Question does not belong to this session")

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
def session_status(session_id: int, db: Session = Depends(get_db)):
    """Get live session statistics."""
    session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    stats = get_session_stats(session, db)
    questions = db.query(PracticeQuestion).filter(
        PracticeQuestion.session_id == session.id
    ).order_by(PracticeQuestion.id.asc()).all()
    if questions:
        generation_status = "ready" if session.is_active else "complete"
    else:
        generation_status = "generating" if session.is_active else "failed"

    return {
        "session_id": session.id,
        "mode": session.mode,
        "topic": session.topic,
        "difficulty": session.difficulty,
        "is_active": session.is_active,
        **stats,
        "generation_status": generation_status,
        "total_questions": session.question_count or len(questions),
        "questions": [_public_question(question) for question in questions],
    }


@router.post("/session/{session_id}/next-batch")
def next_batch(session_id: int, db: Session = Depends(get_db)):
    """Generate the next batch of questions with adaptive difficulty."""
    session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Count existing questions
    existing_count = (
        db.query(PracticeQuestion)
        .filter(PracticeQuestion.session_id == session_id)
        .count()
    )

    remaining = session.question_count - existing_count
    if remaining <= 0:
        # End session
        if session.is_active:
            session.is_active = False
            session.ended_at = datetime.utcnow()
            
            # Finalize session (QuizHistory & UserPerformance)
            finalize_session_history(session, db)
            
            db.commit()
        return {"questions": [], "session_complete": True, "stats": get_session_stats(session, db)}

    gen_count = min(remaining, 5)

    # Adaptive difficulty based on current session performance
    difficulty = get_adaptive_difficulty(session.student_id, session.topic or "General", db)

    raw_questions = generate_questions(
        student_id=session.student_id,
        topic=session.topic or "General",
        difficulty=difficulty,
        count=gen_count,
        db=db,
        mode=session.mode,
    )

    saved_questions = []
    pending_questions = []
    for q in raw_questions:
        pq = PracticeQuestion(
            session_id=session.id,
            topic=q["topic"],
            subtopic=q.get("subtopic", "General"),
            difficulty=q.get("difficulty", difficulty),
            question_text=q["question"],
            options=q["options"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
        )
        db.add(pq)
        pending_questions.append(pq)
    db.flush()
    for pq in pending_questions:
        saved_questions.append({
            "id": pq.id,
            "topic": pq.topic,
            "subtopic": pq.subtopic,
            "difficulty": pq.difficulty,
            "question": pq.question_text,
            "options": pq.options,
        })
    db.commit()

    return {
        "questions": saved_questions,
        "session_complete": False,
        "difficulty": difficulty,
    }
