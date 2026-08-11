import os
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import ALLOWED_ORIGINS
from routes import auth, upload, chat, settings, performance, admin
from routes import homepage, career, practice, learning, documents, chat_sidebar, roadmap, courses, analytics, professor, classroom
from database import init_db
import sqlite3

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Safe migration helper using individual sessions
    from database import SessionLocal
    from sqlalchemy import text
    
    def run_sql(stmt: str):
        db = SessionLocal()
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    # 1. Classrooms migrations
    run_sql("ALTER TABLE classrooms ADD COLUMN course_code VARCHAR")

    # 1b. Documents metadata migrations
    run_sql("ALTER TABLE documents ADD COLUMN document_type VARCHAR")
    run_sql("ALTER TABLE documents ADD COLUMN owner_role VARCHAR")
    run_sql("ALTER TABLE documents ADD COLUMN visibility VARCHAR")
    run_sql("ALTER TABLE documents ADD COLUMN tags_json VARCHAR")
    run_sql("ALTER TABLE documents ADD COLUMN classroom_id INTEGER")

    # Backfill migration for existing documents with NULL document_type
    run_sql("UPDATE documents SET document_type = 'resume' WHERE document_type IS NULL AND (filename LIKE '%resume%' OR filename LIKE '%cv%' OR filename LIKE '%CV%')")
    run_sql("UPDATE documents SET document_type = 'marksheet' WHERE document_type IS NULL AND (filename LIKE '%marksheet%' OR filename LIKE '%grade%' OR filename LIKE '%transcript%' OR filename LIKE '%marks%')")
    run_sql("UPDATE documents SET document_type = 'policy' WHERE document_type IS NULL AND (filename LIKE '%policy%' OR filename LIKE '%handbook%')")
    run_sql("UPDATE documents SET document_type = 'syllabus' WHERE document_type IS NULL AND filename LIKE '%syllabus%'")
    run_sql("UPDATE documents SET document_type = 'notes' WHERE document_type IS NULL AND (filename LIKE '%notes%' OR filename LIKE '%lecture%' OR filename LIKE '%slide%')")
    run_sql("UPDATE documents SET document_type = 'general' WHERE document_type IS NULL")

    # 2. Practice sessions migrations
    run_sql("ALTER TABLE practice_sessions RENAME COLUMN total_questions TO question_count")
    run_sql("ALTER TABLE practice_sessions ADD COLUMN question_count INTEGER DEFAULT 0")
    run_sql("ALTER TABLE practice_sessions ADD COLUMN correct_answers INTEGER DEFAULT 0")
    run_sql("ALTER TABLE practice_sessions ADD COLUMN accuracy FLOAT DEFAULT 0.0")
    run_sql("ALTER TABLE practice_sessions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    run_sql("ALTER TABLE practice_sessions ADD COLUMN ended_at TIMESTAMP")
    run_sql("ALTER TABLE practice_sessions ADD COLUMN is_active BOOLEAN DEFAULT TRUE")

    # 3. Practice questions migrations
    run_sql("ALTER TABLE practice_questions ADD COLUMN student_answer VARCHAR")
    run_sql("ALTER TABLE practice_questions ADD COLUMN is_correct BOOLEAN")
    run_sql("ALTER TABLE practice_questions ADD COLUMN time_spent_seconds INTEGER")
    run_sql("ALTER TABLE practice_questions ADD COLUMN answered_at TIMESTAMP")
    run_sql("ALTER TABLE practice_questions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    # 4. Topic performance migrations
    run_sql("ALTER TABLE topic_performance RENAME COLUMN total_attempts TO sessions")
    run_sql("ALTER TABLE topic_performance ADD COLUMN sessions INTEGER DEFAULT 0")
    run_sql("ALTER TABLE topic_performance RENAME COLUMN mastery_level TO status")
    run_sql("ALTER TABLE topic_performance ADD COLUMN status VARCHAR DEFAULT 'NOT_STARTED'")
    run_sql("ALTER TABLE topic_performance ADD COLUMN questions_attempted INTEGER DEFAULT 0")
    run_sql("ALTER TABLE topic_performance ADD COLUMN correct_answers INTEGER DEFAULT 0")
    run_sql("ALTER TABLE topic_performance ADD COLUMN last_practiced_at TIMESTAMP")
    run_sql("UPDATE topic_performance SET status = 'NOT_STARTED' WHERE status IS NULL OR status = 'basic'")

    # 5. Course codes update
    run_sql("UPDATE classrooms SET course_code = 'ML101' WHERE name ILIKE '%Machine learning%' AND course_code IS NULL")
    run_sql("UPDATE classrooms SET course_code = 'AI102' WHERE name ILIKE '%AI%' AND course_code IS NULL")
    run_sql("UPDATE classrooms SET course_code = 'OS103' WHERE (name ILIKE '%Operating system%' OR name ILIKE '%OS%') AND course_code IS NULL")
    run_sql("UPDATE classrooms SET course_code = 'DSA104' WHERE name ILIKE '%DSA%' AND course_code IS NULL")
    run_sql("UPDATE classrooms SET course_code = 'CN105' WHERE (name ILIKE '%CN%' OR name ILIKE '%NETWORK%') AND course_code IS NULL")
    run_sql("UPDATE classrooms SET course_code = 'CS' || FLOOR(RANDOM() * 900 + 100)::INT::VARCHAR WHERE course_code IS NULL")
        
    try:
        db = SessionLocal()
        from models import User
        from classroom_models import Classroom, StudentClass, ClassCurriculum
        from practice_models import UserPerformance, QuizHistory, TopicPerformance
        from passlib.hash import bcrypt
        import random
        
        REAL_NAMES = [
            "Aarav Roy", "Aditya Nair", "Priya Iyer", "Sneha Reddy", "Vikram Malhotra",
            "Ananya Sen", "Aditya Joshi", "Divya Nair", "Rohan Gupta", "Neha Verma",
            "Sanjay Rao", "Kirti Kapoor", "Arjun Singh", "Tanvi Bhatia", "Rishi Mehta",
            "Neha Gupta", "Deepak Kumar", "Shalini Mishra", "Karan Johar", "Isha Chawla",
            "Kabir Shah", "Myra Gill", "Ishaan Dutta", "Diya Pillai", "Aryan Bose",
            "Kiara Saxena", "Vivaan Desai", "Anika Choudhury", "Kabir Lal", "Aanya Sodhi"
        ]
        
        # First, clean up and rename any existing students in the database
        existing_students = db.query(User).filter(User.role == "student").all()
        for s in existing_students:
            if not s.name:
                continue
            # Rename if it is an old mock student name
            if "Mock Student" in s.name:
                name_idx = s.id % len(REAL_NAMES)
                s.name = REAL_NAMES[name_idx]
            # Strip out any brackets or parentheses (e.g. "(GDVDEA)")
            if "(" in s.name:
                s.name = s.name.split("(")[0].strip()
        db.commit()

        # Ensure all student profiles matching "Amir" or "Priya" are enrolled in all classrooms
        matching_students = db.query(User).filter(
            (User.name.ilike("%amir%") | User.name.ilike("%priya%")),
            User.role == "student"
        ).all()

        # If none exist, create defaults
        has_amir = any(s.email == "amir@example.com" for s in matching_students)
        has_priya = any(s.email == "priya@example.com" for s in matching_students)

        if not has_amir:
            amir = User(
                name="Amir",
                email="amir@example.com",
                role="student",
                password_hash=bcrypt.hash("student123"),
                is_active=True
            )
            db.add(amir)
            db.commit()
            db.refresh(amir)
            matching_students.append(amir)

        if not has_priya:
            priya = User(
                name="Priya",
                email="priya@example.com",
                role="student",
                password_hash=bcrypt.hash("student123"),
                is_active=True
            )
            db.add(priya)
            db.commit()
            db.refresh(priya)
            matching_students.append(priya)

        # Cleanup duplicate Amir/Priya users that don't match the standard emails
        duplicates = db.query(User).filter(
            User.role == "student",
            (User.name == "Amir") | (User.name == "Priya")
        ).all()
        for d in duplicates:
            if d.email not in ["amir@example.com", "priya@example.com"]:
                db.query(StudentClass).filter(StudentClass.student_id == d.id).delete()
                db.query(UserPerformance).filter(UserPerformance.student_id == d.id).delete()
                db.query(TopicPerformance).filter(TopicPerformance.student_id == d.id).delete()
                db.query(QuizHistory).filter(QuizHistory.student_id == d.id).delete()
                db.delete(d)
        db.commit()

        # Re-fetch matching students to only include non-mock, real profiles for all-classroom enrollment
        real_matching_students = db.query(User).filter(
            User.role == "student",
            User.email.in_(["amir@example.com", "priya@example.com"])
        ).all()

        classrooms = db.query(Classroom).all()
        for c in classrooms:
            for s in real_matching_students:
                sc = db.query(StudentClass).filter_by(student_id=s.id, class_id=c.id).first()
                if not sc:
                    db.add(StudentClass(student_id=s.id, class_id=c.id))
        db.commit()

        # Cleanup mock student cross-enrollments (ensure mock students are only enrolled in their original class)
        all_enrollments = db.query(StudentClass).all()
        for enrollment in all_enrollments:
            student = db.query(User).filter(User.id == enrollment.student_id).first()
            if student and student.role == "student" and "_" in student.email:
                parts = student.email.split("@")[0].split("_")
                if len(parts) >= 2:
                    try:
                        orig_class_id = int(parts[-2])
                        if enrollment.class_id != orig_class_id:
                            db.delete(enrollment)
                    except ValueError:
                        pass
        db.commit()

        # Delete all mock/universal shared documents from database
        from models import Document
        db.query(Document).filter(Document.visibility != "private").delete()
        db.commit()

        classrooms = db.query(Classroom).all()
        for c in classrooms:
            enrolled_count = db.query(StudentClass).filter(StudentClass.class_id == c.id).count()
            if enrolled_count < 8:
                name_lower = c.name.lower()
                if "operating" in name_lower or "os" in name_lower:
                    topics = ["Deadlocks", "Process Scheduling", "Memory Management", "File Systems", "Virtual Memory", "Concurrency"]
                    subject = "Operating Systems"
                elif "dsa" in name_lower or "structure" in name_lower or "algorithm" in name_lower:
                    topics = ["Arrays", "Linked Lists", "Trees", "Graphs", "Sorting", "Stacks & Queues"]
                    subject = "Data Structures and Algorithms"
                elif "network" in name_lower or "cn" in name_lower:
                    topics = ["IP Addressing", "TCP/IP Model", "Routing Protocols", "DNS & DHCP", "HTTP & HTTPS", "Network Security"]
                    subject = "Computer Networks"
                elif "ml" in name_lower or "machine" in name_lower:
                    topics = ["Regression", "Classification", "Neural Networks", "Clustering", "Decision Trees", "Feature Engineering"]
                    subject = "Machine Learning"
                elif "ai" in name_lower or "artificial" in name_lower:
                    topics = ["Search Algorithms", "Knowledge Representation", "NLP", "Computer Vision", "Expert Systems", "Reinforcement Learning"]
                    subject = "Artificial Intelligence"
                else:
                    topics = ["Introduction", "Core Concepts", "Advanced Methods", "Applications", "Future Trends"]
                    subject = c.name

                for i in range(1, 11):
                    name_idx = (c.id * 10 + i) % len(REAL_NAMES)
                    student_name = REAL_NAMES[name_idx]
                    email = f"{REAL_NAMES[name_idx].lower().replace(' ', '')}_{c.id}_{i}@example.com"
                    
                    student = db.query(User).filter(User.email == email).first()
                    if not student:
                        student = User(
                            name=student_name,
                            email=email,
                            role="student",
                            password_hash=bcrypt.hash("student123"),
                            is_active=True,
                            created_at=datetime.utcnow() - timedelta(days=random.randint(10, 40))
                        )
                        db.add(student)
                        db.commit()
                        db.refresh(student)
                    
                    enrollment = db.query(StudentClass).filter(
                        StudentClass.student_id == student.id,
                        StudentClass.class_id == c.id
                    ).first()
                    if not enrollment:
                        db.add(StudentClass(student_id=student.id, class_id=c.id))
                    
                    is_at_risk = i <= 2
                    is_excellent = i >= 8
                    
                    avg_acc = random.uniform(30, 49) if is_at_risk else (random.uniform(85, 98) if is_excellent else random.uniform(50, 80))
                    num_topics = random.randint(1, 2) if is_at_risk else random.randint(3, 6)
                    
                    perf = db.query(UserPerformance).filter(UserPerformance.student_id == student.id).first()
                    if not perf:
                        perf = UserPerformance(
                            student_id=student.id,
                            total_questions_attempted=num_topics * 10,
                            total_correct_answers=int((num_topics * 10) * (avg_acc / 100)),
                            lifetime_accuracy=avg_acc,
                            topics_covered=num_topics,
                            current_streak=random.randint(0, 1) if is_at_risk else random.randint(2, 10),
                            last_practiced=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                        )
                        db.add(perf)
                    
                    for t_idx in range(min(num_topics, len(topics))):
                        topic = topics[t_idx]
                        t_perf = db.query(TopicPerformance).filter(
                            TopicPerformance.student_id == student.id,
                            TopicPerformance.topic == topic
                        ).first()
                        if not t_perf:
                            db.add(TopicPerformance(
                                student_id=student.id,
                                subject=subject,
                                topic=topic,
                                sessions=random.randint(1, 5),
                                questions_attempted=random.randint(5, 50),
                                accuracy=avg_acc + random.uniform(-10, 10),
                                last_practiced_at=datetime.utcnow() - timedelta(days=random.randint(0, 10))
                            ))
                    
                    for _ in range(random.randint(1, 3)):
                        db.add(QuizHistory(
                            student_id=student.id,
                            topic=random.choice(topics[:min(num_topics, len(topics))]),
                            questions_attempted=10,
                            score_percentage=avg_acc + random.uniform(-15, 15),
                            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                        ))
                db.commit()
    except Exception as e:
        db.rollback()
        print("Seeding error:", e)
    finally:
        db.close()
    
    # Auto-seed RAG institutional knowledge base if empty
    try:
        # Temporary zip file inspection
        import zipfile
        zip_path = "/home/galaxy/Desktop/Student_System/mentorai-documents.zip"
        log_path = "uploads/extract_log.txt"
        with open(log_path, "w") as log_f:
            if os.path.exists(zip_path):
                log_f.write(f"Zip file found: {zip_path}\n")
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    log_f.write("Files in zip:\n")
                    for name in zf.namelist():
                        log_f.write(f" - {name}\n")
            else:
                log_f.write(f"Zip file not found: {zip_path}\n")
        
        # pyrefly: ignore [missing-import]
        from seed_kb import seed_knowledge_base
        seed_knowledge_base()
    except Exception as seed_err:
        print("Lifespan seeding warning:", seed_err)

    yield


app = FastAPI(
    title="Student System API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     tags=["auth"])
app.include_router(documents.router, tags=["documents"])
app.include_router(upload.router,   tags=["upload"])
app.include_router(chat.router,     tags=["chat"])
app.include_router(settings.router, tags=["settings"])
app.include_router(performance.router, tags=["performance"])
app.include_router(homepage.router, tags=["homepage"])
app.include_router(career.router, tags=["career"])
app.include_router(practice.router, tags=["practice"])
app.include_router(learning.router, tags=["learning"])
app.include_router(chat_sidebar.router, tags=["chat-sidebar"])
app.include_router(roadmap.router, tags=["roadmap"])
app.include_router(courses.router, tags=["courses"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(professor.router, tags=["professor"])
app.include_router(classroom.router, tags=["classroom"])
app.include_router(admin.router,     tags=["admin"])


@app.get("/")
def root():
    return {"message": "Student System API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/force-seed-db")
def force_seed_db_endpoint():
    from database import SessionLocal
    from models import User
    from classroom_models import Classroom, StudentClass, ClassCurriculum
    from practice_models import TopicPerformance, UserPerformance, QuizHistory, PracticeSession, PracticeQuestion
    from datetime import datetime, timedelta
    import random
    import json

    
    db = SessionLocal()
    results = []
    try:
        classrooms = db.query(Classroom).all()
        for classroom in classrooms:
            student_classes = db.query(StudentClass).filter(StudentClass.class_id == classroom.id).all()
            student_ids = [sc.student_id for sc in student_classes]
            students = db.query(User).filter(User.id.in_(student_ids)).all()
            
            curriculum = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == classroom.id).first()
            topics = []
            if curriculum and curriculum.curriculum_json:
                if "units" in curriculum.curriculum_json:
                    for unit in curriculum.curriculum_json["units"]:
                        topics.extend(unit.get("topics", []))
                elif "semesters" in curriculum.curriculum_json:
                    for sem in curriculum.curriculum_json["semesters"]:
                        for course in sem.get("courses", []):
                            topics.extend(course.get("topics", []))
            if not topics:
                topics = ["Introduction", "Core Concepts", "Advanced Application", "Final Review"]
                
            for student in students:
                if student.role != "student":
                    continue
                
                # Force delete old performance to rewrite fresh real-looking data
                db.query(UserPerformance).filter(UserPerformance.student_id == student.id).delete()
                db.query(TopicPerformance).filter(TopicPerformance.student_id == student.id).delete()
                db.query(QuizHistory).filter(QuizHistory.student_id == student.id).delete()
                
                # Delete associated questions first to avoid FK constraint errors on delete session
                session_ids = [s.id for s in db.query(PracticeSession).filter(PracticeSession.student_id == student.id).all()]
                if session_ids:
                    db.query(PracticeQuestion).filter(PracticeQuestion.session_id.in_(session_ids)).delete(synchronize_session=False)
                
                db.query(PracticeSession).filter(PracticeSession.student_id == student.id).delete()
                db.flush()
                
                perf = UserPerformance(student_id=student.id)
                db.add(perf)
                
                # Choose a student archetype for realistic data distribution
                archetype = random.choice(["excellent", "average", "average", "average", "struggling"])
                if archetype == "excellent":
                    accuracy_base = random.randint(85, 96)
                    practiced_ratio = random.uniform(0.6, 0.9)
                elif archetype == "struggling":
                    accuracy_base = random.randint(35, 48)
                    practiced_ratio = random.uniform(0.15, 0.3)
                else:
                    accuracy_base = random.randint(60, 78)
                    practiced_ratio = random.uniform(0.3, 0.6)

                total_q = random.randint(25, 60)
                correct_q = int(total_q * (accuracy_base / 100.0))
                
                perf.total_questions_attempted = total_q
                perf.total_correct_answers = correct_q
                perf.lifetime_accuracy = round((correct_q / total_q) * 100, 1) if total_q > 0 else 0.0
                perf.total_points = correct_q * 10
                
                # Determine how many topics they practiced
                practiced_count = max(1, int(len(topics) * practiced_ratio))
                perf.topics_covered = practiced_count
                
                perf.badges_earned = random.randint(1, 4) if archetype != "struggling" else 0
                perf.current_streak = random.randint(3, 7) if archetype == "excellent" else random.randint(0, 3)
                perf.longest_streak = max(perf.current_streak, random.randint(4, 10))
                perf.total_time_seconds = total_q * random.randint(35, 80)
                perf.last_practiced = datetime.utcnow() - timedelta(days=random.randint(0, 5))
                
                practiced_topics = random.sample(topics, practiced_count)

                
                for topic in topics:
                    if topic in practiced_topics:
                        tp = TopicPerformance(
                            student_id=student.id,
                            topic=topic,
                            subject=classroom.name,
                            sessions=random.randint(1, 4),
                            questions_attempted=random.randint(5, 20)
                        )
                        topic_acc = accuracy_base + random.randint(-12, 8)
                        topic_acc = max(15.0, min(100.0, topic_acc))
                        tp.correct_answers = int(tp.questions_attempted * (topic_acc / 100.0))
                        tp.accuracy = round((tp.correct_answers / tp.questions_attempted) * 100, 1)
                        tp.current_difficulty = random.choice(["easy", "medium", "hard"])
                        
                        if tp.accuracy >= 75:
                            tp.status = "STRONG"
                        elif tp.accuracy >= 55:
                            tp.status = "LEARNING"
                        else:
                            tp.status = "WEAK"
                            
                        tp.last_practiced_at = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
                        db.add(tp)
                        
                        session = PracticeSession(
                            student_id=student.id,
                            mode="topic",
                            topic=topic,
                            difficulty=tp.current_difficulty,
                            question_count=5,
                            correct_answers=tp.correct_answers % 6,
                            accuracy=round(((tp.correct_answers % 6) / 5) * 100, 1),
                            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 4)),
                            ended_at=datetime.utcnow(),
                            is_active=False
                        )
                        db.add(session)
                        db.flush()
                        
                        quiz = QuizHistory(
                            student_id=student.id,
                            session_id=session.id,
                            topic=topic,
                            score_percentage=session.accuracy,
                            created_at=session.created_at
                        )
                        db.add(quiz)
                    else:
                        tp = TopicPerformance(
                            student_id=student.id,
                            topic=topic,
                            subject=classroom.name,
                            status="NOT_STARTED"
                        )
                        db.add(tp)
                
                results.append(f"Seeded student {student.name} for class {classroom.name}")
            
        # Seed global question bank cache for all topics to make quiz generation instant
        from practice_models import AICache
        all_unique_topics = set()
        for classroom in classrooms:
            curriculum = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == classroom.id).first()
            if curriculum and curriculum.curriculum_json:
                if "units" in curriculum.curriculum_json:
                    for unit in curriculum.curriculum_json["units"]:
                        all_unique_topics.update(unit.get("topics", []))
                elif "semesters" in curriculum.curriculum_json:
                    for sem in curriculum.curriculum_json["semesters"]:
                        for course in sem.get("courses", []):
                            all_unique_topics.update(course.get("topics", []))

        # Clear existing global topic caches and student revision action caches to reload new format
        db.query(AICache).filter(AICache.student_id == 0, AICache.action_type == "master_question_bank").delete()
        db.query(AICache).filter(AICache.action_type.in_(["explain", "examples", "flashcard"])).delete()

        
        for topic in all_unique_topics:
            mock_bank = {
                "easy": [],
                "medium": [],
                "hard": [],
                "is_initial": False
            }
            difficulties = ["easy", "medium", "hard"]
            q_index = 1
            for diff in difficulties:
                for i in range(1, 11):
                    mock_bank[diff].append({
                        "topic": topic,
                        "subtopic": f"Section {i}",
                        "difficulty": diff,
                        "question": f"Practice Question {q_index}: Which of the following is a key element of {topic}?",
                        "options": [
                            {"id": "A", "text": f"Option A: Core definition of {topic}"},
                            {"id": "B", "text": "Option B: Secondary component"},
                            {"id": "C", "text": "Option C: Unrelated detail"},
                            {"id": "D", "text": "Option D: None of the above"}
                        ],
                        "correct_answer": "A",
                        "explanation": f"Option A is correct because it matches the core definition of {topic}."
                    })
                    q_index += 1
            
            db.add(AICache(
                student_id=0,
                topic=topic,
                action_type="master_question_bank",
                content=json.dumps(mock_bank)
            ))
        db.flush()
        
        db.commit()
        return {"status": "success", "seeded": results}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@app.get("/test-analytics/{class_id}")
def test_analytics_endpoint(class_id: int):
    from database import SessionLocal
    from classroom_models import Classroom, ClassCurriculum, StudentClass
    from models import User
    from services.analytics_engine import get_predefined_topics, calculate_subject_metrics
    
    db = SessionLocal()
    try:
        classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
        if not classroom:
            return {"error": "Classroom not found"}
            
        curriculum = db.query(ClassCurriculum).filter(ClassCurriculum.class_id == class_id).first()
        subject_name = curriculum.subject_name if curriculum else f"Class {class_id}"
        
        student_classes = db.query(StudentClass).filter(StudentClass.class_id == class_id).all()
        student_ids = [sc.student_id for sc in student_classes]
        
        if not student_ids:
            return {"error": "No students enrolled"}
            
        student_id = student_ids[0]
        student = db.query(User).filter(User.id == student_id).first()
        
        predefined_topics = get_predefined_topics(student_id, subject_name, db)
        
        from practice_models import TopicPerformance
        performances = db.query(TopicPerformance).filter(
            TopicPerformance.student_id == student_id
        ).all()
        
        perf_topics_in_db = [p.topic for p in performances]
        
        metrics = calculate_subject_metrics(student_id, subject_name, db)
        
        return {
            "classroom_name": classroom.name,
            "subject_name": subject_name,
            "student_name": student.name,
            "predefined_topics": predefined_topics,
            "perf_topics_in_db": perf_topics_in_db,
            "metrics": metrics
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
 