import logging
import re
from sqlalchemy.orm import Session
from models import Document, User
from services.chatbot.chat_intent import RetrievalMode

logger = logging.getLogger(__name__)


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


def _detect_mentioned_doc_ids(question: str, visible_docs: list[Document]) -> list[int]:
    """Token-based filename matching."""
    q = question.lower()
    mentioned_ids = []
    for doc in visible_docs:
        filename = doc.filename.lower()
        basename = filename.split('.')[0] if '.' in filename else filename
        tokens = [t for t in re.split(r'[\s_\-]', basename) if len(t) > 2]
        
        if filename in q or basename in q:
            mentioned_ids.append(doc.id)
            continue
        
        for t in tokens:
            if t in q:
                mentioned_ids.append(doc.id)
                break
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
    q_lower = question.lower()

    # 1. Filename token matching
    mentioned_ids = _detect_mentioned_doc_ids(question, visible_docs)

    # 2. Semantic Alias & Synonym Matching
    alias_map = {
        "resume": ["resume", "cv"],
        "cv": ["resume", "cv"],
        "marksheet": ["marksheet", "transcript", "grade", "gpa", "cgpa"],
        "transcript": ["marksheet", "transcript", "grade"],
        "syllabus": ["syllabus", "curriculum", "course_structure"],
        "policy": ["policy", "handbook", "rules", "regulations"],
        "placement": ["placement", "job", "recruitment", "interview"],
    }

    matched_types = set()
    for keyword, target_types in alias_map.items():
        if keyword in q_lower:
            matched_types.update(target_types)

    if matched_types:
        for doc in visible_docs:
            doc_type = (doc.document_type or "").lower()
            fn_lower = doc.filename.lower()
            if doc_type in matched_types or any(t in fn_lower for t in matched_types):
                if doc.id not in mentioned_ids:
                    mentioned_ids.append(doc.id)

    target_docs = [d for d in visible_docs if d.id in mentioned_ids]

    if mode == RetrievalMode.STRICT_DOCUMENT:
        searched_docs = target_docs if target_docs else visible_docs
    else:
        searched_docs = visible_docs

    logger.info(f"[DocumentResolver] Visible: {len(visible_docs)}, Target: {[d.filename for d in target_docs]}, Searched: {[d.filename for d in searched_docs]}")
    return target_docs, searched_docs
