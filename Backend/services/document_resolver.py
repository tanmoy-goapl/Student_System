import logging
import re
from sqlalchemy.orm import Session
from models import Document, User
from services.chatbot.chat_intent import RetrievalMode, is_personal_profile_question

logger = logging.getLogger(__name__)

_FILENAME_GENERIC_TOKENS = {
    "ai", "pdf", "doc", "docs", "document", "documents", "file", "files",
    "study", "material", "materials", "lesson", "plan", "practice", "set",
    "notes", "note", "report", "reports", "placement", "placements",
    "policy", "policies", "rule", "rules", "regulation", "regulations",
    "handbook", "academic", "college", "university",
}
_POLICY_DOCUMENT_TYPES = {
    "policy", "handbook", "rules", "regulations", "attendance",
    "academic_calendar",
}
_POLICY_FILENAME_MARKERS = (
    "policy", "policies", "rule", "rules", "regulation", "regulations",
    "handbook", "attendance",
)
_REPORT_FILENAME_MARKERS = (
    "report", "placement_companies", "sector_wise",
)
_PERSONAL_DOCUMENT_TYPES = {
    "resume", "cv", "marksheet", "transcript", "grade", "grades",
    "academic_record",
}
_PERSONAL_FILENAME_MARKERS = (
    "resume", "cv", "marksheet", "transcript", "grade", "academic",
    "profile",
)
_POLICY_QUERY_TERMS = (
    "policy", "policies", "rule", "rules", "regulation", "regulations",
    "handbook", "criteria", "guideline", "guidelines", "attendance",
    "attendence", "leave", "mandatory", "debarment", "condonation",
    "exam rule", "academic regulation",
)


def _normalize_query(question: str) -> str:
    """Normalize only common spelling variants used for document routing."""
    normalized = re.sub(r"\s+", " ", str(question or "")).strip().lower()
    replacements = {
        "plicy": "policy",
        "polcy": "policy",
        "policys": "policies",
        "attendence": "attendance",
        "eligiblity": "eligibility",
    }
    for misspelling, correction in replacements.items():
        normalized = re.sub(
            rf"\b{re.escape(misspelling)}\b",
            correction,
            normalized,
        )
    return normalized


def get_role_visible_docs(student_id: int, role: str, db: Session) -> list[Document]:
    """
    Return ALL documents that the current user is permitted to see,
    based on their role and visibility tiers.
    """
    uid = student_id

    if role == "admin":
        return db.query(Document).filter(
            (Document.visibility == "universal") |
            (Document.visibility == "admin_shared") |
            (
                (Document.visibility == "private") &
                ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid))) &
                (Document.owner_role == "admin")
            )
        ).all()

    elif role == "professor":
        from classroom_models import Classroom
        teaches = db.query(Classroom).filter(Classroom.professor_id == uid).all()
        teach_ids = [c.id for c in teaches]

        return db.query(Document).filter(
            (Document.visibility == "universal") |
            (
                (Document.visibility == "course_shared") &
                (
                    (Document.classroom_id.in_(teach_ids) if teach_ids else False) |
                    ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid)))
                )
            ) |
            (
                (Document.visibility == "private") &
                ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid))) &
                (Document.owner_role == "professor")
            )
        ).all()

    else:  # student
        from classroom_models import StudentClass
        joined = db.query(StudentClass).filter(StudentClass.student_id == uid).all()
        class_ids = [c.class_id for c in joined]

        return db.query(Document).filter(
            (Document.visibility == "universal") |
            (
                (Document.visibility == "course_shared") &
                (Document.classroom_id.in_(class_ids) if class_ids else False)
            ) |
            (
                (Document.visibility == "private") &
                ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid))) &
                (Document.owner_role == "student")
            )
        ).all()


def _normalize_filename_phrase(value: str) -> str:
    """Normalize a filename for explicit phrase matching only."""
    stem = re.sub(r"\.[^./\\]+$", "", str(value or "").lower())
    tokens = [
        token for token in re.split(r"[\W_]+", stem)
        if token and not token.isdigit()
    ]
    return " ".join(tokens)


def _detect_mentioned_doc_ids(question: str, visible_docs: list[Document]) -> list[int]:
    """Match a document only when its normalized filename phrase is explicit."""
    normalized_question = _normalize_filename_phrase(question)
    mentioned_ids = []
    for doc in visible_docs:
        filename_phrase = _normalize_filename_phrase(doc.filename)
        if filename_phrase and filename_phrase in normalized_question:
            mentioned_ids.append(doc.id)
    return mentioned_ids


def resolve_documents(
    mode: RetrievalMode,
    question: str,
    student_id: int,
    role: str,
    db: Session
) -> tuple[list[Document], list[Document]]:
    """
    Resolves documents for a query into (target_docs, searched_docs).
    - target_docs: Specific documents explicitly targeted by the user query.
    - searched_docs: All documents searched/considered in context building.
    """
    visible_docs = get_role_visible_docs(student_id, role, db)
    q_lower = _normalize_query(question)

    # 1. Filename matching is intentionally conservative. Generic words such
    # as "placement" must not select a report when the user is asking for a
    # policy.
    explicit_ids = set(_detect_mentioned_doc_ids(question, visible_docs))
    if q_lower != question.lower():
        explicit_ids.update(_detect_mentioned_doc_ids(q_lower, visible_docs))
    mentioned_ids = list(explicit_ids)

    # 2. Semantic alias and document-type matching
    alias_map = {
        "resume": ["resume", "cv"],
        "cv": ["resume", "cv"],
        "marksheet": ["marksheet", "transcript", "grade", "gpa", "cgpa"],
        "transcript": ["marksheet", "transcript", "grade"],
        "syllabus": ["syllabus", "curriculum", "course_structure"],
        "policy": ["policy", "handbook", "rules", "regulations", "academic_calendar"],
        "attendance": ["policy", "handbook", "rules", "regulations", "attendance"],
        "criteria": ["policy", "handbook", "rules", "regulations"],
        "eligibility": ["policy", "handbook", "rules", "regulations"],
        "placement": ["placement", "placement_record", "job", "recruitment", "interview", "ats_report"],
    }

    matched_types = set()
    for keyword, target_types in alias_map.items():
        if keyword in q_lower:
            matched_types.update(target_types)

    # First-person profile questions should prefer the users own profile
    # evidence without requiring the user to name the file explicitly.
    if is_personal_profile_question(q_lower):
        for doc in visible_docs:
            if (doc.visibility or "").lower() != "private":
                continue
            doc_type = (doc.document_type or "").lower()
            filename = (doc.filename or "").lower()
            is_personal_doc = (
                doc_type in _PERSONAL_DOCUMENT_TYPES
                or any(marker in filename for marker in _PERSONAL_FILENAME_MARKERS)
            )
            if is_personal_doc and doc.id not in mentioned_ids:
                mentioned_ids.append(doc.id)

    if matched_types:
        for doc in visible_docs:
            doc_type = (doc.document_type or "").lower()
            filename_tokens = {
                token for token in re.split(r"[\s_\-]", doc.filename.lower())
                if len(token) > 2
            }
            filename_matches = any(
                term in filename_tokens
                for term in matched_types
                if term not in _FILENAME_GENERIC_TOKENS
            )
            if doc_type in matched_types or filename_matches:
                if doc.id not in mentioned_ids:
                    mentioned_ids.append(doc.id)

    # Policy questions should search policy material first. This prevents a
    # placement report that happens to contain the word "placement" from
    # displacing the academic rules that contain the actual attendance rule.
    is_policy_query = any(
        re.search(rf"\b{re.escape(term)}\b", q_lower)
        for term in _POLICY_QUERY_TERMS
    )
    # Keep policy-first narrowing only for policy-only questions. A mixed
    # request such as "placement policy and companies" must retain both
    # policy and placement documents for retrieval.
    policy_only_query = bool(matched_types) and matched_types.issubset(
        _POLICY_DOCUMENT_TYPES
    )
    if is_policy_query and policy_only_query:
        policy_docs = []
        for doc in visible_docs:
            doc_type = (doc.document_type or "").lower()
            filename = (doc.filename or "").lower()
            is_policy_doc = (
                doc_type in _POLICY_DOCUMENT_TYPES
                or any(marker in filename for marker in _POLICY_FILENAME_MARKERS)
            )
            is_report = any(marker in filename for marker in _REPORT_FILENAME_MARKERS)
            if is_policy_doc and (not is_report or doc.id in explicit_ids):
                policy_docs.append(doc)

        if policy_docs:
            policy_ids = {doc.id for doc in policy_docs}
            mentioned_ids = [
                doc_id for doc_id in mentioned_ids
                if doc_id in explicit_ids or doc_id in policy_ids
            ]
            for doc in policy_docs:
                if doc.id not in mentioned_ids:
                    mentioned_ids.append(doc.id)

    target_docs = [d for d in visible_docs if d.id in mentioned_ids]

    if mode == RetrievalMode.STRICT_DOCUMENT:
        searched_docs = target_docs if target_docs else visible_docs
    else:
        searched_docs = visible_docs

    logger.info(f"[DocumentResolver] Visible: {len(visible_docs)}, Target: {[d.filename for d in target_docs]}, Searched: {[d.filename for d in searched_docs]}")
    return target_docs, searched_docs
