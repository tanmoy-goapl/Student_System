import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "Backend"))

from Backend.database import SessionLocal
from Backend.practice_models import TopicPerformance

db = SessionLocal()
perfs = db.query(TopicPerformance).all()
for p in perfs:
    print(f"ID: {p.id}, Student: {p.student_id}, Subject: '{p.subject}', Topic: '{p.topic}', Accuracy: {p.accuracy}")
db.close()
