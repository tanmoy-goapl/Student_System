"""
One-time repair script: Recover TopicPerformance records that show 0%
even though quiz history exists in PracticeQuestion table.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from practice_models import TopicPerformance, PracticeQuestion, PracticeSession
from services.analytics_engine import get_topic_status

db = SessionLocal()

# Find all TopicPerformance records with questions_attempted == 0
broken_perfs = db.query(TopicPerformance).filter(TopicPerformance.questions_attempted == 0).all()
print(f"Found {len(broken_perfs)} TopicPerformance records with 0 questions_attempted")

repaired = 0
for perf in broken_perfs:
    # Check if there is actual quiz history in PracticeQuestion
    history_qs = db.query(PracticeQuestion).join(PracticeSession).filter(
        PracticeSession.student_id == perf.student_id,
        PracticeQuestion.topic == perf.topic,
        PracticeQuestion.is_correct.isnot(None)
    ).all()
    
    if history_qs:
        attempted = len(history_qs)
        correct = sum(1 for q in history_qs if q.is_correct)
        accuracy = (correct / attempted * 100) if attempted > 0 else 0.0
        sessions = db.query(PracticeSession.id).join(PracticeQuestion).filter(
            PracticeSession.student_id == perf.student_id,
            PracticeQuestion.topic == perf.topic,
            PracticeQuestion.is_correct.isnot(None)
        ).distinct().count()
        
        perf.questions_attempted = attempted
        perf.correct_answers = correct
        perf.accuracy = accuracy
        perf.sessions = sessions
        perf.status = get_topic_status(sessions, attempted, accuracy)
        repaired += 1
        print(f"  REPAIRED: student={perf.student_id} topic=\"{perf.topic}\" -> "
              f"acc={accuracy:.1f}% attempted={attempted} correct={correct} "
              f"sessions={sessions} status={perf.status}")

db.commit()
db.close()
print(f"\n✅ Repaired {repaired} of {len(broken_perfs)} records")
