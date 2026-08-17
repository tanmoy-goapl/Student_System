import json
import logging
import re
import threading
from typing import Optional
from sqlalchemy.orm import Session

from models import Document, DocumentChunk
from practice_models import AICache, LearningContent, PracticeQuestion, PracticeSession
from chroma_store import query_chunks
from services.practice.base import _practice_llm_call
from database import SessionLocal

logger = logging.getLogger("chatbot")

# Global lock to prevent duplicate background generation jobs for the same topic
generating_topics = set()
_generating_topics_lock = threading.Lock()


def generate_master_question_bank(student_id: int, topic: str, db: Optional[Session] = None):
    """
    Generate a master question bank incrementally:
    Stage 1: Generate a quick 5-question bank and cache it immediately.
    Stage 2: Continue generating the remaining 25 questions in the background.
    """
    cache_key = f"{student_id}_{topic}"
    with _generating_topics_lock:
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
- Ground the questions in specific concepts, examples, mechanisms, or relationships from the context, not just the topic heading.
- Use five different cognitive angles: recall/definition, mechanism or cause-and-effect, application/scenario, comparison/trade-off, and troubleshooting or prediction.
- Use a different subtopic for each question where the context supports it. Do not repeat a generic stem with only the topic name changed.
- Do not ask placeholder questions about the topic's "primary purpose", "standard best practice", or "production use" unless the context explicitly teaches that exact point.
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
        seen_questions = set()
        if response_5:
            json_match_5 = re.search(r'\[[\s\S]*\]', response_5)
            if json_match_5:
                try:
                    questions_5 = json.loads(json_match_5.group())
                    for q in questions_5:
                        if all(k in q for k in ("question", "options", "correct_answer", "difficulty")):
                            if _is_generic_fallback(str(q.get("question", ""))):
                                continue
                            norm_q = re.sub(r'[^a-z0-9]', '', q["question"].strip().lower())
                            if norm_q not in seen_questions:
                                seen_questions.add(norm_q)
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
- Every question must target a concrete concept, example, mechanism, relationship, or decision from the context, rather than restating the topic title.
- Deliberately vary question forms across the bank: definition, why/how, scenario/application, compare/contrast, debugging, prediction, and (when the context supports it) a small calculation.
- Do not repeat a stem pattern with only a different noun substituted. Avoid generic "primary purpose", "best practice", and "production system" placeholders.

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
                            if _is_generic_fallback(str(q.get("question", ""))):
                                continue
                            norm_q = re.sub(r'[^a-z0-9]', '', q["question"].strip().lower())
                            if norm_q not in seen_questions:
                                seen_questions.add(norm_q)
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
        with _generating_topics_lock:
            generating_topics.discard(cache_key)


def _question_key(question: str) -> str:
    return re.sub(r"[^a-z0-9]", "", question.strip().lower())
_GENERIC_FALLBACK_MARKERS = (
    "best defines the primary purpose of",
    "major engineering trade-off or constraint",
    "standard best practice when analyzing",
    "in a production system, how is",
    "performance bottleneck points associated with",
)


def _is_generic_fallback(question: str) -> bool:
    normalized = question.strip().lower()
    return any(marker in normalized for marker in _GENERIC_FALLBACK_MARKERS)


def _used_question_keys(student_id: int, topic: str, db: Session) -> set[str]:
    rows = (
        db.query(PracticeQuestion.question_text)
        .join(PracticeSession)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.topic == topic,
        )
        .all()
    )
    return {_question_key(row.question_text) for row in rows if row.question_text}


def _context_text(value) -> str:
    """Flatten cached JSON/markdown into prompt and fallback-friendly text."""
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if parsed != value:
                return _context_text(parsed)
        except (json.JSONDecodeError, TypeError):
            pass
        return value
    if isinstance(value, dict):
        parts = []
        if isinstance(value.get("notes"), list):
            parts.append(_context_text(value["notes"]))
        for level in ("easy", "medium", "hard"):
            for question in value.get(level, []) or []:
                if isinstance(question, dict):
                    parts.append(
                        f"{question.get('subtopic', 'Topic')}: {question.get('question', '')} "
                        f"Correct explanation: {question.get('explanation', '')} "
                        f"Options: {'; '.join(str(o.get('text', '')) for o in question.get('options', []) if isinstance(o, dict))}"
                    )
        if parts:
            return "\n".join(parts)
        return "\n".join(f"{key}: {_context_text(item)}" for key, item in value.items())
    if isinstance(value, list):
        return "\n".join(_context_text(item) for item in value)
    return str(value) if value is not None else ""


def _cached_source_questions(student_id: int, topic: str, db: Session) -> list[dict]:
    cached = db.query(AICache).filter(
        AICache.student_id == student_id,
        AICache.topic == topic,
        AICache.action_type == "master_question_bank",
    ).order_by(AICache.created_at.desc()).first()
    if not cached:
        return []
    try:
        bank = json.loads(cached.content)
        source = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
        return [
            question for question in _parse_quiz_questions(json.dumps(source), topic, "mixed", None)
            if not _is_generic_fallback(question["question"])
        ]
    except (json.JSONDecodeError, AttributeError, TypeError):
        return []

def _parse_quiz_questions(response: str, topic: str, difficulty: str, subtopic: Optional[str]) -> list[dict]:
    """Parse and normalize a model response without doing another repair call."""
    if not response or response.startswith("ERROR:"):
        return []
    match = re.search(r"\[[\s\S]*\]", response)
    if not match:
        return []
    try:
        payload = json.loads(match.group())
    except (json.JSONDecodeError, TypeError):
        return []
    if not isinstance(payload, list):
        return []

    normalized = []
    seen = set()
    option_ids = ("A", "B", "C", "D")
    for item in payload:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        options = item.get("options")
        if not question or not isinstance(options, list) or len(options) < 4:
            continue
        clean_options = []
        for index, option in enumerate(options[:4]):
            text = str(option.get("text", "") if isinstance(option, dict) else option).strip()
            if not text:
                break
            clean_options.append({"id": option_ids[index], "text": text})
        if len(clean_options) != 4:
            continue
        correct = str(item.get("correct_answer", "")).strip().upper()
        if correct not in option_ids:
            for option_id, option in zip(option_ids, clean_options):
                if correct == option["text"].upper():
                    correct = option_id
                    break
        if correct not in option_ids:
            continue
        key = _question_key(question)
        if not key or key in seen or _is_generic_fallback(question):
            continue
        seen.add(key)
        normalized.append({"topic": item.get("topic", topic), "subtopic": item.get("subtopic", subtopic or "General"), "difficulty": str(item.get("difficulty", difficulty)).lower(), "question": question, "options": clean_options, "correct_answer": correct, "explanation": str(item.get("explanation", "")).strip()})
    return normalized
def _read_fast_cache(student_id: int, topic: str, difficulty: str, count: int, db: Session) -> list[dict]:
    used = _used_question_keys(student_id, topic, db)
    cached = db.query(AICache).filter(
        AICache.student_id == student_id,
        AICache.topic == topic,
        AICache.action_type == f"quiz_questions_{difficulty}",
    ).order_by(AICache.created_at.desc()).first()
    if not cached:
        return []
    try:
        questions = json.loads(cached.content)
        if not isinstance(questions, list):
            return []
        usable = []
        seen = set()
        for question in questions:
            if not isinstance(question, dict):
                continue
            text = str(question.get("question", ""))
            key = _question_key(text)
            if not key or key in used or key in seen or _is_generic_fallback(text):
                continue
            seen.add(key)
            usable.append(question)
        if len(usable) >= count:
            return usable[:count]
    except (json.JSONDecodeError, TypeError):
        logger.warning(f"[PracticeEngine] Ignoring malformed fast quiz cache for topic='{topic}'")
    return []


def _cache_fast_questions(student_id: int, topic: str, difficulty: str, questions: list[dict]) -> None:
    if not questions:
        return
    local_db = SessionLocal()
    try:
        action_type = f"quiz_questions_{difficulty}"
        local_db.query(AICache).filter(
            AICache.student_id == student_id,
            AICache.topic == topic,
            AICache.action_type == action_type,
        ).delete()
        local_db.add(AICache(
            student_id=student_id,
            topic=topic,
            action_type=action_type,
            content=json.dumps(questions),
        ))
        local_db.commit()
    except Exception as exc:
        local_db.rollback()
        logger.warning(f"[PracticeEngine] Fast quiz cache write failed: {exc}")
    finally:
        local_db.close()
def _cached_learning_context(student_id: int, topic: str, db: Session) -> str:
    """Use materialized notes, cached source questions, and document text without Chroma."""
    parts = []
    try:
        learning = db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.topic == topic,
        ).first()
        if not learning:
            learning = db.query(LearningContent).filter(LearningContent.topic == topic).first()
        if learning and learning.content:
            parts.append(_context_text(learning.content))

        caches = db.query(AICache).filter(
            AICache.student_id == student_id,
            AICache.topic == topic,
            AICache.action_type.in_(("master_question_bank", "explain")),
        ).order_by(AICache.created_at.desc()).limit(3).all()
        parts.extend(_context_text(cache.content) for cache in caches if cache.content)

        doc_ids = [row.id for row in db.query(Document.id).filter(Document.student_id == student_id).all()]
        if doc_ids:
            chunks = db.query(DocumentChunk.chunk_text).filter(
                DocumentChunk.document_id.in_(doc_ids)
            ).order_by(DocumentChunk.chunk_index).limit(8).all()
            parts.extend(row.chunk_text for row in chunks if row.chunk_text)
    except Exception as exc:
        logger.debug(f"[PracticeEngine] Cached learning context unavailable: {exc}")
    context = "\n\n".join(part for part in parts if part)
    return context[:6000] or "(No stored study content available — use accurate general knowledge.)"
def _extract_content_facts(context: str, topic: str) -> list[tuple[str, str]]:
    text = _context_text(context)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    facts = []
    heading = "Core concepts"
    for block in re.split(r"(?<=[.!?])\s+|\n+", text):
        block = re.sub(r"^[#>*\-\d.\s]+", "", block).strip(" |:")
        if not block:
            continue
        if len(block) < 35 or len(block) > 260:
            if len(block) < 80 and not re.search(r"[.!?]", block):
                heading = block[:80]
            continue
        lower = block.lower()
        if "options:" in lower or "correct explanation:" in lower or "generate exactly" in lower:
            continue
        if _is_generic_fallback(block):
            continue
        key = _question_key(block)
        if key and all(key != _question_key(existing[1]) for existing in facts):
            facts.append((heading, block))
    return facts[:24]


def _rotated_options(correct: str, distractors: list[str], rotation: int) -> tuple[list[dict], str]:
    values = [correct] + [value for value in distractors if value and value != correct][:3]
    if len(values) < 4:
        return [], ""
    values = values[rotation % 4:] + values[:rotation % 4]
    ids = ("A", "B", "C", "D")
    return ([{"id": option_id, "text": value[:320]} for option_id, value in zip(ids, values)], ids[values.index(correct)])


def generate_content_fallback_questions(
    topic: str,
    count: int,
    difficulty: str,
    context: str,
    excluded_keys: Optional[set[str]] = None,
    source_questions: Optional[list[dict]] = None,
) -> list[dict]:
    """Create deterministic MCQs from stored material when the model is unavailable."""
    excluded = set(excluded_keys or set())
    results = []
    seen = set(excluded)
    source_questions = source_questions or []
    source_answers = []
    for source in source_questions:
        correct = str(source.get("correct_answer", "")).upper()
        answer = next((o.get("text", "") for o in source.get("options", []) if o.get("id") == correct), "")
        if answer:
            source_answers.append(answer)
    # A validated source question is already useful content-grounded practice.
    # Reusing its complete wording is better than manufacturing a generic stem.
    for index, source in enumerate(source_questions):
        source_question = str(source.get("question", "")).strip()
        source_key = _question_key(source_question)
        if source_question and source_key not in seen and not _is_generic_fallback(source_question):
            copied = dict(source)
            copied["topic"] = topic
            copied["difficulty"] = difficulty
            results.append(copied)
            seen.add(source_key)
            if len(results) >= count:
                return results

        correct_id = str(source.get("correct_answer", "")).upper()
        correct = next((o.get("text", "") for o in source.get("options", []) if o.get("id") == correct_id), "")
        if not correct:
            continue
        label = str(source.get("subtopic") or "this concept")
        distractors = [o.get("text", "") for o in source.get("options", []) if o.get("id") != correct_id]
        distractors.extend(answer for answer in source_answers if answer not in distractors and answer != correct)
        stems = (
            "A learner is reviewing {label}. Which statement is directly supported by the study material?",
            "When {label} is applied in a problem from {topic}, which outcome follows from the notes?",
            "Which cause-and-effect explanation about {label} matches the material for {topic}?",
        )
        for variant, stem in enumerate(stems):
            question = stem.format(label=label, topic=topic)
            key = _question_key(question)
            if key in seen:
                continue
            options, answer_id = _rotated_options(correct, distractors, index + variant)
            if not options:
                continue
            seen.add(key)
            results.append({"topic": topic, "subtopic": label, "difficulty": difficulty, "question": question, "options": options, "correct_answer": answer_id, "explanation": str(source.get("explanation", "The study material supports this answer.")).strip()})
            if len(results) >= count:
                return results
    facts = _extract_content_facts(context, topic)
    fact_values = [fact for _, fact in facts]
    fact_stems = (
        'The notes discuss this detail: "{focus}". Which statement is supported by the same material?',
        'Given the study detail "{focus}", which practical conclusion follows?',
        'A learner is applying the detail "{focus}". Which claim should be relied on?',
        'How should the detail "{focus}" be interpreted in relation to {topic}?',
        'Which observation would be consistent with the detail "{focus}"?',
    )
    for index, (label, fact) in enumerate(facts):
        distractors = [other for other in fact_values if other != fact]
        distractors.extend(answer for answer in source_answers if answer not in distractors and answer != fact)
        variant = index % len(fact_stems)
        stem = fact_stems[variant]
        focus = re.sub(r"\s+", " ", fact).strip().rstrip(".")
        question = stem.format(
            topic=topic,
            label=label or "this concept",
            focus=focus[:140],
        )
        key = _question_key(question)
        if key in seen:
            continue
        options, answer_id = _rotated_options(fact, distractors, index + variant)
        if not options:
            continue
        seen.add(key)
        results.append({"topic": topic, "subtopic": label or "Study content", "difficulty": difficulty, "question": question, "options": options, "correct_answer": answer_id, "explanation": f"The notes state: {fact}"})
    return results[:count]
def _generate_fast_questions(
    student_id: int,
    topic: str,
    difficulty: str,
    count: int,
    db: Session,
    subtopic: Optional[str] = None,
) -> list[dict]:
    used = _used_question_keys(student_id, topic, db)
    cached = _read_fast_cache(student_id, topic, difficulty, count, db)
    if cached:
        return cached
    source_questions = _cached_source_questions(student_id, topic, db)
    source_available = [
        question for question in source_questions
        if _question_key(question["question"]) not in used
        and not _is_generic_fallback(question["question"])
    ]
    questions = source_available[:count]
    if len(questions) >= count:
        _cache_fast_questions(student_id, topic, difficulty, questions)
        return questions

    remaining = count - len(questions)
    guidance = {
        "easy": "basic definitions and recall",
        "medium": "understanding and practical application",
        "hard": "deep reasoning and multi-step application",
        "mixed": "a balanced mix of easy, medium, and hard",
    }.get(difficulty.lower(), "a balanced mix of easy, medium, and hard")
    context = _cached_learning_context(student_id, topic, db)
    avoid = list(used | {_question_key(q["question"]) for q in questions})[:20]
    system_prompt = (
        f"Create exactly {remaining} valid MCQs about '{topic}' using only the study content below. "
        f"Target {guidance}. Every question must test a specific fact, concept, relationship, or example "
        "from the content; do not write questions about the topic heading itself. "
        "Vary the question forms across definition, mechanism, application, comparison, debugging, and prediction. "
        "Use different concrete concepts where possible and never repeat a stem with only the topic name changed. "
        "Return ONLY a JSON array with question, four A/B/C/D options, correct_answer, difficulty, and explanation.\n\n"
        f"STUDY CONTENT:\n{context}\n\nAVOID THESE USED QUESTION TEXTS:\n{avoid}"
    )
    response = _practice_llm_call(
        system_prompt,
        f"Generate {remaining} new content-grounded questions for {topic}.",
        max_tokens=min(2200, max(1000, remaining * 260)),
        # Session creation is a backend job, so quality gets priority over a
        # short request timeout. The browser is not held open while this runs.
        timeout_seconds=12.0,
        allow_fallback_chain=True,
    )
    generated = _parse_quiz_questions(response, topic, difficulty, subtopic)
    seen = used | {_question_key(q["question"]) for q in questions}
    for question in generated:
        key = _question_key(question["question"])
        if key and key not in seen and not _is_generic_fallback(question["question"]):
            questions.append(question)
            seen.add(key)
        if len(questions) >= count:
            break
    if len(questions) < count:
        questions.extend(generate_content_fallback_questions(
            topic,
            count - len(questions),
            difficulty,
            context,
            excluded_keys=seen,
            source_questions=source_questions,
        ))
    result = questions[:count]
    if len(result) < count:
        local_questions = generate_local_fallback_questions(
            topic,
            count - len(result),
            difficulty=difficulty,
            context=context,
            excluded_keys=seen,
            source_questions=source_questions,
        )
        result.extend(local_questions)
    result = result[:count]
    _cache_fast_questions(student_id, topic, difficulty, result)
    return result
def _start_master_generation(student_id: int, topic: str) -> None:
    """Start document-grounded bank creation only after the fast response is ready."""
    cache_key = f"{student_id}_{topic}"
    with _generating_topics_lock:
        if cache_key in generating_topics:
            return
    def run_in_background():
        bg_db = SessionLocal()
        try:
            generate_master_question_bank(student_id, topic, bg_db)
        finally:
            bg_db.close()
    threading.Thread(target=run_in_background, daemon=True, name="practice-bank-generator").start()
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
    Return a cached bank immediately or generate a bounded first batch.
    The full document-grounded bank is built asynchronously after the response.
    """
    # 1. Check for master question bank cache
    from practice_models import AICache
    
    # Full document-grounded generation is deferred until the fast batch returns.

    # Check for an already available Stage 1/full bank without adding request latency.
    master_cached = None
    for _ in range(1):
        db.expire_all()
        # 1. Try student-specific cache
        master_cached = db.query(AICache).filter(
            AICache.student_id == student_id,
            AICache.topic == topic,
            AICache.action_type == "master_question_bank"
        ).order_by(AICache.created_at.desc()).first()
        
        if master_cached:
            break
    
    if master_cached:

        try:
            bank = json.loads(master_cached.content)
            diff_key = difficulty.lower()
            # Pool questions based on requested difficulty
            all_pool = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
            preferred_pool = bank.get(diff_key, []) if diff_key in ("easy", "medium", "hard") else all_pool
            pool = preferred_pool if len(preferred_pool) >= count else all_pool
                
            # Fetch previously answered questions in practice sessions to avoid repeating them
            recent_questions = (
                db.query(PracticeQuestion.question_text)
                .join(PracticeSession)
                .filter(PracticeSession.student_id == student_id)
                .filter(PracticeQuestion.topic == topic)
                .all()
            )
            # Normalize answered questions thoroughly: lowercase, strip, and remove basic non-alphanumeric chars
            answered_questions = {
                re.sub(r'[^a-z0-9]', '', q.question_text.strip().lower())
                for q in recent_questions
            }

            if pool:
                import random
                shuffled_pool = list(pool)
                random.shuffle(shuffled_pool)
                
                # Filter out questions already answered by the student using the normalized text
                filtered_pool = []
                seen_questions = set()
                
                for q in shuffled_pool:
                    norm_q = re.sub(r'[^a-z0-9]', '', q["question"].strip().lower())
                    if norm_q in seen_questions or _is_generic_fallback(q["question"]):
                        continue
                        
                    # Check if the normalized question matches any of the answered questions
                    is_repeated = False
                    for aq in answered_questions:
                        if aq in norm_q or norm_q in aq:
                            is_repeated = True
                            break
                    if not is_repeated:
                        seen_questions.add(norm_q)
                        filtered_pool.append(q)
                
                if len(filtered_pool) >= count:
                    logger.info(f"[PracticeEngine] Master cache HIT: Retrieved {len(pool)} cached questions, filtered down to {len(filtered_pool)} non-repeated questions, returning {count}")
                    return filtered_pool[:count]
                
                logger.info(f"[PracticeEngine] Cache exhausted (only {len(filtered_pool)} unrepeated questions left). Falling through to dynamic generation.")
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to parse master question bank cache: {e}")

    fast_questions = _generate_fast_questions(
        student_id,
        topic,
        difficulty,
        count,
        db,
        subtopic,
    )
    _start_master_generation(student_id, topic)
    return fast_questions
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
            seen_questions = set()
            for q in questions:
                if all(k in q for k in ("question", "options", "correct_answer")):
                    norm_q = re.sub(r'[^a-z0-9]', '', q["question"].strip().lower())
                    if norm_q not in seen_questions:
                        seen_questions.add(norm_q)
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

def generate_local_fallback_questions(
    topic: str,
    count: int,
    difficulty: str = "mixed",
    context: str = "",
    excluded_keys: Optional[set[str]] = None,
    source_questions: Optional[list[dict]] = None,
) -> list[dict]:
    """Build deterministic questions without the old title-only template.

    Stored notes and validated source questions are preferred. If no material is
    available, the final safety net tests transferable reasoning and never
    invents a topic-specific fact.
    """
    logger.warning(f"[PracticeEngine] Generating grounded local fallback questions for topic='{topic}'")
    grounded = generate_content_fallback_questions(
        topic,
        count,
        difficulty,
        context,
        excluded_keys=excluded_keys,
        source_questions=source_questions,
    )
    if len(grounded) >= count:
        return grounded[:count]

    seen = set(excluded_keys or set()) | {_question_key(q["question"]) for q in grounded}
    blueprints = (
        (
            "Requirements and validation",
            f"A learner is checking an implementation of {topic}. Which evidence is strongest that it satisfies the stated requirements?",
            "Its observed inputs, outputs, and boundary behavior match the defined requirements.",
            [
                "It uses the most popular library regardless of the requirements.",
                "It produces a result once on a small example, without checking constraints.",
                "It has the longest source code among the available implementations.",
            ],
        ),
        (
            "Evaluation",
            f"When comparing two approaches to {topic}, which evidence should guide the decision first?",
            "Measurements from representative workloads together with the constraints that matter for the system.",
            [
                "The approach with the most configuration switches, without measurements.",
                "A single best-case run that ignores memory, latency, and failure behavior.",
                "The approach selected only because its name sounds more advanced.",
            ],
        ),
        (
            "Debugging",
            f"A problem appears only when the workload grows in a system using {topic}. What is the most useful first step?",
            "Reproduce the issue with representative inputs and measure the resource or algorithmic constraint that changes with scale.",
            [
                "Change several unrelated components at once so the cause cannot be isolated.",
                "Assume the latest code change is responsible without collecting evidence.",
                "Disable validation so the symptom is hidden from the user.",
            ],
        ),
        (
            "Edge cases",
            f"Which practice gives the most reliable understanding of how {topic} behaves?",
            "Trace a concrete example through normal and boundary cases, then compare the result with the expected behavior.",
            [
                "Study only the successful path and ignore empty or extreme inputs.",
                "Replace the example with an unrelated feature before reasoning about it.",
                "Judge correctness from the interface name alone.",
            ],
        ),
        (
            "Trade-offs",
            f"A design for {topic} meets its functional goal but violates a system constraint. What should the learner do next?",
            "Identify the violated constraint, measure the trade-off, and choose the change that preserves correctness within the stated limits.",
            [
                "Remove the constraint from the requirements without discussing its impact.",
                "Optimize an unrelated part of the system before measuring the violation.",
                "Treat functional correctness as proof that every non-functional requirement is met.",
            ],
        ),
    )
    for index, (subtopic, question, correct, distractors) in enumerate(blueprints):
        key = _question_key(question)
        if key in seen:
            continue
        options, answer_id = _rotated_options(correct, distractors, index)
        if not options:
            continue
        grounded.append({
            "topic": topic,
            "subtopic": subtopic,
            "difficulty": difficulty,
            "question": question,
            "options": options,
            "correct_answer": answer_id,
            "explanation": "This answer uses evidence, constraints, and observable behavior instead of relying on the topic label alone.",
        })
        seen.add(key)
        if len(grounded) >= count:
            break
    return grounded[:count]
