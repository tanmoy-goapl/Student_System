from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta

from database import get_db
from models import User
from practice_models import TopicPerformance, UserPerformance, QuizHistory
from classroom_models import Classroom, StudentClass, ClassCurriculum

router = APIRouter(prefix="/professor", tags=["professor"])

@router.get("/classes/{professor_id}")
def get_professor_classes(professor_id: int, db: Session = Depends(get_db)):
    classes = db.query(Classroom).filter(Classroom.professor_id == professor_id).all()
    result = []
    for c in classes:
        student_count = db.query(StudentClass).filter(StudentClass.class_id == c.id).count()
        result.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "course_code": c.course_code,
            "students": student_count
        })
    return {"success": True, "classes": result}

@router.get("/class/{class_id}/analytics")
def get_class_analytics(class_id: int, db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")

    student_classes = db.query(StudentClass).filter(StudentClass.class_id == class_id).all()
    student_ids = [sc.student_id for sc in student_classes]
    students = db.query(User).filter(User.id.in_(student_ids)).all()
    
    student_metrics = []
    total_accuracy = 0
    total_confidence = 0
    total_exposure = 0
    total_progress = 0
    valid_students_for_accuracy = 0
    active_students_count = 0
    inactive_students_count = 0
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    topic_stats: Dict[str, Dict[str, Any]] = {}
    
    # Calculate total topics from curriculum
    total_class_topics = 20 # Fallback
    curriculum = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
    if curriculum and curriculum.curriculum_json and "semesters" in curriculum.curriculum_json:
        curr_topics = 0
        for sem in curriculum.curriculum_json.get("semesters", []):
            for course in sem.get("courses", []):
                curr_topics += len(course.get("topics", []))
        if curr_topics > 0:
            total_class_topics = curr_topics
    
    from services.analytics_engine import calculate_subject_metrics, calculate_topic_metrics, get_predefined_topics
    subject_name = curriculum.subject_name if curriculum else f"Class {class_id}"
    predefined_topics = get_predefined_topics(students[0].id if students else 0, subject_name, db)

    # 1. Gather Individual Student Metrics
    for student in students:
        perf = db.query(UserPerformance).filter(UserPerformance.student_id == student.id).first()
        topic_perfs = db.query(TopicPerformance).filter(TopicPerformance.student_id == student.id).all()
        
        metrics = calculate_subject_metrics(student.id, subject_name, db)
        
        if topic_perfs:
            for p in topic_perfs:
                if p.topic not in predefined_topics:
                    continue
                t_metrics = calculate_topic_metrics(p)
                if p.topic not in topic_stats:
                    topic_stats[p.topic] = {"sum_accuracy": 0, "attempts_count": 0, "mastered_count": 0, "completed_count": 0, "in_progress_count": 0}
                
                topic_stats[p.topic]["sum_accuracy"] += t_metrics["accuracy"]
                if t_metrics["sessions"] >= 1:
                    topic_stats[p.topic]["attempts_count"] += 1
                
                if t_metrics["status"] == "STRONG":
                    topic_stats[p.topic]["mastered_count"] += 1
                    topic_stats[p.topic]["completed_count"] += 1
                elif t_metrics["status"] == "LEARNING":
                    topic_stats[p.topic]["in_progress_count"] += 1
                elif t_metrics["status"] == "WEAK":
                    topic_stats[p.topic]["in_progress_count"] += 1
            
        progress_pct = metrics["progress"]
        student_accuracy = metrics["average_accuracy"]
        student_confidence = metrics.get("average_confidence", 0.0)
        student_exposure = metrics.get("exposure", 0.0)
        
        # Determine status (Needs Attention)
        if student_accuracy < 50:
            status = "Red"
        elif student_accuracy <= 70:
            status = "Yellow"
        else:
            status = "Green"
            
        # Check active status
        last_active = perf.last_practiced if perf and perf.last_practiced else student.created_at
        if last_active:
            last_active = last_active.replace(tzinfo=None)
            
        if last_active and last_active > thirty_days_ago:
            active_students_count += 1
        else:
            inactive_students_count += 1
            
        is_at_risk = student_accuracy < 50 and progress_pct > 0
        
        recent_quiz = db.query(QuizHistory).filter(QuizHistory.student_id == student.id).order_by(QuizHistory.created_at.desc()).first()
            
        student_metrics.append({
            "id": f"S{student.id}",
            "name": student.name or f"Student {student.id}",
            "progress": progress_pct,
            "accuracy": round(student_accuracy, 1),
            "confidence": round(student_confidence, 1),
            "exposure": round(student_exposure, 1),
            "status": status,
            "topics_completed": metrics["mastered_topics"],
            "is_at_risk": is_at_risk,
            "streak": perf.current_streak if perf else 0,
            "last_practiced_at": perf.last_practiced.isoformat() if perf and perf.last_practiced else None,
            "recent_quiz": {"topic": recent_quiz.topic, "score": recent_quiz.score_percentage} if recent_quiz else None
        })
        
        total_accuracy += student_accuracy
        total_confidence += student_confidence
        total_exposure += student_exposure
        total_progress += progress_pct
        if metrics["total_topics"] > 0 or perf:
            valid_students_for_accuracy += 1

    # Sort Leaderboard
    student_metrics.sort(key=lambda x: (-x["accuracy"], -x["progress"], -x["streak"]))

    student_count = len(student_metrics)
    average_accuracy = round(total_accuracy / valid_students_for_accuracy, 1) if valid_students_for_accuracy > 0 else 0
    average_confidence = round(total_confidence / valid_students_for_accuracy, 1) if valid_students_for_accuracy > 0 else 0
    average_exposure = round(total_exposure / valid_students_for_accuracy, 1) if valid_students_for_accuracy > 0 else 0
    completion_rate = round(total_progress / valid_students_for_accuracy, 1) if valid_students_for_accuracy > 0 else 0
    
    # 2. Topic Analytics (Weak, Strong, Completion vs Accuracy)
    weak_topics = []
    strong_topics = []
    topic_analytics = []
    
    for topic, stats in topic_stats.items():
        avg_score = stats["sum_accuracy"] / stats["attempts_count"]
        completion_pct = round((stats["attempts_count"] / student_count) * 100, 1) if student_count > 0 else 0
        
        topic_data = {
            "name": topic,
            "accuracy_percentage": round(avg_score, 1),
            "completion_percentage": completion_pct,
            "mastered": stats["mastered_count"],
            "completed": stats["completed_count"],
            "in_progress": stats["in_progress_count"],
            "not_started": student_count - stats["attempts_count"]
        }
        topic_analytics.append(topic_data)
        
        if avg_score < 70:
            weak_topics.append({"name": topic, "score": round(avg_score, 1)})
        elif avg_score >= 85:
            strong_topics.append({"name": topic, "score": round(avg_score, 1)})
            
    weak_topics.sort(key=lambda x: x["score"])
    strong_topics.sort(key=lambda x: -x["score"])
    
    # 3. Unit Analytics
    unit_analytics = []
    curriculum = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
    if curriculum and curriculum.curriculum_json and "semesters" in curriculum.curriculum_json:
        for sem in curriculum.curriculum_json["semesters"]:
            for course in sem.get("courses", []):
                unit_name = course.get("name", "Unknown Unit")
                topics = course.get("topics", [])
                
                # Calculate avg unit accuracy and completion
                unit_accuracy_sum = 0
                unit_completion_sum = 0
                valid_topics = 0
                
                for t in topics:
                    # Find topic in topic_analytics
                    ta = next((ta for ta in topic_analytics if ta["name"].lower() == t.lower()), None)
                    if ta:
                        unit_accuracy_sum += ta["accuracy"]
                        unit_completion_sum += ta["completion"]
                        valid_topics += 1
                        
                avg_unit_acc = round(unit_accuracy_sum / valid_topics, 1) if valid_topics > 0 else 0
                avg_unit_comp = round(unit_completion_sum / valid_topics, 1) if valid_topics > 0 else 0
                
                health = "Red"
                if avg_unit_acc >= 80: health = "Green"
                elif avg_unit_acc >= 60: health = "Yellow"
                
                unit_analytics.append({
                    "name": unit_name,
                    "accuracy": avg_unit_acc,
                    "completion": avg_unit_comp,
                    "health": health
                })

    # 4. Recent Activity Feed
    activity_feed = []
    recent_quizzes = db.query(QuizHistory).filter(QuizHistory.student_id.in_(student_ids)).order_by(QuizHistory.created_at.desc()).limit(15).all()
    for q in recent_quizzes:
        s_name = next((s.name for s in students if s.id == q.student_id), f"Student {q.student_id}")
        if q.score_percentage >= 85:
            text = f"{s_name} scored {q.score_percentage}% on {q.topic}!"
        elif q.score_percentage >= 70:
            text = f"{s_name} completed {q.topic}."
        else:
            text = f"{s_name} practiced {q.topic} ({q.score_percentage}%)."
        activity_feed.append({
            "id": q.id,
            "text": text,
            "time": q.created_at.isoformat()
        })

    # 5. Alerts
    alerts = []
    for wt in weak_topics[:3]:
        if wt["score"] < 50:
            alerts.append(f"{wt['name']} accuracy is critically low ({wt['score']}%).")
    
    for ua in unit_analytics:
        if ua["completion"] < 30 and ua["accuracy"] > 0:
            alerts.append(f"Most students have not started {ua['name']} (Completion: {ua['completion']}%).")
        elif ua["health"] == "Red" and ua["completion"] > 20:
            alerts.append(f"{ua['name']} needs review (Accuracy: {ua['accuracy']}%).")

    return {
        "metrics": {
            "studentCount": student_count,
            "activeStudents": active_students_count,
            "inactiveStudents": inactive_students_count,
            "averageAccuracy": average_accuracy,
            "averageConfidence": average_confidence,
            "averageExposure": average_exposure,
            "completionRate": completion_rate,
            "weakTopics": weak_topics[:5],
            "strongTopics": strong_topics[:5],
            "alerts": alerts
        },
        "students": student_metrics,
        "topicAnalytics": topic_analytics,
        "unitAnalytics": unit_analytics,
        "activityFeed": activity_feed
    }
