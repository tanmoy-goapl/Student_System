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
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from practice_models import (
    PracticeSession, PracticeQuestion,
    TopicPerformance, BehavioralInsight,
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
)

logger = logging.getLogger("chatbot")

router = APIRouter(prefix="/practice", tags=["practice"])


# ═════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

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
        session.is_active = False
        session.ended_at = datetime.utcnow()
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

    # Dynamic subjects from documents
    subjects = []
    if student_id:
        topics_data = extract_topics_from_documents(student_id, db)
        performances = (
            db.query(TopicPerformance)
            .filter(TopicPerformance.student_id == student_id)
            .all()
        )
        perf_map = {p.topic: p for p in performances}

        colors = ["#a78bfa", "#60a5fa", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#f43f5e", "#6366f1"]

        for i, subj in enumerate(topics_data.get("subjects", [])):
            topic_names = []
            for t in subj.get("topics", []):
                perf = perf_map.get(t["name"])
                topic_names.append(t["name"])

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
            })

    if not subjects:
        # Fallback to default subjects if no documents are uploaded or extraction fails
        subjects = [
            {
                "id": "physics",
                "title": "Physics",
                "iconName": "Atom",
                "color": "#a78bfa",
                "weakAreas": ["Electrostatics", "Ray Optics", "Rotational Motion"],
                "topics": [
                    "Units and Measurements",
                    "Kinematics",
                    "Laws of Motion",
                    "Work, Energy and Power",
                    "Rotational Motion",
                    "Gravitation",
                    "Mechanical Properties of Solids",
                    "Mechanical Properties of Fluids",
                    "Thermal Properties of Matter",
                    "Thermodynamics",
                    "Kinetic Theory of Gases",
                    "Oscillations",
                    "Waves",
                    "Electrostatics",
                    "Current Electricity",
                    "Magnetic Effects of Current",
                    "Magnetism and Matter",
                    "Electromagnetic Induction",
                    "Alternating Current",
                    "Electromagnetic Waves",
                    "Ray Optics",
                    "Wave Optics",
                    "Dual Nature of Matter and Radiation",
                    "Atoms and Nuclei",
                    "Semiconductor Electronics",
                    "Communication Systems"
                ],
                "isExpanded": True,
            },
            {
                "id": "chemistry",
                "title": "Chemistry",
                "iconName": "FlaskConical",
                "color": "#60a5fa",
                "weakAreas": ["General Organic Chemistry", "Chemical Kinetics"],
                "topics": [
                    "Mole Concept",
                    "Structure of Atom",
                    "Classification of Elements & Periodicity",
                    "Chemical Bonding & Molecular Structure",
                    "States of Matter",
                    "Thermodynamics",
                    "Equilibrium",
                    "Redox Reactions",
                    "Hydrogen",
                    "s-Block Elements",
                    "p-Block Elements",
                    "d- and f-Block Elements",
                    "Coordination Compounds",
                    "Environmental Chemistry",
                    "General Organic Chemistry",
                    "Hydrocarbons",
                    "Haloalkanes and Haloarenes",
                    "Alcohols, Phenols and Ethers",
                    "Aldehydes, Ketones and Carboxylic Acids",
                    "Organic Compounds Containing Nitrogen",
                    "Biomolecules",
                    "Polymers",
                    "Chemistry in Everyday Life",
                    "Principles Related to Practical Chemistry",
                    "Chemical Kinetics",
                    "Electrochemistry",
                    "Surface Chemistry",
                    "Metallurgy"
                ],
                "isExpanded": False,
            },
            {
                "id": "mathematics",
                "title": "Mathematics",
                "iconName": "Calculator",
                "color": "#14b8a6",
                "weakAreas": ["Calculus", "Probability"],
                "topics": [
                    "Sets, Relations and Functions",
                    "Trigonometric Functions",
                    "Inverse Trigonometric Functions",
                    "Principle of Mathematical Induction",
                    "Complex Numbers and Quadratic Equations",
                    "Linear Inequalities",
                    "Permutations and Combinations",
                    "Binomial Theorem",
                    "Sequences and Series",
                    "Straight Lines",
                    "Conic Sections",
                    "Three Dimensional Geometry",
                    "Limits and Derivatives",
                    "Mathematical Reasoning",
                    "Statistics",
                    "Probability",
                    "Matrices",
                    "Determinants",
                    "Continuity and Differentiability",
                    "Application of Derivatives",
                    "Integrals",
                    "Application of Integrals",
                    "Differential Equations",
                    "Vector Algebra"
                ],
                "isExpanded": False,
            },
            {
                "id": "biology",
                "title": "Biology",
                "iconName": "Dna",
                "color": "#f97316",
                "weakAreas": ["Genetics", "Biotechnology"],
                "topics": ["Genetics", "Human Physiology", "Plant Physiology", "Cell Biology", "Biotechnology", "Ecology"],
                "isExpanded": False,
            },
            {
                "id": "computer-science",
                "title": "Computer Science",
                "iconName": "Monitor",
                "color": "#ec4899",
                "weakAreas": ["Operating Systems", "Machine Learning"],
                "topics": ["Operating Systems", "Web Development", "Algorithms", "Data Structures", "Machine Learning", "Database Systems", "Computer Networks"],
                "isExpanded": False,
            },
            {
                "id": "history",
                "title": "History",
                "iconName": "Library",
                "color": "#f43f5e",
                "weakAreas": ["World War II"],
                "topics": ["World War I", "World War II", "Ancient Civilizations", "Medieval Europe", "Modern History", "Cold War"],
                "isExpanded": False,
            },
            {
                "id": "economics",
                "title": "Economics",
                "iconName": "TrendingUp",
                "color": "#84cc16",
                "weakAreas": ["Macroeconomics"],
                "topics": ["Microeconomics", "Macroeconomics", "International Trade", "Public Finance", "Development Economics"],
                "isExpanded": False,
            }
        ]

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
