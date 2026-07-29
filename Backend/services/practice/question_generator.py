import json
import logging
import re
from typing import Optional
from sqlalchemy.orm import Session

from models import Document
from practice_models import PracticeQuestion, PracticeSession
from chroma_store import query_chunks
from services.practice.base import _practice_llm_call

logger = logging.getLogger("chatbot")

# Global lock to prevent duplicate background generation jobs for the same topic
generating_topics = set()

from typing import Optional
from database import SessionLocal

def generate_master_question_bank(student_id: int, topic: str, db: Optional[Session] = None):
    """
    Generate a master question bank containing 30 questions (10 Easy, 10 Medium, 10 Hard)
    for a topic, and cache it permanently in the database.
    """
    cache_key = f"{student_id}_{topic}"
    if cache_key in generating_topics:
        logger.info(f"[PracticeEngine] Background generation already in progress for topic='{topic}'")
        return
        
    generating_topics.add(cache_key)
    logger.info(f"[PracticeEngine] Starting background generation of master question bank for topic='{topic}'")
    
    try:
        # 1. Build document context
        search_query = topic
        local_db = db or SessionLocal()
        docs = []
        try:
            docs = local_db.query(Document).filter(Document.student_id == student_id).all()
        finally:
            if not db:
                local_db.close()
        if not docs:
            context = "(No documents uploaded — use general knowledge)"
            doc_ids = []
        else:
            doc_ids = [d.id for d in docs]
            try:
                results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
                if results and results.get("documents") and results["documents"][0]:
                    context = "\n\n".join(results["documents"][0])
                else:
                    context = "(No relevant content found in documents — use general knowledge)"
            except Exception as e:
                logger.warning(f"[PracticeEngine] Failed to query documents from ChromaDB: {e}")
                context = "(Document search failed due to database error — use general knowledge)"

        # 2. Build system prompt for LLM
        system_prompt = f"""You are an expert quiz generator for educational content.
Generate a master question bank containing exactly 30 multiple-choice questions on the topic: "{topic}".
Categorize the questions exactly into three difficulty levels: "easy", "medium", and "hard".
Generate exactly 10 questions for each difficulty level (10 easy, 10 medium, 10 hard).

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

Return ONLY valid JSON array containing objects with a "difficulty" field:
[
  {{
    "topic": "{topic}",
    "subtopic": "specific subtopic",
    "difficulty": "easy",
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

        user_prompt = f"Generate 30 MCQ questions on '{topic}' (10 easy, 10 medium, 10 hard)."
        response = _practice_llm_call(system_prompt, user_prompt, max_tokens=6000)
        
        if not response:
            logger.error("[PracticeEngine] LLM returned empty response for master question bank")
            return

        json_match = re.search(r'\[[\s\S]*\]', response)
        if not json_match:
            logger.error("[PracticeEngine] LLM response does not contain a valid JSON array")
            return

        questions = json.loads(json_match.group())
        validated = []
        for q in questions:
            if all(k in q for k in ("question", "options", "correct_answer", "difficulty")):
                validated.append({
                    "topic": q.get("topic", topic),
                    "subtopic": q.get("subtopic", "General"),
                    "difficulty": q["difficulty"].lower(),
                    "question": q["question"],
                    "options": q["options"][:4],
                    "correct_answer": q["correct_answer"],
                    "explanation": q.get("explanation", ""),
                })
        
        if validated:
            # Group into the master question bank structure
            bank = {
                "easy": [q for q in validated if q["difficulty"] == "easy"],
                "medium": [q for q in validated if q["difficulty"] == "medium"],
                "hard": [q for q in validated if q["difficulty"] == "hard"],
            }
            
            # Fill missing levels if LLM failed to distribute correctly
            for q in validated:
                if q["difficulty"] not in ("easy", "medium", "hard"):
                    bank["medium"].append(q)

            # Persist to database cache
            from practice_models import AICache
            local_db = db or SessionLocal()
            try:
                # Clean existing cache
                local_db.query(AICache).filter(
                    AICache.student_id == student_id,
                    AICache.topic == topic,
                    AICache.action_type == "master_question_bank"
                ).delete()
                
                local_db.add(AICache(
                    student_id=student_id,
                    topic=topic,
                    action_type="master_question_bank",
                    content=json.dumps(bank)
                ))
                local_db.commit()
            finally:
                if not db:
                    local_db.close()
            logger.info(f"[PracticeEngine] Successfully generated and cached master question bank for topic='{topic}' (total={len(validated)} questions)")
        else:
            logger.error("[PracticeEngine] No valid questions found in LLM response")
            
    except Exception as e:
        logger.error(f"[PracticeEngine] Error generating master question bank: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        generating_topics.discard(cache_key)


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
    # 1. Check for master question bank cache
    from practice_models import AICache
    master_cached = db.query(AICache).filter(
        AICache.student_id == student_id,
        AICache.topic == topic,
        AICache.action_type == "master_question_bank"
    ).first()
    
    if master_cached:
        try:
            bank = json.loads(master_cached.content)
            diff_key = difficulty.lower()
            
            # Pool questions based on requested difficulty
            if diff_key in ("easy", "medium", "hard"):
                pool = bank.get(diff_key, [])
                if not pool:
                    pool = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
            else:
                # "mixed" or "adaptive" or undefined: combine all pools
                pool = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
                
            if pool:
                import random
                shuffled_pool = list(pool)
                random.shuffle(shuffled_pool)
                
                logger.info(f"[PracticeEngine] Master cache HIT: Retrieved {len(pool)} cached questions for topic='{topic}', difficulty='{difficulty}', returning {min(count, len(shuffled_pool))}")
                return shuffled_pool[:count]
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to parse master question bank cache: {e}")

    # Master cache miss: trigger background generation asynchronously
    cache_key = f"{student_id}_{topic}"
    if cache_key not in generating_topics:
        import threading
        from database import SessionLocal
        def run_in_bg():
            bg_db = SessionLocal()
            try:
                generate_master_question_bank(student_id, topic, bg_db)
            finally:
                bg_db.close()
        threading.Thread(target=run_in_bg, daemon=True).start()

    search_query = f"{topic} {subtopic or ''}"
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        context = "(No documents uploaded — use general knowledge)"
        doc_ids = []
    else:
        doc_ids = [d.id for d in docs]
        try:
            results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
            if results and results.get("documents") and results["documents"][0]:
                context = "\n\n".join(results["documents"][0])
            else:
                context = "(No relevant content found in documents — use general knowledge)"
        except Exception as e:
            logger.warning(f"[PracticeEngine] Failed to query documents from ChromaDB: {e}")
            context = "(Document search failed due to database error — use general knowledge)"

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

    try:
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            questions = json.loads(json_match.group())
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
            if validated:
                try:
                    from database import SessionLocal
                    local_db = SessionLocal()
                    try:
                        # Clean existing cache for this difficulty
                        existing = local_db.query(AICache).filter(
                            AICache.student_id == student_id,
                            AICache.topic == topic,
                            AICache.action_type == f"quiz_questions_{difficulty}"
                        ).first()
                        if existing:
                            local_db.delete(existing)
                            local_db.commit()
                        
                        local_db.add(AICache(
                            student_id=student_id,
                            topic=topic,
                            action_type=f"quiz_questions_{difficulty}",
                            content=json.dumps(validated)
                        ))
                        local_db.commit()
                        logger.info(f"Cached generated quiz questions for topic='{topic}', difficulty='{difficulty}'")
                    finally:
                        local_db.close()
                except Exception as cache_error:
                    logger.error(f"Failed to cache generated quiz questions: {cache_error}")

            return validated[:count]
    except (json.JSONDecodeError, AttributeError) as e:
        logger.error(f"[PracticeEngine] Failed to parse questions: {e}")
        logger.error(f"[PracticeEngine] Raw response: {response[:500]}")

    return []
