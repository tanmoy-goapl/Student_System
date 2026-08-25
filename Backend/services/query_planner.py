import logging
import re
from enum import Enum

from services.chatbot.chat_intent import is_personal_profile_question

logger = logging.getLogger(__name__)

class RetrievalStrategy(str, Enum):
    DOCUMENT_RECONSTRUCTION = "DOCUMENT_RECONSTRUCTION"
    PER_DOCUMENT_SEARCH = "PER_DOCUMENT_SEARCH"
    GLOBAL_SEARCH = "GLOBAL_SEARCH"

    @property
    def enable_query_rewrite(self) -> bool:
        return self != RetrievalStrategy.DOCUMENT_RECONSTRUCTION

_BROAD_QUERY_PATTERNS = (
    r"\ball\b", r"\bevery\b", r"\beach\b", r"\blist\b",
    r"\bcompare\b", r"\bcomparison\b", r"\bbreakdown\b",
    r"\bcomplete\b", r"\bentire\b", r"\bfull\b", r"\btotal\b",
    r"\bhow many\b", r"\bwhich companies\b", r"\bpackages\b",
    r"\boffers\b", r"\brecruiters\b",
)


def is_broad_query(question: str) -> bool:
    """Return whether the user is asking for coverage/list/aggregation."""
    normalized = re.sub(r"\s+", " ", str(question or "").lower()).strip()
    return any(re.search(pattern, normalized) for pattern in _BROAD_QUERY_PATTERNS)


def plan_retrieval_strategy(
    question: str,
    has_specific_target_docs: bool,
    target_doc_types: list[str] | None = None,
) -> RetrievalStrategy:
    """
    Decides the retrieval strategy independently of document resolution.
    """
    q_lower = re.sub(
        r"\b(?:plicy|polcy|polic)\b",
        "policy",
        question.lower(),
    )
    
    # Policy and attendance questions are best answered from the complete,
    # small policy documents once the resolver has identified them.
    document_wide_keywords = [
        "summarize", "explain", "study", "review", "roadmap",
        "read complete", "entire document", "full document",
        "attendance", "policy", "policies", "rule", "rules",
        "regulation", "regulations", "handbook", "criteria",
    ]
    is_doc_wide = any(kw in q_lower for kw in document_wide_keywords) or is_broad_query(q_lower)

    normalized_doc_types = {
        re.sub(r"\s+", "_", str(doc_type or "").strip().lower())
        for doc_type in (target_doc_types or [])
        if str(doc_type or "").strip()
    }
    has_mixed_document_types = len(normalized_doc_types) > 1

    is_personal_profile = is_personal_profile_question(question)

    if has_specific_target_docs and (is_doc_wide or is_personal_profile) and not has_mixed_document_types:
        logger.info("[QueryPlanner] Strategy selected: DOCUMENT_RECONSTRUCTION")
        return RetrievalStrategy.DOCUMENT_RECONSTRUCTION
    
    if has_specific_target_docs:
        logger.info("[QueryPlanner] Strategy selected: PER_DOCUMENT_SEARCH")
        return RetrievalStrategy.PER_DOCUMENT_SEARCH

    logger.info("[QueryPlanner] Strategy selected: GLOBAL_SEARCH")
    return RetrievalStrategy.GLOBAL_SEARCH
