import sys
import logging
from database import SessionLocal
from services.practice_engine import extract_topics_from_documents
from practice_models import CustomTopic, TopicPerformance

# Set up logging to stdout
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chatbot")
handler = logging.StreamHandler(sys.stdout)
logger.addHandler(handler)

db = SessionLocal()
try:
    print("Pre-existing CustomTopics for student 3:")
    cts = db.query(CustomTopic).filter(CustomTopic.student_id == 3).all()
    for ct in cts:
        print(f"  - Topic: {ct.topic_name}, Subject: {ct.subject_name}")

    print("\nRunning extract_topics_from_documents for student 3:")
    res = extract_topics_from_documents(3, db)
    print("Result:", res)

    print("\nPost CustomTopics for student 3:")
    cts = db.query(CustomTopic).filter(CustomTopic.student_id == 3).all()
    for ct in cts:
        print(f"  - Topic: {ct.topic_name}, Subject: {ct.subject_name}")

    print("\nPost TopicPerformance for student 3:")
    tps = db.query(TopicPerformance).filter(TopicPerformance.student_id == 3).all()
    for tp in tps:
        print(f"  - Topic: {tp.topic}, Status: {tp.status}")

finally:
    db.close()
