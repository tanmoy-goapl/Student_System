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

from services.analytics_engine import (
    get_topic_status,
    calculate_topic_metrics,
    calculate_subject_metrics,
    calculate_student_metrics,
    get_student_subjects
)

def _load_curriculum():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p = os.path.join(base_dir, "config", "default_curriculum.json")
    with open(p, "r") as f:
        return json.load(f)

def _load_subject_topics():
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        p = os.path.join(base_dir, "config", "subject_topics.json")
        with open(p, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load subject_topics: {e}")
        return {}

def _load_subject_resources():
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        p = os.path.join(base_dir, "config", "subject_resources.json")
        with open(p, "r") as f:
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
        
        # 1. Load dynamic subjects first
        dynamic_subjects_list = []
        dynamic_subjects_names = set()
        
        sem_num_match = re.search(r'semester-(\d+)', sem["id"])
        sem_num = int(sem_num_match.group(1)) if sem_num_match else 1
        
        if sem_num == current_semester_num:
            try:
                from classroom_models import StudentClass, ClassCurriculum
                enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
                class_ids = [c.class_id for c in enrolled_classes]
                if class_ids:
                    curriculums = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(class_ids)).all()
                    for curr in curriculums:
                        if curr.curriculum_json and "units" in curr.curriculum_json:
                            subject_name = curr.subject_name or f"Class {curr.class_id}"
                            dynamic_subjects_names.add(subject_name)
                            
                            actual_topics = []
                            for unit in curr.curriculum_json["units"]:
                                actual_topics.extend(unit.get("topics", []))
                            
                            subject_perf = perf_map.get(subject_name, [])
                            
                            metrics = calculate_subject_metrics(student_id, subject_name, db)
                            
                            current_topic = actual_topics[0] if actual_topics else ""
                            for topic_name in actual_topics:
                                t_perf = next((p for p in subject_perf if p.topic == topic_name), None)
                                t_metrics = calculate_topic_metrics(t_perf)
                                if t_metrics["status"] != "STRONG":
                                    current_topic = topic_name
                                    break
                                
                            dynamic_subjects_list.append({
                                "name": subject_name,
                                "topics_mastered": metrics["mastered_topics"],
                                "topics_completed": metrics["mastered_topics"],
                                "total_topics": metrics["total_topics"],
                                "progress": metrics["progress"],
                                "accuracy": metrics["average_accuracy"],
                                "confidence": metrics.get("average_confidence", 0.0),
                                "exposure": metrics.get("exposure", 0.0),
                                "current_topic": current_topic,
                                "subject_health": metrics["health"]
                            })
            except Exception as e:
                logger.error(f"Failed to inject class curriculums: {e}")
                
        # Add dynamic subjects to the top of the list
        sem_data["subjects"].extend(dynamic_subjects_list)
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
            predefined_topics = subject_topics.get(subject_name, subjects[subject_name])
            found = True
            break
            
    if not found:
        subject_topics = _load_subject_topics()
        if subject_name in subject_topics:
            predefined_topics = subject_topics[subject_name]
        else:
            from classroom_models import ClassCurriculum, StudentClass
            enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
            class_ids = [c.class_id for c in enrolled_classes]
            
            curr = db.query(ClassCurriculum).filter(
                ClassCurriculum.subject_name == subject_name,
                ClassCurriculum.class_id.in_(class_ids)
            ).first()
            
            if curr and curr.curriculum_json and "units" in curr.curriculum_json:
                predefined_topics = []
                for unit in curr.curriculum_json["units"]:
                    predefined_topics.extend(unit.get("topics", []))
            else:
                raise HTTPException(status_code=404, detail="Subject not found in curriculum")
        
    # Query performances for this subject
    if predefined_topics:
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined_topics)
        ).all()
    else:
        performances = []
    
    perf_dict = {p.topic: p for p in performances}
    logger.info(f"DEBUG2 predefined_topics: {predefined_topics}")
    logger.info(f"DEBUG2 performances keys: {list(perf_dict.keys())}")
    logger.info(f"DEBUG2 matched perfs: {[perf_dict.get(t) for t in predefined_topics if perf_dict.get(t)]}")

    subject_metrics = calculate_subject_metrics(student_id, subject_name, db)
    
    topics_data = []
    found_unfinished = False

    for topic in predefined_topics:
        perf = perf_dict.get(topic)
        metrics = calculate_topic_metrics(perf)
        is_completed = (metrics["status"] == "STRONG")
        
        topic_data = {
            "id": topic,
            "title": topic,
            "status": metrics["status"],
            "accuracy": metrics["accuracy"],
            "confidence": metrics.get("confidence", 0.0),
            "sessions": metrics["sessions"],
            "questions_attempted": metrics["questions_attempted"],
            "last_studied": metrics["last_practiced_at"].isoformat() if metrics.get("last_practiced_at") else None,
            "difficulty": "Medium",
            "estimated_hours": 2,
        }
            
        is_next_unfinished = False
        if not is_completed and not found_unfinished:
            is_next_unfinished = True
            found_unfinished = True
            
        topic_data["is_next_unfinished"] = is_next_unfinished
        topics_data.append(topic_data)
            
    resources_dict = _load_subject_resources()
    resources_list = resources_dict.get(subject_name, resources_dict.get("default", []))
    
    return {
        "success": True,
        "subject": subject_name,
        "progress": {
            "topics_total": subject_metrics["total_topics"],
            "topics_mastered": subject_metrics["mastered_topics"],
            "topics_strong": subject_metrics["mastered_topics"],
            "topics_learning": subject_metrics["learning_topics"],
            "topics_weak": subject_metrics["weak_topics"],
            "topics_not_started": subject_metrics["not_started_topics"],
            "progress": subject_metrics["progress"],
            "exposure": subject_metrics.get("exposure", 0.0),
            "accuracy": subject_metrics["average_accuracy"],
            "confidence": subject_metrics.get("average_confidence", 0.0),
            "subject_health": subject_metrics["health"]
        },
        "topics": topics_data,
        "resources": resources_list
    }

@router.get("/analytics/{student_id}")
def get_analytics(student_id: int, db: Session = Depends(get_db)):
    stats = calculate_student_metrics(student_id, db)
    subjects = get_student_subjects(student_id, db)
    
    mastered_topics = 0
    strong_topics = 0
    learning_topics = 0
    weak_topics = 0
    not_started_topics = 0
    
    for subj in subjects:
        m = calculate_subject_metrics(student_id, subj, db)
        mastered_topics += m["mastered_topics"]
        strong_topics += m["mastered_topics"]
        learning_topics += m["learning_topics"]
        weak_topics += m["weak_topics"]
        not_started_topics += m["not_started_topics"]
        
    return {
        "overall_accuracy": stats["overall_accuracy"],
        "overall_progress": stats["overall_progress"],
        "mastered_topics": mastered_topics,
        "strong_topics": strong_topics,
        "learning_topics": learning_topics,
        "weak_topics": weak_topics,
        "not_started_topics": not_started_topics
    }

@router.get("/subject/{subject_name}/progress/{student_id}")
def get_subject_progress(subject_name: str, student_id: int, db: Session = Depends(get_db)):
    data = get_subject_data(subject_name, student_id, db)
    if "progress" in data:
        return data["progress"]
    return data

@router.get("/topic/{topic_name}/progress/{student_id}")
def get_topic_progress(topic_name: str, student_id: int, db: Session = Depends(get_db)):
    perf = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.topic == topic_name
    ).first()
    
    metrics = calculate_topic_metrics(perf)
    return {
        "sessions": metrics["sessions"],
        "questions_attempted": metrics["questions_attempted"],
        "accuracy": metrics["accuracy"],
        "status": metrics["status"]
    }
