import json
import logging
import os
import glob
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from practice_models import TopicPerformance

router = APIRouter(prefix="/courses", tags=["courses"])
logger = logging.getLogger("chatbot")

def _load_curriculum():
    with open("config/default_curriculum.json", "r") as f:
        return json.load(f)

def _load_subject_topics():
    try:
        with open("config/subject_topics.json", "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load subject_topics: {e}")
        return {}

def _load_subject_resources():
    try:
        with open("config/subject_resources.json", "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load subject_resources: {e}")
        return {}

@router.get("/data/{student_id}")
def get_courses_data(student_id: int, db: Session = Depends(get_db)):
    """Fetch all semesters and calculate subject progress based on completed topics."""
    try:
        default_curr = _load_curriculum()
    except Exception as e:
        logger.error(f"Failed to load curriculum: {e}")
        return {"success": False, "message": "Failed to load curriculum"}
        
    semesters = default_curr.get("semesters", [])
    current_semester_num = default_curr.get("current_semester", 1)
    
    # Query all topic performances for the student
    all_topics = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
    
    # Organize by subject
    perf_map = {}
    for t in all_topics:
        if t.subject not in perf_map:
            perf_map[t.subject] = []
        perf_map[t.subject].append(t)
        
    response_semesters = []
    
    for sem in semesters:
        sem_data = {
            "id": sem["id"],
            "title": sem["title"],
            "iconName": sem.get("iconName", "BookOpen"),
            "color": sem.get("color", "#a78bfa"),
            "subjects": []
        }
        
        subjects = sem.get("subjects", {})
        for subject_name, topics in subjects.items():
            subject_topics = _load_subject_topics()
            
            # Use curated topics if available, else fallback to the generic array from default_curriculum
            actual_topics = subject_topics.get(subject_name, topics)
            total_topics = len(actual_topics)
            subject_perf = perf_map.get(subject_name, [])
            
            completed_count = 0
            for p in subject_perf:
                if p.accuracy >= 70 and p.total_attempts >= 2:
                    completed_count += 1

            current_topic = actual_topics[0] if actual_topics else ""
            for topic_name in actual_topics:
                t_perf = next((p for p in subject_perf if p.topic == topic_name), None)
                if not t_perf or not (t_perf.accuracy >= 70 and t_perf.total_attempts >= 2):
                    current_topic = topic_name
                    break
            
            if len(subject_perf) > 0:
                accuracy = sum(p.accuracy for p in subject_perf) / len(subject_perf)
            else:
                accuracy = 0
                
            sem_data["subjects"].append({
                "name": subject_name,
                "topics_completed": completed_count,
                "total_topics": total_topics,
                "accuracy": round(accuracy, 1),
                "current_topic": current_topic
            })
            
        response_semesters.append(sem_data)
        
    return {
        "success": True, 
        "current_semester": current_semester_num,
        "semesters": response_semesters
    }

@router.get("/subject/{subject_name}/{student_id}")
def get_subject_data(subject_name: str, student_id: int, db: Session = Depends(get_db)):
    """Fetch predefined topics for a subject and attach individual performance data."""
    try:
        default_curr = _load_curriculum()
    except Exception as e:
        logger.error(f"Failed to load curriculum: {e}")
        raise HTTPException(status_code=500, detail="Failed to load curriculum")
        
    # Find the subject in the curriculum
    predefined_topics = []
    found = False
    for sem in default_curr.get("semesters", []):
        subjects = sem.get("subjects", {})
        if subject_name in subjects:
            subject_topics = _load_subject_topics()
            # Use curated topics if available, else fallback to the generic array
            predefined_topics = subject_topics.get(subject_name, subjects[subject_name])
            found = True
            break
            
    if not found:
        # If subject is entirely missing, still check subject_topics as a fallback
        subject_topics = _load_subject_topics()
        if subject_name in subject_topics:
            predefined_topics = subject_topics[subject_name]
        else:
            raise HTTPException(status_code=404, detail="Subject not found in curriculum")
        
    # Query performances for this subject
    performances = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.subject == subject_name
    ).all()
    
    perf_dict = {p.topic: p for p in performances}
    
    topics_data = []
    completed_count = 0
    total_accuracy = 0
    attempted_count = 0
    
    found_unfinished = False

    for topic in predefined_topics:
        perf = perf_dict.get(topic)
        
        status = "Not Started"
        is_completed = False
        
        if perf:
            is_mastered = perf.accuracy >= 85 and str(perf.mastery_level).lower() == "strong"
            is_completed_only = perf.accuracy >= 70 and perf.total_attempts >= 2
            
            if is_mastered:
                status = "Mastered"
                is_completed = True
                completed_count += 1
            elif is_completed_only:
                status = "Completed"
                is_completed = True
                completed_count += 1
            else:
                status = "In Progress"
                
            total_accuracy += perf.accuracy
            attempted_count += 1
            
        is_next_unfinished = False
        if not is_completed and not found_unfinished:
            is_next_unfinished = True
            found_unfinished = True

        if perf:
            topic_data = {
                "id": topic,
                "title": topic,
                "status": status,
                "accuracy": perf.accuracy,
                "attempts": perf.total_attempts,
                "last_studied": perf.last_practiced.isoformat() if perf.last_practiced else None,
                "difficulty": "Medium",
                "estimated_hours": 2,
                "is_next_unfinished": is_next_unfinished
            }
        else:
            topic_data = {
                "id": topic,
                "title": topic,
                "status": "Not Started",
                "accuracy": 0,
                "attempts": 0,
                "last_studied": None,
                "difficulty": "Medium",
                "estimated_hours": 2,
                "is_next_unfinished": is_next_unfinished
            }
        topics_data.append(topic_data)
            
    overall_accuracy = round(total_accuracy / attempted_count, 1) if attempted_count > 0 else 0
    
    # Load resources
    resources_dict = _load_subject_resources()
    resources_list = resources_dict.get(subject_name, resources_dict.get("default", []))
    
    return {
        "success": True,
        "subject": subject_name,
        "progress": {
            "completed": completed_count,
            "total": len(predefined_topics),
            "accuracy": overall_accuracy
        },
        "topics": topics_data,
        "resources": resources_list
    }
