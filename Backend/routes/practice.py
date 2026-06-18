"""
routes/practice.py — Adaptive Practice Mode API
════════════════════════════════════════════════
Endpoints for the adaptive learning engine:
  • Start/manage practice sessions
  • Generate and submit quiz questions
  • Track performance and adapt difficulty
  • Extract topics from uploaded documents
"""

from __future__ import annotations

import logging
import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from practice_models import (
    PracticeSession, PracticeQuestion,
    TopicPerformance, BehavioralInsight, CustomTopic,
)
from services.practice_engine import (
    extract_topics_from_documents,
    generate_questions,
    get_adaptive_difficulty,
    update_topic_performance,
    get_weak_topics,
    get_weakness_topics_for_quiz,
    detect_behavioral_patterns,
    get_stored_insights,
    get_session_stats,
    finalize_session_history,
)

logger = logging.getLogger("chatbot")

router = APIRouter(prefix="/practice", tags=["practice"])


# ═════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class AddCustomTopicRequest(BaseModel):
    student_id: int
    topic_name: str
    subject_name: Optional[str] = "General Topics"

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


# ═════════════════════════════════════════════════════════════════════════════
#  TOPIC EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/topics/{student_id}")
def get_topics(student_id: int, db: Session = Depends(get_db)):
    """Extract topics from student's uploaded documents."""
    logger.info(f"[Practice] Extracting topics for student_id={student_id}")

    topics_data = extract_topics_from_documents(student_id, db)

    # Enrich with performance data
    performances = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .all()
    )
    perf_map = {p.topic: p for p in performances}

    # Add performance info to each topic
    for subject in topics_data.get("subjects", []):
        for topic in subject.get("topics", []):
            perf = perf_map.get(topic["name"])
            if perf:
                topic["accuracy"] = round(perf.accuracy, 1)
                topic["mastery_level"] = perf.mastery_level
                topic["total_attempts"] = perf.total_attempts
            else:
                topic["accuracy"] = None
                topic["mastery_level"] = "new"
                topic["total_attempts"] = 0

    return topics_data


@router.post("/custom-topics")
def add_custom_topic(req: AddCustomTopicRequest, db: Session = Depends(get_db)):
    """Save a user-selected general/custom topic to the database."""
    existing = (
        db.query(CustomTopic)
        .filter(CustomTopic.student_id == req.student_id)
        .filter(CustomTopic.topic_name == req.topic_name)
        .filter(CustomTopic.subject_name == req.subject_name)
        .first()
    )
    if existing:
        return {"status": "success", "message": "Topic already added", "id": existing.id}
    
    custom_topic = CustomTopic(
        student_id=req.student_id,
        topic_name=req.topic_name,
        subject_name=req.subject_name
    )
    db.add(custom_topic)
    db.commit()
    db.refresh(custom_topic)
    return {"status": "success", "message": "Topic added successfully", "id": custom_topic.id}


# ═════════════════════════════════════════════════════════════════════════════
#  SESSION MANAGEMENT
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/session/start")
def start_session(req: StartSessionRequest, db: Session = Depends(get_db)):
    """Start a new practice session and generate the first batch of questions."""
    logger.info(f"[Practice] Starting session: mode={req.mode}, topic={req.topic}, difficulty={req.difficulty}")

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

    # Create session record
    session = PracticeSession(
        student_id=req.student_id,
        mode=req.mode,
        topic=topic_for_gen,
        difficulty=difficulty,
        total_questions=req.question_count,
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate first batch of questions
    gen_count = min(req.question_count, 5)
    raw_questions = generate_questions(
        student_id=req.student_id,
        topic=topic_for_gen,
        difficulty=difficulty,
        count=gen_count,
        db=db,
        mode=req.mode,
    )

    # Save questions to DB
    saved_questions = []
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
        db.commit()
        db.refresh(pq)
        saved_questions.append({
            "id": pq.id,
            "topic": pq.topic,
            "subtopic": pq.subtopic,
            "difficulty": pq.difficulty,
            "question": pq.question_text,
            "options": pq.options,
        })

    return {
        "session_id": session.id,
        "mode": session.mode,
        "topic": session.topic,
        "difficulty": difficulty,
        "total_questions": session.total_questions,
        "questions": saved_questions,
    }


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
        session.correct_count += 1

    db.commit()

    # Update topic performance
    update_topic_performance(
        student_id=session.student_id,
        topic=question.topic,
        is_correct=is_correct,
        db=db,
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
    return {
        "session_id": session.id,
        "mode": session.mode,
        "topic": session.topic,
        "is_active": session.is_active,
        **stats,
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

    remaining = session.total_questions - existing_count
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
        db.commit()
        db.refresh(pq)
        saved_questions.append({
            "id": pq.id,
            "topic": pq.topic,
            "subtopic": pq.subtopic,
            "difficulty": pq.difficulty,
            "question": pq.question_text,
            "options": pq.options,
        })

    return {
        "questions": saved_questions,
        "session_complete": False,
        "difficulty": difficulty,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  PERFORMANCE & INSIGHTS
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/performance/{student_id}")
def get_performance(student_id: int, db: Session = Depends(get_db)):
    """Get per-topic performance, weak areas, and behavioral insights."""
    weak_topics = get_weak_topics(student_id, db)
    insights = detect_behavioral_patterns(student_id, db)
    stored_insights = get_stored_insights(student_id, db)

    # Overall stats
    all_perfs = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .all()
    )

    total_attempts = sum(p.total_attempts for p in all_perfs)
    total_correct = sum(p.correct_count for p in all_perfs)
    overall_accuracy = (total_correct / total_attempts * 100) if total_attempts > 0 else 0

    return {
        "overall_accuracy": round(overall_accuracy, 1),
        "total_attempts": total_attempts,
        "total_correct": total_correct,
        "weak_topics": weak_topics,
        "insights": stored_insights if stored_insights else insights,
        "topic_performances": [
            {
                "topic": p.topic,
                "subject": p.subject or "General",
                "accuracy": round(p.accuracy, 1),
                "total_attempts": p.total_attempts,
                "mastery_level": p.mastery_level,
                "current_difficulty": p.current_difficulty,
            }
            for p in all_perfs
        ],
    }


# ═════════════════════════════════════════════════════════════════════════════
#  BACKWARD-COMPATIBLE DATA ENDPOINT
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/data")
async def get_practice_data(student_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Returns practice data in the format expected by the existing frontend.
    Now dynamically generated from documents + performance data.
    """

    practice_modes = [
        {
            "id": "weakness",
            "iconName": "alert-circle",
            "title": "Weakness-Based",
            "description": "AI targets your weak areas",
            "isCurrent": True,
        },
        {
            "id": "topic",
            "iconName": "book-2",
            "title": "Topic-Based",
            "description": "Practice a specific topic",
        },
        {
            "id": "exam",
            "iconName": "clipboard-check",
            "title": "Exam Simulation",
            "description": "Full mock exam experience",
        },
        {
            "id": "revision",
            "iconName": "bookmark",
            "title": "Revision Mode",
            "description": "Revisit bookmarked topics",
        },
    ]

    difficulties = [
        {"label": "Easy", "value": "easy"},
        {"label": "Mixed", "value": "mixed"},
        {"label": "Hard", "value": "hard"},
    ]

    # ── Topic Priority Order ──
    # 1. Document-derived topics (if user has uploaded documents)
    # 2. Custom topics (merged into whichever source is active)
    # 3. Default 8-semester curriculum (fallback when no documents)

    subjects = []
    has_documents = False
    colors = ["#a78bfa", "#60a5fa", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#f43f5e", "#6366f1"]
    perf_map = {}

    if student_id:
        performances = (
            db.query(TopicPerformance)
            .filter(TopicPerformance.student_id == student_id)
            .all()
        )
        perf_map = {p.topic: p for p in performances}

        # ── PRIORITY 1: Document-derived topics ──
        topics_data = extract_topics_from_documents(student_id, db)
        if topics_data and topics_data.get("subjects"):
            has_documents = True

            for i, subj in enumerate(topics_data.get("subjects", [])):
                topic_names = [t["name"] for t in subj.get("topics", [])]

                weak_areas = []
                for t_name in topic_names:
                    p = perf_map.get(t_name)
                    if p and p.mastery_level in ("weak", "medium"):
                        weak_areas.append(t_name)
                    elif not p:
                        weak_areas.append(t_name)  # untested = weak

                subjects.append({
                    "id": subj["name"].lower().replace(" ", "-"),
                    "title": subj["name"],
                    "iconName": "Book",
                    "color": colors[i % len(colors)],
                    "weakAreas": weak_areas,
                    "topics": topic_names,
                    "isExpanded": i == 0,
                    "section": "documents",
                })

    # ── PRIORITY 3: Default 8-semester curriculum (Always loaded now) ──
    config_path = os.path.join(
        os.path.dirname(__file__), "..", "config", "default_curriculum.json"
    )
    try:
        with open(config_path, "r") as f:
            curriculum_data = json.load(f)

        for i, sem in enumerate(curriculum_data.get("semesters", [])):
            weak_areas = []
            if student_id:
                for t_name in sem.get("topics", []):
                    p = perf_map.get(t_name)
                    if p and p.mastery_level in ("weak", "medium"):
                        weak_areas.append(t_name)
                    elif not p:
                        weak_areas.append(t_name)

            subjects.append({
                "id": sem["id"],
                "title": sem["title"],
                "iconName": sem.get("iconName", "Book"),
                "color": sem.get("color", colors[i % len(colors)]),
                "weakAreas": weak_areas,
                "topics": sem.get("topics", []),
                "isExpanded": not has_documents and i == 0,
                "section": "curriculum",
            })
    except Exception as e:
        logger.error(f"Failed to load default curriculum: {e}")

    # ── PRIORITY 2: Custom topics (merged into active list) ──
    if student_id:
        custom_topics = (
            db.query(CustomTopic)
            .filter(CustomTopic.student_id == student_id)
            .all()
        )

        for ct in custom_topics:
            # Try to find a matching subject to merge into
            subj_match = next(
                (s for s in subjects if s["title"].lower() == ct.subject_name.lower()),
                None,
            )
            if subj_match:
                if ct.topic_name not in subj_match["topics"]:
                    subj_match["topics"].append(ct.topic_name)
                    p = perf_map.get(ct.topic_name)
                    if not p or p.mastery_level in ("weak", "medium"):
                        if ct.topic_name not in subj_match["weakAreas"]:
                            subj_match["weakAreas"].append(ct.topic_name)
            else:
                # Create a new subject category for orphan custom topics
                # Group all custom topics under the same subject_name together
                existing_custom = next(
                    (s for s in subjects if s["id"] == ct.subject_name.lower().replace(" ", "-")),
                    None,
                )
                if existing_custom:
                    if ct.topic_name not in existing_custom["topics"]:
                        existing_custom["topics"].append(ct.topic_name)
                else:
                    p = perf_map.get(ct.topic_name)
                    is_weak = not p or p.mastery_level in ("weak", "medium")
                    subjects.append({
                        "id": ct.subject_name.lower().replace(" ", "-"),
                        "title": ct.subject_name,
                        "iconName": "Folder",
                        "color": colors[len(subjects) % len(colors)],
                        "weakAreas": [ct.topic_name] if is_weak else [],
                        "topics": [ct.topic_name],
                        "isExpanded": False,
                        "section": "documents" if has_documents else "curriculum",
                    })

    # Session stats from DB
    session_stats = {"attempted": 0, "accuracy": 0, "time": "0m", "progress": 0, "total": 0}
    if student_id:
        all_perfs = (
            db.query(TopicPerformance)
            .filter(TopicPerformance.student_id == student_id)
            .all()
        )
        total_attempts = sum(p.total_attempts for p in all_perfs)
        total_correct = sum(p.correct_count for p in all_perfs)
        accuracy = (total_correct / total_attempts * 100) if total_attempts > 0 else 0
        session_stats = {
            "attempted": total_attempts,
            "accuracy": round(accuracy),
            "time": f"{total_attempts * 2}m",  # rough estimate
            "progress": min(total_attempts, 100),
            "total": 100,
        }

    return {
        "practiceModes": practice_modes,
        "subjects": subjects,
        "difficulties": difficulties,
        "sessionStats": session_stats,
        "sampleQuestions": [],  # questions now come from /session/start
    }
