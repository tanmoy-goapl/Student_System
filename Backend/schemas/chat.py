from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    student_id: int
    question: str
    role: str
    reset: bool = False
    session_id: Optional[str] = None
    session_title: Optional[str] = None

class Message(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    sources: Optional[List[str]] = []
    history: List[Message] = []
