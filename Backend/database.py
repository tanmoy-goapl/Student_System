from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import DATABASE_URL

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=3600
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def init_db():
    from models import User, Document, Department  # removed DocumentChunk
    from practice_models import (      # Adaptive Learning Engine tables
        PracticeSession, PracticeQuestion,
        TopicPerformance, BehavioralInsight, CustomTopic, LearningContent, UserNote
    )
    from roadmap_models import UserGoal, LearningRoadmap, DailyTask, LearnerPreferences
    from classroom_models import Classroom, StudentClass, ClassResource, ClassCurriculum
    Base.metadata.create_all(bind=engine)
    
    # Run automatic column migrations
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if "sqlite" in str(DATABASE_URL):
                conn.execute(text("PRAGMA journal_mode=WAL;"))
                conn.execute(text("PRAGMA synchronous=NORMAL;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS category VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS subject VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS pages INTEGER;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_format VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_id INTEGER;"))
            
            # DailyTask roadmap additions
            conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS day_number INTEGER;"))
            conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS subtopics JSON DEFAULT '[]';"))
            
            # LearningContent additions
            conn.execute(text("ALTER TABLE learning_content ADD COLUMN IF NOT EXISTS subject VARCHAR;"))
            
            # ChatMessage additions
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id VARCHAR;"))
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_title VARCHAR;"))
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS source_documents TEXT;"))
    except Exception as e:
        print("Database schema migration notice/error:", e)

    # Seed mock student data if needed
    try:
        from datetime import timedelta, datetime
        from models import User
        from classroom_models import Classroom, StudentClass, ClassCurriculum
        from practice_models import TopicPerformance, UserPerformance, QuizHistory, PracticeSession
        db = SessionLocal()
        # Find all classrooms
        classrooms = db.query(Classroom).all()
        for classroom in classrooms:
            # Find all student enrollments in this classroom
            student_classes = db.query(StudentClass).filter(StudentClass.class_id == classroom.id).all()
            student_ids = [sc.student_id for sc in student_classes]
            students = db.query(User).filter(User.id.in_(student_ids)).all()
            if not students:
                continue
                
            # Get curriculum topics
            curriculum = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == classroom.id).first()
            topics = []
            curriculum_data = (curriculum.curriculum_json or {}) if curriculum else {}
            if "semesters" in curriculum_data:
                for sem in curriculum_data["semesters"]:
                    for course in sem.get("courses", []):
                        topics.extend(course.get("topics", []))
            elif "units" in curriculum_data:
                for unit in curriculum_data["units"]:
                    topics.extend(unit.get("topics", []))
            if not topics:
                topics = ["Introduction", "Core Concepts", "Advanced Application", "Final Review"]
                
            import random
            for student in students:
                if student.role != "student":
                    continue
                
                # Check if this student already has some performance seeded to avoid duplicate runs
                existing_perf = db.query(UserPerformance).filter(UserPerformance.student_id == student.id).first()
                if existing_perf and existing_perf.total_questions_attempted > 0:
                    continue # Already seeded
                
                # 1. Lifetime User Performance
                if not existing_perf:
                    perf = UserPerformance(student_id=student.id)
                    db.add(perf)
                else:
                    perf = existing_perf
                
                total_q = random.randint(15, 45)
                is_math = "math" in classroom.name.lower()
                accuracy_base = random.randint(40, 58) if is_math else random.randint(65, 88)
                
                correct_q = int(total_q * (accuracy_base / 100.0))
                perf.total_questions_attempted = total_q
                perf.total_correct_answers = correct_q
                perf.lifetime_accuracy = round((correct_q / total_q) * 100, 1) if total_q > 0 else 0.0
                perf.total_points = correct_q * 10
                perf.topics_covered = random.randint(1, len(topics))
                perf.badges_earned = random.randint(0, 3)
                perf.current_streak = random.randint(1, 5)
                perf.longest_streak = max(perf.current_streak, random.randint(3, 8))
                perf.total_time_seconds = total_q * random.randint(30, 90)
                perf.last_practiced = datetime.utcnow() - timedelta(days=random.randint(0, 10))
                
                # 2. Topic Performance
                practiced_count = random.randint(1, len(topics))
                practiced_topics = random.sample(topics, practiced_count)
                
                for topic in topics:
                    tp = db.query(TopicPerformance).filter(
                        TopicPerformance.student_id == student.id,
                        TopicPerformance.topic == topic
                    ).first()
                    
                    if topic in practiced_topics:
                        if not tp:
                            tp = TopicPerformance(
                                student_id=student.id,
                                topic=topic,
                                subject=classroom.name
                            )
                            db.add(tp)
                        
                        tp.sessions = random.randint(1, 4)
                        tp.questions_attempted = tp.sessions * 5
                        topic_acc = accuracy_base + random.randint(-15, 10)
                        topic_acc = max(10.0, min(100.0, topic_acc))
                        tp.correct_answers = int(tp.questions_attempted * (topic_acc / 100.0))
                        tp.accuracy = round((tp.correct_answers / tp.questions_attempted) * 100, 1)
                        tp.current_difficulty = random.choice(["easy", "medium", "hard"])
                        
                        if tp.accuracy >= 75:
                            tp.status = "STRONG"
                        elif tp.accuracy >= 55:
                            tp.status = "LEARNING"
                        else:
                            tp.status = "WEAK"
                            
                        tp.last_practiced_at = datetime.utcnow() - timedelta(hours=random.randint(1, 100))
                        
                        # 3. Practice Session & Quiz History
                        quiz_correct = min(5, max(0, tp.correct_answers % 6))
                        session = PracticeSession(
                            student_id=student.id,
                            mode="topic",
                            topic=topic,
                            difficulty=tp.current_difficulty,
                            question_count=5,
                            correct_answers=quiz_correct,
                            accuracy=round((quiz_correct / 5) * 100, 1),
                            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 5)),
                            ended_at=datetime.utcnow(),
                            is_active=False
                        )
                        db.add(session)
                        db.flush()
                        
                        quiz = QuizHistory(
                            student_id=student.id,
                            session_id=session.id,
                            topic=topic,
                            questions_attempted=5,
                            correct_answers=quiz_correct,
                            score_percentage=session.accuracy,
                            points_earned=quiz_correct * 10,
                            time_spent=random.randint(90, 300),
                            created_at=session.created_at
                        )
                        db.add(quiz)
                    else:
                        if not tp:
                            tp = TopicPerformance(
                                student_id=student.id,
                                topic=topic,
                                subject=classroom.name,
                                status="NOT_STARTED"
                            )
                            db.add(tp)
        db.commit()
    except Exception as e:
        print("Database mock seeding error:", e)
    finally:
        db.close()


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
