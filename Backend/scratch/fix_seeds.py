import sys
import os
from sqlalchemy.orm import Session

# Add Backend to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
# Import all database models to populate SQLAlchemy registry before mapping
from classroom_models import Classroom, StudentClass
from practice_models import PracticeSession
from roadmap_models import LearningRoadmap
from models import Document, User

def fix_metadata():
    db = SessionLocal()
    try:
        # Find default owners for roles if uploader doesn't match
        admin_user = db.query(User).filter(User.role == "admin").first()
        professor_user = db.query(User).filter(User.role == "professor").first()
        student_user = db.query(User).filter(User.role == "student").first()

        if not admin_user:
            print("Warning: No admin user found in database!")
        if not professor_user:
            print("Warning: No professor user found in database!")
        if not student_user:
            print("Warning: No student user found in database!")

        documents = db.query(Document).all()
        print(f"Loaded {len(documents)} documents to analyze and fix.")

        fixed_count = 0
        for doc in documents:
            filename = doc.filename.lower()
            
            # Determine correct role, visibility, and owner based on document name or current state
            new_visibility = None
            new_role = None
            new_owner_id = None

            # 1. Policies, regulations, placement reports, academic calendars -> universal / admin
            if any(k in filename for k in ["policy", "regulation", "placement", "calendar", "handbook", "rule"]):
                new_visibility = "universal"
                new_role = "admin"
                new_owner_id = admin_user.id if admin_user else doc.student_id

            # 2. Finance and internal administrative reports -> admin_shared / admin
            elif any(k in filename for k in ["finance", "budget", "internal", "admin_report", "salary_report"]):
                new_visibility = "admin_shared"
                new_role = "admin"
                new_owner_id = admin_user.id if admin_user else doc.student_id

            # 3. Lecture notes, assignments, study materials -> course_shared / professor
            elif any(k in filename for k in ["notes", "assignment", "lecture", "study", "material", "slide", "syllabus", "curriculum"]):
                new_visibility = "course_shared"
                new_role = "professor"
                new_owner_id = professor_user.id if professor_user else doc.student_id

            # 4. Resumes, marksheets, certificates -> private / student or professor
            elif any(k in filename for k in ["resume", "marksheet", "certificate", "cv", "transcript", "grade"]):
                new_visibility = "private"
                # Keep uploader role or default to student
                uploader = db.query(User).filter(User.id == doc.student_id).first()
                new_role = uploader.role if uploader else "student"
                new_owner_id = doc.student_id

            # Fallback based on uploader role
            else:
                uploader = db.query(User).filter(User.id == doc.student_id).first()
                if uploader:
                    new_role = uploader.role
                    new_owner_id = uploader.id
                    if uploader.role == "admin":
                        new_visibility = "admin_shared"
                    elif uploader.role == "professor":
                        new_visibility = "course_shared"
                    else:
                        new_visibility = "private"
                else:
                    new_role = "student"
                    new_owner_id = doc.student_id
                    new_visibility = "private"

            # Apply updates
            doc.visibility = new_visibility
            doc.owner_role = new_role
            doc.owner_id = new_owner_id
            fixed_count += 1
            print(f"Fixed: {doc.filename} -> visibility={new_visibility}, role={new_role}, owner_id={new_owner_id}")

        db.commit()
        print(f"Successfully committed changes for {fixed_count} documents.")

    except Exception as e:
        db.rollback()
        print(f"Error during metadata fix: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_metadata()
