import json
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from practice_models import PracticeSession, PracticeQuestion, TopicPerformance, UserPerformance, QuizHistory
from services.analytics_engine import get_topic_status

logger = logging.getLogger("chatbot")


def get_adaptive_difficulty(student_id: int, topic: str, db: Session) -> str:
    """Determine difficulty based on student's accuracy for a topic."""
    perf = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.topic == topic)
        .first()
    )

    if not perf or perf.sessions < 3:
        return "easy"  # start easy for new topics

    if perf.accuracy < 50:
        return "easy"
    elif perf.accuracy < 75:
        return "medium"
    else:
        return "hard"


def update_topic_performance(
    student_id: int,
    topic: str,
    is_correct: bool,
    db: Session,
    session_id: int = None,
    subject: Optional[str] = None,
):
    """Update aggregated performance stats for a topic after an answer."""
    perf = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.topic == topic)
        .first()
    )

    if not perf:
        resolved_subject = subject
        try:
            # Check subject_topics.json first (highest priority)
            subject_topics_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "config", "subject_topics.json")
            if os.path.exists(subject_topics_path):
                with open(subject_topics_path, "r") as f:
                    subject_topics = json.load(f)
                for subj_name, topics_list in subject_topics.items():
                    if topic in topics_list:
                        resolved_subject = subj_name
                        break
            
            # If not found, check default_curriculum.json
            if resolved_subject == subject:
                config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "config", "default_curriculum.json")
                with open(config_path, "r") as f:
                    curriculum_data = json.load(f)
                for sem in curriculum_data.get("semesters", []):
                    for subj_name, topics_list in sem.get("subjects", {}).items():
                        if topic in topics_list:
                            resolved_subject = subj_name
                            break
        except Exception:
            pass

        from practice_models import PracticeQuestion, PracticeSession
        history_qs = db.query(PracticeQuestion).join(PracticeSession).filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.topic == topic,
            PracticeQuestion.is_correct.isnot(None)
        ).all()
        
        hist_attempted = len(history_qs)
        hist_correct = sum(1 for q in history_qs if q.is_correct)
        hist_accuracy = (hist_correct / hist_attempted * 100) if hist_attempted > 0 else 0.0
        hist_sessions = db.query(PracticeSession.id).join(PracticeQuestion).filter(
            PracticeSession.student_id == student_id,
            PracticeQuestion.topic == topic,
            PracticeQuestion.is_correct.isnot(None)
        ).distinct().count()

        perf = TopicPerformance(
            student_id=student_id,
            topic=topic,
            subject=resolved_subject,
            sessions=hist_sessions,
            questions_attempted=hist_attempted,
            correct_answers=hist_correct,
            accuracy=hist_accuracy,
        )
        db.add(perf)
        db.commit()
        db.refresh(perf)
    else:
        try:
            subject_topics_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "config", "subject_topics.json")
            found_subject = None
            if os.path.exists(subject_topics_path):
                with open(subject_topics_path, "r") as f:
                    subject_topics = json.load(f)
                for subj_name, topics_list in subject_topics.items():
                    if topic in topics_list:
                        found_subject = subj_name
                        break
            
            if not found_subject:
                config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "config", "default_curriculum.json")
                with open(config_path, "r") as f:
                    curriculum_data = json.load(f)
                for sem in curriculum_data.get("semesters", []):
                    for subj_name, topics_list in sem.get("subjects", {}).items():
                        if topic in topics_list:
                            found_subject = subj_name
                            break
            
            if found_subject and perf.subject != found_subject:
                perf.subject = found_subject
        except Exception:
            pass

    perf.questions_attempted += 1
    if is_correct:
        perf.correct_answers += 1

    perf.accuracy = (perf.correct_answers / perf.questions_attempted) * 100 if perf.questions_attempted > 0 else 0
    perf.current_difficulty = get_adaptive_difficulty(student_id, topic, db)
    
    if session_id:
        from practice_models import PracticeQuestion
        answered_in_session = db.query(PracticeQuestion).filter(
            PracticeQuestion.session_id == session_id,
            PracticeQuestion.topic == topic,
            PracticeQuestion.is_correct.isnot(None)
        ).count()
        if answered_in_session == 1:
            perf.sessions += 1

    perf.status = get_topic_status(perf.sessions, perf.questions_attempted, perf.accuracy)
    perf.last_practiced_at = datetime.utcnow()

    db.commit()
    db.refresh(perf)
    
    logger.info(f"PERFORMANCE UPDATED | Topic: {topic} | Accuracy: {perf.accuracy}% | Sessions: {perf.sessions} | Status: {perf.status}")
    
    return perf


def finalize_session_history(session, db: Session):
    """Save session to QuizHistory and update UserPerformance after session completes."""
    from practice_models import UserPerformance, QuizHistory, PracticeQuestion
    
    questions = db.query(PracticeQuestion).filter(PracticeQuestion.session_id == session.id).all()
    attempted = sum(1 for q in questions if q.student_answer is not None)
    correct = sum(1 for q in questions if q.is_correct)
    time_spent = sum(q.time_spent_seconds or 0 for q in questions)
    
    score_percentage = (correct / attempted * 100) if attempted > 0 else 0.0
    points_earned = correct * 10
    
    # 1. Create QuizHistory
    history = QuizHistory(
        student_id=session.student_id,
        session_id=session.id,
        topic=session.topic or "General",
        questions_attempted=attempted,
        correct_answers=correct,
        score_percentage=score_percentage,
        points_earned=points_earned,
        time_spent=time_spent
    )
    db.add(history)
    
    # 2. Update UserPerformance
    perf = db.query(UserPerformance).filter(UserPerformance.student_id == session.student_id).first()
    if not perf:
        perf = UserPerformance(
            student_id=session.student_id,
            total_questions_attempted=0,
            total_correct_answers=0,
            lifetime_accuracy=0.0,
            total_points=0,
            topics_covered=0,
            badges_earned=0,
            current_streak=0,
            longest_streak=0,
            total_time_seconds=0
        )
        db.add(perf)
        
    perf.total_questions_attempted += attempted
    perf.total_correct_answers += correct
    perf.total_time_seconds += time_spent
    perf.total_points += points_earned
    
    if perf.total_questions_attempted > 0:
        perf.lifetime_accuracy = (perf.total_correct_answers / perf.total_questions_attempted) * 100
        
    perf.last_practiced = datetime.utcnow()
    
    db.commit()
    
    # Recalculate streak
    histories = db.query(QuizHistory.created_at).filter(QuizHistory.student_id == session.student_id).order_by(QuizHistory.created_at.desc()).all()
    days = sorted(list(set(h.created_at.date() for h in histories)), reverse=True)
    
    streak = 0
    current_date = datetime.utcnow().date()
    if days and (days[0] == current_date or days[0] == current_date - timedelta(days=1)):
        for i, d in enumerate(days):
            if d == current_date - timedelta(days=i) or (days[0] != current_date and d == current_date - timedelta(days=i+1)):
                streak += 1
            else:
                break
    
    perf.current_streak = streak
    if streak > perf.longest_streak:
        perf.longest_streak = streak
        
    unique_topics = db.query(QuizHistory.topic).filter(QuizHistory.student_id == session.student_id).distinct().count()
    perf.topics_covered = unique_topics
    
    db.commit()

    if score_percentage >= 75.0:
        from roadmap_models import LearningRoadmap, DailyTask
        from sqlalchemy import desc
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == session.student_id).order_by(desc(LearningRoadmap.created_at)).first()
        if roadmap:
            task = db.query(DailyTask).filter(
                DailyTask.roadmap_id == roadmap.id,
                DailyTask.topic == session.topic,
                DailyTask.task_type == "quiz",
                DailyTask.status != "completed"
            ).first()
            
            if task:
                task.status = "completed"
                task.completed_at = datetime.utcnow()
                db.commit()
                
                all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
                if all_tasks:
                    completed_count = sum(1 for t in all_tasks if t.status == "completed")
                    roadmap.overall_progress = (completed_count / len(all_tasks)) * 100
                    db.commit()


def get_session_stats(session: PracticeSession, db: Session) -> dict:
    """Calculate live session statistics."""
    questions = (
        db.query(PracticeQuestion)
        .filter(PracticeQuestion.session_id == session.id)
        .all()
    )

    answered = [q for q in questions if q.student_answer is not None]
    correct = [q for q in answered if q.is_correct]

    streak = 0
    for q in sorted(answered, key=lambda x: x.answered_at or datetime.min, reverse=True):
        if q.is_correct:
            streak += 1
        else:
            break

    total_time = sum(q.time_spent_seconds or 0 for q in answered)
    avg_time = total_time / len(answered) if answered else 0

    points = 0
    for q in correct:
        base = {"easy": 10, "medium": 20, "hard": 30}.get(q.difficulty, 15)
        points += base

    if streak >= 5:
        points += streak * 5

    accuracy = (len(correct) / len(answered) * 100) if answered else 0

    return {
        "total_questions": len(questions),
        "answered": len(answered),
        "correct": len(correct),
        "accuracy": round(accuracy, 1),
        "streak": streak,
        "points": points,
        "avg_time_seconds": round(avg_time, 1),
        "total_time_seconds": total_time,
    }
