from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# ─────────────────────────────────────────────
# User Goal Model
# ─────────────────────────────────────────────
class UserGoal(Base):
    __tablename__ = "user_goals"

    id          = Column(Integer, primary_key=True, index=True)
    student_id  = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_type   = Column(String, nullable=False) # e.g., "semester_exam", "internship", "weak_subject", "custom"
    title       = Column(String, nullable=False) # e.g., "Crack Full-Stack Internship"
    description = Column(Text, nullable=True)
    deadline    = Column(DateTime, nullable=True)
    status      = Column(String, default="active") # active, completed, abandoned
    created_at  = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("User", backref="goals")

# ─────────────────────────────────────────────
# Learning Roadmap Model
# ─────────────────────────────────────────────
class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"

    id               = Column(Integer, primary_key=True, index=True)
    student_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_id          = Column(Integer, ForeignKey("user_goals.id"), nullable=False, index=True)
    title            = Column(String, nullable=False)
    overall_progress = Column(Float, default=0.0)
    roadmap_data     = Column(JSON, nullable=True) # JSON storing week-by-week structure
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="roadmaps")
    goal    = relationship("UserGoal", backref="roadmaps")

# ─────────────────────────────────────────────
# Daily Task Model
# ─────────────────────────────────────────────
class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id            = Column(Integer, primary_key=True, index=True)
    roadmap_id    = Column(Integer, ForeignKey("learning_roadmaps.id"), nullable=False, index=True)
    task_type     = Column(String, nullable=False) # "learning" or "quiz"
    topic         = Column(String, nullable=False)
    description   = Column(Text, nullable=True)
    status        = Column(String, default="pending") # "pending", "completed"
    assigned_date = Column(DateTime, nullable=False)
    completed_at  = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    
    # New fields for weekly tracking
    week_number   = Column(Integer, default=1, nullable=True)
    day_number    = Column(Integer, nullable=True)
    subtopics     = Column(JSON, nullable=True)

    # Relationships
    roadmap = relationship("LearningRoadmap", backref="daily_tasks")
