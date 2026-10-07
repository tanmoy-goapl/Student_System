from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from practice_models import CustomTopic, RevisionItem, TopicPerformance
from services.authorization import require_student

router = APIRouter()

_VALID_PRIORITIES = {"low", "medium", "high"}


class AddRevisionRequest(BaseModel):
    student_id: int
    topic_name: str
    priority: Optional[str] = "high"
    subject: Optional[str] = None


def _resolve_subject(req: AddRevisionRequest, db: Session) -> str:
    requested_subject = (req.subject or "").strip()
    if requested_subject:
        return requested_subject

    performance = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == req.student_id,
        TopicPerformance.topic == req.topic_name,
    ).first()
    if performance and performance.subject:
        return performance.subject

    custom_topic = db.query(CustomTopic).filter(
        CustomTopic.student_id == req.student_id,
        CustomTopic.topic_name == req.topic_name,
    ).first()
    if custom_topic and custom_topic.subject_name:
        return custom_topic.subject_name

    return "Personal topics"


@router.post("/revision")
def add_to_revision(req: AddRevisionRequest, db: Session = Depends(get_db)):
    require_student(req.student_id, db)
    topic_name = req.topic_name.strip()
    if not topic_name:
        raise HTTPException(status_code=400, detail="A topic is required to add a revision item.")

    priority = (req.priority or "high").strip().lower()
    if priority not in _VALID_PRIORITIES:
        priority = "high"

    subject = _resolve_subject(
        AddRevisionRequest(
            student_id=req.student_id,
            topic_name=topic_name,
            priority=priority,
            subject=req.subject,
        ),
        db,
    )

    item = db.query(RevisionItem).filter(
        RevisionItem.student_id == req.student_id,
        RevisionItem.topic == topic_name,
        RevisionItem.status == "pending",
    ).first()

    if item:
        item.priority = priority
        item.subject = subject
        message = "Revision is already queued; priority updated."
    else:
        item = RevisionItem(
            student_id=req.student_id,
            topic=topic_name,
            subject=subject,
            priority=priority,
            status="pending",
        )
        db.add(item)
        message = "Added to revision."

    db.commit()
    db.refresh(item)

    return {
        "success": True,
        "message": message,
        "revision_item": {
            "id": item.id,
            "student_id": item.student_id,
            "topic": item.topic,
            "subject": item.subject,
            "priority": item.priority,
            "status": item.status,
            "added_at": item.added_at.isoformat() if item.added_at else None,
        },
    }


@router.get("/revision/{student_id}")
def get_revision_items(student_id: int, db: Session = Depends(get_db)):
    require_student(student_id, db)
    items = db.query(RevisionItem).filter(
        RevisionItem.student_id == student_id,
        RevisionItem.status == "pending",
    ).order_by(RevisionItem.added_at.asc()).all()

    return {
        "success": True,
        "items": [
            {
                "id": item.id,
                "topic": item.topic,
                "subject": item.subject or "Personal topics",
                "priority": item.priority,
                "status": item.status,
                "added_at": item.added_at.isoformat() if item.added_at else None,
            }
            for item in items
        ],
    }
