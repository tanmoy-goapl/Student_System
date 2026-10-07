"""Shared chatbot preflight filtering.

General informational questions are allowed for every role. The only narrow
boundary enforced here is direct entertainment generation, such as requesting
a joke, song, poem, riddle, or roleplay.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import unicodedata
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Callable, Iterable

import numpy as np

from services.embedding import get_embeddings

logger = logging.getLogger(__name__)

_EXAMPLES_PATH = Path(__file__).with_name("student_scope_examples.json")
_CACHE_LOCK = threading.Lock()
_PROTOTYPE_CACHE: tuple[int, list[tuple[str, str, np.ndarray]], list[tuple[str, str, np.ndarray]]] | None = None


class ScopeDecision(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    UNCERTAIN = "uncertain"


@dataclass(frozen=True)
class ScopeResult:
    decision: ScopeDecision
    allowed_score: float = 0.0
    blocked_score: float = 0.0
    matched_category: str | None = None


def normalize_for_scope(question: str) -> str:
    """Normalize formatting without maintaining a term-by-term alias list."""
    value = unicodedata.normalize("NFKC", question or "")
    value = value.replace("’", "'").replace("`", "'")
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


_BASIC_ARITHMETIC_RE = re.compile(
    r"(?<![\w.])\d+(?:\.\d+)?(?:\s*(?:\*\*|//|[+\-*/%])\s*\d+(?:\.\d+)?)+(?![\w.])"
)

# The chatbot is intentionally broad for factual, educational, technical,
# career, planning, and everyday informational questions. Only direct
# entertainment-generation requests are blocked before retrieval/LLM work.
_ENTERTAINMENT_GENERATION_PATTERNS = (
    re.compile(
        r"\b(?:tell|give|make|write|compose|create|generate|share|send)\s+"
        r"(?:me\s+)?(?:a|an|some)?\s*"
        r"(?:bad|funny|dark|dirty)?\s*"
        r"(?:joke|riddle|meme|roast|poem|poetry|rap|song|lyrics?|story)\b",
        flags=re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:sing|hum|perform|recite|play)\s+"
        r"(?:me\s+)?(?:a|an|some)?\s*"
        r"(?:song|lyrics?|poem|poetry|rap|joke)\b",
        flags=re.IGNORECASE,
    ),
    re.compile(
        r"^(?:sing|hum|perform|recite)\b",
        flags=re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:roleplay|role-play)\b",
        flags=re.IGNORECASE,
    ),
)

def _is_short_supported_conversation(question: str) -> bool:
    return bool(re.fullmatch(
        r"(?:hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|"
        r"what can you do|how can you help|help me|yes|yeah|yep|ok|okay|sure|"
        r"please|go ahead|do it|update learning preferences|edit answers|generate roadmap)[!.?, ]*",
        question,
        flags=re.IGNORECASE,
    )) or bool(re.match(
        r"^(?:create|generate|make|build) (?:a )?(?:personalized )?(?:learning )?roadmap\b",
        question,
        flags=re.IGNORECASE,
    ))


def _load_example_groups() -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    with _EXAMPLES_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    allowed = [
        (item["category"], example)
        for item in data.get("allowed", [])
        for example in item.get("examples", [])
    ]
    blocked = [
        (item["category"], example)
        for item in data.get("blocked", [])
        for example in item.get("examples", [])
    ]
    if not allowed or not blocked:
        raise ValueError("Student scope examples must contain allowed and blocked examples")
    return allowed, blocked


def _unit_vector(values: Iterable[float]) -> np.ndarray:
    vector = np.asarray(list(values), dtype=np.float32)
    norm = np.linalg.norm(vector)
    return vector / norm if norm else vector


def _build_prototypes(
    embed_fn: Callable[[list[str]], list[list[float]]] = get_embeddings,
) -> tuple[list[tuple[str, str, np.ndarray]], list[tuple[str, str, np.ndarray]]]:
    allowed_examples, blocked_examples = _load_example_groups()
    all_examples = allowed_examples + blocked_examples
    vectors = embed_fn([text for _, text in all_examples])
    split = len(allowed_examples)

    allowed = [
        (category, text, _unit_vector(vector))
        for (category, text), vector in zip(allowed_examples, vectors[:split])
    ]
    blocked = [
        (category, text, _unit_vector(vector))
        for (category, text), vector in zip(blocked_examples, vectors[split:])
    ]
    return allowed, blocked


def _get_prototypes() -> tuple[list[tuple[str, str, np.ndarray]], list[tuple[str, str, np.ndarray]]]:
    global _PROTOTYPE_CACHE
    cache_key = _EXAMPLES_PATH.stat().st_mtime_ns
    if _PROTOTYPE_CACHE and _PROTOTYPE_CACHE[0] == cache_key:
        return _PROTOTYPE_CACHE[1], _PROTOTYPE_CACHE[2]

    with _CACHE_LOCK:
        if _PROTOTYPE_CACHE and _PROTOTYPE_CACHE[0] == cache_key:
            return _PROTOTYPE_CACHE[1], _PROTOTYPE_CACHE[2]
        allowed, blocked = _build_prototypes()
        _PROTOTYPE_CACHE = (cache_key, allowed, blocked)
        return allowed, blocked


def _best_match(vector: np.ndarray, prototypes: list[tuple[str, str, np.ndarray]]) -> tuple[float, str | None]:
    scores = [float(np.dot(vector, prototype)) for _, _, prototype in prototypes]
    if not scores:
        return 0.0, None
    index = int(np.argmax(scores))
    return scores[index], prototypes[index][0]


_ACADEMIC_DISHONESTY_PATTERNS = (
    re.compile(
        r"\b(?:write|do|solve|complete)\s+(?:my\s+)?(?:essay|homework|assignment|exam|quiz)\b",
        flags=re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:give|tell)\s+(?:me\s+)?(?:the\s+)?answers?\s+(?:to|for)\s+(?:this\s+)?(?:exam|quiz|test)\b",
        flags=re.IGNORECASE,
    ),
)

_TOXICITY_PATTERNS = (
    re.compile(
        r"\b(?:stupid|useless|idiot|dumb|hate\s+you|fuck|shit|bitch)\b",
        flags=re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:kill\s+myself|hurt\s+myself|suicide)\b",
        flags=re.IGNORECASE,
    ),
)

_JAILBREAK_PATTERNS = (
    re.compile(
        r"\b(?:ignore|forget)\s+(?:all\s+)?(?:previous\s+)?(?:instructions|rules|prompts)\b",
        flags=re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:developer\s+mode|system\s+prompt|unfiltered\s+ai)\b",
        flags=re.IGNORECASE,
    ),
)

def is_explicitly_blocked_request(question: str) -> str | None:
    """Return the matched category if the question hits a blocked regex."""
    normalized = normalize_for_scope(question)
    if not normalized:
        return None
    if any(pattern.search(normalized) for pattern in _ENTERTAINMENT_GENERATION_PATTERNS):
        return "non_learning_entertainment"
    if any(pattern.search(normalized) for pattern in _ACADEMIC_DISHONESTY_PATTERNS):
        return "academic_dishonesty"
    if any(pattern.search(normalized) for pattern in _TOXICITY_PATTERNS):
        return "toxicity"
    if any(pattern.search(normalized) for pattern in _JAILBREAK_PATTERNS):
        return "jailbreak"
    return None


def classify_student_scope(
    question: str,
    embed_fn: Callable[[list[str]], list[list[float]]] | None = None,
) -> ScopeResult:
    """Classify allowed vs blocked scope using regex rules and semantic embeddings."""
    normalized = normalize_for_scope(question)
    if not normalized:
        return ScopeResult(ScopeDecision.BLOCK, matched_category="empty")
        
    # 1. Check strict regex rules
    blocked_category = is_explicitly_blocked_request(normalized)
    if blocked_category:
        return ScopeResult(ScopeDecision.BLOCK, matched_category=blocked_category)

    # 2. Check semantic prototype embeddings
    try:
        allowed, blocked = _get_prototypes()
        fn = embed_fn or get_embeddings
        vector = _unit_vector(fn([normalized])[0])
        
        allowed_score, _ = _best_match(vector, allowed)
        blocked_score, matched_blocked = _best_match(vector, blocked)
        
        # If it strongly matches a blocked category
        if blocked_score > 0.82 and blocked_score > allowed_score:
            return ScopeResult(
                ScopeDecision.BLOCK,
                allowed_score=allowed_score,
                blocked_score=blocked_score,
                matched_category=matched_blocked
            )
            
        return ScopeResult(
            ScopeDecision.ALLOW,
            allowed_score=allowed_score,
            blocked_score=blocked_score,
            matched_category="semantic_allowed"
        )
    except Exception as exc:
        logger.warning(f"Semantic scope classifier failed, defaulting to regex rules: {exc}")
        return ScopeResult(
            ScopeDecision.ALLOW,
            matched_category="general_information",
        )


def is_student_question_in_scope(question: str) -> bool:
    """Compatibility wrapper: allow everything except blocked entertainment."""
    try:
        result = classify_student_scope(question)
    except Exception:
        logger.exception("Student scope router unavailable; rejecting question safely")
        return False
    return result.decision == ScopeDecision.ALLOW
