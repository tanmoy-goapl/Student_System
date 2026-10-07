import logging
import json
import os
import traceback
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from practice_models import (
    TopicPerformance, PracticeQuestion, PracticeSession,
    CustomTopic
)
from services.practice.topic_extractor import extract_topics_from_documents
from services.practice.analytics import (
    detect_behavioral_patterns
)
from services.authorization import require_student

logger = logging.getLogger("chatbot")

router = APIRouter()


@router.get("/performance/{student_id}")
def get_performance(student_id: int, db: Session = Depends(get_db)):
    require_student(student_id, db)
    """Get per-topic performance, weak areas, and behavioral insights."""
    
    # Auto-repair: fix TopicPerformance records that lost their quiz data
    from services.analytics_engine import get_topic_status as _get_status
    broken_perfs = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.questions_attempted == 0
    ).all()
    for bp in broken_perfs:
        hist = db.query(PracticeQuestion).join(PracticeSession).filter(
            PracticeSession.student_id == bp.student_id,
            PracticeQuestion.topic == bp.topic,
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.is_correct.isnot(None)
        ).all()
        if hist:
            att = len(hist)
            cor = sum(1 for q in hist if q.is_correct)
            acc = (cor / att * 100) if att > 0 else 0.0
            ses = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == bp.student_id,
                PracticeQuestion.topic == bp.topic,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).distinct().count()
            bp.questions_attempted = att
            bp.correct_answers = cor
            bp.accuracy = acc
            bp.sessions = ses
            bp.status = _get_status(ses, att, acc)
    
    # Auto-recover: find orphaned quiz topics (answered questions but NO TopicPerformance row)
    from sqlalchemy import distinct as sql_distinct
    all_answered_topics = db.query(sql_distinct(PracticeQuestion.topic)).join(PracticeSession).filter(
        PracticeSession.student_id == student_id,
        PracticeQuestion.student_answer.isnot(None),
        PracticeQuestion.is_correct.isnot(None)
    ).all()
    existing_tp_topics = set(
        t[0] for t in db.query(TopicPerformance.topic).filter(
            TopicPerformance.student_id == student_id
        ).all()
    )
    for (topic_name,) in all_answered_topics:
        if topic_name not in existing_tp_topics:
            hist = db.query(PracticeQuestion).join(PracticeSession).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == topic_name,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).all()
            att = len(hist)
            cor = sum(1 for q in hist if q.is_correct)
            acc = (cor / att * 100) if att > 0 else 0.0
            ses = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == student_id,
                PracticeQuestion.topic == topic_name,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).distinct().count()
            # Resolve subject from subtopic field of first question
            first_q = hist[0] if hist else None
            resolved_subject = first_q.subtopic if first_q and first_q.subtopic else "General"
            # Try to find subject from curriculum configs
            try:
                import json as _json, os as _os
                st_path = _os.path.join(_os.path.dirname(__file__), "..", "..", "config", "subject_topics.json")
                if _os.path.exists(st_path):
                    with open(st_path, "r") as f:
                        st_data = _json.load(f)
                    for sn, tl in st_data.items():
                        if topic_name in tl:
                            resolved_subject = sn
                            break
            except Exception:
                pass
            
            new_tp = TopicPerformance(
                student_id=student_id,
                topic=topic_name,
                subject=resolved_subject,
                sessions=ses,
                questions_attempted=att,
                correct_answers=cor,
                accuracy=acc,
                status=_get_status(ses, att, acc)
            )
            db.add(new_tp)
    
    db.commit()
    
    from services.analytics_engine import calculate_topic_metrics
    
    # Overall stats
    all_perfs = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .all()
    )

    questions_attempted = sum(p.questions_attempted for p in all_perfs)
    correct_answers = sum(p.correct_answers for p in all_perfs)
    overall_accuracy = (correct_answers / questions_attempted * 100) if questions_attempted > 0 else 0.0

    # 1. Weak Topics (Top 4)
    # Sort topics by accuracy ascending
    weak_candidates = [p for p in all_perfs if p.sessions >= 1]
    weak_candidates.sort(key=lambda x: x.accuracy)
    
    weak_topics_list = []
    for p in weak_candidates[:4]:
        metrics = calculate_topic_metrics(p)
        days = (datetime.utcnow() - p.last_practiced_at).days if p.last_practiced_at else 30
        
        if days >= 6:
            reason = f"Not practiced for {days} days"
        elif p.accuracy < 40:
            reason = "Incorrect in recent sessions"
        elif metrics["confidence"] < 40:
            reason = "Confidence dropped"
        else:
            reason = "Active weak area"
            
        weak_topics_list.append({
            "topic": p.topic,
            "subject": p.subject or "General",
            "accuracy": round(p.accuracy, 1),
            "reason": reason
        })

    # 2. Adaptive Engine Calculations
    if overall_accuracy > 80:
        rec_diff = "Hard"
    elif overall_accuracy >= 50:
        rec_diff = "Medium"
    else:
        rec_diff = "Easy"
        
    recent_sessions = (
        db.query(PracticeSession)
        .join(PracticeQuestion, PracticeQuestion.session_id == PracticeSession.id)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.is_correct.isnot(None),
            PracticeQuestion.answered_at.isnot(None),
            PracticeSession.ended_at != None,
        )
        .distinct()
        .order_by(PracticeSession.created_at.desc())
        .limit(5)
        .all()
    )
    
    if recent_sessions:
        avg_mins = sum((s.ended_at - s.created_at).total_seconds() / 60.0 for s in recent_sessions) / len(recent_sessions)
    else:
        avg_mins = 20.0
        
    if avg_mins < 15:
        pace = "Fast"
    elif avg_mins <= 40:
        pace = "Normal"
    else:
        pace = "Slow"
        
    focus_topic = weak_topics_list[0]["topic"] if weak_topics_list else "Core Syllabus"
    
    last_question = (
        db.query(PracticeQuestion)
        .join(PracticeSession, PracticeQuestion.session_id == PracticeSession.id)
        .filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.is_correct.isnot(None),
            PracticeQuestion.answered_at.isnot(None),
        )
        .order_by(PracticeQuestion.answered_at.desc())
        .first()
    )
    
    def get_relative_time(dt):
        if not dt:
            return "Never"
        diff = datetime.utcnow() - dt
        if diff.days == 0:
            return "Today"
        if diff.days == 1:
            return "Yesterday"
        return f"{diff.days} days ago"
        
    last_active_str = get_relative_time(last_question.answered_at if last_question else None)
    
    adaptive_engine = {
        "recommended_difficulty": rec_diff,
        "study_pace": pace,
        "focus_topic": focus_topic,
        "last_active": last_active_str
    }

    # 3. Suggested Next Actions (Priority: Continue Practice, Review Mistakes, Take Quiz, Read Notes)
    suggested_next = []
    
    strong_topics = [p for p in all_perfs if p.status == "STRONG"]
    strong_topic = strong_topics[0].topic if strong_topics else (all_perfs[0].topic if all_perfs else "Core Concepts")
    
    # 1. Continue Practice
    suggested_next.append({
        "title": "Continue Practice",
        "topic": focus_topic,
        "reason": "Reinforce concepts from last session",
        "action_url": f"/practice?topic={focus_topic}"
    })
    
    # 2. Review Mistakes
    suggested_next.append({
        "title": "Review Mistakes",
        "topic": weak_topics_list[0]["topic"] if weak_topics_list else focus_topic,
        "reason": "Incorrect patterns detected",
        "action_url": f"/practice?mode=weakness&topic={weak_topics_list[0]['topic'] if weak_topics_list else focus_topic}"
    })
    
    # 3. Take Quiz
    suggested_next.append({
        "title": "Take Quiz",
        "topic": strong_topic,
        "reason": "Verify long-term memory",
        "action_url": f"/practice?topic={strong_topic}"
    })
    
    # 4. Read Notes
    suggested_next.append({
        "title": "Read Notes",
        "topic": focus_topic,
        "reason": "Review theory and fundamentals",
        "action_url": f"/learning?topic={focus_topic}"
    })

    insights = detect_behavioral_patterns(student_id, db)

    # Keep the Practice page self-contained: the same revision queue shown on
    # the student home page is also available beside the live practice insights.
    # A queue failure must not hide the performance data itself.
    try:
        from services.homepage_engine import calculate_pending_tasks, calculate_revision_queue
        revision_queue = calculate_revision_queue(student_id, db)
        pending_tasks = calculate_pending_tasks(student_id, db)
    except Exception:
        logger.exception("[Practice] Could not calculate revision queue for student_id=%s", student_id)
        revision_queue = []
        pending_tasks = []

    return {
        "overall_accuracy": round(overall_accuracy, 1),
        "questions_attempted": questions_attempted,
        "correct_answers": correct_answers,
        "weak_topics": weak_topics_list,
        "insights": insights,
        "topic_performances": [
            {
                "topic": p.topic,
                "subject": p.subject or "General",
                "accuracy": round(p.accuracy, 1),
                "questions_attempted": p.questions_attempted,
                "sessions": p.sessions,
                "status": p.status,
                "current_difficulty": p.current_difficulty,
            }
            for p in all_perfs
        ],
        "overall_accuracy": round(overall_accuracy, 1), # Duplicated key in original code, kept for consistency
        "adaptive_engine": adaptive_engine,
        "suggested_next": suggested_next,
        "revision_queue": revision_queue,
        "pending_tasks": pending_tasks
    }


@router.post("/repair-performance")
def repair_performance(student_id: int = Query(...), db: Session = Depends(get_db)):
    """One-time repair: recover lost quiz progress from PracticeQuestion history."""
    require_student(student_id, db)
    from services.analytics_engine import get_topic_status
    
    broken_perfs = db.query(TopicPerformance).filter(
        TopicPerformance.student_id == student_id,
        TopicPerformance.questions_attempted == 0
    ).all()
    
    repaired = []
    for perf in broken_perfs:
        history_qs = db.query(PracticeQuestion).join(PracticeSession).filter(
            PracticeSession.student_id == perf.student_id,
            PracticeQuestion.topic == perf.topic,
            PracticeQuestion.student_answer.isnot(None),
            PracticeQuestion.is_correct.isnot(None)
        ).all()
        
        if history_qs:
            attempted = len(history_qs)
            correct = sum(1 for q in history_qs if q.is_correct)
            accuracy = (correct / attempted * 100) if attempted > 0 else 0.0
            sessions = db.query(PracticeSession.id).join(PracticeQuestion).filter(
                PracticeSession.student_id == perf.student_id,
                PracticeQuestion.topic == perf.topic,
                PracticeQuestion.student_answer.isnot(None),
                PracticeQuestion.is_correct.isnot(None)
            ).distinct().count()
            
            perf.questions_attempted = attempted
            perf.correct_answers = correct
            perf.accuracy = accuracy
            perf.sessions = sessions
            perf.status = get_topic_status(sessions, attempted, accuracy)
            repaired.append({
                "topic": perf.topic,
                "accuracy": round(accuracy, 1),
                "attempted": attempted,
                "correct": correct,
                "sessions": sessions,
                "status": perf.status
            })
    
    db.commit()
    return {"repaired_count": len(repaired), "repaired": repaired}


@router.get("/data")
async def get_practice_data(student_id: int = Query(...), class_id: Optional[int] = None, db: Session = Depends(get_db)):
    require_student(student_id, db)
    try:
        return await _get_practice_data_impl(student_id, class_id, db)
    except Exception as e:
        logger.error(f"[PracticeRouter] get_practice_data crashed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


async def _get_practice_data_impl(student_id: Optional[int] = None, class_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Returns practice data in the format expected by the existing frontend.
    Now dynamically generated from documents + performance data + class curriculum.
    """

    # Dynamic recommendation for practice modes
    recommended_mode = "topic"  # default
    if student_id:
        try:
            all_perfs = db.query(TopicPerformance).filter(TopicPerformance.student_id == student_id).all()
            weak_count = 0
            revision_due_count = 0
            for p in all_perfs:
                if p.sessions > 0:
                    if p.accuracy < 50:
                        weak_count += 1
                    if p.status == "STRONG" and p.last_practiced_at:
                        days = (datetime.utcnow() - p.last_practiced_at).days
                        if days > 7:
                            revision_due_count += 1
            if revision_due_count > 0:
                recommended_mode = "revision"
            elif weak_count > 0:
                recommended_mode = "weakness"
        except Exception as e:
            logger.error(f"[PracticeRouter] Error calculating recommended mode: {e}")

    practice_modes = [
        {
            "id": "weakness",
            "iconName": "alert-circle",
            "title": "Weakness-Based",
            "description": "AI targets your weak areas",
            "isCurrent": recommended_mode == "weakness",
        },
        {
            "id": "topic",
            "iconName": "book-2",
            "title": "Topic-Based",
            "description": "Practice a specific topic",
            "isCurrent": recommended_mode == "topic",
        },
        {
            "id": "exam",
            "iconName": "clipboard-check",
            "title": "Exam Simulation",
            "description": "Full mock exam experience",
            "isCurrent": recommended_mode == "exam",
        },
        {
            "id": "revision",
            "iconName": "bookmark",
            "title": "Revision Mode",
            "description": "Revisit bookmarked topics",
            "isCurrent": recommended_mode == "revision",
        },
    ]

    difficulties = [
        {"label": "Easy", "value": "easy"},
        {"label": "Medium", "value": "medium"},
        {"label": "Mixed", "value": "mixed"},
        {"label": "Hard", "value": "hard"},
    ]

    subjects = []
    has_documents = False
    colors = ["#a78bfa", "#60a5fa", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#f43f5e", "#6366f1"]
    perf_map = {}

    if student_id:
        topics_data = extract_topics_from_documents(student_id, db)

        performances = (
            db.query(TopicPerformance)
            .filter(TopicPerformance.student_id == student_id)
            .all()
        )
        perf_map = {p.topic: p for p in performances}
        
        if topics_data and topics_data.get("subjects"):
            has_documents = True

            for i, subj in enumerate(topics_data.get("subjects", [])):
                topic_names = [t["name"] for t in subj.get("topics", [])]

                weak_areas = []
                practiced_topics = []
                for t_name in topic_names:
                    p = perf_map.get(t_name)
                    if p:
                        if p.status == "WEAK":
                            weak_areas.append(t_name)
                        if p.sessions > 0:
                            practiced_topics.append(t_name)

                subjects.append({
                    "id": subj["name"].lower().replace(" ", "-"),
                    "title": subj["name"],
                    "iconName": "Book",
                    "color": colors[i % len(colors)],
                    "weakAreas": weak_areas,
                    "practicedTopics": practiced_topics,
                    "topics": topic_names,
                    "isExpanded": i == 0,
                    "section": "documents",
                })

    # Roadmaps
    # Return every roadmap owned by this student. The previous implementation
    # selected only the latest roadmap and exposed its weeks as separate
    # subjects, which hid all older personal roadmaps in Practice Arena.
    from roadmap_models import LearningRoadmap, DailyTask
    from sqlalchemy import desc
    if student_id:
        roadmaps = (
            db.query(LearningRoadmap)
            .filter(LearningRoadmap.student_id == student_id)
            .order_by(desc(LearningRoadmap.created_at), desc(LearningRoadmap.id))
            .all()
        )

        for roadmap_index, roadmap in enumerate(roadmaps):
            all_tasks = (
                db.query(DailyTask)
                .filter(DailyTask.roadmap_id == roadmap.id)
                .order_by(DailyTask.week_number, DailyTask.day_number, DailyTask.id)
                .all()
            )

            topics_list = []
            weak_areas = []
            practiced_topics = []
            for task in all_tasks:
                topic_name = (task.topic or '').strip()
                if not topic_name or topic_name in topics_list:
                    continue
                topics_list.append(topic_name)
                performance = perf_map.get(topic_name)
                if performance:
                    if performance.status == 'WEAK':
                        weak_areas.append(topic_name)
                    if performance.sessions > 0:
                        practiced_topics.append(topic_name)

            # Keep an empty roadmap visible while it is being populated; it
            # cannot be selected until it has topics, but it should not vanish
            # from the student's roadmap list.
            subjects.append({
                'id': f'roadmap-{roadmap.id}',
                'title': roadmap.title or f'Roadmap {roadmap_index + 1}',
                'iconName': 'Map',
                'color': colors[(roadmap_index + 1) % len(colors)],
                'weakAreas': weak_areas,
                'practicedTopics': practiced_topics,
                'topics': topics_list,
                'isExpanded': roadmap_index == 0,
                'section': 'roadmap',
            })

    # Curriculum
    if class_id:
        from classroom_models import ClassCurriculum
        curr = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
        if curr and curr.curriculum_json:
            units = curr.curriculum_json.get("units", [])
            subject_name = curr.curriculum_json.get("subject_name", "Class Curriculum")
            
            for i, unit in enumerate(units):
                topics_list = unit.get("topics", [])
                weak_areas = []
                practiced_topics = []
                if student_id:
                    for t_name in topics_list:
                        p = perf_map.get(t_name)
                        if p:
                            if p.status == "WEAK":
                                weak_areas.append(t_name)
                            if p.sessions > 0:
                                practiced_topics.append(t_name)
                            
                subjects.append({
                    "id": f"unit-{i}",
                    "title": unit.get("title", f"Unit {i+1}"),
                    "iconName": "Book",
                    "color": colors[i % len(colors)],
                    "weakAreas": weak_areas,
                    "practicedTopics": practiced_topics,
                    "topics": topics_list,
                    "isExpanded": subject_name.lower() != "software engineering",
                    "section": "curriculum",
                    "semester": subject_name,
                })
    else:
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "config", "default_curriculum.json"
        )
        try:
            with open(config_path, "r") as f:
                curriculum_data = json.load(f)
    
            current_sem_num = curriculum_data.get("current_semester", 3)
            
            # 1. Load dynamic curriculums first
            dynamic_subjects = set()
            if student_id:
                try:
                    from classroom_models import StudentClass, ClassCurriculum
                    enrolled = db.query(StudentClass).filter(StudentClass.student_id == student_id).all()
                    c_ids = [c.class_id for c in enrolled]
                    if c_ids:
                        curriculums = db.query(ClassCurriculum).filter(ClassCurriculum.class_id.in_(c_ids)).all()
                        for c in curriculums:
                            if c.curriculum_json and "units" in c.curriculum_json:
                                subj_name = c.subject_name or f"Class {c.class_id}"
                                dynamic_subjects.add(subj_name)
                                
                                all_t = []
                                for u in c.curriculum_json["units"]:
                                    all_t.extend(u.get("topics", []))
                                    
                                weak_areas = []
                                practiced_topics = []
                                for t_name in all_t:
                                    p = perf_map.get(t_name)
                                    if p:
                                        if p.status == "WEAK":
                                            weak_areas.append(t_name)
                                        if p.sessions > 0:
                                            practiced_topics.append(t_name)
                                        
                                subjects.append({
                                    "id": subj_name.lower().replace(" ", "-"),
                                    "title": subj_name,
                                    "iconName": "Book",
                                    "color": "#14b8a6",
                                    "weakAreas": weak_areas,
                                    "practicedTopics": practiced_topics,
                                    "topics": all_t,
                                    "isExpanded": not has_documents and subj_name.lower() != "software engineering",
                                    "section": "curriculum",
                                    "semester": f"Semester {current_sem_num}",
                                })
                except Exception as e:
                    logger.error(f"Failed to load dynamic curriculum for practice: {e}")
            # 2. Load static curriculum for the current semester
            if not dynamic_subjects:
                current_sem_data = next(
                    (sem for sem in curriculum_data.get("semesters", []) if sem.get("id") == f"semester-{current_sem_num}"),
                    None
                )
                if current_sem_data:
                    for subj_name, topics_list in current_sem_data.get("subjects", {}).items():
                        if subj_name in dynamic_subjects:
                            continue
                        
                        weak_areas = []
                        practiced_topics = []
                        if student_id:
                            for t_name in topics_list:
                                p = perf_map.get(t_name)
                                if p:
                                    if p.status == "WEAK":
                                        weak_areas.append(t_name)
                                    if p.sessions > 0:
                                        practiced_topics.append(t_name)
                                    
                        subjects.append({
                            "id": subj_name.lower().replace(" ", "-"),
                            "title": subj_name,
                            "iconName": "Book",
                            "color": current_sem_data.get("color", "#14b8a6"),
                            "weakAreas": weak_areas,
                            "practicedTopics": practiced_topics,
                            "topics": topics_list,
                            "isExpanded": not has_documents and subj_name.lower() != "software engineering",
                            "section": "curriculum",
                            "semester": f"Semester {current_sem_num}",
                        })
        except Exception as e:
            logger.error(f"Failed to load default curriculum: {e}")

    # Custom topics
    if student_id:
        custom_topics = (
            db.query(CustomTopic)
            .filter(CustomTopic.student_id == student_id)
            .all()
        )

        for ct in custom_topics:
            subj_name = ct.subject_name or "General Topics"
            subj_match = next(
                (s for s in subjects if s["title"].lower() == subj_name.lower()),
                None,
            )
            if subj_match:
                if ct.topic_name not in subj_match["topics"]:
                    subj_match["topics"].append(ct.topic_name)
                    p = perf_map.get(ct.topic_name)
                    if p and p.status == "WEAK":
                        if ct.topic_name not in subj_match["weakAreas"]:
                            subj_match["weakAreas"].append(ct.topic_name)
            else:
                existing_custom = next(
                    (s for s in subjects if s["id"] == subj_name.lower().replace(" ", "-")),
                    None,
                )
                if existing_custom:
                    if ct.topic_name not in existing_custom["topics"]:
                        existing_custom["topics"].append(ct.topic_name)
                else:
                    p = perf_map.get(ct.topic_name)
                    is_weak = p is not None and p.status == "WEAK"
                    subjects.append({
                        "id": subj_name.lower().replace(" ", "-"),
                        "title": subj_name,
                        "iconName": "Folder",
                        "color": colors[len(subjects) % len(colors)],
                        "weakAreas": [ct.topic_name] if is_weak else [],
                        "topics": [ct.topic_name],
                        "isExpanded": False,
                        "section": "documents" if has_documents else "curriculum",
                    })

    # Session stats
    session_stats = {"attempted": 0, "accuracy": 0, "time": "0m", "progress": 0, "total": 0}
    if student_id:
        all_perfs = (
            db.query(TopicPerformance)
            .filter(TopicPerformance.student_id == student_id)
            .all()
        )
        questions_attempted = sum(p.questions_attempted for p in all_perfs)
        correct_answers = sum(p.correct_answers for p in all_perfs)
        accuracy = (correct_answers / questions_attempted * 100) if questions_attempted > 0 else 0
        session_stats = {
            "attempted": questions_attempted,
            "sessions": sum(p.sessions for p in all_perfs),
            "time": f"{questions_attempted * 2}m",
            "progress": min(questions_attempted, 100),
            "total": 100,
        }

    return {
        "practiceModes": practice_modes,
        "subjects": subjects,
        "difficulties": difficulties,
        "sessionStats": session_stats,
        "sampleQuestions": [],
    }
