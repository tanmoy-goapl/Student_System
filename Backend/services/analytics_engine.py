import json
import os
import re
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from practice_models import (
    TopicPerformance,
    PracticeSession,
    PracticeQuestion,
    QuizHistory,
    UserPerformance,
)

logger = logging.getLogger("chatbot")

# These thresholds are shared by student, professor, and admin dashboards.
ACTIVITY_WINDOW_DAYS = 7
HIGH_RISK_ACCURACY = 50.0
SUPPORT_ACCURACY = 70.0
HIGH_RISK_CONFIDENCE = 40.0
SUPPORT_CONFIDENCE = 60.0
SUPPORT_EXPOSURE = 25.0

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
    # A session can be created while a quiz is being generated. It is not
    # learning activity until at least one answer has been recorded.
    if sessions == 0 or questions_attempted <= 0:
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

def _as_naive_datetime(value):
    if value is None:
        return None
    if getattr(value, "tzinfo", None) is not None:
        return value.replace(tzinfo=None)
    return value

def calculate_study_streak_metrics(student_id: int, db: Session, now=None) -> dict:
    """Calculate streaks from answered learning activity only.

    A session created for background question generation is not activity. Quiz
    history rows count only when they contain answered questions, while an
    in-progress session is represented by answered practice questions. Keeping
    this calculation here gives all dashboard consumers the same definition of
    student activity.
    """
    now = _as_naive_datetime(now) or datetime.utcnow()

    history_rows = db.query(QuizHistory.created_at).filter(
        QuizHistory.student_id == student_id,
        QuizHistory.questions_attempted > 0,
    ).all()
    answered_rows = (
        db.query(PracticeQuestion.answered_at)
        .join(PracticeSession, PracticeQuestion.session_id == PracticeSession.id)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.answered_at.isnot(None),
            PracticeQuestion.is_correct.isnot(None),
        )
        .all()
    )

    activity_timestamps = []
    for row in history_rows + answered_rows:
        timestamp = _as_naive_datetime(row[0])
        if timestamp:
            activity_timestamps.append(timestamp)

    activity_dates = sorted({timestamp.date() for timestamp in activity_timestamps})
    last_active_at = max(activity_timestamps, default=None)
    last_active = last_active_at.date() if last_active_at else None
    date_set = set(activity_dates)

    best_streak = 0
    running_streak = 0
    previous_date = None
    for activity_date in activity_dates:
        if previous_date and activity_date == previous_date + timedelta(days=1):
            running_streak += 1
        else:
            running_streak = 1
        best_streak = max(best_streak, running_streak)
        previous_date = activity_date

    current_streak = 0
    if last_active and last_active >= now.date() - timedelta(days=1):
        cursor = last_active
        while cursor in date_set:
            current_streak += 1
            cursor -= timedelta(days=1)

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "last_active": last_active.isoformat() if last_active else None,
        "last_active_at": last_active_at,
    }

def _aggregate_topic_metrics(perfs) -> dict:
    if not perfs:
        return {
            "status": "NOT_STARTED",
            "accuracy": 0.0,
            "confidence": 0.0,
            "sessions": 0,
            "questions_attempted": 0,
            "correct_answers": 0,
            "last_practiced_at": None,
        }

    sessions = sum(max(int(getattr(perf, "sessions", 0) or 0), 0) for perf in perfs)
    questions_attempted = 0
    correct_answers = 0
    fallback_accuracies = []
    last_practiced_at = None

    for perf in perfs:
        questions = max(int(getattr(perf, "questions_attempted", 0) or 0), 0)
        correct = max(int(getattr(perf, "correct_answers", 0) or 0), 0)
        if questions:
            questions_attempted += questions
            correct_answers += min(correct, questions)
        else:
            fallback_accuracies.append(float(getattr(perf, "accuracy", 0.0) or 0.0))

        candidate_last = getattr(perf, "last_practiced_at", None)
        if candidate_last is None:
            candidate_last = getattr(perf, "last_practiced", None)
        if candidate_last and (
            last_practiced_at is None
            or _as_naive_datetime(candidate_last) > _as_naive_datetime(last_practiced_at)
        ):
            last_practiced_at = candidate_last

    if questions_attempted:
        accuracy = (correct_answers / questions_attempted) * 100.0
    else:
        accuracy = sum(fallback_accuracies) / len(fallback_accuracies) if fallback_accuracies else 0.0

    confidence = calculate_confidence(accuracy, sessions, questions_attempted)
    return {
        "status": get_topic_status(sessions, questions_attempted, accuracy),
        "accuracy": round(max(0.0, min(100.0, accuracy)), 2),
        "confidence": confidence,
        "sessions": sessions,
        "questions_attempted": questions_attempted,
        "correct_answers": correct_answers,
        "last_practiced_at": last_practiced_at,
    }


def calculate_topic_metrics(perf) -> dict:
    """Return one topic's live metrics using answer counts as the source of truth."""
    if perf is None:
        return {
            "status": "NOT_STARTED",
            "accuracy": 0.0,
            "confidence": 0.0,
            "sessions": 0,
            "questions_attempted": 0,
            "correct_answers": 0,
            "last_practiced_at": None,
        }
    return _aggregate_topic_metrics([perf])


def _normalize_subject_name(subject_name: str) -> str:
    """Return a stable alias for matching class and fallback curriculum names."""
    compact = re.sub(r"[^a-z0-9]+", " ", (subject_name or "").lower()).strip()
    if "operating" in compact or "os" in compact.split():
        return "Operating Systems"
    if (
        compact in {"ai", "artificial intelligence"}
        or "artificial intelligence" in compact
    ):
        return "Artificial Intelligence"
    if (
        "front end" in compact
        or "frontend" in compact
        or "front-end" in compact
    ):
        return "Front-End Development"
    if "data structure" in compact or "dsa" in compact:
        return "Data Structures"
    if "database" in compact or "dbms" in compact:
        return "Database Management Systems"
    if "network" in compact or "cn" in compact.split():
        return "Computer Networks"
    return (subject_name or "").strip()


def get_predefined_topics(student_id: int, subject_name: str, db: Session) -> list:
    requested_subject = (subject_name or "").strip()
    subject_name = _normalize_subject_name(requested_subject)

    # 1. Try the enrolled class curriculum first. Match the stored subject
    # exactly before applying aliases so custom course names keep their topics.
    try:
        from classroom_models import ClassCurriculum, StudentClass
        enrolled_classes = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
        class_ids = [c.class_id for c in enrolled_classes]
        if class_ids:
            curriculums = db.query(ClassCurriculum).filter(
                ClassCurriculum.class_id.in_(class_ids)
            ).all()
            requested_key = requested_subject.casefold()
            curr = next(
                (
                    item for item in curriculums
                    if item.subject_name and item.subject_name.strip().casefold() == requested_key
                ),
                None,
            )
            if curr is None:
                curr = next(
                    (
                        item for item in curriculums
                        if item.subject_name
                        and _normalize_subject_name(item.subject_name) == subject_name
                    ),
                    None,
                )
            if curr and curr.curriculum_json:
                topics = []
                if "units" in curr.curriculum_json:
                    for unit in curr.curriculum_json["units"]:
                        topics.extend(unit.get("topics", []))
                elif "semesters" in curr.curriculum_json:
                    for sem in curr.curriculum_json["semesters"]:
                        for course in sem.get("courses", []):
                            topics.extend(course.get("topics", []))
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

def _subject_match_rank(perf, requested_subject: str):
    """Prefer exact subject rows, then aliases, then unscoped legacy rows."""
    stored_subject = (getattr(perf, "subject", None) or "").strip()
    requested = (requested_subject or "").strip()
    if not stored_subject:
        return 2
    if stored_subject.casefold() == requested.casefold():
        return 0
    if _normalize_subject_name(stored_subject).casefold() == _normalize_subject_name(requested).casefold():
        return 1
    return None


def calculate_subject_metrics(student_id: int, subject: str, db: Session, topics_override=None) -> dict:
    predefined_topics = list(dict.fromkeys(
        topic.strip()
        for topic in (topics_override if topics_override is not None else get_predefined_topics(student_id, subject, db))
        if isinstance(topic, str) and topic.strip()
    ))
    total_topics = len(predefined_topics)

    performances = []
    if predefined_topics:
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id,
            TopicPerformance.topic.in_(predefined_topics),
            # Rows with no answered questions are generated/incomplete
            # sessions, not measurable student performance.
            TopicPerformance.questions_attempted > 0,
        ).all()

    # Older practice records stored a concept label such as "Basic
    # definition" in the subject column instead of the course name. Keep
    # those records usable by topic, while still preventing a row explicitly
    # belonging to another enrolled course from leaking into this subject.
    enrolled_subjects = get_student_subjects(student_id, db)
    performances_by_topic = {}
    for perf in performances:
        rank = _subject_match_rank(perf, subject)
        if rank is None:
            belongs_to_enrolled_subject = any(
                _subject_match_rank(perf, enrolled_subject) is not None
                for enrolled_subject in enrolled_subjects
            )
            if belongs_to_enrolled_subject:
                continue
            # This is an unscoped/legacy label. The topic is already bounded
            # by this subject's curriculum, so use it as a topic-level
            # fallback after explicit subject matches.
            rank = 3
        performances_by_topic.setdefault(perf.topic, []).append((rank, perf))

    mastered_topics = 0
    weak_topics = 0
    learning_topics = 0
    not_started_topics = 0
    attempted_metrics = []
    total_questions = 0
    total_correct_answers = 0

    for topic in predefined_topics:
        candidates = performances_by_topic.get(topic, [])
        if candidates:
            best_rank = min(rank for rank, _ in candidates)
            topic_rows = [perf for rank, perf in candidates if rank == best_rank]
        else:
            topic_rows = []

        metrics = _aggregate_topic_metrics(topic_rows)
        status = metrics["status"]

        if status == "STRONG":
            mastered_topics += 1
        elif status == "LEARNING":
            learning_topics += 1
        elif status == "WEAK":
            weak_topics += 1
        else:
            not_started_topics += 1

        if metrics["questions_attempted"] > 0:
            attempted_metrics.append(metrics)
            total_questions += metrics["questions_attempted"]
            total_correct_answers += metrics["correct_answers"]

    attempted_topics_count = len(attempted_metrics)
    fallback_weight = sum(
        metric["questions_attempted"] if metric["questions_attempted"] > 0 else 1
        for metric in attempted_metrics
    )
    if total_questions > 0:
        average_accuracy = (total_correct_answers / total_questions) * 100.0
    elif fallback_weight:
        average_accuracy = sum(
            metric["accuracy"] * (metric["questions_attempted"] if metric["questions_attempted"] > 0 else 1)
            for metric in attempted_metrics
        ) / fallback_weight
    else:
        average_accuracy = 0.0

    if fallback_weight:
        average_confidence = sum(
            metric["confidence"] * (metric["questions_attempted"] if metric["questions_attempted"] > 0 else 1)
            for metric in attempted_metrics
        ) / fallback_weight
    else:
        average_confidence = 0.0

    exposure = (attempted_topics_count / total_topics * 100) if total_topics > 0 else 0.0
    progress = (mastered_topics / total_topics * 100) if total_topics > 0 else 0.0
    last_activity_at = max(
        (
            metric.get("last_practiced_at")
            for metric in attempted_metrics
            if metric.get("last_practiced_at") is not None
        ),
        default=None,
    )
    if average_accuracy > 80:
        health = "GREEN"
    elif average_accuracy >= 60:
        health = "YELLOW"
    else:
        health = "RED"

    result = {
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
        "questions_attempted": total_questions,
        "correct_answers": total_correct_answers,
        "last_activity_at": _as_naive_datetime(last_activity_at),
        "health": health,
    }
    result["risk_tier"] = classify_risk(result)
    return result


def _activity_recency_score(last_activity_at) -> float:
    """Convert the latest learning activity into a bounded readiness signal."""
    last_activity_at = _as_naive_datetime(last_activity_at)
    if not last_activity_at:
        return 0.0
    age_days = max(0.0, (datetime.utcnow() - last_activity_at).total_seconds() / 86400.0)
    if age_days <= 1:
        return 100.0
    if age_days <= 3:
        return 85.0
    if age_days <= 7:
        return 70.0
    if age_days <= 14:
        return 45.0
    if age_days <= 30:
        return 20.0
    return 0.0


def calculate_readiness(
    exposure: float,
    confidence: float,
    last_activity_at=None,
    roadmap_progress: float = 0.0,
) -> float:
    """Apply the shared readiness weighting to a scoped metric."""
    value = (
        (float(exposure or 0.0) * 0.40)
        + (float(confidence or 0.0) * 0.35)
        + (_activity_recency_score(last_activity_at) * 0.15)
        + (max(0.0, min(100.0, float(roadmap_progress or 0.0))) * 0.10)
    )
    return round(max(0.0, min(100.0, value)), 1)


def get_activity_snapshot(student_ids, db: Session, now=None, topics=None) -> dict:
    """Return one consistent activity window for all dashboard consumers."""
    ids = {int(student_id) for student_id in (student_ids or [])}
    now = _as_naive_datetime(now) or datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    window_start = now - timedelta(days=ACTIVITY_WINDOW_DAYS)

    active_today = set()
    active_7d = set()
    quiz_7d = set()
    practice_7d = set()
    last_activity_by_student = {}

    if not ids:
        return {
            "active_today": active_today,
            "active_7d": active_7d,
            "quiz_7d": quiz_7d,
            "practice_7d": practice_7d,
            "last_activity_by_student": last_activity_by_student,
        }

    quiz_query = db.query(QuizHistory.student_id, QuizHistory.created_at).filter(
        QuizHistory.student_id.in_(ids),
        QuizHistory.questions_attempted > 0,
        QuizHistory.created_at >= window_start,
    )
    # A session is only student activity after an answer is recorded. Sessions
    # are also created while questions are generated in the background.
    session_query = (
        db.query(PracticeSession.student_id, PracticeQuestion.answered_at)
        .join(PracticeQuestion, PracticeQuestion.session_id == PracticeSession.id)
        .filter(
            PracticeSession.student_id.in_(ids),
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.answered_at >= window_start,
            PracticeQuestion.answered_at.isnot(None),
            PracticeQuestion.is_correct.isnot(None),
        )
    )
    scoped_topics = {
        topic.strip()
        for topic in (topics or [])
        if isinstance(topic, str) and topic.strip()
    }
    if scoped_topics:
        quiz_query = quiz_query.filter(QuizHistory.topic.in_(scoped_topics))
        session_query = session_query.filter(PracticeQuestion.topic.in_(scoped_topics))
    quiz_rows = quiz_query.all()
    session_rows = session_query.all()

    for student_id, timestamp in quiz_rows:
        timestamp = _as_naive_datetime(timestamp)
        if not timestamp:
            continue
        quiz_7d.add(student_id)
        active_7d.add(student_id)
        if timestamp >= today_start:
            active_today.add(student_id)
        previous = last_activity_by_student.get(student_id)
        if previous is None or timestamp > previous:
            last_activity_by_student[student_id] = timestamp

    for student_id, timestamp in session_rows:
        timestamp = _as_naive_datetime(timestamp)
        if not timestamp:
            continue
        practice_7d.add(student_id)
        active_7d.add(student_id)
        if timestamp >= today_start:
            active_today.add(student_id)
        previous = last_activity_by_student.get(student_id)
        if previous is None or timestamp > previous:
            last_activity_by_student[student_id] = timestamp

    return {
        "active_today": active_today,
        "active_7d": active_7d,
        "quiz_7d": quiz_7d,
        "practice_7d": practice_7d,
        "last_activity_by_student": last_activity_by_student,
    }


def calculate_quiz_accuracy_window(
    student_ids,
    db: Session,
    start_at,
    end_at=None,
    topics=None,
):
    """Return question-weighted quiz accuracy for one time and topic scope."""
    ids = {int(student_id) for student_id in (student_ids or [])}
    if not ids:
        return None

    query = db.query(
        QuizHistory.questions_attempted,
        QuizHistory.correct_answers,
        QuizHistory.topic,
    ).filter(
        QuizHistory.student_id.in_(ids),
        QuizHistory.questions_attempted > 0,
        QuizHistory.created_at >= _as_naive_datetime(start_at),
    )
    if end_at is not None:
        query = query.filter(QuizHistory.created_at < _as_naive_datetime(end_at))

    scoped_topics = {
        topic.strip()
        for topic in (topics or [])
        if isinstance(topic, str) and topic.strip()
    }
    if scoped_topics:
        query = query.filter(QuizHistory.topic.in_(scoped_topics))

    total_questions = 0
    total_correct = 0
    for questions, correct, _topic in query.all():
        questions = max(int(questions or 0), 0)
        correct = min(max(int(correct or 0), 0), questions)
        total_questions += questions
        total_correct += correct

    if total_questions == 0:
        return None
    return round((total_correct / total_questions) * 100.0, 1)


def classify_risk(metrics: dict) -> str:
    """Shared academic risk tiers; no-attempt students are not called high risk."""
    questions_attempted = int(metrics.get("questions_attempted", 0) or 0)
    attempted_topics = int(metrics.get("attempted_topics", 0) or 0)
    if questions_attempted <= 0 and attempted_topics <= 0:
        return "NOT_STARTED"

    accuracy = float(metrics.get("average_accuracy", 0.0) or 0.0)
    confidence = float(metrics.get("average_confidence", 0.0) or 0.0)
    exposure = float(metrics.get("exposure", 0.0) or 0.0)
    if accuracy < HIGH_RISK_ACCURACY or confidence < HIGH_RISK_CONFIDENCE:
        return "HIGH_RISK"
    if accuracy < SUPPORT_ACCURACY or confidence < SUPPORT_CONFIDENCE or exposure < SUPPORT_EXPOSURE:
        return "NEEDS_SUPPORT"
    return "ON_TRACK"


def calculate_student_metrics(student_id: int, db: Session, activity_snapshot=None) -> dict:
    subjects = get_student_subjects(student_id, db)

    total_topics_all = 0
    total_attempted_topics_all = 0
    mastered_topics_all = 0
    weak_topics_all = 0
    strong_topics_all = 0
    learning_topics_all = 0
    total_questions = 0
    total_correct_answers = 0
    weighted_accuracy_sum = 0.0
    weighted_confidence_sum = 0.0
    weighted_metric_count = 0

    for subject in subjects:
        metrics = calculate_subject_metrics(student_id, subject, db)
        total_topics_all += metrics["total_topics"]
        total_attempted_topics_all += metrics.get("attempted_topics", 0)
        mastered_topics_all += metrics["mastered_topics"]
        strong_topics_all += metrics["mastered_topics"]
        weak_topics_all += metrics["weak_topics"]
        learning_topics_all += metrics["learning_topics"]
        total_questions += metrics.get("questions_attempted", 0)
        total_correct_answers += metrics.get("correct_answers", 0)

        weight = metrics.get("questions_attempted", 0) or metrics.get("attempted_topics", 0)
        if weight:
            weighted_accuracy_sum += metrics.get("average_accuracy", 0.0) * weight
            weighted_confidence_sum += metrics.get("average_confidence", 0.0) * weight
            weighted_metric_count += weight

    overall_progress = (mastered_topics_all / total_topics_all * 100) if total_topics_all > 0 else 0.0
    overall_exposure = (total_attempted_topics_all / total_topics_all * 100) if total_topics_all > 0 else 0.0
    overall_accuracy = (
        (total_correct_answers / total_questions) * 100.0
        if total_questions > 0
        else (weighted_accuracy_sum / weighted_metric_count if weighted_metric_count else 0.0)
    )
    overall_confidence = (
        weighted_confidence_sum / weighted_metric_count
        if weighted_metric_count
        else 0.0
    )

    latest_topic_activity = db.query(TopicPerformance.last_practiced_at).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.last_practiced_at.isnot(None),
    ).order_by(TopicPerformance.last_practiced_at.desc()).first()
    latest_activity_at = latest_topic_activity[0] if latest_topic_activity else None

    user_performance = db.query(UserPerformance.last_practiced).filter(
        UserPerformance.student_id == student_id,
    ).first()
    if user_performance and user_performance[0] and (
        not latest_activity_at or _as_naive_datetime(user_performance[0]) > _as_naive_datetime(latest_activity_at)
    ):
        latest_activity_at = user_performance[0]

    if activity_snapshot is None:
        activity_snapshot = get_activity_snapshot([student_id], db)
    activity_last = activity_snapshot.get("last_activity_by_student", {}).get(student_id)
    if activity_last and (
        not latest_activity_at or activity_last > _as_naive_datetime(latest_activity_at)
    ):
        latest_activity_at = activity_last

    roadmap_progress = 0.0
    latest_roadmap_activity = None
    try:
        from roadmap_models import LearningRoadmap, DailyTask

        latest_roadmap = db.query(LearningRoadmap).filter(
            LearningRoadmap.student_id == student_id,
        ).order_by(LearningRoadmap.updated_at.desc(), LearningRoadmap.created_at.desc()).first()
        if latest_roadmap:
            roadmap_progress = max(0.0, min(100.0, float(latest_roadmap.overall_progress or 0.0)))

        completed_task = db.query(DailyTask.completed_at).join(LearningRoadmap).filter(
            LearningRoadmap.student_id == student_id,
            DailyTask.completed_at.isnot(None),
        ).order_by(DailyTask.completed_at.desc()).first()
        latest_roadmap_activity = completed_task[0] if completed_task else None
    except Exception:
        pass

    if latest_roadmap_activity and (
        not latest_activity_at or _as_naive_datetime(latest_roadmap_activity) > _as_naive_datetime(latest_activity_at)
    ):
        latest_activity_at = latest_roadmap_activity

    overall_recency = _activity_recency_score(latest_activity_at)
    overall_readiness = calculate_readiness(
        overall_exposure,
        overall_confidence,
        latest_activity_at,
        roadmap_progress,
    )

    result = {
        "overall_progress": round(overall_progress),
        "overall_exposure": round(overall_exposure),
        "overall_accuracy": round(overall_accuracy, 1),
        "overall_confidence": round(overall_confidence, 1),
        "overall_readiness": round(overall_readiness, 1),
        "readiness_components": {
            "exposure": round(overall_exposure, 1),
            "confidence": round(overall_confidence, 1),
            "recent_activity": round(overall_recency, 1),
            "roadmap_progress": round(roadmap_progress, 1),
        },
        "mastered_topics": mastered_topics_all,
        "weak_topics": weak_topics_all,
        "strong_topics": strong_topics_all,
        "learning_topics": learning_topics_all,
        "attempted_topics": total_attempted_topics_all,
        "total_topics": total_topics_all,
        "questions_attempted": total_questions,
        "correct_answers": total_correct_answers,
        "last_activity_at": _as_naive_datetime(latest_activity_at),
        "active_today": student_id in activity_snapshot.get("active_today", set()),
        "active_7d": student_id in activity_snapshot.get("active_7d", set()),
    }
    result["risk_tier"] = classify_risk({
        "questions_attempted": total_questions,
        "attempted_topics": total_attempted_topics_all,
        "average_accuracy": overall_accuracy,
        "average_confidence": overall_confidence,
        "exposure": overall_exposure,
    })
    return result
