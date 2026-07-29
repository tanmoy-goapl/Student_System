from enum import Enum
from sqlalchemy.orm import Session
from models import ChatMessage
import logging

logger = logging.getLogger(__name__)


class RetrievalMode(str, Enum):
    STRICT_DOCUMENT = "STRICT_DOCUMENT"
    FACTUAL_RAG = "FACTUAL_RAG"
    LEARNING = "LEARNING"
    PERSONALIZED_ADVISOR = "PERSONALIZED_ADVISOR"
    ROADMAP_CREATION = "ROADMAP_CREATION"


def detect_retrieval_mode(
    question: str, db: Session = None, student_id: int = None
) -> RetrievalMode:
    q_lower = question.lower()

    # ── 1. ROADMAP CREATION (highest priority — explicit request) ─────────────
    roadmap_triggers = [
        "roadmap", "study plan", "learning plan",
        "curriculum", "study path", "learning path",
    ]
    creation_verbs = [
        "create", "generate", "make", "build", "setup", "prepare",
        "personalized", "yes", "please", "sure", "ok", "start",
        "days", "weeks",
    ]
    if any(t in q_lower for t in roadmap_triggers) and any(
        v in q_lower for v in creation_verbs
    ):
        logger.info("Selected Mode: ROADMAP_CREATION")
        return RetrievalMode.ROADMAP_CREATION

    # Contextual confirmation for roadmap (e.g. "yes" after "would you like me to create a roadmap?")
    if db and student_id:
        try:
            last_msg = (
                db.query(ChatMessage)
                .filter(ChatMessage.student_id == student_id)
                .order_by(ChatMessage.id.desc())
                .first()
            )
            if last_msg and last_msg.role == "assistant":
                lc = last_msg.content.lower()
                if any(
                    phrase in lc
                    for phrase in [
                        "create a personalized roadmap",
                        "would you like me to create",
                        "create a roadmap",
                    ]
                ):
                    confirm_words = [
                        "yes", "please", "sure", "ok", "go ahead", "do it",
                        "create", "build", "make", "generate", "want",
                        "for 10 days", "for 6 weeks",
                    ]
                    if any(w in q_lower for w in confirm_words):
                        logger.info("Selected Mode: ROADMAP_CREATION (confirmed)")
                        return RetrievalMode.ROADMAP_CREATION
        except Exception as ex:
            logger.error(f"Error in contextual intent detection: {ex}")

    # ── 2. STRICT DOCUMENT MODE ──────────────────────────────────────────────
    strict_keywords = [
        "this document", "according to this file", "from my resume",
        "from my marksheet", "only use this document", "this file",
        "this pdf", "these documents",
    ]
    if any(k in q_lower for k in strict_keywords):
        logger.info("Selected Mode: STRICT_DOCUMENT")
        return RetrievalMode.STRICT_DOCUMENT

    if any(
        ext in q_lower
        for ext in [".pdf", ".txt", ".doc", "my resume", "my marksheet"]
    ):
        logger.info("Selected Mode: STRICT_DOCUMENT")
        return RetrievalMode.STRICT_DOCUMENT

    # ── 3. FACTUAL RAG MODE ──────────────────────────────────────────────────
    factual_keywords = [
        "cgpa", "gpa", "marks", "score", "grade", "failed", "result",
        "attendance", "policy", "rule", "handbook", "leave", "requirement",
        "placement", "job", "recruiter", "recruit", "internship", "salary",
        "package", "ats", "academic record", "hostel", "curfew", "backlog",
        "fee structure", "scholarship", "exam rules", "academic regulations",
        "placement eligibility", "disciplinary actions", "grading rules",
        "leave policy", "semester policy",
    ]
    if any(k in q_lower for k in factual_keywords):
        logger.info("Selected Mode: FACTUAL_RAG")
        return RetrievalMode.FACTUAL_RAG

    # ── 4. PERSONALIZED ADVISOR MODE ─────────────────────────────────────────
    advisor_keywords = [
        "career", "role", "become", "path", "guidance", "improve",
        "strategy", "advice", "chances", "plan",
    ]
    if any(k in q_lower for k in advisor_keywords):
        logger.info("Selected Mode: PERSONALIZED_ADVISOR")
        return RetrievalMode.PERSONALIZED_ADVISOR

    # ── 5. LEARNING MODE (default fallback) ──────────────────────────────────
    logger.info("Selected Mode: LEARNING (default)")
    return RetrievalMode.LEARNING
