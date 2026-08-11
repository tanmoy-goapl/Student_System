"""Semantic routing for the Student Chat domain boundary.

The router intentionally uses configurable examples instead of a keyword list.
The embedding model is loaded lazily and shared with the existing embedding
service. This keeps the decision local and avoids an extra GPT request.
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


def classify_student_scope(
    question: str,
    embed_fn: Callable[[list[str]], list[list[float]]] | None = None,
) -> ScopeResult:
    normalized = normalize_for_scope(question)
    if not normalized:
        return ScopeResult(ScopeDecision.BLOCK, matched_category="empty")
    if _is_short_supported_conversation(normalized):
        return ScopeResult(ScopeDecision.ALLOW, matched_category="conversation")

    if embed_fn is None:
        allowed, blocked = _get_prototypes()
        query_vector = _unit_vector(get_embeddings([normalized])[0])
    else:
        allowed, blocked = _build_prototypes(embed_fn)
        query_vector = _unit_vector(embed_fn([normalized])[0])

    allowed_score, allowed_category = _best_match(query_vector, allowed)
    blocked_score, blocked_category = _best_match(query_vector, blocked)
    margin = allowed_score - blocked_score

    # A strong semantic match to an academic category should win over a broad
    # blocked prototype such as generic animal trivia. This allows legitimate
    # science questions without opening the door to bare trivia.
    academic_categories = {
        "academic_learning",
        "coding_and_computer_science",
        "student_support",
        "career_and_roadmap",
    }
    if allowed_score >= 0.50 and allowed_category in academic_categories:
        return ScopeResult(ScopeDecision.ALLOW, allowed_score, blocked_score, allowed_category)
    if allowed_score >= 0.20 and margin >= 0.03:
        return ScopeResult(ScopeDecision.ALLOW, allowed_score, blocked_score, allowed_category)
    if blocked_score >= 0.52 and margin <= -0.03:
        return ScopeResult(ScopeDecision.BLOCK, allowed_score, blocked_score, blocked_category)
    return ScopeResult(ScopeDecision.UNCERTAIN, allowed_score, blocked_score, allowed_category or blocked_category)


def is_student_question_in_scope(question: str) -> bool:
    """Compatibility boolean for the existing role-guardrail call site."""
    try:
        result = classify_student_scope(question)
    except Exception:
        logger.exception("Student scope router unavailable; rejecting question safely")
        return False
    if result.decision == ScopeDecision.UNCERTAIN:
        logger.info(
            "Student scope uncertain: allowed=%.3f blocked=%.3f category=%s",
            result.allowed_score,
            result.blocked_score,
            result.matched_category,
        )
    return result.decision == ScopeDecision.ALLOW
