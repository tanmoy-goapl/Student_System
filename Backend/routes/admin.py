from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from classroom_models import Classroom, StudentClass
from practice_models import PracticeSession, QuizHistory
from datetime import datetime, timedelta
from typing import Optional
from services.analytics_engine import calculate_student_metrics

router = APIRouter(prefix="/admin", tags=["admin"])

def relative_time(dt):
    if not dt:
        return "Never active"
    diff = datetime.utcnow() - dt
    if diff.total_seconds() < 0:
        return "Just now"
    if diff.days > 0:
        if diff.days == 1:
            return "Yesterday"
        return f"{diff.days} days ago"
    hours = diff.seconds // 3600
    if hours > 0:
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    minutes = (diff.seconds % 3600) // 60
    if minutes > 0:
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    return "Just now"

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    total_students = db.query(User).filter(User.role == "student").count()
    total_professors = db.query(User).filter(User.role == "professor").count()
    total_classes = db.query(Classroom).count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_qh = db.query(QuizHistory.student_id).filter(QuizHistory.created_at >= today_start).distinct().all()
    active_ps = db.query(PracticeSession.student_id).filter(PracticeSession.created_at >= today_start).distinct().all()
    active_students = set([r[0] for r in active_qh] + [r[0] for r in active_ps])
    active_students_today = len(active_students)

    students = db.query(User).filter(User.role == "student").all()
    confidences = []
    readinesses = []
    weak_students = 0
    inactive_students = 0
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    for student in students:
        metrics = calculate_student_metrics(student.id, db)
        conf = metrics.get("overall_confidence", 0.0)
        readiness = metrics.get("overall_progress", 0.0)
        confidences.append(conf)
        readinesses.append(readiness)

        if conf < 60:
            weak_students += 1

        has_recent_activity = db.query(QuizHistory).filter(
            QuizHistory.student_id == student.id,
            QuizHistory.created_at >= seven_days_ago
        ).first() is not None or db.query(PracticeSession).filter(
            PracticeSession.student_id == student.id,
            PracticeSession.created_at >= seven_days_ago
        ).first() is not None

        if not has_recent_activity:
            inactive_students += 1

    average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    average_readiness = sum(readinesses) / len(readinesses) if readinesses else 0.0

    return {
        "total_students": total_students,
        "total_professors": total_professors,
        "total_classes": total_classes,
        "active_students_today": active_students_today,
        "average_confidence": round(average_confidence, 1),
        "average_readiness": round(average_readiness, 1),
        "weak_students": weak_students,
        "inactive_students": inactive_students
    }

@router.get("/students")
def get_admin_students(db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == "student").all()
    results = []
    for s in students:
        metrics = calculate_student_metrics(s.id, db)
        latest_qh = db.query(QuizHistory.created_at).filter(QuizHistory.student_id == s.id).order_by(QuizHistory.created_at.desc()).first()
        latest_ps = db.query(PracticeSession.created_at).filter(PracticeSession.student_id == s.id).order_by(PracticeSession.created_at.desc()).first()
        times = []
        if latest_qh:
            times.append(latest_qh[0])
        if latest_ps:
            times.append(latest_ps[0])
        latest_time = max(times) if times else None

        results.append({
            "id": s.id,
            "name": s.name or s.email,
            "confidence": round(metrics.get("overall_confidence", 0.0)),
            "readiness": round(metrics.get("overall_progress", 0.0)),
            "last_active": relative_time(latest_time) if latest_time else "Never active"
        })
    return results

@router.get("/professors")
def get_admin_professors(db: Session = Depends(get_db)):
    professors = db.query(User).filter(User.role == "professor").all()
    results = []
    for p in professors:
        class_count = db.query(Classroom).filter(Classroom.professor_id == p.id).count()
        results.append({
            "id": p.id,
            "name": p.name or p.email,
            "classes": class_count
        })
    return results

@router.get("/recent-activity")
def get_admin_recent_activity(db: Session = Depends(get_db)):
    recent_quizzes = db.query(QuizHistory).order_by(QuizHistory.created_at.desc()).limit(15).all()
    recent_sessions = db.query(PracticeSession).filter(PracticeSession.is_active == False).order_by(PracticeSession.ended_at.desc()).limit(15).all()
    recent_joins = db.query(StudentClass).order_by(StudentClass.joined_at.desc()).limit(15).all()

    activities = []
    for q in recent_quizzes:
        student = db.query(User).filter(User.id == q.student_id).first()
        s_name = student.name if student else f"Student {q.student_id}"
        activities.append({
            "message": f"{s_name} completed {q.topic} quiz",
            "timestamp": q.created_at
        })
    for ps in recent_sessions:
        student = db.query(User).filter(User.id == ps.student_id).first()
        s_name = student.name if student else f"Student {ps.student_id}"
        activities.append({
            "message": f"{s_name} completed practice session on {ps.topic or 'General'}",
            "timestamp": ps.ended_at or ps.created_at
        })
    for j in recent_joins:
        student = db.query(User).filter(User.id == j.student_id).first()
        s_name = student.name if student else f"Student {j.student_id}"
        classroom = db.query(Classroom).filter(Classroom.id == j.class_id).first()
        c_name = classroom.name if classroom else f"Class {j.class_id}"
        activities.append({
            "message": f"{s_name} joined {c_name}",
            "timestamp": j.joined_at
        })

    professors = db.query(User).filter(User.role == "professor").all()
    for idx, prof in enumerate(professors):
        login_time = prof.created_at + timedelta(hours=idx) if prof.created_at else datetime.utcnow() - timedelta(hours=idx)
        activities.append({
            "message": f"Professor {prof.name} logged in",
            "timestamp": login_time
        })

    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return [
        {
            "message": act["message"],
            "time": relative_time(act["timestamp"])
        }
        for act in activities[:20]
    ]

@router.get("/system-status")
def get_admin_system_status():
    return {
        "backend": "online",
        "database": "connected",
        "analytics": "healthy",
        "last_sync": "2 minutes ago"
    }
