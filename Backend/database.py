from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import DATABASE_URL

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def init_db():
    from models import User, Document  # removed DocumentChunk
    from practice_models import (      # Adaptive Learning Engine tables
        PracticeSession, PracticeQuestion,
        TopicPerformance, BehavioralInsight, CustomTopic, LearningContent,
    )
    from roadmap_models import UserGoal, LearningRoadmap, DailyTask
    Base.metadata.create_all(bind=engine)
    
    # Run automatic column migrations
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS category VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS subject VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS pages INTEGER;"))
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_format VARCHAR;"))
            
            # DailyTask roadmap additions
            conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS day_number INTEGER;"))
            conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS subtopics JSON DEFAULT '[]';"))
            
            # LearningContent additions
            conn.execute(text("ALTER TABLE learning_content ADD COLUMN IF NOT EXISTS subject VARCHAR;"))
    except Exception as e:
        print("Database schema migration notice/error:", e)


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()