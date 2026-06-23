import os
import sys
import json

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "Backend"))

from Backend.database import SessionLocal
from Backend.practice_models import TopicPerformance
from Backend.models import User  # Required for SQLAlchemy relationship resolution

db = SessionLocal()
perfs = db.query(TopicPerformance).all()

# Load curriculum
config_path = os.path.join(os.path.dirname(__file__), "Backend", "config", "default_curriculum.json")
with open(config_path, "r") as f:
    curriculum_data = json.load(f)

fixed = 0
for p in perfs:
    found_subject = None
    
    # Check subject_topics.json first
    subject_topics_path = os.path.join(os.path.dirname(__file__), "Backend", "config", "subject_topics.json")
    if os.path.exists(subject_topics_path):
        with open(subject_topics_path, "r") as f:
            subject_topics = json.load(f)
        for subj_name, topics_list in subject_topics.items():
            if p.topic in topics_list:
                found_subject = subj_name
                break

    # If not found, check default_curriculum.json
    if not found_subject:
        for sem in curriculum_data.get("semesters", []):
            for subj_name, topics_list in sem.get("subjects", {}).items():
                if p.topic in topics_list:
                    found_subject = subj_name
                    break
    
    if found_subject and p.subject != found_subject:
        print(f"Fixing topic '{p.topic}': Subject '{p.subject}' -> '{found_subject}'")
        p.subject = found_subject
        fixed += 1

db.commit()
print(f"Successfully fixed {fixed} topic records in the database.")
db.close()
