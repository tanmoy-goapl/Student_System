"""
services/practice_engine.py — Adaptive Learning Engine
═══════════════════════════════════════════════════════
Core engine that:
  • Analyzes uploaded documents to extract topics/subtopics
  • Generates quiz questions via LLM using document context
  • Adapts difficulty based on student performance
  • Detects behavioral patterns from answer history
  • Tracks per-topic mastery
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import Document
from practice_models import (
    PracticeSession, PracticeQuestion,
    TopicPerformance, BehavioralInsight,
)
from chroma_store import query_chunks
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider

logger = logging.getLogger("chatbot")


# ═════════════════════════════════════════════════════════════════════════════
#  LLM HELPER (reuses same provider chain as chatbot)
# ═════════════════════════════════════════════════════════════════════════════

def _practice_llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
    """Call the LLM with a system + user prompt. Returns raw text response."""
    provider = get_provider()
    configs = []

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))

    if provider == "gpt4o":
        add_gpt(); add_llama()
    elif provider == "llama":
        add_llama(); add_gpt()
    else:
        add_gpt(); add_llama()

    for name, api_key, base_url, model in configs:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.3,
                timeout=10,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.error(f"[PracticeEngine] LLM '{name}' failed: {e}")
            continue

    logger.error("[PracticeEngine] All LLM providers failed!")
    return ""


_TOPICS_CACHE = {}


# ═════════════════════════════════════════════════════════════════════════════
#  DOCUMENT → TOPIC EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

def extract_topics_from_documents(student_id: int, db: Session) -> dict:
    """
    Query all of a student's document chunks from ChromaDB and use LLM
    to extract a structured subject/topic/subtopic hierarchy.
    """
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        return {"subjects": []}

    doc_ids = sorted([d.id for d in docs])
    cache_key = (student_id, tuple(doc_ids))
    if cache_key in _TOPICS_CACHE:
        logger.info(f"[PracticeEngine] Returning cached topics hierarchy for student {student_id}")
        return _TOPICS_CACHE[cache_key]

    doc_names = {d.id: d.filename for d in docs}

    # Gather representative chunks from each document
    all_text_snippets = []
    for doc in docs:
        results = query_chunks("overview summary topics chapters", top_k=5, allowed_doc_ids=[doc.id])
        if results and results.get("documents") and results["documents"][0]:
            for chunk_text in results["documents"][0]:
                all_text_snippets.append(f"[{doc.filename}]: {chunk_text[:500]}")

    if not all_text_snippets:
        return {"subjects": []}

    combined_context = "\n\n".join(all_text_snippets[:20])  # limit context

    system_prompt = """You are an educational content analyzer. 
Given document excerpts from a student's study materials, extract a structured hierarchy of subjects, topics, and subtopics.

RULES:
- Identify the subject (e.g., Physics, Mathematics, Computer Science, Biology, etc.)
- Under each subject, identify major topics
- Under each topic, identify subtopics if visible
- Estimate difficulty (easy/medium/hard) for each topic based on content complexity
- Estimate importance (high/medium/low) based on how much content covers that topic

Return ONLY valid JSON in this exact format, no markdown fencing:
{
  "subjects": [
    {
      "name": "Subject Name",
      "topics": [
        {
          "name": "Topic Name",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "difficulty": "medium",
          "importance": "high"
        }
      ]
    }
  ]
}"""

    user_prompt = f"Analyze these document excerpts and extract the educational topic structure:\n\n{combined_context}"

    response = _practice_llm_call(system_prompt, user_prompt, max_tokens=2048)

    if not response:
        return {"subjects": []}

    # Parse JSON from LLM response
    try:
        # Try to extract JSON from response (handle markdown fencing)
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            parsed = json.loads(json_match.group())
            if "subjects" in parsed:
                _TOPICS_CACHE[cache_key] = parsed
                return parsed
    except (json.JSONDecodeError, AttributeError) as e:
        logger.error(f"[PracticeEngine] Failed to parse topic extraction: {e}")
        logger.error(f"[PracticeEngine] Raw response: {response[:500]}")

    return {"subjects": []}


# ═════════════════════════════════════════════════════════════════════════════
#  QUIZ QUESTION GENERATION
# ═════════════════════════════════════════════════════════════════════════════

def generate_questions(
    student_id: int,
    topic: str,
    difficulty: str,
    count: int,
    db: Session,
    subtopic: Optional[str] = None,
    mode: str = "topic",
) -> list[dict]:
    """
    Generate quiz questions using LLM based on document content.
    Uses ChromaDB to retrieve relevant chunks for the topic.
    """
    # 1. Retrieve relevant chunks from the student's documents
    search_query = f"{topic} {subtopic or ''}"
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        # Fallback: generate questions from general knowledge
        context = "(No documents uploaded — use general knowledge)"
        doc_ids = []
    else:
        doc_ids = [d.id for d in docs]
        results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
        if results and results.get("documents") and results["documents"][0]:
            context = "\n\n".join(results["documents"][0])
        else:
            context = "(No relevant content found in documents — use general knowledge)"

    # 2. Check for previously asked questions to avoid repetition
    recent_questions = (
        db.query(PracticeQuestion.question_text)
        .join(PracticeSession)
        .filter(PracticeSession.student_id == student_id)
        .filter(PracticeQuestion.topic == topic)
        .order_by(PracticeQuestion.created_at.desc())
        .limit(20)
        .all()
    )
    avoid_list = [q.question_text[:80] for q in recent_questions] if recent_questions else []
    avoid_text = ""
    if avoid_list:
        avoid_text = f"\n\nAVOID repeating these recently asked questions:\n" + "\n".join(f"- {q}" for q in avoid_list[:10])

    # 3. Build the generation prompt
    difficulty_guidance = {
        "easy": "Generate EASY questions focusing on basic definitions, recall, and simple concepts. Suitable for beginners.",
        "medium": "Generate MEDIUM difficulty questions that test understanding, application, and analysis.",
        "hard": "Generate HARD questions that test deep understanding, multi-step problem solving, and advanced application.",
        "mixed": "Generate a MIX of easy, medium, and hard questions.",
    }

    system_prompt = f"""You are an expert quiz generator for educational content.
Generate exactly {count} multiple-choice questions on the topic: "{topic}"{f' / subtopic: "{subtopic}"' if subtopic else ''}.

DIFFICULTY: {difficulty_guidance.get(difficulty, difficulty_guidance['mixed'])}

CONTEXT FROM STUDENT'S DOCUMENTS:
{context[:4000]}

RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Exactly ONE correct answer per question
- Include a clear, educational explanation for the correct answer
- Questions should be factually accurate
- Base questions on the document content when possible
- Use general knowledge to supplement when documents lack sufficient detail
- Mix question types: conceptual, numerical, application-based, analytical
- Set appropriate difficulty per question{avoid_text}

Return ONLY valid JSON array, no markdown fencing:
[
  {{
    "topic": "{topic}",
    "subtopic": "specific subtopic",
    "difficulty": "easy|medium|hard",
    "question": "Question text here?",
    "options": [
      {{"id": "A", "text": "Option A text"}},
      {{"id": "B", "text": "Option B text"}},
      {{"id": "C", "text": "Option C text"}},
      {{"id": "D", "text": "Option D text"}}
    ],
    "correct_answer": "B",
    "explanation": "Clear explanation of why B is correct."
  }}
]"""

    user_prompt = f"Generate {count} MCQ questions on '{topic}' at {difficulty} difficulty level."

    response = _practice_llm_call(system_prompt, user_prompt, max_tokens=3000)

    if not response:
        logger.error("[PracticeEngine] LLM returned empty response for question generation")
        return []

    # Parse the JSON response
    try:
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            questions = json.loads(json_match.group())
            # Validate structure
            validated = []
            for q in questions:
                if all(k in q for k in ("question", "options", "correct_answer")):
                    validated.append({
                        "topic": q.get("topic", topic),
                        "subtopic": q.get("subtopic", subtopic or "General"),
                        "difficulty": q.get("difficulty", difficulty),
                        "question": q["question"],
                        "options": q["options"][:4],  # ensure max 4 options
                        "correct_answer": q["correct_answer"],
                        "explanation": q.get("explanation", ""),
                    })
            return validated[:count]
    except (json.JSONDecodeError, AttributeError) as e:
        logger.error(f"[PracticeEngine] Failed to parse questions: {e}")
        logger.error(f"[PracticeEngine] Raw response: {response[:500]}")

    return []


# ═════════════════════════════════════════════════════════════════════════════
#  ADAPTIVE DIFFICULTY
# ═════════════════════════════════════════════════════════════════════════════

def get_adaptive_difficulty(student_id: int, topic: str, db: Session) -> str:
    """Determine difficulty based on student's accuracy for a topic."""
    perf = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.topic == topic)
        .first()
    )

    if not perf or perf.total_attempts < 3:
        return "easy"  # start easy for new topics

    if perf.accuracy < 50:
        return "easy"
    elif perf.accuracy < 75:
        return "medium"
    else:
        return "hard"


def get_mastery_level(accuracy: float, total_attempts: int) -> str:
    """Calculate mastery level from accuracy and attempt count."""
    if total_attempts < 3:
        return "weak"
    if accuracy < 50:
        return "weak"
    elif accuracy < 75:
        return "medium"
    else:
        return "strong"


# ═════════════════════════════════════════════════════════════════════════════
#  PERFORMANCE TRACKING
# ═════════════════════════════════════════════════════════════════════════════

def update_topic_performance(
    student_id: int,
    topic: str,
    is_correct: bool,
    db: Session,
    subject: Optional[str] = None,
):
    """Update aggregated performance stats for a topic after an answer."""
    perf = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.topic == topic)
        .first()
    )

    if not perf:
        perf = TopicPerformance(
            student_id=student_id,
            topic=topic,
            subject=subject,
            total_attempts=0,
            correct_count=0,
        )
        db.add(perf)

    perf.total_attempts += 1
    if is_correct:
        perf.correct_count += 1

    perf.accuracy = (perf.correct_count / perf.total_attempts) * 100 if perf.total_attempts > 0 else 0
    perf.current_difficulty = get_adaptive_difficulty(student_id, topic, db)
    perf.mastery_level = get_mastery_level(perf.accuracy, perf.total_attempts)
    perf.last_practiced = datetime.utcnow()

    db.commit()
    db.refresh(perf)
    return perf


# ═════════════════════════════════════════════════════════════════════════════
#  WEAK TOPICS
# ═════════════════════════════════════════════════════════════════════════════

def get_weak_topics(student_id: int, db: Session) -> list[dict]:
    """Return topics sorted by accuracy ascending (weakest first)."""
    perfs = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.total_attempts >= 1)
        .order_by(TopicPerformance.accuracy.asc())
        .all()
    )

    return [
        {
            "topic": p.topic,
            "subject": p.subject or "General",
            "accuracy": round(p.accuracy, 1),
            "total_attempts": p.total_attempts,
            "mastery_level": p.mastery_level,
            "current_difficulty": p.current_difficulty,
        }
        for p in perfs
    ]


def get_weakness_topics_for_quiz(student_id: int, db: Session, limit: int = 3) -> list[str]:
    """Get the weakest topic names for weakness-based quiz generation."""
    weak = get_weak_topics(student_id, db)
    if not weak:
        return []
    return [w["topic"] for w in weak[:limit]]


# ═════════════════════════════════════════════════════════════════════════════
#  BEHAVIORAL INSIGHTS
# ═════════════════════════════════════════════════════════════════════════════

def detect_behavioral_patterns(student_id: int, db: Session) -> list[dict]:
    """Analyze recent answers to identify behavioral patterns."""
    # Get recent answered questions
    recent = (
        db.query(PracticeQuestion)
        .join(PracticeSession)
        .filter(PracticeSession.student_id == student_id)
        .filter(PracticeQuestion.student_answer.isnot(None))
        .order_by(PracticeQuestion.answered_at.desc())
        .limit(50)
        .all()
    )

    if len(recent) < 3:
        return []

    insights = []
    wrong_answers = [q for q in recent if not q.is_correct]
    fast_wrong = [q for q in wrong_answers if q.time_spent_seconds and q.time_spent_seconds < 10]
    slow_answers = [q for q in recent if q.time_spent_seconds and q.time_spent_seconds > 120]

    # 1. Guessing detection (fast + wrong)
    if len(fast_wrong) >= 3:
        ratio = len(fast_wrong) / len(recent) * 100
        insights.append({
            "type": "guessing",
            "title": "Possible guessing detected",
            "description": f"You answered {len(fast_wrong)} questions incorrectly in under 10 seconds. Slow down and think through the options.",
            "frequency": len(fast_wrong),
        })

    # 2. Time pressure (slow answers)
    if len(slow_answers) >= 3:
        insights.append({
            "type": "time_pressure",
            "title": "Time management needed",
            "description": f"You spent over 2 minutes on {len(slow_answers)} questions. Practice similar problems to build speed.",
            "frequency": len(slow_answers),
        })

    # 3. Repeated topic errors
    topic_errors = {}
    for q in wrong_answers:
        topic_errors[q.topic] = topic_errors.get(q.topic, 0) + 1

    for topic_name, error_count in topic_errors.items():
        if error_count >= 3:
            insights.append({
                "type": "repeated_error",
                "title": f"Recurring mistakes in {topic_name}",
                "description": f"You've made {error_count} errors in {topic_name}. Consider reviewing the fundamentals before practicing more.",
                "frequency": error_count,
            })

    # 4. Overall accuracy trend
    total = len(recent)
    correct = len([q for q in recent if q.is_correct])
    accuracy = (correct / total) * 100 if total > 0 else 0

    if accuracy < 40:
        insights.append({
            "type": "conceptual_gap",
            "title": "Low overall accuracy",
            "description": f"Your recent accuracy is {accuracy:.0f}%. Focus on understanding core concepts before attempting harder questions.",
            "frequency": total - correct,
        })

    # Persist insights
    for insight in insights:
        existing = (
            db.query(BehavioralInsight)
            .filter(BehavioralInsight.student_id == student_id)
            .filter(BehavioralInsight.insight_type == insight["type"])
            .first()
        )
        if existing:
            existing.title = insight["title"]
            existing.description = insight["description"]
            existing.frequency = insight["frequency"]
            existing.detected_at = datetime.utcnow()
        else:
            db.add(BehavioralInsight(
                student_id=student_id,
                insight_type=insight["type"],
                title=insight["title"],
                description=insight["description"],
                frequency=insight["frequency"],
            ))

    db.commit()
    return insights


def get_stored_insights(student_id: int, db: Session) -> list[dict]:
    """Get persisted behavioral insights."""
    insights = (
        db.query(BehavioralInsight)
        .filter(BehavioralInsight.student_id == student_id)
        .order_by(BehavioralInsight.detected_at.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "type": insight.insight_type,
            "title": insight.title,
            "description": insight.description,
            "frequency": insight.frequency,
        }
        for insight in insights
    ]


# ═════════════════════════════════════════════════════════════════════════════
#  SESSION STATS
# ═════════════════════════════════════════════════════════════════════════════

def get_session_stats(session: PracticeSession, db: Session) -> dict:
    """Calculate live session statistics."""
    questions = (
        db.query(PracticeQuestion)
        .filter(PracticeQuestion.session_id == session.id)
        .all()
    )

    answered = [q for q in questions if q.student_answer is not None]
    correct = [q for q in answered if q.is_correct]

    # Calculate streak (consecutive correct from most recent)
    streak = 0
    for q in sorted(answered, key=lambda x: x.answered_at or datetime.min, reverse=True):
        if q.is_correct:
            streak += 1
        else:
            break

    # Calculate total time
    total_time = sum(q.time_spent_seconds or 0 for q in answered)
    avg_time = total_time / len(answered) if answered else 0

    # Points: easy=10, medium=20, hard=30 + streak bonus
    points = 0
    for q in correct:
        base = {"easy": 10, "medium": 20, "hard": 30}.get(q.difficulty, 15)
        points += base

    # Streak bonus
    if streak >= 5:
        points += streak * 5

    accuracy = (len(correct) / len(answered) * 100) if answered else 0

    return {
        "total_questions": len(questions),
        "answered": len(answered),
        "correct": len(correct),
        "accuracy": round(accuracy, 1),
        "streak": streak,
        "points": points,
        "avg_time_seconds": round(avg_time, 1),
        "total_time_seconds": total_time,
    }
