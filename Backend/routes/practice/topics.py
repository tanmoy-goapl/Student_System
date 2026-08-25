import logging
import json
import os
import re
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from practice_models import TopicPerformance, CustomTopic
from services.practice.topic_extractor import extract_topics_from_documents
from services.authorization import require_student

logger = logging.getLogger("chatbot")

router = APIRouter()

class AddCustomTopicRequest(BaseModel):
    student_id: int
    topic_name: str
    subject_name: Optional[str] = "General Topics"


@router.get("/topics/{student_id}")
def get_topics(student_id: int, db: Session = Depends(get_db)):
    require_student(student_id, db)
    """Extract topics from student's uploaded documents or curriculum."""
    logger.info(f"[Practice] Extracting topics for student_id={student_id}")

    # Load default curriculum structure
    topics_data = {"subjects": []}
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        p = os.path.join(base_dir, "config", "subject_topics.json")
        with open(p, "r") as f:
            curriculum_data = json.load(f)
            
        current_sem_num = curriculum_data.get("current_semester", 3)
        
        for sem in curriculum_data.get("semesters", []):
            sem_num_match = re.search(r'semester-(\d+)', sem["id"])
            sem_num = int(sem_num_match.group(1)) if sem_num_match else 1
            
            if sem_num == current_sem_num:
                for course in sem.get("courses", []):
                    subject_info = {
                        "name": course["name"],
                        "topics": [{"name": t} for t in course.get("topics", [])]
                    }
                    topics_data["subjects"].append(subject_info)
    except Exception as e:
        logger.error(f"[Practice] Error loading curriculum topics: {e}")

    # Load enrolled class curriculums
    try:
        from classroom_models import StudentClass, ClassCurriculum
        enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
        class_ids = [c.class_id for c in enrolled_classes]
        
        if class_ids:
            curriculums = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(class_ids)).all()
            for curr in curriculums:
                if curr.curriculum_json and "units" in curr.curriculum_json:
                    subject_name = curr.subject_name or "Class Curriculum"
                    topics = []
                    for unit in curr.curriculum_json["units"]:
                        topics.extend([{"name": t} for t in unit.get("topics", [])])
                    
                    if topics:
                        topics_data["subjects"].append({
                            "name": subject_name,
                            "topics": topics
                        })
    except Exception as e:
        logger.error(f"[Practice] Error loading class curriculums: {e}")

    # Enrich with performance data
    performances = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .all()
    )
    perf_map = {p.topic: p for p in performances}

    # Add performance info to each topic
    for subject in topics_data.get("subjects", []):
        for topic in subject.get("topics", []):
            perf = perf_map.get(topic["name"])
            if perf:
                topic["accuracy"] = round(perf.accuracy, 1)
                topic["status"] = perf.status
                topic["questions_attempted"] = perf.questions_attempted
                topic["sessions"] = perf.sessions
            else:
                topic["accuracy"] = None
                topic["status"] = "NOT_STARTED"
                topic["questions_attempted"] = 0
                topic["sessions"] = 0

    return topics_data


@router.post("/custom-topics")
def add_custom_topic(req: AddCustomTopicRequest, db: Session = Depends(get_db)):
    require_student(req.student_id, db)
    """Save a user-selected general/custom topic to the database."""
    existing = (
        db.query(CustomTopic)
        .filter(CustomTopic.student_id == req.student_id)
        .filter(CustomTopic.topic_name == req.topic_name)
        .filter(CustomTopic.subject_name == req.subject_name)
        .first()
    )
    if existing:
        return {"status": "success", "message": "Topic already added", "id": existing.id}
    
    custom_topic = CustomTopic(
        student_id=req.student_id,
        topic_name=req.topic_name,
        subject_name=req.subject_name
    )
    db.add(custom_topic)
    db.commit()
    db.refresh(custom_topic)
    return {"status": "success", "message": "Topic added successfully", "id": custom_topic.id}
