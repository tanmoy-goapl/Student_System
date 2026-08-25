from enum import Enum
import re
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


_GENERAL_DEFINITION_RE = re.compile(
    r"^(?:what is|what are|who is|who are|what does|define|explain|"
    r"how does|how do|difference between)\b",
    flags=re.IGNORECASE,
)
_PERSONAL_OR_INSTITUTIONAL_TERMS = (
    "my ", "our ", "student ", "college", "campus", "institution",
    "university", "attendance", "marks", "cgpa", "gpa", "grade", "score",
    "fee", "hostel", "curfew", "leave", "policy", "handbook", "eligibility",
    "academic record", "disciplinary", "grading rule", "exam rule",
)


def _normalize_common_query(question: str) -> str:
    normalized = re.sub(r"\s+", " ", str(question or "")).strip().lower()
    for misspelling, correction in {
        "plicy": "policy",
        "polcy": "policy",
        "polic": "policy",
    }.items():
        normalized = re.sub(
            rf"\b{re.escape(misspelling)}\b",
            correction,
            normalized,
        )
    return normalized


def is_general_definition_question(question: str) -> bool:
    """Identify general explanations that should not require user documents."""
    normalized = _normalize_common_query(question)
    if not _GENERAL_DEFINITION_RE.match(normalized):
        return False
    return not any(term in normalized.lower() for term in _PERSONAL_OR_INSTITUTIONAL_TERMS)


_RESUME_ANALYSIS_TERMS = (
    "weak", "weakness", "gap", "missing", "improve", "improvement",
    "strengthen", "shortcoming", "limitation", "feedback", "advice",
    "advise", "suggest", "recommend", "review", "readiness", "fit",
    "qualified", "qualify", "optimize", "growth", "opportunity",
    "opportunities", "areas",
)


def is_resume_analysis_question(question: str) -> bool:
    """Return True for analysis requests about a resume, not simple extraction.

    A request such as "list my projects from my resume" must stay in strict
    document mode. Requests about gaps or improvement need the advisor mode so
    the model can distinguish documented evidence from clearly-labelled
    inferences and recommendations.
    """
    normalized = re.sub(r"\s+", " ", str(question or "")).strip().lower()
    has_resume_reference = bool(
        re.search(r"\b(?:resume|cv|curriculum vitae)\b", normalized)
    )
    return has_resume_reference and any(
        re.search(rf"\b{re.escape(term)}\b", normalized)
        for term in _RESUME_ANALYSIS_TERMS
    )


_PERSONAL_PROFILE_REFERENCE_RE = re.compile(
    r"\b(?:my|mine|me|i|myself)\b",
    flags=re.IGNORECASE,
)
_PERSONAL_PROFILE_TERMS = (
    "specializ", "branch", "major", "field", "degree", "qualif",
    "educat", "academic", "skill", "project", "experienc", "intern",
    "certificat", "profile", "background", "resume", "cv", "course",
    "subject", "mark", "cgpa", "gpa", "grade", "score", "compan",
    "job", "role",
)


def is_personal_profile_question(question: str) -> bool:
    # First-person profile/fact questions should use private evidence.
    normalized = re.sub(r"\s+", " ", str(question or "")).strip().lower()
    if not _PERSONAL_PROFILE_REFERENCE_RE.search(normalized):
        return False
    if is_resume_analysis_question(question):
        return False
    return any(term in normalized for term in _PERSONAL_PROFILE_TERMS)


def detect_retrieval_mode(
    question: str, db: Session = None, student_id: int = None
) -> RetrievalMode:
    q_lower = _normalize_common_query(question)

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
    # Resume analysis is intentionally handled before strict extraction. The
    # user is asking for an evaluation, not claiming that the resume contains
    # a literal section called "weaknesses".
    if is_resume_analysis_question(question):
        logger.info("Selected Mode: PERSONALIZED_ADVISOR (resume analysis)")
        return RetrievalMode.PERSONALIZED_ADVISOR

    if is_personal_profile_question(question):
        logger.info("Selected Mode: STRICT_DOCUMENT (personal profile evidence)")
        return RetrievalMode.STRICT_DOCUMENT

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

    # ── 3. GENERAL DEFINITION MODE ──────────────────────────────────────────
    # Broad terms such as internship, placement, or salary can be general
    # concepts. Keep clear definitions out of document-only mode unless the
    # question is explicitly personal or institutional.
    if is_general_definition_question(question):
        logger.info("Selected Mode: LEARNING (general definition)")
        return RetrievalMode.LEARNING

    # ── 4. FACTUAL RAG MODE ──────────────────────────────────────────────────
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

    # ── 5. PERSONALIZED ADVISOR MODE ─────────────────────────────────────────
    advisor_keywords = [
        "career", "role", "become", "path", "guidance", "improve",
        "strategy", "advice", "chances", "plan",
    ]
    if any(k in q_lower for k in advisor_keywords):
        logger.info("Selected Mode: PERSONALIZED_ADVISOR")
        return RetrievalMode.PERSONALIZED_ADVISOR

    # ── 6. LEARNING MODE (default fallback) ──────────────────────────────────
    logger.info("Selected Mode: LEARNING (default)")
    return RetrievalMode.LEARNING
