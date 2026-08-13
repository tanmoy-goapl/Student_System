"""Minimal Mentor AI chat service.

This process intentionally exposes only the chat router. Keeping it separate
from the dashboard and learning API prevents a slow model stream from using
the workers needed by Home, Courses, and the rest of the student application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS

# Register the model modules required by User's string relationships before
# SQLAlchemy configures mappers. Keep this import-only; do not import main.py,
# which also runs dashboard migrations and seed work.
from models import User, Document, DocumentChunk, ChatMessage  # noqa: F401
from classroom_models import Classroom, StudentClass, ClassResource, ClassCurriculum  # noqa: F401

from routes import chat


app = FastAPI(title="Mentor AI Chat Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, tags=["chat"])


@app.get("/health")
def health():
    return {"status": "healthy", "service": "mentor-ai-chat"}
