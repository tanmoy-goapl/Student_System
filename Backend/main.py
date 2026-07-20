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


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
 