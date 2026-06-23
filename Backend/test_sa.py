import sys
from sqlalchemy import create_engine, Column, Integer, String, func
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

class TopicPerformance(Base):
    __tablename__ = 'topic_performance'
    id = Column(Integer, primary_key=True)
    mastery_level = Column(String)

engine = create_engine('sqlite:///:memory:')
Session = sessionmaker(bind=engine)
session = Session()

try:
    results = session.query(
        TopicPerformance.mastery_level,
        func.count(TopicPerformance.id)
    ).group_by(TopicPerformance.mastery_level).all()
    print("Test 1 passed")
except Exception as e:
    print(f"Test 1 failed: {e}")

try:
    results = session.query(
        TopicPerformance.mastery_level,
        func.count()
    ).group_by(TopicPerformance.mastery_level).all()
    print("Test 2 passed")
except Exception as e:
    print(f"Test 2 failed: {e}")
    
try:
    results = session.query(
        TopicPerformance.mastery_level,
        func.count(1)
    ).group_by(TopicPerformance.mastery_level).all()
    print("Test 3 passed")
except Exception as e:
    print(f"Test 3 failed: {e}")
