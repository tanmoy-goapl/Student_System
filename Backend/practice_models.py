"""
practice_models.py — SQLAlchemy models for the Adaptive Learning Engine
═══════════════════════════════════════════════════════════════════════════
Stores practice sessions, individual questions+answers, per-topic
performance aggregates, and AI-detected behavioral insights.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Boolean,
    ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# ─────────────────────────────────────────────
# Practice Session
# ─────────────────────────────────────────────
class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id              = Column(Integer, primary_key=True, index=True)
    student_id      = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mode            = Column(String, nullable=False, default="topic")      # topic | weakness | exam | revision
    topic           = Column(String, nullable=True)                        # selected topic (null for exam/weakness)
    difficulty      = Column(String, nullable=False, default="mixed")      # easy | medium | hard | mixed
    total_questions = Column(Integer, default=0)
    correct_count   = Column(Integer, default=0)
    started_at      = Column(DateTime, default=datetime.utcnow)
    ended_at        = Column(DateTime, nullable=True)
    is_active       = Column(Boolean, default=True)

    # Relationships
    student   = relationship("User", backref="practice_sessions")
    questions = relationship("PracticeQuestion", back_populates="session", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# Practice Question (individual question + answer)
# ─────────────────────────────────────────────
class PracticeQuestion(Base):
    __tablename__ = "practice_questions"

    id                 = Column(Integer, primary_key=True, index=True)
    session_id         = Column(Integer, ForeignKey("practice_sessions.id"), nullable=False, index=True)
    topic              = Column(String, nullable=False)
    subtopic           = Column(String, nullable=True)
    difficulty         = Column(String, nullable=False, default="medium")   # easy | medium | hard
    question_text      = Column(Text, nullable=False)
    options            = Column(JSON, nullable=False)                       # [{"id":"A","text":"..."},...]
    correct_answer     = Column(String, nullable=False)                    # "A", "B", "C", or "D"
    explanation        = Column(Text, nullable=True)
    student_answer     = Column(String, nullable=True)                     # null until answered
    is_correct         = Column(Boolean, nullable=True)                    # null until answered
    time_spent_seconds = Column(Integer, nullable=True)
    answered_at        = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("PracticeSession", back_populates="questions")


# ─────────────────────────────────────────────
# Topic Performance (aggregated per-topic stats)
# ─────────────────────────────────────────────
class TopicPerformance(Base):
    __tablename__ = "topic_performance"

    id               = Column(Integer, primary_key=True, index=True)
    student_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject          = Column(String, nullable=True)
    topic            = Column(String, nullable=False)
    total_attempts   = Column(Integer, default=0)
    correct_count    = Column(Integer, default=0)
    accuracy         = Column(Float, default=0.0)                          # 0.0 – 100.0
    current_difficulty = Column(String, default="medium")                   # easy | medium | hard
    mastery_level    = Column(String, default="weak")                      # weak | medium | strong
    last_practiced   = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("User", backref="topic_performances")


# ─────────────────────────────────────────────
# Behavioral Insight (AI-detected mistake patterns)
# ─────────────────────────────────────────────
class BehavioralInsight(Base):
    __tablename__ = "behavioral_insights"

    id            = Column(Integer, primary_key=True, index=True)
    student_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    insight_type  = Column(String, nullable=False)    # conceptual_gap | formula_misuse | guessing | time_pressure | repeated_error
    title         = Column(String, nullable=False)
    description   = Column(Text, nullable=True)
    frequency     = Column(Integer, default=1)
    detected_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="behavioral_insights")
