import json
import logging
import re
import threading
from difflib import SequenceMatcher
from typing import Optional
from sqlalchemy.orm import Session

from models import Document, DocumentChunk
from practice_models import AICache, LearningContent, PracticeQuestion, PracticeSession
from chroma_store import query_chunks
from services.practice.base import _practice_llm_call, normalize_generated_text
from database import SessionLocal

logger = logging.getLogger("chatbot")

# Global lock to prevent duplicate background generation jobs for the same topic
generating_topics = set()
_generating_topics_lock = threading.Lock()

# Bump this when the question contract changes. Old cached banks may still be
# useful for analytics, but they must not be served as new practice questions.
# Bump this whenever the question contract or de-duplication policy changes.
# This prevents old low-quality/repeated banks from being served to new sessions.
PRACTICE_CACHE_VERSION = "v4"
MASTER_QUESTION_BANK_CACHE = f"master_question_bank_{PRACTICE_CACHE_VERSION}"


def _quiz_cache_action(difficulty: str) -> str:
    return f"quiz_questions_{PRACTICE_CACHE_VERSION}_{difficulty.lower()}"


def generate_master_question_bank(student_id: int, topic: str, db: Optional[Session] = None):
    """
    Generate a master question bank incrementally:
    Stage 1: Generate a quick 5-question bank and cache it immediately.
    Stage 2: Continue generating the remaining 25 questions in the background.
    """
    local_db = db or SessionLocal()
    try:
        active_session = local_db.query(PracticeSession).filter(
            PracticeSession.student_id == student_id,
            PracticeSession.is_active == True
        ).first()
        if active_session:
            logger.info(f"[PracticeEngine] Active practice session found for student={student_id}, skipping master bank generation to avoid LLM contention.")
            return
    except Exception as e:
        logger.error(f"[PracticeEngine] Failed to check for active sessions: {e}")
    finally:
        if not db:
            local_db.close()

    cache_key = f"{student_id}_{topic}"
    with _generating_topics_lock:
        if cache_key in generating_topics:
            logger.info(f"[PracticeEngine] Background generation already in progress for topic='{topic}'")
            return

        generating_topics.add(cache_key)
    logger.info(f"[PracticeEngine] Starting background incremental generation of master question bank for topic='{topic}'")
    
    try:
        # Build the same authoritative summary-plus-evidence context used by fast generation.
        local_db = db or SessionLocal()
        try:
            context = _cached_learning_context(student_id, topic, local_db)
            shown_question_texts = _used_question_texts(student_id, topic, local_db)
        finally:
            if not db:
                local_db.close()
        prior_questions_text = "\n".join(f"- {text[:140]}" for text in shown_question_texts[-20:]) or "(none)"

        # ─── STAGE 1: Quick 5-Question Bank ─────────────────
        logger.info(f"[PracticeEngine] [Stage 1] Generating 5 initial questions for topic='{topic}'")
        system_prompt_5 = f"""You are an expert quiz generator for educational content.
Generate exactly 5 multiple-choice questions on the topic: "{topic}".
Categorize the questions into difficulty levels: "easy", "medium", and "hard" (e.g., a mix of difficulties).

AUTHORITATIVE TOPIC SUMMARY AND RELEVANT EVIDENCE:
{context[:4000]}

PRIOR QUESTIONS TO AVOID:
{prior_questions_text}

RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Exactly ONE correct answer per question
- Include a clear, educational explanation for the correct answer
- Ground the questions in specific concepts, examples, mechanisms, or relationships from the context, not just the topic heading.
- Use five different cognitive angles: recall/definition, mechanism or cause-and-effect, application/scenario, comparison/trade-off, and troubleshooting or prediction.
- Use a different subtopic for each question where the context supports it. Do not repeat a generic stem with only the topic name changed.
- NEVER use generic templates where the topic is just pasted in (e.g. "What is the primary purpose of [Topic]?"). The question must test specific knowledge about the topic, not meta-knowledge about the title itself.
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
                AICache.action_type == MASTER_QUESTION_BANK_CACHE
            ).delete()
            
            local_db.add(AICache(
                student_id=student_id,
                topic=topic,
                action_type=MASTER_QUESTION_BANK_CACHE,
                content=json.dumps(bank_5)
            ))
            local_db.commit()
            logger.info(f"[PracticeEngine] [Stage 1] Cached initial 5-question bank for topic='{topic}'")
        finally:
            if not db:
                local_db.close()

        # ─── STAGE 2: Remaining 25 Questions ────────────────
        logger.info(f"[PracticeEngine] [Stage 2] Generating remaining 25 questions for topic='{topic}'")
        avoid_list = (shown_question_texts + [q["question"] for q in initial_questions])[-30:]
        avoid_text = "\n\nAVOID repeating these questions:\n" + "\n".join(f"- {q}" for q in avoid_list)

        system_prompt_25 = f"""You are an expert quiz generator for educational content.
Generate a question bank containing exactly 25 multiple-choice questions on the topic: "{topic}".
Categorize the questions into three difficulty levels: "easy", "medium", and "hard".
Generate approximately 8-9 questions for each difficulty level (to sum up to 25).
For medium questions require application or analysis beyond recall. For hard questions require multi-step reasoning, an edge case, trade-off, debugging trace, or calculation supported by the context.

AUTHORITATIVE TOPIC SUMMARY AND RELEVANT EVIDENCE:
{context[:4000]}

RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Exactly ONE correct answer per question
- Include a clear, educational explanation for the correct answer{avoid_text}
- Every question must target a concrete concept, example, mechanism, relationship, or decision from the context, rather than restating the topic title.
- Deliberately vary question forms across the bank: definition, why/how, scenario/application, compare/contrast, debugging, prediction, and (when the context supports it) a small calculation.
- Do not repeat a stem pattern with only a different noun substituted. Avoid generic "primary purpose", "best practice", and "production system" placeholders.
- NEVER use generic templates where the topic is just pasted in (e.g. "What is the primary purpose of [Topic]?"). The question must test specific knowledge about the topic.

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
                AICache.action_type == MASTER_QUESTION_BANK_CACHE
            ).delete()
            
            local_db.add(AICache(
                student_id=student_id,
                topic=topic,
                action_type=MASTER_QUESTION_BANK_CACHE,
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


_QUESTION_STOPWORDS = frozenset({
    "about", "after", "all", "an", "and", "are", "as", "at", "be", "before",
    "by", "can", "does", "for", "from", "how", "in", "is", "it", "of", "on",
    "or", "should", "that", "the", "this", "to", "under", "what", "when", "which",
    "with", "within", "why", "you",
})


def _meaningful_question_tokens(question: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", str(question or "").casefold())
        if len(token) > 2 and token not in _QUESTION_STOPWORDS
    }


def _question_is_duplicate(question: str, existing_questions: list[str]) -> bool:
    """Reject exact, close-paraphrase, and near-identical question repeats."""
    normalized = _question_key(question)
    if not normalized:
        return True
    question_tokens = _meaningful_question_tokens(question)
    for existing in existing_questions:
        existing_normalized = _question_key(existing)
        if not existing_normalized:
            continue
        if normalized == existing_normalized:
            return True
        if len(normalized) >= 48 and len(existing_normalized) >= 48:
            if SequenceMatcher(None, normalized, existing_normalized).ratio() >= 0.86:
                return True
        existing_tokens = _meaningful_question_tokens(existing)
        if len(question_tokens) >= 4 and len(existing_tokens) >= 4:
            shared = len(question_tokens & existing_tokens)
            smaller = min(len(question_tokens), len(existing_tokens))
            union = len(question_tokens | existing_tokens)
            if shared / smaller >= 0.9 or shared / union >= 0.72:
                return True
    return False


def _used_question_texts(student_id: int, topic: str, db: Session) -> list[str]:
    rows = (
        db.query(PracticeQuestion.question_text)
        .join(PracticeSession)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeSession.topic == topic,
        )
        .all()
    )
    return [row.question_text for row in rows if row.question_text]

_BAD_CONTENT_MARKERS = (
    "file://",
    "/backend/",
    "student_system",
    "which statement is supported by the same material",
    "the notes discuss this detail",
    "the notes state",
    "a learner is applying",
    "a learner is reviewing",
    "a learner is checking",
    "which claim should be relied on",
    ".py",
    ".tsx",
    ".ts",
    ".js",
    "/home/",
    "/desktop/",
    "switches llm",
    "settings.py",
    "http://",
    "https://",
    "fastapi",
    "endpoint",
    "router",
    "sqlalchemy",
)

_GENERIC_FALLBACK_MARKERS = (
    "best defines the primary purpose of",
    "best defines the primary concept of",
    "major engineering trade-off or constraint",
    "standard best practice when analyzing",
    "in a production system, how is",
    "performance bottleneck points associated with",
    "principal advantage of properly applying",
    "when analyzing the efficiency of",
    "in which scenario is",
    "which trade-off is most commonly evaluated when working with",
    "a learner is applying the detail",
    "which claim should be relied on",
    "which conclusion is directly supported by this study note",
    "according to this study note on",
    "what outcome follows from the principle described in this",
    "which interpretation best matches the relationship described in this",
    "which claim is consistent with the evidence in this",
)

_MEDIUM_REASONING_MARKERS = (
    "if ",
    "when ",
    "given ",
    "suppose",
    "scenario",
    "case ",
    "compare",
    "contrast",
    "why ",
    "how ",
    "predict",
    "trace",
    "before ",
    "after ",
    "under what",
    "most likely",
    "which change",
    "which approach",
    "what happens",
    "effect of",
    "impact of",
    "choose",
    "which of the following",
    "what is the",
)

_HARD_REASONING_MARKERS = (
    "multi-step",
    "step 1",
    "step 2",
    "edge case",
    "trade-off",
    "tradeoff",
    "debug",
    "trace",
    "calculate",
    "compute",
    "derive",
    "analy",
    "failure",
    "constraint",
    "under both",
    "despite",
    "invariant",
    "complexity",
    "asymptotic",
    "worst-case",
    "optimal",
)

_LOW_QUALITY_OPTION_MARKERS = (
    "all of the above",
    "none of the above",
    "all of these",
    "both a and b",
    "neither a nor b",
)


def _is_generic_fallback(question: str) -> bool:
    normalized = question.strip().lower()
    return (
        any(marker in normalized for marker in _GENERIC_FALLBACK_MARKERS)
        or any(marker in normalized for marker in _BAD_CONTENT_MARKERS)
        or bool(re.search(r"\[[^\]]+\.(?:py|js|ts|tsx|java|md|pdf)\]", normalized))
        or bool(re.search(r"\(file:///[^)]*\)", normalized))
    )


def _has_difficulty_signal(question: str, difficulty: str) -> bool:
    """Validate reasonable question structure for the requested difficulty."""
    level = difficulty.lower()
    if level in ("easy", "mixed"):
        return True

    normalized = f" {question.strip().lower()} "
    word_count = len(normalized.split())
    medium_hits = sum(marker in normalized for marker in _MEDIUM_REASONING_MARKERS)
    hard_hits = sum(marker in normalized for marker in _HARD_REASONING_MARKERS)

    if level == "medium":
        return word_count >= 8 and (medium_hits >= 1 or word_count >= 14)

    return word_count >= 12 and (hard_hits >= 1 or medium_hits >= 1)


def _normalise_quiz_item(
    item: dict,
    topic: str,
    difficulty: str,
    subtopic: Optional[str],
) -> Optional[dict]:
    """Validate one model/cache item before it reaches a practice session."""
    if not isinstance(item, dict):
        return None

    level = str(difficulty or "mixed").strip().lower()
    item_level = str(item.get("difficulty", level)).strip().lower()
    if item_level not in ("easy", "medium", "hard"):
        return None
    if level in ("easy", "medium", "hard") and item_level != level:
        return None

    question = normalize_generated_text(_sanitize_study_text(str(item.get("question", "")))).strip()
    options = item.get("options")
    if not question or not isinstance(options, list) or len(options) < 4:
        return None
    if len(question.split()) < 5 or _is_generic_fallback(question):
        return None

    option_ids = ("A", "B", "C", "D")
    clean_options = []
    option_keys = set()
    for index, option in enumerate(options[:4]):
        text = normalize_generated_text(_sanitize_study_text(
            str(option.get("text", "") if isinstance(option, dict) else option)
        )).strip()
        option_key = re.sub(r"\s+", " ", text.lower())
        if (
            not text
            or option_key in option_keys
            or any(marker in option_key for marker in _LOW_QUALITY_OPTION_MARKERS)
            or any(marker in option_key for marker in _BAD_CONTENT_MARKERS)
        ):
            return None
        option_keys.add(option_key)
        clean_options.append({"id": option_ids[index], "text": text[:500]})

    correct = str(item.get("correct_answer", "")).strip().upper()
    if correct not in option_ids:
        for option_id, option in zip(option_ids, clean_options):
            if correct == option["text"].upper():
                correct = option_id
                break
    if correct not in option_ids:
        return None

    explanation = normalize_generated_text(_sanitize_study_text(
        str(item.get("explanation", ""))
    )).strip()
    if len(explanation.split()) < (5 if item_level in ("medium", "hard") else 3):
        return None

    combined = " ".join([question, explanation, *(option["text"] for option in clean_options)]).lower()
    if any(marker in combined for marker in _BAD_CONTENT_MARKERS):
        return None

    return {
        "topic": _sanitize_study_text(str(item.get("topic") or topic)).strip() or topic,
        "subtopic": _sanitize_study_text(str(item.get("subtopic") or subtopic or "General")).strip() or "General",
        "difficulty": item_level,
        "question": question,
        "options": clean_options,
        "correct_answer": correct,
        "explanation": explanation,
    }


def _sanitize_study_text(text: str) -> str:
    """Remove implementation metadata, code paths, and markdown file links."""
    text = re.sub(r"\[[^\]]+\]\s*\((?:file://|https?://|/)[^)]*\):?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\((?:file://|https?://|/)[^)]*\):?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"file:///[^\s)]+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"/home/[^\s)]+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"/Desktop/[^\s)]+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"`[^`]+\.(?:py|ts|tsx|js|json|md)`", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b[\w-]+\.(?:py|ts|tsx|js|json|md)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:FastAPI|SQLAlchemy|APIRouter|SessionLocal)\b", "", text, flags=re.IGNORECASE)
    return re.sub(r"[ \t]+", " ", text).strip()


def _used_question_keys(student_id: int, topic: str, db: Session) -> set[str]:
    rows = (
        db.query(PracticeQuestion.question_text)
        .join(PracticeSession)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeSession.topic == topic,
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
        AICache.action_type == MASTER_QUESTION_BANK_CACHE,
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
    """Parse and validate a model response without doing another repair call."""
    if not response or response.startswith("ERROR:"):
        return []

    payload = None

    # Strategy 1: Try to find a JSON array  [...]
    match = re.search(r"\[[\s\S]*\]", response)
    if match:
        try:
            payload = json.loads(match.group())
        except (json.JSONDecodeError, TypeError):
            payload = None

    # Strategy 2: If no array found, try to find a single JSON object  {...}
    if payload is None:
        obj_match = re.search(r"\{[\s\S]*\}", response)
        if obj_match:
            try:
                parsed = json.loads(obj_match.group())
                if isinstance(parsed, dict):
                    payload = [parsed]
            except (json.JSONDecodeError, TypeError):
                payload = None

    # Strategy 3: Try wrapping entire response in brackets
    if payload is None:
        try:
            payload = json.loads("[" + response.strip().strip(",") + "]")
        except (json.JSONDecodeError, TypeError):
            pass

    # Strategy 4: Truncation repair — salvage complete objects from truncated JSON
    # The LLM often runs out of tokens mid-JSON, producing e.g. [{...}, {... (cut off)
    if payload is None:
        # Find the start of the array
        arr_start = response.find("[")
        if arr_start >= 0:
            fragment = response[arr_start:]
            # Try progressively trimming from the end to find valid JSON
            # Look for the last complete object boundary "},"  or "}" before truncation
            for end_marker in ["},", "}"]:
                last_pos = fragment.rfind(end_marker)
                if last_pos > 0:
                    candidate = fragment[:last_pos + len(end_marker)].rstrip(",").rstrip() + "]"
                    try:
                        parsed = json.loads(candidate)
                        if isinstance(parsed, list) and parsed:
                            payload = parsed
                            logger.info(f"[PracticeEngine] Truncation repair salvaged {len(parsed)} questions")
                            break
                    except (json.JSONDecodeError, TypeError):
                        continue

    if not payload or not isinstance(payload, list):
        return []

    normalized = []
    seen_questions = []
    for item in payload:
        question = _normalise_quiz_item(item, topic, difficulty, subtopic)
        if not question:
            continue
        if _question_is_duplicate(question["question"], seen_questions):
            continue
        seen_questions.append(question["question"])
        normalized.append(question)

    return normalized


def _read_fast_cache(
    student_id: int,
    topic: str,
    difficulty: str,
    count: int,
    db: Session,
    used_texts: Optional[list[str]] = None,
) -> list[dict]:
    used_texts = list(used_texts) if used_texts is not None else _used_question_texts(student_id, topic, db)
    action_type = _quiz_cache_action(difficulty)
    cached = db.query(AICache).filter(
        AICache.student_id == student_id,
        AICache.topic == topic,
        AICache.action_type == action_type,
    ).order_by(AICache.created_at.desc()).first()
    if not cached:
        return []
    try:
        questions = json.loads(cached.content)
        if not isinstance(questions, list):
            return []
        usable = []
        seen_texts = []
        for item in questions:
            question = _normalise_quiz_item(item, topic, difficulty, None)
            if not question:
                continue
            text = question["question"]
            if _question_is_duplicate(text, used_texts + seen_texts):
                continue
            seen_texts.append(text)
            usable.append(question)
        if usable:
            return usable[:count]
    except (json.JSONDecodeError, TypeError):
        logger.warning(f"[PracticeEngine] Ignoring malformed fast quiz cache for topic='{topic}'")
    return []


def _cache_fast_questions(
    student_id: int,
    topic: str,
    difficulty: str,
    questions: list[dict],
    db: Optional[Session] = None,
) -> None:
    if not questions:
        return
    cache_db = db or SessionLocal()
    owns_db = db is None
    try:
        action_type = _quiz_cache_action(difficulty)
        existing = cache_db.query(AICache).filter(
            AICache.student_id == student_id,
            AICache.topic == topic,
            AICache.action_type == action_type,
        ).order_by(AICache.created_at.desc()).first()
        existing_questions = []
        if existing:
            try:
                payload = json.loads(existing.content)
                if isinstance(payload, list):
                    existing_questions = [item for item in payload if isinstance(item, dict)]
            except (json.JSONDecodeError, TypeError):
                existing_questions = []

        merged = []
        merged_texts = []
        for candidate in existing_questions + questions:
            normalized = _normalise_quiz_item(candidate, topic, difficulty, None)
            if not normalized:
                continue
            text = normalized["question"]
            if _question_is_duplicate(text, merged_texts):
                continue
            merged.append(normalized)
            merged_texts.append(text)

        if existing:
            existing.content = json.dumps(merged[-200:])
        else:
            cache_db.add(AICache(
                student_id=student_id,
                topic=topic,
                action_type=action_type,
                content=json.dumps(merged[-200:]),
            ))
        if owns_db:
            cache_db.commit()
        else:
            cache_db.flush()
    except Exception as exc:
        cache_db.rollback()
        logger.warning(f"[PracticeEngine] Fast quiz cache write failed: {exc}")
    finally:
        if owns_db:
            cache_db.close()


def _cached_learning_context(student_id: int, topic: str, db: Session) -> str:
    """Build a compact, topic-grounded context for fast question generation."""
    parts = []
    try:
        learning = db.query(LearningContent).filter(
            LearningContent.student_id == student_id,
            LearningContent.topic == topic,
        ).order_by(LearningContent.created_at.desc()).first()
        if learning and learning.content:
            parts.append("TOPIC SUMMARY:\n" + _context_text(learning.content)[:1000])

        if not parts:
            caches = db.query(AICache).filter(
                AICache.student_id == student_id,
                AICache.topic == topic,
                AICache.action_type.in_(("summary", "explain", "examples")),
            ).order_by(AICache.created_at.desc()).limit(2).all()
            parts.extend(
                f"STUDY MATERIAL ({cache.action_type}):\n{_context_text(cache.content)[:600]}"
                for cache in caches
                if cache.content
            )

        if not parts:
            doc_ids = [row.id for row in db.query(Document.id).filter(Document.student_id == student_id).all()]
            if doc_ids:
                try:
                    results = query_chunks(topic, top_k=4, allowed_doc_ids=doc_ids)
                    relevant_chunks = (
                        results.get("documents", [[]])[0]
                        if results and results.get("documents")
                        else []
                    )
                    if relevant_chunks:
                        parts.append("SOURCE EXCERPTS:\n" + "\n\n".join(relevant_chunks[:2]))
                except Exception:
                    pass
    except Exception as exc:
        logger.debug(f"[PracticeEngine] Cached learning context unavailable: {exc}")
    context = _sanitize_study_text("\n\n".join(part for part in parts if part))
    return context[:1500] or f"Core concept: {topic}."
def _extract_content_facts(context: str, topic: str) -> list[tuple[str, str]]:
    text = _context_text(context)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    facts = []
    heading = topic
    for block in re.split(r"(?<=[.!?])\s+|\n+", text):
        block = _sanitize_study_text(re.sub(r"^[#>*\-\d.\s]+", "", block)).strip(" |:")
        if not block or len(block) < 30 or len(block) > 220:
            continue
        lower = block.lower()
        if any(marker in lower for marker in _BAD_CONTENT_MARKERS) or _is_generic_fallback(block):
            continue
        if "def " in lower or "import " in lower or "class " in lower or "{" in lower or "}" in lower or "(" in lower and "file:" in lower:
            continue
        key = _question_key(block)
        if key and all(key != _question_key(existing[1]) for existing in facts):
            facts.append((heading, block))
    return facts[:24]


def _rotated_options(correct: str, distractors: list[str], rotation: int) -> tuple[list[dict], str]:
    correct_text = str(correct or "").strip()
    correct_key = re.sub(r"\s+", " ", correct_text.casefold())
    unique_distractors = []
    seen_option_keys = set()
    for distractor in distractors:
        text = str(distractor or "").strip()
        key = re.sub(r"\s+", " ", text.casefold())
        if not text or key == correct_key or key in seen_option_keys:
            continue
        seen_option_keys.add(key)
        unique_distractors.append(text)
    if len(unique_distractors) < 3:
        return [], ""
    values = [correct_text] + unique_distractors[:3]
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
    """Create authentic MCQs from stored material when the model is unavailable."""
    excluded = set(excluded_keys or set())
    results = []
    seen = set(excluded)
    source_questions = source_questions or []
    if difficulty.lower() in ("easy", "medium", "hard"):
        source_questions = [
            source for source in source_questions
            if str(source.get("difficulty", "")).lower() == difficulty.lower()
        ]

    for source in source_questions:
        source_question = str(source.get("question", "")).strip()
        source_key = _question_key(source_question)
        if source_question and source_key not in seen and not _is_generic_fallback(source_question):
            copied = dict(source)
            copied["topic"] = topic
            copied["difficulty"] = str(source.get("difficulty", "medium")).lower()
            if copied["difficulty"] not in ("easy", "medium", "hard"):
                copied["difficulty"] = "medium"
            results.append(copied)
            seen.add(source_key)
            if len(results) >= count:
                return results

    return results


def _generate_fast_questions(
    student_id: int,
    topic: str,
    difficulty: str,
    count: int,
    db: Session,
    subtopic: Optional[str] = None,
) -> list[dict]:
    used_texts = _used_question_texts(student_id, topic, db)
    cached = _read_fast_cache(
        student_id,
        topic,
        difficulty,
        count,
        db,
        used_texts=used_texts,
    )
    questions = list(cached or [])
    source_questions = _cached_source_questions(student_id, topic, db)
    requested_level = difficulty.lower()
    source_available = [
        question for question in source_questions
        if (requested_level == "mixed" or question.get("difficulty") == requested_level)
        and not _question_is_duplicate(
            question["question"],
            used_texts + [q["question"] for q in questions],
        )
        and not _is_generic_fallback(question["question"])
    ]
    source_questions_for_difficulty = [
        question for question in source_questions
        if requested_level == "mixed" or question.get("difficulty") == requested_level
    ]
    for source in source_available:
        if len(questions) >= count:
            break
        if _question_is_duplicate(
            source["question"],
            used_texts + [q["question"] for q in questions],
        ):
            continue
        questions.append(source)
    if len(questions) >= count:
        _cache_fast_questions(student_id, topic, difficulty, questions, db=db)
        return questions[:count]

    remaining = count - len(questions)
    guidance = {
        "easy": "direct recall and fundamental conceptual definitions",
        "medium": "concrete application, comparisons, algorithm behavior, or scenario analysis",
        "hard": "multi-step reasoning, asymptotic complexity, boundary trade-offs, or tracing execution",
        "mixed": "a balanced mix of easy, medium, and hard",
    }.get(difficulty.lower(), "a balanced mix of easy, medium, and hard")
    difficulty_contract = {
        "easy": "Keep the question stem direct and clear. Focus on core principles without obscure trivia.",
        "medium": "Include the relevant scenario or algorithmic condition in the question stem.",
        "hard": "Test multi-step analytical reasoning, exact complexity analysis, or subtle edge-case behavior.",
        "mixed": "Label each item with its actual difficulty level and keep a balanced distribution.",
    }.get(difficulty.lower(), "Label each item with its actual difficulty level and keep a balanced distribution.")
    context = _cached_learning_context(student_id, topic, db)
    avoid = (used_texts + [q["question"] for q in questions])[-15:]
    system_prompt = (
        f"You are an expert university professor creating an exam quiz on '{topic}'.\n"
        f"Create exactly {remaining} authentic, realistic multiple-choice questions.\n"
        f"Difficulty: {difficulty.upper()} ({guidance})\n{difficulty_contract}\n\n"
        "QUALITY RULES:\n"
        "- Write natural, academic questions (e.g., 'What is the time complexity of...?', 'Which property holds true for...?').\n"
        "- NEVER use robotic templates like 'A learner is applying the detail...' or mention code files/paths.\n"
        "- NEVER use generic templates where the topic is just pasted in (e.g. 'What is the primary purpose of [Topic]?'). The question must test specific knowledge about the topic, not meta-knowledge about the title.\n"
        "- All 4 options (A, B, C, D) must be plausible, realistic subject-matter answers.\n"
        "- Use clean mathematical notation (e.g. O(n), O(n²), O(log n)) without raw LaTeX dollar signs ($).\n"
        "- Provide a clear, educational 1-2 sentence explanation.\n"
        "- Return ONLY a JSON array (e.g. [{...}, {...}]) of objects with keys: topic, subtopic, difficulty, question, options (array of 4 {id, text}), correct_answer (A/B/C/D), explanation. ALWAYS wrap in square brackets [], even if there is only 1 question.\n\n"
        f"TOPIC STUDY CONTEXT:\n{context}\n\n"
        f"AVOID REPEATING THESE QUESTIONS:\n{avoid}"
    )
    response = _practice_llm_call(
        system_prompt,
        f"Generate {remaining} realistic academic MCQ questions for '{topic}' at {difficulty} level.",
        max_tokens=min(4000, max(800, remaining * 450)),
        timeout_seconds=30.0,
        total_timeout_seconds=45.0,
        allow_fallback_chain=True,
    )
    generated = _parse_quiz_questions(response, topic, difficulty, subtopic)
    seen = {_question_key(text) for text in used_texts}
    seen.update(_question_key(q["question"]) for q in questions)
    seen_texts = used_texts + [q["question"] for q in questions]
    for question in generated:
        key = _question_key(question["question"])
        if key and not _question_is_duplicate(question["question"], seen_texts) and not _is_generic_fallback(question["question"]):
            questions.append(question)
            seen.add(key)
            seen_texts.append(question["question"])
        if len(questions) >= count:
            break
    if len(questions) < count:
        questions.extend(generate_content_fallback_questions(
            topic,
            count - len(questions),
            difficulty,
            context,
            excluded_keys=seen,
            source_questions=source_questions_for_difficulty,
        ))
    if len(questions) < count:
        questions.extend(generate_local_fallback_questions(
            topic,
            count - len(questions),
            difficulty=difficulty,
            context=context,
            excluded_keys=seen,
            source_questions=source_questions_for_difficulty,
        ))

    validated_result = []
    validated_texts = []
    for item in questions:
        normalized = _normalise_quiz_item(item, topic, difficulty, subtopic)
        if not normalized:
            continue
        if _question_is_duplicate(normalized["question"], used_texts + validated_texts):
            continue
        validated_result.append(normalized)
        validated_texts.append(normalized["question"])
    result = validated_result[:count]
    _cache_fast_questions(student_id, topic, difficulty, result, db=db)
    return result


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
    """
    from practice_models import AICache
    
    # 1. Reuse only the student's own master cache
    master_cached = db.query(AICache).filter(
        AICache.student_id == student_id,
        AICache.topic == topic,
        AICache.action_type == MASTER_QUESTION_BANK_CACHE
    ).order_by(AICache.created_at.desc()).first()
    if master_cached:
        try:
            bank = json.loads(master_cached.content)
            diff_key = difficulty.lower()
            all_pool = bank.get("easy", []) + bank.get("medium", []) + bank.get("hard", [])
            preferred_pool = bank.get(diff_key, []) if diff_key in ("easy", "medium", "hard") else all_pool
            raw_pool = preferred_pool
            pool = []
            for item in raw_pool:
                normalized = _normalise_quiz_item(
                    item,
                    topic,
                    diff_key if diff_key in ("easy", "medium", "hard") else "mixed",
                    subtopic,
                )
                if normalized:
                    pool.append(normalized)
                
            shown_question_texts = _used_question_texts(student_id, topic, db)

            if pool:
                import random
                shuffled_pool = list(pool)
                random.shuffle(shuffled_pool)
                
                filtered_pool = []
                seen_questions = []
                
                for q in shuffled_pool:
                    question_text = str(q.get("question", "")).strip()
                    if not question_text or _question_is_duplicate(question_text, shown_question_texts + seen_questions) or _is_generic_fallback(question_text):
                        continue
                    seen_questions.append(question_text)
                    filtered_pool.append(q)
                
                if len(filtered_pool) >= count:
                    logger.info(f"[PracticeEngine] Master cache HIT: Retrieved {len(pool)} cached questions, filtered down to {len(filtered_pool)} non-repeated questions, returning {count}")
                    return filtered_pool[:count]
                
                logger.info(f"[PracticeEngine] Cache exhausted (only {len(filtered_pool)} unrepeated questions left). Falling through to fast generation.")
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
    return fast_questions


def generate_local_fallback_questions(
    topic: str,
    count: int,
    difficulty: str = "mixed",
    context: str = "",
    excluded_keys: Optional[set[str]] = None,
    source_questions: Optional[list[dict]] = None,
) -> list[dict]:
    """Build genuine, authentic subject-matter questions."""
    grounded = generate_content_fallback_questions(
        topic,
        count,
        difficulty,
        context,
        excluded_keys=excluded_keys,
        source_questions=source_questions,
    )
    return grounded[:count]
