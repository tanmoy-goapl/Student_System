import sys
import os
import random
import string
import sqlite3

# Add Backend to path so we can import from database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User
from classroom_models import Classroom, StudentClass
from practice_models import TopicPerformance, UserPerformance, QuizHistory
from seed_analytics import seed_analytics_data

def generate_class_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def run_migration():
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "student_system.db")
    
    # 1. Alter schema
    print("Checking for course_code column...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE classrooms ADD COLUMN course_code VARCHAR")
        conn.commit()
        print("Added course_code column to classrooms table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("course_code column already exists.")
        else:
            print("Error altering table:", e)
    finally:
        conn.close()

    db = SessionLocal()
    try:
        # 2. Fix existing class codes
        classrooms = db.query(Classroom).all()
        for c in classrooms:
            if not c.course_code:
                if "Machine learning" in c.name:
                    c.course_code = "ML101"
                    if c.code == "ML101":
                        c.code = generate_class_code()
                elif "AI" in c.name:
                    c.course_code = "AI102"
                    if c.code == "AI102":
                        c.code = generate_class_code()
                elif "Operating system" in c.name or "OS" in c.name:
                    c.course_code = "OS103"
                    if c.code == "OS103":
                        c.code = generate_class_code()
                elif "DSA" in c.name.upper():
                    c.course_code = "DSA104"
                elif "CN" in c.name.upper() or "NETWORK" in c.name.upper():
                    c.course_code = "CN105"
                else:
                    # Default fallback
                    c.course_code = f"CS{random.randint(100, 999)}"
                print(f"Updated {c.name}: course_code={c.course_code}, code={c.code}")
        
        db.commit()

        # 3. Seed students for empty classes
        all_students = db.query(User).filter(User.role == "student").all()
        if not all_students:
            print("No students found to seed!")
            return

        for c in classrooms:
            enrolled = db.query(StudentClass).filter(StudentClass.class_id == c.id).count()
            if enrolled == 0:
                print(f"Class {c.name} has 0 students. Seeding...")
                # Pick 5 random students
                selected = random.sample(all_students, min(5, len(all_students)))
                for s in selected:
                    sc = StudentClass(student_id=s.id, class_id=c.id)
                    db.add(sc)
                    
                    # Also seed basic performance
                    perf = db.query(UserPerformance).filter(UserPerformance.student_id == s.id).first()
                    if not perf:
                        perf = UserPerformance(
                            student_id=s.id,
                            total_quizzes_taken=random.randint(5, 15),
                            average_score=random.uniform(60, 95),
                            weak_areas="None",
                            strong_areas="None"
                        )
                        db.add(perf)
                    
                    # Generate some random quiz history for this class
                    topics = ["Intro", "Basics", "Advanced concepts"]
                    for _ in range(3):
                        qh = QuizHistory(
                            student_id=s.id,
                            topic=random.choice(topics) + f" ({c.name})",
                            score_percentage=random.randint(50, 100),
                            time_spent=random.randint(300, 1200)
                        )
                        db.add(qh)
                        
                        tp = TopicPerformance(
                            student_id=s.id,
                            topic=qh.topic,
                            accuracy=qh.score_percentage,
                            attempts=1,
                            mastery_level="Intermediate" if qh.score_percentage > 70 else "Beginner"
                        )
                        db.add(tp)
                        
                db.commit()
                print(f"Seeded students for {c.name}!")
                
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
