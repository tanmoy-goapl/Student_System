import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from classroom_models import Classroom, StudentClass
from models import User

db = SessionLocal()
try:
    print("--- Classrooms ---")
    classrooms = db.query(Classroom).all()
    for c in classrooms:
        print(f"Classroom ID: {c.id}, Name: {c.name}, Code: {c.code}, Prof ID: {c.professor_id}")

    print("\n--- Student Enrolled Classes (Student ID = 1) ---")
    enrolled = db.query(StudentClass).filter(StudentClass.student_id == 1).all()
    for e in enrolled:
        print(f"Enrollment ID: {e.id}, Student ID: {e.student_id}, Classroom ID: {e.class_id}, Class Name: {e.classroom.name}")
finally:
    db.close()
