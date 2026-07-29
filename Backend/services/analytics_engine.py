import json
import os
import re
import logging
from sqlalchemy.orm import Session
from practice_models import TopicPerformance

logger = logging.getLogger("chatbot")

_curriculum_cache = None
_subject_topics_cache = None

def _load_curriculum():
    global _curriculum_cache
    if _curriculum_cache is None:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_curriculum.json")
        with open(config_path, "r") as f:
            _curriculum_cache = json.load(f)
    return _curriculum_cache

def _load_subject_topics():
    global _subject_topics_cache
    if _subject_topics_cache is None:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "subject_topics.json")
        try:
            with open(config_path, "r") as f:
                _subject_topics_cache = json.load(f)
        except Exception:
            return {}
    return _subject_topics_cache

def get_topic_status(sessions: int, questions_attempted: int, accuracy: float) -> str:
    if sessions == 0:
        return "NOT_STARTED"
    if sessions < 2:
        return "LEARNING"
    if questions_attempted < 10:
        return "LEARNING"
    if accuracy < 50:
        return "WEAK"
    if accuracy >= 85:
        return "STRONG"
    return "LEARNING"

def calculate_confidence(accuracy: float, sessions: int, questions_attempted: int, difficulty_factor: float = 1.0) -> float:
    if sessions == 0:
        return 0.0
    session_factor = min(sessions / 5.0, 1.0)
    question_factor = min(questions_attempted / 20.0, 1.0)
    base_conf = (accuracy * 0.6) + (40.0 * session_factor * question_factor * difficulty_factor)
    return round(min(base_conf, 100.0), 2)

def calculate_topic_metrics(perf) -> dict:
    if perf is not None:
        sessions = perf.sessions
        questions_attempted = perf.questions_attempted
        accuracy = round(perf.accuracy, 2)
        confidence = calculate_confidence(accuracy, sessions, questions_attempted)
        status = get_topic_status(sessions, questions_attempted, accuracy)
        last_practiced_at = perf.last_practiced_at if hasattr(perf, 'last_practiced_at') else None
        if last_practiced_at is None and hasattr(perf, 'last_practiced'):
            last_practiced_at = perf.last_practiced
    else:
        sessions = 0
        questions_attempted = 0
        accuracy = 0.0
        confidence = 0.0
        status = "NOT_STARTED"
        last_practiced_at = None
    return {
        "status": status,
        "accuracy": accuracy,
        "confidence": confidence,
        "sessions": sessions,
        "questions_attempted": questions_attempted,
        "last_practiced_at": last_practiced_at
    }

def get_predefined_topics(student_id: int, subject_name: str, db: Session) -> list:
    # 1. Try to find dynamic classroom curriculum first (highest priority)
    try:
        from classroom_models import ClassCurriculum, StudentClass
        enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
        class_ids = [c.class_id for c in enrolled_classes]
        if class_ids:
            curr = db.query(ClassCurriculum).filter(
                ClassCurriculum.subject_name == subject_name,
                ClassCurriculum.class_id.in_(class_ids)
            ).first()
            if curr and curr.curriculum_json and "units" in curr.curriculum_json:
                topics = []
                for unit in curr.curriculum_json["units"]:
                    topics.extend(unit.get("topics", []))
                if topics:
                    seen = set()
                    unique_topics = []
                    for t in topics:
                        if t not in seen:
                            seen.add(t)
                            unique_topics.append(t)
                    return unique_topics
    except Exception as e:
        logger.error(f"Failed to load dynamic curriculum topics: {e}")

    try:
        default_curr = _load_curriculum()
    except Exception:
        default_curr = {}
        
    predefined_topics = []
    found = False
    for sem in default_curr.get("semesters", []):
        subjects = sem.get("subjects", {})
        if subject_name in subjects:
            subject_topics = _load_subject_topics()
            predefined_topics = list(subject_topics.get(subject_name, subjects[subject_name]))
            found = True
            break
            
    if not found:
        subject_topics = _load_subject_topics()
        if subject_name in subject_topics:
            predefined_topics = list(subject_topics[subject_name])
            
    # Remove duplicates preserving order
    seen = set()
    unique_topics = []
    for t in predefined_topics:
        if t not in seen:
            seen.add(t)
            unique_topics.append(t)
    return unique_topics

def get_student_subjects(student_id: int, db: Session) -> list:
    from classroom_models import StudentClass, ClassCurriculum
    enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
    class_ids = [c.class_id for c in enrolled_classes]
    if not class_ids:
        try:
            default_curr = _load_curriculum()
            current_semester_num = default_curr.get("current_semester", 1)
            for sem in default_curr.get("semesters", []):
                sem_num_match = re.search(r'semester-(\d+)', sem["id"])
                sem_num = int(sem_num_match.group(1)) if sem_num_match else 1
                if sem_num == current_semester_num:
                    return list(sem.get("subjects", {}).keys())
        except Exception:
            pass
        return []
    
    curriculums = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(class_ids)).all()
    subjects = []
    for curr in curriculums:
        if curr.subject_name and curr.subject_name not in subjects:
            subjects.append(curr.subject_name)
    return subjects

def calculate_subject_metrics(student_id: int, subject: str, db: Session) -> dict:
    predefined_topics = get_predefined_topics(student_id, subject, db)
    total_topics = len(predefined_topics)
    
    if predefined_topics:
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined_topics)
        ).all()
    else:
        performances = []
    
    perf_dict = {p.topic: p for p in performances}
    
    mastered_topics = 0
    weak_topics = 0
    learning_topics = 0
    not_started_topics = 0
    total_attempted_accuracy = 0
    total_attempted_confidence = 0
    attempted_topics_count = 0
    
    for topic in predefined_topics:
        perf = perf_dict.get(topic)
        metrics = calculate_topic_metrics(perf)
        status = metrics["status"]
        
        if status == "STRONG":
            mastered_topics += 1
        elif status == "LEARNING":
            learning_topics += 1
        elif status == "WEAK":
            weak_topics += 1
        elif status == "NOT_STARTED":
            not_started_topics += 1
            
        if metrics["sessions"] > 0 or metrics["questions_attempted"] > 0:
            attempted_topics_count += 1
            total_attempted_accuracy += metrics["accuracy"]
            total_attempted_confidence += metrics.get("confidence", 0.0)
        
    average_accuracy = total_attempted_accuracy / attempted_topics_count if attempted_topics_count > 0 else 0.0
    average_confidence = total_attempted_confidence / attempted_topics_count if attempted_topics_count > 0 else 0.0
    exposure = (attempted_topics_count / total_topics * 100) if total_topics > 0 else 0.0
    progress = (mastered_topics / total_topics * 100) if total_topics > 0 else 0.0
    
    if average_accuracy > 80:
        health = "GREEN"
    elif average_accuracy >= 60:
        health = "YELLOW"
    else:
        health = "RED"
        
    return {
        "total_topics": total_topics,
        "attempted_topics": attempted_topics_count,
        "mastered_topics": mastered_topics,
        "weak_topics": weak_topics,
        "learning_topics": learning_topics,
        "not_started_topics": not_started_topics,
        "progress": round(progress),
        "exposure": round(exposure),
        "average_accuracy": round(average_accuracy, 1),
        "average_confidence": round(average_confidence, 1),
        "health": health
    }

def calculate_student_metrics(student_id: int, db: Session) -> dict:
    subjects = get_student_subjects(student_id, db)
    
    total_topics_all = 0
    total_attempted_topics_all = 0
    mastered_topics_all = 0
    weak_topics_all = 0
    strong_topics_all = 0
    learning_topics_all = 0
    total_accuracy_sum = 0
    total_confidence_sum = 0
    
    for subj in subjects:
        metrics = calculate_subject_metrics(student_id, subj, db)
        total_topics_all += metrics["total_topics"]
        total_attempted_topics_all += metrics.get("attempted_topics", 0)
        mastered_topics_all += metrics["mastered_topics"]
        strong_topics_all += metrics["mastered_topics"]
        weak_topics_all += metrics["weak_topics"]
        learning_topics_all += metrics["learning_topics"]
        
        attempted = metrics.get("attempted_topics", 0)
        total_accuracy_sum += metrics["average_accuracy"] * attempted
        total_confidence_sum += metrics.get("average_confidence", 0.0) * attempted
        
    overall_progress = (mastered_topics_all / total_topics_all * 100) if total_topics_all > 0 else 0.0
    overall_exposure = (total_attempted_topics_all / total_topics_all * 100) if total_topics_all > 0 else 0.0
    overall_accuracy = (total_accuracy_sum / total_attempted_topics_all) if total_attempted_topics_all > 0 else 0.0
    overall_confidence = (total_confidence_sum / total_attempted_topics_all) if total_attempted_topics_all > 0 else 0.0
    
    return {
        "overall_progress": round(overall_progress),
        "overall_exposure": round(overall_exposure),
        "overall_accuracy": round(overall_accuracy, 1),
        "overall_confidence": round(overall_confidence, 1),
        "mastered_topics": mastered_topics_all,
        "weak_topics": weak_topics_all,
        "strong_topics": strong_topics_all,
        "attempted_topics": total_attempted_topics_all,
        "total_topics": total_topics_all
    }
