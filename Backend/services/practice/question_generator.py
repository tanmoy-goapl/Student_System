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
    Generate a master question bank incrementally:
    Stage 1: Generate a quick 5-question bank and cache it immediately.
    Stage 2: Continue generating the remaining 25 questions in the background.
    """
    cache_key = f"{student_id}_{topic}"
    if cache_key in generating_topics:
        logger.info(f"[PracticeEngine] Background generation already in progress for topic='{topic}'")
        return
        
    generating_topics.add(cache_key)
    logger.info(f"[PracticeEngine] Starting background incremental generation of master question bank for topic='{topic}'")
    
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

        # ─── STAGE 1: Quick 5-Question Bank ─────────────────
        logger.info(f"[PracticeEngine] [Stage 1] Generating 5 initial questions for topic='{topic}'")
        system_prompt_5 = f"""You are an expert quiz generator for educational content.
Generate exactly 5 multiple-choice questions on the topic: "{topic}".
Categorize the questions into difficulty levels: "easy", "medium", and "hard" (e.g., a mix of difficulties).

CONTEXT FROM STUDENT'S DOCUMENTS:
{context[:4000]}

RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Exactly ONE correct answer per question
- Include a clear, educational explanation for the correct answer
- Return ONLY valid JSON array containing objects with a "difficulty" field:
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

        user_prompt_5 = f"Generate 5 MCQ questions on '{topic}'."
        response_5 = _practice_llm_call(system_prompt_5, user_prompt_5, max_tokens=2000)
        
        initial_questions = []
        if response_5:
            json_match_5 = re.search(r'\[[\s\S]*\]', response_5)
            if json_match_5:
                try:
                    questions_5 = json.loads(json_match_5.group())
                    for q in questions_5:
                        if all(k in q for k in ("question", "options", "correct_answer", "difficulty")):
                            initial_questions.append({
                                "topic": q.get("topic", topic),
                                "subtopic": q.get("subtopic", "General"),
                                "difficulty": q["difficulty"].lower(),
                                "question": q["question"],
                                "options": q["options"][:4],
                                "correct_answer": q["correct_answer"],
                                "explanation": q.get("explanation", ""),
                            })
                except Exception as e:
                    logger.error(f"[PracticeEngine] Failed to parse initial 5 questions JSON: {e}")

        if not initial_questions:
            logger.error("[PracticeEngine] Failed to generate initial 5 questions, aborting incremental flow")
            return

        # Cache the initial 5 questions immediately
        bank_5 = {
            "easy": [q for q in initial_questions if q["difficulty"] == "easy"],
            "medium": [q for q in initial_questions if q["difficulty"] == "medium"],
            "hard": [q for q in initial_questions if q["difficulty"] == "hard"],
            "is_initial": True
        }
        for q in initial_questions:
            if q["difficulty"] not in ("easy", "medium", "hard"):
                bank_5["medium"].append(q)

        from practice_models import AICache
        local_db = db or SessionLocal()
        try:
            local_db.query(AICache).filter(
                AICache.student_id == student_id,
                AICache.topic == topic,
                AICache.action_type == "master_question_bank"
            ).delete()
            
            local_db.add(AICache(
                student_id=student_id,
                topic=topic,
                action_type="master_question_bank",
                content=json.dumps(bank_5)
            ))
            local_db.commit()
            logger.info(f"[PracticeEngine] [Stage 1] Cached initial 5-question bank for topic='{topic}'")
        finally:
            if not db:
                local_db.close()

        # ─── STAGE 2: Remaining 25 Questions ────────────────
        logger.info(f"[PracticeEngine] [Stage 2] Generating remaining 25 questions for topic='{topic}'")
        avoid_list = [q["question"][:80] for q in initial_questions]
        avoid_text = "\n\nAVOID repeating these questions:\n" + "\n".join(f"- {q}" for q in avoid_list)

        system_prompt_25 = f"""You are an expert quiz generator for educational content.
Generate a question bank containing exactly 25 multiple-choice questions on the topic: "{topic}".
Categorize the questions into three difficulty levels: "easy", "medium", and "hard".
Generate approximately 8-9 questions for each difficulty level (to sum up to 25).

CONTEXT FROM STUDENT'S DOCUMENTS:
{context[:4000]}

RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Exactly ONE correct answer per question
- Include a clear, educational explanation for the correct answer{avoid_text}

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

        user_prompt_25 = f"Generate remaining 25 MCQ questions on '{topic}'."
        response_25 = _practice_llm_call(system_prompt_25, user_prompt_25, max_tokens=5000)
        
        remaining_questions = []
        if response_25:
            json_match_25 = re.search(r'\[[\s\S]*\]', response_25)
            if json_match_25:
                try:
                    questions_25 = json.loads(json_match_25.group())
                    for q in questions_25:
                        if all(k in q for k in ("question", "options", "correct_answer", "difficulty")):
                            # Skip if duplicate of initial 5
                            if q["question"][:80] not in avoid_list:
                                remaining_questions.append({
                                    "topic": q.get("topic", topic),
                                    "subtopic": q.get("subtopic", "General"),
                                    "difficulty": q["difficulty"].lower(),
                                    "question": q["question"],
                                    "options": q["options"][:4],
                                    "correct_answer": q["correct_answer"],
                                    "explanation": q.get("explanation", ""),
                                })
                except Exception as e:
                    logger.error(f"[PracticeEngine] Failed to parse remaining 25 questions JSON: {e}")

        # Combine both stages to form the final 30-question bank
        all_questions = initial_questions + remaining_questions
        bank_final = {
            "easy": [q for q in all_questions if q["difficulty"] == "easy"],
            "medium": [q for q in all_questions if q["difficulty"] == "medium"],
            "hard": [q for q in all_questions if q["difficulty"] == "hard"],
            "is_initial": False
        }
        for q in all_questions:
            if q["difficulty"] not in ("easy", "medium", "hard"):
                bank_final["medium"].append(q)

        local_db = db or SessionLocal()
        try:
            local_db.query(AICache).filter(
                AICache.student_id == student_id,
                AICache.topic == topic,
                AICache.action_type == "master_question_bank"
            ).delete()
            
            local_db.add(AICache(
                student_id=student_id,
                topic=topic,
                action_type="master_question_bank",
                content=json.dumps(bank_final)
            ))
            local_db.commit()
            logger.info(f"[PracticeEngine] [Stage 2] Cached full merged question bank for topic='{topic}' (total={len(all_questions)} questions)")
        finally:
            if not db:
                local_db.close()
            
    except Exception as e:
        logger.error(f"[PracticeEngine] Error in incremental generation of master question bank: {e}")
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
    import time
    
    # Start background generation if not already active
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

    # Wait up to 1 second for Stage 1 (initial 5 questions) to generate and cache (2 iterations)
    master_cached = None
    for _ in range(2):
        db.expire_all()
        # 1. Try student-specific cache
        master_cached = db.query(AICache).filter(
            AICache.student_id == student_id,
            AICache.topic == topic,
            AICache.action_type == "master_question_bank"
        ).first()
        
        # 2. Try global/any-student cache for this topic to avoid duplicate LLM generation latency
        if not master_cached:
            any_cached = db.query(AICache).filter(
                AICache.topic.ilike(topic),
                AICache.action_type == "master_question_bank"
            ).first()
            if any_cached:
                try:
                    # Clone cache for this student to make future checks instant
                    master_cached = AICache(
                        student_id=student_id,
                        topic=topic,
                        action_type="master_question_bank",
                        content=any_cached.content
                    )
                    db.add(master_cached)
                    db.commit()
                    logger.info(f"[PracticeEngine] Shared cache HIT: Cloned question bank for topic='{topic}' from another student profile.")
                except Exception:
                    db.rollback()
                break
                
        if master_cached:
            break
        time.sleep(0.5)
    
    if master_cached:

        try:
            bank = json.loads(master_cached.content)
            diff_key = difficulty.lower()
            # Pool questions based on requested difficulty
            is_initial = bank.get("is_initial", False)
            if diff_key in ("easy", "medium", "hard") and not is_initial:
                pool = bank.get(diff_key, [])
                if not pool:
                    pool = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
            else:
                # "mixed" or "adaptive" or initial cache state: combine all pools
                pool = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
                
            if pool:
                import random
                shuffled_pool = list(pool)
                random.shuffle(shuffled_pool)
                
                logger.info(f"[PracticeEngine] Master cache HIT: Retrieved {len(pool)} cached questions for topic='{topic}', difficulty='{difficulty}', returning {min(count, len(shuffled_pool))}")
                return shuffled_pool[:count]
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to parse master question bank cache: {e}")

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
        return generate_local_fallback_questions(topic, count)

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

    return generate_local_fallback_questions(topic, count)

def generate_local_fallback_questions(topic: str, count: int) -> list[dict]:
    """Generate high-quality general questions about the topic as a fallback."""
    logger.warning(f"[PracticeEngine] Generating local fallback questions for topic='{topic}'")
    fallback_questions = [
        {
            "topic": topic,
            "subtopic": "Core Principles",
            "difficulty": "easy",
            "question": f"Which of the following best defines the primary purpose of {topic}?",
            "options": [
                {"id": "A", "text": f"To optimize the runtime and memory footprint of {topic} operations."},
                {"id": "B", "text": f"To serve as a foundational protocol or structure within the system."},
                {"id": "C", "text": f"To decouple high-level interfaces from low-level implementations."},
                {"id": "D", "text": "All of the above."}
            ],
            "correct_answer": "D",
            "explanation": f"All options list core design goals and primary purposes of {topic} in standard implementations."
        },
        {
            "topic": topic,
            "subtopic": "Architecture",
            "difficulty": "medium",
            "question": f"When implementing {topic}, what is a major engineering trade-off or constraint?",
            "options": [
                {"id": "A", "text": "Increased design complexity in exchange for better scalability."},
                {"id": "B", "text": "Reduced thread safety and lock contention issues."},
                {"id": "C", "text": "Strict reliance on single-threaded execution models."},
                {"id": "D", "text": "Higher initial execution latency with no long-term throughput benefits."}
            ],
            "correct_answer": "A",
            "explanation": f"Implementing {topic} typically introduces higher design complexity to achieve scalability, reliability, and modularity."
        },
        {
            "topic": topic,
            "subtopic": "Best Practices",
            "difficulty": "easy",
            "question": f"What is a standard best practice when analyzing or working with {topic}?",
            "options": [
                {"id": "A", "text": "Ignoring performance profiling and edge cases."},
                {"id": "B", "text": f"Ensuring modular division of responsibilities and checking boundary constraints."},
                {"id": "C", "text": "Coupling database transactions directly with slow, external network API calls."},
                {"id": "D", "text": "Using outdated legacy algorithms with known security vulnerabilities."}
            ],
            "correct_answer": "B",
            "explanation": f"Modular design and strict checking of boundary conditions are foundational best practices when implementing {topic}."
        },
        {
            "topic": topic,
            "subtopic": "Application",
            "difficulty": "medium",
            "question": f"In a production system, how is {topic} most commonly applied?",
            "options": [
                {"id": "A", "text": "To coordinate distributed workloads and maintain system state integrity."},
                {"id": "B", "text": "As a simple print statement for debugging local environments."},
                {"id": "C", "text": "To replace all core database index structures without testing performance."},
                {"id": "D", "text": "To execute unverified, arbitrary scripts from untrusted remote domains."}
            ],
            "correct_answer": "A",
            "explanation": f"In production environments, {topic} is widely used to coordinate workloads, optimize data access, and ensure high availability."
        },
        {
            "topic": topic,
            "subtopic": "Troubleshooting",
            "difficulty": "hard",
            "question": f"What is the most effective way to optimize performance bottleneck points associated with {topic}?",
            "options": [
                {"id": "A", "text": "Adding arbitrary delay timers to simulate background work."},
                {"id": "B", "text": "Profiling hot execution paths, using efficient caches, and removing redundant lock contentions."},
                {"id": "C", "text": "Disabling database connection pooling entirely."},
                {"id": "D", "text": "Increasing LLM completion timeouts to exceed 30 seconds."}
            ],
            "correct_answer": "B",
            "explanation": f"Identifying hot paths, utilizing local cache systems, and optimizing thread locks are standard methods to remediate performance bottlenecks in {topic}."
        }
    ]
    return fallback_questions[:count]
