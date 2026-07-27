import logging
from enum import Enum

logger = logging.getLogger(__name__)

class RetrievalStrategy(str, Enum):
    DOCUMENT_RECONSTRUCTION = "DOCUMENT_RECONSTRUCTION"
    PER_DOCUMENT_SEARCH = "PER_DOCUMENT_SEARCH"
    GLOBAL_SEARCH = "GLOBAL_SEARCH"

    @property
    def enable_query_rewrite(self) -> bool:
        return self != RetrievalStrategy.DOCUMENT_RECONSTRUCTION

def plan_retrieval_strategy(question: str, has_specific_target_docs: bool) -> RetrievalStrategy:
    """
    Decides the retrieval strategy independently of document resolution.
    """
    q_lower = question.lower()
    
    # Check if user requested full document operations
    document_wide_keywords = ["summarize", "explain", "study", "review", "roadmap", "read complete", "entire document", "full document"]
    is_doc_wide = any(kw in q_lower for kw in document_wide_keywords)

    if has_specific_target_docs and is_doc_wide:
        logger.info("[QueryPlanner] Strategy selected: DOCUMENT_RECONSTRUCTION")
        return RetrievalStrategy.DOCUMENT_RECONSTRUCTION
    
    if has_specific_target_docs:
        logger.info("[QueryPlanner] Strategy selected: PER_DOCUMENT_SEARCH")
        return RetrievalStrategy.PER_DOCUMENT_SEARCH

    logger.info("[QueryPlanner] Strategy selected: GLOBAL_SEARCH")
    return RetrievalStrategy.GLOBAL_SEARCH
