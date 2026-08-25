from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models import User, Department, Document
from classroom_models import Classroom, StudentClass, ClassResource, ClassCurriculum
from practice_models import PracticeSession, QuizHistory
from datetime import datetime, timedelta
from typing import Optional
from services.analytics_engine import (
    calculate_student_metrics,
    calculate_subject_metrics,
    calculate_readiness,
    get_activity_snapshot,
    get_predefined_topics,
)
from services.departments import department_display_name, normalize_department_code, split_department_codes, valid_department_input
from services.authorization import require_admin

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


def _build_faculty_activity(db: Session) -> dict:
    """Build a live teaching-activity snapshot from existing faculty records."""
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    professors = db.query(User).filter(User.role == "professor").all()
    professor_ids = {professor.id for professor in professors}
    professor_names = {
        professor.id: professor.name or professor.email or f"Professor {professor.id}"
        for professor in professors
    }
    active_professor_ids = set()
    events = []

    def add_event(professor_id, timestamp, message):
        if professor_id not in professor_ids or not timestamp:
            return
        if timestamp >= week_start:
            active_professor_ids.add(professor_id)
        if timestamp >= month_start:
            events.append((timestamp, message))

    recent_classes = db.query(Classroom).filter(
        Classroom.created_at >= month_start,
        Classroom.professor_id.in_(professor_ids),
    ).all() if professor_ids else []
    for classroom in recent_classes:
        professor_name = professor_names.get(classroom.professor_id, "A professor")
        add_event(classroom.professor_id, classroom.created_at, f"{professor_name} created {classroom.name}")

    recent_resources = db.query(ClassResource).filter(
        ClassResource.uploaded_at >= month_start,
        ClassResource.uploaded_by.in_(professor_ids),
    ).all() if professor_ids else []
    for resource in recent_resources:
        professor_name = professor_names.get(resource.uploaded_by, "A professor")
        add_event(resource.uploaded_by, resource.uploaded_at, f"{professor_name} uploaded {resource.title}")

    recent_curriculums = db.query(ClassCurriculum, Classroom).join(
        Classroom, ClassCurriculum.class_id == Classroom.id
    ).filter(
        ClassCurriculum.generated_at >= month_start,
        Classroom.professor_id.in_(professor_ids),
    ).all() if professor_ids else []
    for curriculum, classroom in recent_curriculums:
        professor_name = professor_names.get(classroom.professor_id, "A professor")
        add_event(
            classroom.professor_id,
            curriculum.generated_at,
            f"{professor_name} updated curriculum for {classroom.name}",
        )

    generated_prefixes = (
        "AI Study Material - ", "AI Lesson - ", "AI Lesson Plan - ",
        "AI Quiz - ", "AI Revision Notes - ", "AI Explained Simpler - ",
        "AI Practice Set - ",
    )
    recent_documents = db.query(Document).filter(
        Document.owner_role == "professor",
        Document.owner_id.in_(professor_ids),
        Document.uploaded_at >= month_start,
    ).all() if professor_ids else []
    generated_documents = [
        document for document in recent_documents
        if (document.title or "").startswith(generated_prefixes)
        or any(f"_{prefix}" in (document.filename or "") for prefix in generated_prefixes)
    ]
    for document in generated_documents:
        professor_name = professor_names.get(document.owner_id, "A professor")
        material_name = (document.title or document.filename or "AI material").replace(".txt", "")
        add_event(document.owner_id, document.uploaded_at, f"{professor_name} generated {material_name}")

    events.sort(key=lambda item: item[0], reverse=True)
    last_action = None
    if events:
        timestamp, message = events[0]
        last_action = {"message": message, "time": relative_time(timestamp)}

    return {
        "total_professors": len(professors),
        "active_professors_7d": len(active_professor_ids),
        "classes_managed": db.query(Classroom).filter(Classroom.professor_id.in_(professor_ids)).count() if professor_ids else 0,
        "classes_created_30d": len(recent_classes),
        "resources_uploaded_30d": len(recent_resources),
        "curriculums_updated_30d": len(recent_curriculums),
        "ai_materials_generated_30d": len(generated_documents),
        "last_action": last_action,
    }


def _build_admin_alerts(
    db: Session,
    admin_id: int,
    metrics_by_student: dict[int, dict],
    total_students: int,
    weak_students: int,
    inactive_students: int,
    active_students_today: int,
    classroom_analytics: list[dict] | None = None,
) -> list[dict]:
    """Build fast, explainable alerts from live platform metrics."""
    alerts = []

    if weak_students:
        alerts.append({
            "id": "students-needing-support",
            "severity": "critical" if weak_students >= max(3, total_students // 5) else "warning",
            "title": "Students need support",
            "message": f"{weak_students} of {total_students} students are high risk, need support, or have not started.",
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
    if classroom_analytics is None:
        classroom_analytics = get_classrooms_analytics(admin_id=admin_id, db=db)
    for classroom in classroom_analytics:
        high_risk_count = int(classroom.get("high_risk_students", 0) or 0)
        if classroom.get("student_count", 0) <= 0 or high_risk_count <= 0:
            continue
        average_confidence = float(classroom.get("avg_confidence", 0.0) or 0.0)
        class_alerts.append((
            high_risk_count,
            average_confidence,
            classroom.get("name", "Class"),
        ))

    if class_alerts:
        high_risk_count, average_confidence, class_name = min(
            class_alerts,
            key=lambda item: (item[0] == 0, item[1]),
        )
        alerts.append({
            "id": "class-needs-attention",
            "severity": "critical",
            "title": f"{class_name} needs attention",
            "message": (
                f"{high_risk_count} high-risk students are enrolled; "
                f"the class average confidence is {round(average_confidence)}%."
            ),
            "metric": f"{high_risk_count} high risk",
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
    return department_display_name(code, code.replace("_", " ").title())


def _department_catalog(db: Session) -> list[dict]:
    catalog = {}
    for department in db.query(Department).filter(Department.is_active == True).order_by(Department.name).all():
        code = normalize_department_code(department.code)
        if code:
            catalog[code] = {
                "id": department.id,
                "code": code,
                "name": department_display_name(code, department.name),
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
    """Build department KPIs from the classes that belong to each department."""
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
    department_contexts = {department_id: [] for department_id in department_meta}

    enrollment_rows = db.query(StudentClass.class_id, StudentClass.student_id).all()
    students_by_class: dict[int, set[int]] = {}
    for class_id, student_id in enrollment_rows:
        students_by_class.setdefault(class_id, set()).add(student_id)

    def class_subject_and_topics(classroom, student_ids):
        curriculum = db.query(ClassCurriculum).filter(
            ClassCurriculum.class_id == classroom.id
        ).first()
        subject_name = (
            curriculum.subject_name
            if curriculum and curriculum.subject_name
            else classroom.name
        )
        topics = []
        curriculum_json = curriculum.curriculum_json if curriculum else None
        if isinstance(curriculum_json, dict):
            if "units" in curriculum_json:
                for unit in curriculum_json.get("units", []):
                    topics.extend(unit.get("topics", []))
            elif "semesters" in curriculum_json:
                for semester in curriculum_json.get("semesters", []):
                    for course in semester.get("courses", []):
                        topics.extend(course.get("topics", []))
        if not topics:
            representative_id = next(iter(student_ids), 0)
            topics = get_predefined_topics(representative_id, subject_name, db)
        return subject_name, list(dict.fromkeys(
            topic.strip()
            for topic in topics
            if isinstance(topic, str) and topic.strip()
        ))

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
            department_contexts[department_id] = []

        student_ids = students_by_class.get(classroom.id, set())
        department_students[department_id].update(student_ids)
        department_courses[department_id].append({
            "id": classroom.id,
            "name": classroom.name,
            "code": classroom.course_code or classroom.code,
            "student_count": len(student_ids),
        })
        subject_name, topics = class_subject_and_topics(classroom, student_ids)
        department_contexts[department_id].append({
            "subject": subject_name,
            "topics": topics,
            "student_ids": student_ids,
        })

    summaries = []
    for department_id in department_meta:
        student_ids = department_students[department_id]
        department_topics = set(
            topic
            for context in department_contexts[department_id]
            for topic in context["topics"]
        )
        activity = get_activity_snapshot(
            student_ids,
            db,
            topics=department_topics,
        )
        confidences = []
        readinesses = []

        for student_id in student_ids:
            scoped_metrics = []
            for context in department_contexts[department_id]:
                if student_id in context["student_ids"]:
                    scoped_metrics.append(calculate_subject_metrics(
                        student_id,
                        context["subject"],
                        db,
                        topics_override=context["topics"],
                    ))
            if not scoped_metrics:
                fallback = metrics_by_student.get(student_id)
                if fallback:
                    confidences.append(fallback.get("overall_confidence", 0.0))
                    readinesses.append(fallback.get("overall_readiness", 0.0))
                continue

            total_topics = sum(metric.get("total_topics", 0) for metric in scoped_metrics)
            attempted_topics = sum(metric.get("attempted_topics", 0) for metric in scoped_metrics)
            total_questions = sum(metric.get("questions_attempted", 0) for metric in scoped_metrics)
            total_correct = sum(metric.get("correct_answers", 0) for metric in scoped_metrics)
            weight = sum(
                metric.get("questions_attempted", 0) or metric.get("attempted_topics", 0)
                for metric in scoped_metrics
            )
            confidence = (
                sum(
                    metric.get("average_confidence", 0.0)
                    * (metric.get("questions_attempted", 0) or metric.get("attempted_topics", 0))
                    for metric in scoped_metrics
                ) / weight
                if weight else 0.0
            )
            exposure = (
                attempted_topics / total_topics * 100
                if total_topics else 0.0
            )
            last_activity = activity["last_activity_by_student"].get(student_id)
            if total_questions == 0 and weight == 0:
                confidence = 0.0
            confidences.append(confidence)
            readinesses.append(calculate_readiness(
                exposure,
                confidence,
                last_activity,
            ))

        summaries.append({
            **department_meta[department_id],
            "student_count": len(student_ids),
            "course_count": len(department_courses[department_id]),
            "active_students": len(activity["active_7d"]),
            "active_students_today": len(activity["active_today"]),
            "inactive_students": len(student_ids - activity["active_7d"]),
            "average_confidence": round(sum(confidences) / len(confidences), 1) if confidences else 0.0,
            "average_readiness": round(sum(readinesses) / len(readinesses), 1) if readinesses else 0.0,
            "courses": department_courses[department_id],
        })

    return summaries


@router.get("/dashboard")
def get_admin_dashboard(admin_id: int = Query(...), db: Session = Depends(get_db)):
    """Return platform KPIs from the same scoped student metrics used elsewhere."""
    require_admin(admin_id, db)
    total_students = db.query(User).filter(User.role == "student").count()
    total_professors = db.query(User).filter(User.role == "professor").count()
    total_classes = db.query(Classroom).count()
    enrollment_rows = db.query(StudentClass.class_id, StudentClass.student_id).all()
    enrolled_student_ids = {student_id for _, student_id in enrollment_rows}

    students = db.query(User).filter(User.role == "student").all()
    student_ids = [student.id for student in students]
    activity_snapshot = get_activity_snapshot(student_ids, db)
    active_students_today = len(activity_snapshot["active_today"])
    recent_activity_student_ids = set(activity_snapshot["active_7d"])

    confidences = []
    readinesses = []
    students_needing_support = 0
    high_risk_students = 0
    not_started_students = 0
    metrics_by_student = {}

    for student in students:
        metrics = calculate_student_metrics(
            student.id,
            db,
            activity_snapshot=activity_snapshot,
        )
        metrics_by_student[student.id] = metrics
        confidences.append(metrics.get("overall_confidence", 0.0))
        readinesses.append(metrics.get("overall_readiness", 0.0))

        if metrics.get("risk_tier") in {"HIGH_RISK", "NEEDS_SUPPORT", "NOT_STARTED"}:
            students_needing_support += 1
        if metrics.get("risk_tier") == "HIGH_RISK":
            high_risk_students += 1
        if metrics.get("risk_tier") == "NOT_STARTED":
            not_started_students += 1

    inactive_students = len(set(student_ids) - recent_activity_student_ids)
    average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    average_readiness = sum(readinesses) / len(readinesses) if readinesses else 0.0
    classroom_analytics = get_classrooms_analytics(admin_id=admin_id, db=db)
    alerts = _build_admin_alerts(
        db,
        admin_id,
        metrics_by_student,
        total_students,
        students_needing_support,
        inactive_students,
        active_students_today,
        classroom_analytics,
    )
    departments = _build_department_summaries(
        db,
        metrics_by_student,
        recent_activity_student_ids,
        activity_snapshot["active_today"],
    )

    return {
        "total_students": total_students,
        "total_student_accounts": total_students,
        "enrolled_students": len(enrolled_student_ids),
        "total_professors": total_professors,
        "total_classes": total_classes,
        "active_students_today": active_students_today,
        "active_students_7d": len(recent_activity_student_ids),
        "average_confidence": round(average_confidence, 1),
        "average_readiness": round(average_readiness, 1),
        # Kept for API compatibility; it now means high-risk, needs-support, or not-started.
        "weak_students": students_needing_support,
        "students_needing_support": students_needing_support,
        "high_risk_students": high_risk_students,
        "not_started_students": not_started_students,
        "inactive_students": inactive_students,
        "departments": departments,
        "alerts": alerts,
        "faculty_activity": _build_faculty_activity(db),
        "last_updated": datetime.utcnow().isoformat(),
    }


def _require_admin(db: Session, admin_id: int) -> User:
    try:
        return require_admin(admin_id, db)
    except HTTPException:
        raise HTTPException(status_code=403, detail="Only active admins can manage departments and assignments.")


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
    name = department_display_name(code, req.name)
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
    if user.role == "admin":
        raise HTTPException(status_code=422, detail="Admin accounts do not use academic departments.")

    code = normalize_department_code(req.department)
    if not code:
        raise HTTPException(status_code=422, detail="Select a department to assign.")
    department = db.query(Department).filter(
        Department.code == code,
        Department.is_active == True,
    ).first()
    if not department:
        raise HTTPException(status_code=422, detail="Select an active department.")

    assigned_codes = split_department_codes(user.department)
    if user.role == "student":
        assigned_codes = {code}
    else:
        if code in assigned_codes:
            raise HTTPException(status_code=409, detail="This department is already assigned to this user.")
        assigned_codes.add(code)
    user.department = ",".join(sorted(assigned_codes))
    db.commit()
    department_names = {
        item["code"]: item["name"]
        for item in _department_catalog(db)
    }
    return {
        "id": user.id,
        "department": user.department,
        "department_name": ", ".join(
            department_names.get(item, _department_name_for_code(item))
            for item in sorted(assigned_codes)
        ),
    }


@router.get("/students")
def get_admin_students(admin_id: int = Query(...), db: Session = Depends(get_db)):
    require_admin(admin_id, db)
    students = db.query(User).filter(User.role == "student").all()
    activity_snapshot = get_activity_snapshot([student.id for student in students], db)
    results = []
    for student in students:
        metrics = calculate_student_metrics(
            student.id,
            db,
            activity_snapshot=activity_snapshot,
        )
        latest_time = metrics.get("last_activity_at")
        results.append({
            "id": student.id,
            "name": student.name or student.email,
            "confidence": round(metrics.get("overall_confidence", 0.0)),
            "readiness": round(metrics.get("overall_readiness", 0.0)),
            "last_active": relative_time(latest_time) if latest_time else "Never active",
            "risk_tier": metrics.get("risk_tier", "NOT_STARTED"),
        })
    return results

@router.get("/professors")
def get_admin_professors(admin_id: int = Query(...), db: Session = Depends(get_db)):
    require_admin(admin_id, db)
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
def get_admin_recent_activity(admin_id: int = Query(...), db: Session = Depends(get_db)):
    require_admin(admin_id, db)
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
def get_admin_system_status(admin_id: int = Query(...), db: Session = Depends(get_db)):
    require_admin(admin_id, db)
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
def get_classrooms_analytics(admin_id: int = Query(...), db: Session = Depends(get_db)):
    """Return class-scoped performance stats using the shared metric definitions."""
    require_admin(admin_id, db)
    classrooms = db.query(Classroom).all()
    result = []

    def class_subject_and_topics(classroom, student_ids):
        curriculum = db.query(ClassCurriculum).filter(
            ClassCurriculum.class_id == classroom.id
        ).first()
        subject_name = (
            curriculum.subject_name
            if curriculum and curriculum.subject_name
            else classroom.name
        )
        topics = []
        curriculum_json = curriculum.curriculum_json if curriculum else None
        if isinstance(curriculum_json, dict):
            if "units" in curriculum_json:
                for unit in curriculum_json.get("units", []):
                    topics.extend(unit.get("topics", []))
            elif "semesters" in curriculum_json:
                for semester in curriculum_json.get("semesters", []):
                    for course in semester.get("courses", []):
                        topics.extend(course.get("topics", []))
        if not topics:
            representative_id = student_ids[0] if student_ids else 0
            topics = get_predefined_topics(representative_id, subject_name, db)
        return subject_name, list(dict.fromkeys(
            topic.strip()
            for topic in topics
            if isinstance(topic, str) and topic.strip()
        ))

    for classroom in classrooms:
        student_ids = sorted({
            enrollment.student_id
            for enrollment in db.query(StudentClass).filter(
                StudentClass.class_id == classroom.id
            ).all()
        })
        professor_name = classroom.professor.name if classroom.professor else "—"

        if not student_ids:
            result.append({
                "id": classroom.id,
                "name": classroom.name,
                "code": classroom.code,
                "professor": professor_name,
                "student_count": 0,
                "avg_confidence": 0,
                "avg_readiness": 0,
                "active_students": 0,
                "inactive_students": 0,
                "status": "EMPTY",
                "high_risk_students": 0,
                "students_needing_support": 0,
                "not_started_students": 0,
            })
            continue

        subject_name, topics = class_subject_and_topics(classroom, student_ids)
        class_activity = get_activity_snapshot(
            student_ids,
            db,
            topics=topics,
        )
        class_metrics = [
            calculate_subject_metrics(
                student_id,
                subject_name,
                db,
                topics_override=topics,
            )
            for student_id in student_ids
        ]
        confidences = [metric.get("average_confidence", 0.0) for metric in class_metrics]
        readinesses = [
            calculate_readiness(
                metric.get("exposure", 0.0),
                metric.get("average_confidence", 0.0),
                metric.get("last_activity_at"),
            )
            for metric in class_metrics
        ]
        risk_tiers = [metric.get("risk_tier", "NOT_STARTED") for metric in class_metrics]
        high_risk_count = risk_tiers.count("HIGH_RISK")
        support_count = sum(
            tier in {"HIGH_RISK", "NEEDS_SUPPORT", "NOT_STARTED"}
            for tier in risk_tiers
        )
        not_started_count = risk_tiers.count("NOT_STARTED")
        active_count = sum(
            student_id in class_activity["active_7d"]
            for student_id in student_ids
        )
        avg_conf = round(sum(confidences) / len(confidences), 1) if confidences else 0.0
        avg_ready = round(sum(readinesses) / len(readinesses), 1) if readinesses else 0.0

        if high_risk_count:
            status = "NEEDS ATTENTION"
        elif support_count:
            status = "STABLE"
        else:
            status = "STRONG"

        result.append({
            "id": classroom.id,
            "name": classroom.name,
            "code": classroom.code,
            "professor": professor_name,
            "student_count": len(student_ids),
            "avg_confidence": avg_conf,
            "avg_readiness": avg_ready,
            "active_students": active_count,
            "inactive_students": len(student_ids) - active_count,
            "status": status,
            "high_risk_students": high_risk_count,
            "students_needing_support": support_count,
            "not_started_students": not_started_count,
        })

    return result
