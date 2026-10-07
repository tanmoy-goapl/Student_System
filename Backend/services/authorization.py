"""Shared ownership and role checks for user-scoped API routes.

The application currently passes the logged-in user's id in request data rather
than using a signed session/JWT.  These helpers still enforce the important
server-side boundary: the supplied id must exist, be active, have the required
role, and own (or be allowed to access) the requested record.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Document, User


def get_active_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active is False:
        raise HTTPException(status_code=403, detail="User account is inactive")
    return user


def require_user(user_id: int, db: Session) -> User:
    return get_active_user(user_id, db)


def require_role(user_id: int, role: str, db: Session) -> User:
    user = get_active_user(user_id, db)
    if user.role != role:
        raise HTTPException(status_code=403, detail=f"Only {role}s can use this endpoint")
    return user


def require_student(user_id: int, db: Session) -> User:
    return require_role(user_id, "student", db)


def require_professor(user_id: int, db: Session) -> User:
    return require_role(user_id, "professor", db)


def require_admin(user_id: int, db: Session) -> User:
    return require_role(user_id, "admin", db)


def document_owner_id(document: Document) -> int | None:
    """Resolve ownership for both new and legacy document rows."""
    return document.owner_id if document.owner_id is not None else document.student_id


def require_document_owner(document: Document, user_id: int, db: Session) -> User:
    user = get_active_user(user_id, db)
    if user.role != "admin" and document_owner_id(document) != user.id:
        raise HTTPException(status_code=403, detail="You do not own this document")
    return user


def _class_ids_owned_by_professor(professor_id: int, db: Session) -> set[int]:
    from classroom_models import Classroom

    return {
        classroom.id
        for classroom in db.query(Classroom).filter(
            Classroom.professor_id == professor_id
        ).all()
    }


def _class_ids_joined_by_student(student_id: int, db: Session) -> set[int]:
    from classroom_models import StudentClass

    return {
        membership.class_id
        for membership in db.query(StudentClass).filter(
            StudentClass.student_id == student_id
        ).all()
    }


def _effective_visibility(document: Document) -> str:
    visibility = (document.visibility or "").strip().lower()
    if visibility in {"institution", "all"}:
        return "universal"
    if visibility in {"classroom", "course"}:
        return "course_shared"
    if visibility:
        return visibility

    # Legacy rows used readable_by before visibility was introduced.
    readable_by = (document.readable_by or "owner").strip().lower()
    if readable_by in {"all", "institution", "universal"}:
        return "universal"
    if readable_by in {"professor", "course", "classroom"}:
        return "course_shared"
    return "private"


def require_document_access(document: Document, user_id: int, db: Session) -> User:
    """Validate that a user may read a document or use it for RAG/preview."""
    user = get_active_user(user_id, db)
    owner_id = document_owner_id(document)
    visibility = _effective_visibility(document)

    if owner_id == user.id:
        return user

    if user.role == "admin":
        if visibility in {"universal", "admin_shared"}:
            return user
    elif user.role == "professor":
        if visibility == "universal":
            return user
        if visibility == "course_shared":
            class_ids = _class_ids_owned_by_professor(user.id, db)
            if document.classroom_id in class_ids:
                return user
    elif user.role == "student":
        if visibility == "universal":
            return user
        if visibility == "course_shared":
            class_ids = _class_ids_joined_by_student(user.id, db)
            if document.classroom_id in class_ids:
                return user

    raise HTTPException(status_code=403, detail="You do not have access to this document")


def require_professor_class(
    professor_id: int,
    classroom_id: int,
    db: Session,
):
    """Return the active professor and a classroom they own."""
    professor = require_professor(professor_id, db)
    from classroom_models import Classroom

    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if classroom.professor_id != professor.id:
        raise HTTPException(status_code=403, detail="You can only access your own classroom")
    return professor, classroom
