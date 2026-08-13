from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models import User, Department
from classroom_models import Classroom, StudentClass
from practice_models import PracticeSession, QuizHistory
from datetime import datetime, timedelta
from typing import Optional
from services.analytics_engine import calculate_student_metrics
from services.departments import normalize_department_code, split_department_codes, valid_department_input

router = APIRouter(prefix="/admin", tags=["admin"])


class DepartmentCreateRequest(BaseModel):
    admin_id: int
    code: str
    name: str


class UserDepartmentUpdateRequest(BaseModel):
    admin_id: int
    department: str | None = None


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


def _build_admin_alerts(
    db: Session,
    metrics_by_student: dict[int, dict],
    total_students: int,
    weak_students: int,
    inactive_students: int,
    active_students_today: int,
) -> list[dict]:
    """Build fast, explainable alerts from live platform metrics."""
    alerts = []

    if weak_students:
        alerts.append({
            "id": "low-confidence-students",
            "severity": "critical" if weak_students >= max(3, total_students // 5) else "warning",
            "title": "Confidence gap detected",
            "message": f"{weak_students} of {total_students} students are below 60% confidence.",
            "metric": f"{weak_students} students",
            "action": "Review student analytics",
        })

    if inactive_students:
        alerts.append({
            "id": "inactive-students",
            "severity": "warning",
            "title": "Re-engagement needed",
            "message": f"{inactive_students} students have no recorded activity in the last 7 days.",
            "metric": f"{inactive_students} inactive",
            "action": "Open student directory",
        })

    class_alerts = []
    classrooms = db.query(Classroom).all()
    for classroom in classrooms:
        enrollments = db.query(StudentClass.student_id).filter(
            StudentClass.class_id == classroom.id
        ).all()
        class_metrics = [
            metrics_by_student[row[0]]
            for row in enrollments
            if row[0] in metrics_by_student
        ]
        if not class_metrics:
            continue
        average_confidence = sum(
            metric.get("overall_confidence", 0.0) for metric in class_metrics
        ) / len(class_metrics)
        if average_confidence < 60:
            class_alerts.append((average_confidence, classroom.name))

    if class_alerts:
        average_confidence, class_name = min(class_alerts, key=lambda item: item[0])
        alerts.append({
            "id": "class-needs-attention",
            "severity": "critical" if average_confidence < 50 else "warning",
            "title": f"{class_name} needs attention",
            "message": f"The live average confidence is {round(average_confidence)}% for this class.",
            "metric": f"{round(average_confidence)}% confidence",
            "action": "Review classroom analytics",
        })

    if total_students and active_students_today == 0:
        alerts.append({
            "id": "no-activity-today",
            "severity": "info",
            "title": "No completed activity today",
            "message": "No completed quiz or practice activity has been recorded today.",
            "metric": "0 active",
            "action": "Monitor activity",
        })
    elif total_students and active_students_today / total_students < 0.2:
        alerts.append({
            "id": "low-daily-engagement",
            "severity": "info",
            "title": "Daily engagement is low",
            "message": f"Only {active_students_today} of {total_students} students are active today.",
            "metric": f"{round(active_students_today / total_students * 100)}% active",
            "action": "Review engagement",
        })

    if not alerts:
        alerts.append({
            "id": "platform-stable",
            "severity": "success",
            "title": "Platform signals are stable",
            "message": "No high-priority confidence, inactivity, or classroom alerts were detected.",
            "metric": "No critical alerts",
            "action": "View live analytics",
        })

    return alerts[:4]


def _department_name_for_code(code: str) -> str:
    if code == "CS":
        return "CS Department"
    if code == "AI":
        return "AI Department"
    return code.replace("_", " ").title() + " Department"


def _department_catalog(db: Session) -> list[dict]:
    catalog = {}
    for department in db.query(Department).filter(Department.is_active == True).order_by(Department.name).all():
        code = normalize_department_code(department.code)
        if code:
            catalog[code] = {
                "id": department.id,
                "code": code,
                "name": department.name,
                "is_active": department.is_active,
            }

    # Keep legacy department values visible even if they predate the catalog.
    for user in db.query(User.department).filter(User.department.isnot(None)).all():
        for code in split_department_codes(user[0]):
            if code in catalog:
                continue
            catalog[code] = {
                "id": code.lower(),
                "code": code,
                "name": _department_name_for_code(code),
                "is_active": True,
            }
    for classroom in db.query(Classroom.department).filter(Classroom.department.isnot(None)).all():
        code = normalize_department_code(classroom[0])
        if code and code not in catalog:
            catalog[code] = {
                "id": code.lower(),
                "code": code,
                "name": _department_name_for_code(code),
                "is_active": True,
            }

    return sorted(catalog.values(), key=lambda item: (item["code"] not in {"CS", "AI"}, item["name"].lower()))


def _department_for_classroom(classroom: Classroom) -> str:
    """Use the saved department, with an identity fallback for legacy classes."""
    explicit_department = normalize_department_code(getattr(classroom, "department", None))
    if explicit_department:
        return explicit_department

    name_tokens = set((classroom.name or "").lower().replace("-", " ").split())
    course_code = (classroom.course_code or classroom.code or "").upper()
    is_ai_course = (
        course_code.startswith(("AI", "ML"))
        or "ai" in name_tokens
        or "ml" in name_tokens
        or ("machine" in name_tokens and "learning" in name_tokens)
        or ("artificial" in name_tokens and "intelligence" in name_tokens)
    )
    return "AI" if is_ai_course else "CS"


def _build_department_summaries(
    db: Session,
    metrics_by_student: dict[int, dict],
    recent_activity_student_ids: set[int],
    active_student_ids_today: set[int],
) -> list[dict]:
    """Build live department summaries from course grouping and enrollments."""
    department_meta = {
        department["code"]: {
            "id": str(department["code"]).lower(),
            "name": department["name"],
            "short_name": department["code"],
        }
        for department in _department_catalog(db)
    }
    department_students = {department_id: set() for department_id in department_meta}
    department_courses = {department_id: [] for department_id in department_meta}

    enrollment_rows = db.query(StudentClass.class_id, StudentClass.student_id).all()
    students_by_class: dict[int, set[int]] = {}
    for class_id, student_id in enrollment_rows:
        students_by_class.setdefault(class_id, set()).add(student_id)

    classrooms = db.query(Classroom).order_by(Classroom.id).all()
    for classroom in classrooms:
        department_id = _department_for_classroom(classroom)
        if department_id not in department_meta:
            department_meta[department_id] = {
                "id": department_id.lower(),
                "name": _department_name_for_code(department_id),
                "short_name": department_id,
            }
            department_students[department_id] = set()
            department_courses[department_id] = []
        student_ids = students_by_class.get(classroom.id, set())
        department_students[department_id].update(student_ids)
        department_courses[department_id].append({
            "id": classroom.id,
            "name": classroom.name,
            "code": classroom.course_code or classroom.code,
            "student_count": len(student_ids),
        })

    summaries = []
    for department_id in department_meta:
        student_ids = department_students[department_id]
        metrics = [metrics_by_student[student_id] for student_id in student_ids if student_id in metrics_by_student]
        confidences = [metric.get("overall_confidence", 0.0) for metric in metrics]
        readinesses = [metric.get("overall_progress", 0.0) for metric in metrics]
        summaries.append({
            **department_meta[department_id],
            "student_count": len(student_ids),
            "course_count": len(department_courses[department_id]),
            "active_students": len(student_ids & recent_activity_student_ids),
            "active_students_today": len(student_ids & active_student_ids_today),
            "inactive_students": len(student_ids - recent_activity_student_ids),
            "average_confidence": round(sum(confidences) / len(confidences), 1) if confidences else 0.0,
            "average_readiness": round(sum(readinesses) / len(readinesses), 1) if readinesses else 0.0,
            "courses": department_courses[department_id],
        })

    return summaries

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    total_students = db.query(User).filter(User.role == "student").count()
    total_professors = db.query(User).filter(User.role == "professor").count()
    total_classes = db.query(Classroom).count()
    enrollment_rows = db.query(StudentClass.class_id, StudentClass.student_id).all()
    enrolled_student_ids = {student_id for _, student_id in enrollment_rows}

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_qh = db.query(QuizHistory.student_id).filter(
        QuizHistory.created_at >= today_start,
        QuizHistory.questions_attempted > 0,
    ).distinct().all()
    active_ps = db.query(PracticeSession.student_id).filter(PracticeSession.created_at >= today_start).distinct().all()
    active_students = set([r[0] for r in active_qh] + [r[0] for r in active_ps])
    active_students_today = len(active_students)

    students = db.query(User).filter(User.role == "student").all()
    confidences = []
    readinesses = []
    weak_students = 0
    inactive_students = 0
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    metrics_by_student = {}
    recent_activity_student_ids = set()

    for student in students:
        metrics = calculate_student_metrics(student.id, db)
        metrics_by_student[student.id] = metrics
        conf = metrics.get("overall_confidence", 0.0)
        readiness = metrics.get("overall_progress", 0.0)
        confidences.append(conf)
        readinesses.append(readiness)

        if conf < 60:
            weak_students += 1

        has_recent_activity = db.query(QuizHistory).filter(
            QuizHistory.student_id == student.id,
            QuizHistory.created_at >= seven_days_ago,
            QuizHistory.questions_attempted > 0,
        ).first() is not None or db.query(PracticeSession).filter(
            PracticeSession.student_id == student.id,
            PracticeSession.created_at >= seven_days_ago
        ).first() is not None

        if not has_recent_activity:
            inactive_students += 1
        else:
            recent_activity_student_ids.add(student.id)

    average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    average_readiness = sum(readinesses) / len(readinesses) if readinesses else 0.0
    alerts = _build_admin_alerts(
        db,
        metrics_by_student,
        total_students,
        weak_students,
        inactive_students,
        active_students_today,
    )
    departments = _build_department_summaries(
        db,
        metrics_by_student,
        recent_activity_student_ids,
        active_students,
    )

    return {
        "total_students": total_students,
        "total_student_accounts": total_students,
        "enrolled_students": len(enrolled_student_ids),
        "total_professors": total_professors,
        "total_classes": total_classes,
        "active_students_today": active_students_today,
        "average_confidence": round(average_confidence, 1),
        "average_readiness": round(average_readiness, 1),
        "weak_students": weak_students,
        "inactive_students": inactive_students,
        "departments": departments,
        "alerts": alerts,
        "last_updated": datetime.utcnow().isoformat(),
    }


def _require_admin(db: Session, admin_id: int) -> User:
    admin = db.query(User).filter(User.id == admin_id).first()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage departments and assignments.")
    return admin


@router.get("/departments")
def get_admin_departments(admin_id: int, db: Session = Depends(get_db)):
    _require_admin(db, admin_id)
    users = db.query(User).filter(User.role.in_(["student", "professor"])).all()
    classrooms = db.query(Classroom).all()
    results = []
    for department in _department_catalog(db):
        code = department["code"]
        results.append({
            **department,
            "student_count": sum(1 for user in users if user.role == "student" and code in split_department_codes(user.department)),
            "professor_count": sum(1 for user in users if user.role == "professor" and code in split_department_codes(user.department)),
            "course_count": sum(1 for classroom in classrooms if _department_for_classroom(classroom) == code),
        })
    return results


@router.post("/departments")
def create_admin_department(req: DepartmentCreateRequest, db: Session = Depends(get_db)):
    _require_admin(db, req.admin_id)
    code = normalize_department_code(req.code)
    name = req.name.strip()
    if not valid_department_input(code) or not name:
        raise HTTPException(status_code=422, detail="Provide a valid department code and name.")
    existing = db.query(Department).filter(Department.code == code).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.name = name
            db.commit()
            db.refresh(existing)
            return {"id": existing.id, "code": existing.code, "name": existing.name, "is_active": existing.is_active}
        raise HTTPException(status_code=409, detail="Department code already exists.")

    department = Department(code=code, name=name, is_active=True)
    db.add(department)
    db.commit()
    db.refresh(department)
    return {"id": department.id, "code": department.code, "name": department.name, "is_active": department.is_active}


@router.patch("/users/{user_id}/department")
def update_user_department(
    user_id: int,
    req: UserDepartmentUpdateRequest,
    db: Session = Depends(get_db),
):
    _require_admin(db, req.admin_id)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    code = normalize_department_code(req.department)
    department = None
    if code:
        department = db.query(Department).filter(
            Department.code == code,
            Department.is_active == True,
        ).first()
        if not department:
            raise HTTPException(status_code=422, detail="Select an active department.")

    user.department = code or None
    db.commit()
    return {
        "id": user.id,
        "department": user.department,
        "department_name": department.name if department else None,
    }


@router.get("/students")
def get_admin_students(db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == "student").all()
    results = []
    for s in students:
        metrics = calculate_student_metrics(s.id, db)
        latest_qh = db.query(QuizHistory.created_at).filter(
            QuizHistory.student_id == s.id,
            QuizHistory.questions_attempted > 0,
        ).order_by(QuizHistory.created_at.desc()).first()
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
    department_names = {
        department["code"]: department["name"]
        for department in _department_catalog(db)
    }
    results = []
    for p in professors:
        professor_classes = db.query(Classroom).filter(Classroom.professor_id == p.id).all()
        class_codes = sorted({_department_for_classroom(classroom) for classroom in professor_classes})
        assigned_codes = sorted(split_department_codes(p.department))
        display_codes = assigned_codes or class_codes
        results.append({
            "id": p.id,
            "name": p.name or p.email,
            "email": p.email,
            "department": ", ".join(display_codes) if display_codes else None,
            "department_name": ", ".join(department_names.get(code, _department_name_for_code(code)) for code in display_codes) if display_codes else None,
            "classes": len(professor_classes)
        })
    return results

@router.get("/recent-activity")
def get_admin_recent_activity(db: Session = Depends(get_db)):
    recent_quizzes = db.query(QuizHistory).filter(
        QuizHistory.questions_attempted > 0,
    ).order_by(QuizHistory.created_at.desc()).limit(15).all()
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

    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return [
        {
            "message": act["message"],
            "time": relative_time(act["timestamp"])
        }
        for act in activities[:20]
    ]

@router.get("/system-status")
def get_admin_system_status(db: Session = Depends(get_db)):
    checked_at = datetime.utcnow()
    database_status = "connected"
    analytics_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
        db.query(PracticeSession.id).limit(1).all()
    except Exception:
        database_status = "degraded"
        analytics_status = "unavailable"

    return {
        "backend": "online",
        "database": database_status,
        "analytics": analytics_status,
        "last_sync": relative_time(checked_at),
        "checked_at": checked_at.isoformat(),
    }


@router.get("/classrooms-analytics")
def get_classrooms_analytics(db: Session = Depends(get_db)):
    """Return per-classroom performance stats for the admin analytics page."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    classrooms = db.query(Classroom).all()
    result = []

    for cls in classrooms:
        # Get students enrolled in this classroom
        enrollments = db.query(StudentClass).filter(StudentClass.class_id == cls.id).all()
        student_ids = [e.student_id for e in enrollments]

        if not student_ids:
            result.append({
                "id": cls.id,
                "name": cls.name,
                "code": cls.code,
                "professor": cls.professor.name if cls.professor else "—",
                "student_count": 0,
                "avg_confidence": 0,
                "avg_readiness": 0,
                "active_students": 0,
                "inactive_students": 0,
                "status": "EMPTY",
            })
            continue

        confidences = []
        readinesses = []
        active_count = 0
        inactive_count = 0

        for sid in student_ids:
            metrics = calculate_student_metrics(sid, db)
            conf = metrics.get("overall_confidence", 0.0)
            readiness = metrics.get("overall_progress", 0.0)
            confidences.append(conf)
            readinesses.append(readiness)

            has_activity = (
                db.query(QuizHistory).filter(
                    QuizHistory.student_id == sid,
                    QuizHistory.created_at >= seven_days_ago,
                    QuizHistory.questions_attempted > 0,
                ).first() is not None
                or db.query(PracticeSession).filter(
                    PracticeSession.student_id == sid,
                    PracticeSession.created_at >= seven_days_ago
                ).first() is not None
            )
            if has_activity:
                active_count += 1
            else:
                inactive_count += 1

        avg_conf = round(sum(confidences) / len(confidences), 1) if confidences else 0.0
        avg_ready = round(sum(readinesses) / len(readinesses), 1) if readinesses else 0.0

        if avg_conf >= 75:
            status = "STRONG"
        elif avg_conf >= 50:
            status = "STABLE"
        else:
            status = "NEEDS ATTENTION"

        result.append({
            "id": cls.id,
            "name": cls.name,
            "code": cls.code,
            "professor": cls.professor.name if cls.professor else "—",
            "student_count": len(student_ids),
            "avg_confidence": avg_conf,
            "avg_readiness": avg_ready,
            "active_students": active_count,
            "inactive_students": inactive_count,
            "status": status,
        })

    return result
