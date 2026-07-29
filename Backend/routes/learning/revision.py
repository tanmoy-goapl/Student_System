from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from practice_models import TopicPerformance

router = APIRouter()

class AddRevisionRequest(BaseModel):
    student_id: int
    topic_name: str
    priority: Optional[str] = "high"


@router.post("/revision")
def add_to_revision(req: AddRevisionRequest, db: Session = Depends(get_db)):
    perf = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == req.student_id,
        TopicPerformance.topic == req.topic_name
    ).first()
    
    overdue_date = datetime.utcnow() - timedelta(days=10)
    
    if perf:
        perf.accuracy = min(perf.accuracy, 30.0)
        perf.status = "WEAK"
        perf.last_practiced_at = overdue_date
        perf.sessions = max(perf.sessions, 1)
    else:
        perf = TopicPerformance(
            student_id=req.student_id,
            topic=req.topic_name,
            subject="General",
            sessions=1,
            questions_attempted=5,
            correct_answers=1,
            accuracy=20.0,
            status="WEAK",
            last_practiced_at=overdue_date,
            current_difficulty="easy"
        )
        db.add(perf)
        
    db.commit()
    return {"success": True, "message": "Added to revision."}
