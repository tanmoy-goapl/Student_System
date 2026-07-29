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
    question_count  = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    accuracy        = Column(Float, default=0.0)
    created_at      = Column(DateTime, default=datetime.utcnow)
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
    sessions         = Column(Integer, default=0)
    questions_attempted = Column(Integer, default=0)
    correct_answers  = Column(Integer, default=0)
    accuracy         = Column(Float, default=0.0)                          # 0.0 – 100.0
    current_difficulty = Column(String, default="medium")                   # easy | medium | hard
    status           = Column(String, default="NOT_STARTED")                      
    last_practiced_at = Column(DateTime, nullable=True)

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


# ─────────────────────────────────────────────
# User Performance (Lifetime Stats)
# ─────────────────────────────────────────────
class UserPerformance(Base):
    __tablename__ = "user_performance"

    id               = Column(Integer, primary_key=True, index=True)
    student_id       = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    total_questions_attempted = Column(Integer, default=0)
    total_correct_answers     = Column(Integer, default=0)
    lifetime_accuracy         = Column(Float, default=0.0)      # 0.0 – 100.0
    total_points              = Column(Integer, default=0)
    
    topics_covered            = Column(Integer, default=0)
    badges_earned             = Column(Integer, default=0)
    
    current_streak            = Column(Integer, default=0)
    longest_streak            = Column(Integer, default=0)
    
    total_time_seconds        = Column(Integer, default=0)
    last_practiced            = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("User", backref="lifetime_performance")


# ─────────────────────────────────────────────
# Quiz History (Session level history)
# ─────────────────────────────────────────────
class QuizHistory(Base):
    __tablename__ = "quiz_history"

    id                  = Column(Integer, primary_key=True, index=True)
    student_id          = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id          = Column(Integer, ForeignKey("practice_sessions.id"), nullable=True)
    topic               = Column(String, nullable=False)
    questions_attempted = Column(Integer, default=0)
    correct_answers     = Column(Integer, default=0)
    score_percentage    = Column(Float, default=0.0)
    points_earned       = Column(Integer, default=0)
    time_spent          = Column(Integer, default=0)
    created_at          = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="quiz_history")
    session = relationship("PracticeSession")


# ─────────────────────────────────────────────
# Custom Topics (Manually added general topics)
# ─────────────────────────────────────────────
class CustomTopic(Base):
    __tablename__ = "custom_topics"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic_name   = Column(String, nullable=False)
    subject_name = Column(String, default="General Topics")
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="custom_topics")


# ─────────────────────────────────────────────
# Learning Content (Cached LLM explanations)
# ─────────────────────────────────────────────
class LearningContent(Base):
    __tablename__ = "learning_content"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject      = Column(String, nullable=True, index=True)
    topic        = Column(String, nullable=False, index=True)
    content      = Column(JSON, nullable=False)   # The 'notesResponse' JSON block
    revision     = Column(JSON, nullable=True)    # The 'revision' JSON block
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="learning_contents")


class AICache(Base):
    __tablename__ = "ai_caches"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic        = Column(String, nullable=False, index=True)
    action_type  = Column(String, nullable=False, index=True) # "explain", "examples", "summary"
    content      = Column(Text, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="ai_caches")


class UserNote(Base):
    __tablename__ = "user_notes"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic        = Column(String, nullable=False, index=True)
    notes        = Column(Text, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", backref="user_notes")
