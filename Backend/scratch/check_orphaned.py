import sys
import os
from sqlalchemy.orm import Session

# Add Backend to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
# Import all database models to populate SQLAlchemy registry
from classroom_models import Classroom, StudentClass
from practice_models import PracticeSession
from roadmap_models import LearningRoadmap
from models import Document, User

def delete_orphaned_files():
    db = SessionLocal()
    try:
        # Get all file paths registered in the database
        db_paths = {os.path.abspath(doc.file_path) for doc in db.query(Document).all() if doc.file_path}
        
        upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
        if not os.path.exists(upload_dir):
            print(f"Uploads directory '{upload_dir}' does not exist.")
            return

        disk_files = [os.path.join(upload_dir, f) for f in os.listdir(upload_dir) if os.path.isfile(os.path.join(upload_dir, f))]
        
        print(f"Checking {len(disk_files)} files in uploads/ folder...")
        deleted_count = 0
        for file_path in disk_files:
            abs_path = os.path.abspath(file_path)
            if abs_path not in db_paths:
                try:
                    os.remove(file_path)
                    print(f"Deleted orphaned file: {os.path.basename(file_path)}")
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting {os.path.basename(file_path)}: {e}")

        print("-" * 60)
        print(f"Successfully cleaned up {deleted_count} orphaned files from disk.")
            
    finally:
        db.close()

if __name__ == "__main__":
    delete_orphaned_files()
