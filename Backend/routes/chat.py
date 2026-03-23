"""
routers/chat.py  —  MentorAI Chat Router
─────────────────────────────────────────
Improvements over original:
  • Intent detection: classifies question into MARKS / IMPROVEMENT / STUDY_PLAN /
    FEEDBACK / GENERAL so the system prompt is tailored per intent.
  • Marks analysis: when intent=MARKS, the LLM is explicitly asked to extract
    subject names, scores, and rank subjects by performance.
  • Study plan generation: intent=STUDY_PLAN produces a structured weekly plan.
  • Conversation memory: last 12 turns kept; older turns summarised with a
    lightweight compression prompt to stay within token limits.
  • Graceful multi-provider: GPT-4o first, falls back to Llama, then plain context.
  • Richer response metadata: returns intent, source docs, and confidence.
"""

from __future__ import annotations

import re
from enum import Enum
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import ChatMessage, Document, DocumentChunk, User
from services.search import search_relevant_chunks, build_rich_context
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider

router = APIRouter()

HISTORY_LIMIT   = 4     # max turns kept verbatim (smaller for speed)
MAX_CONTEXT_LEN = 1200  # max chars of retrieved context sent to LLM


# ═════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    student_id: int
    question: str
    role: str
    reset: bool = False

class Message(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    sources: Optional[List[str]] = []
    history: List[Message] = []


# ═════════════════════════════════════════════════════════════════════════════
#  INTENT DETECTION
# ═════════════════════════════════════════════════════════════════════════════

class Intent(str, Enum):
    MARKS       = "marks"
    IMPROVEMENT = "improvement"
    STUDY_PLAN  = "study_plan"
    FEEDBACK    = "feedback"
    GENERAL     = "general"

_INTENT_PATTERNS: list[tuple[Intent, list[str]]] = [
    (Intent.MARKS,       ["marks", "score", "grade", "result", "percentage",
                          "gpa", "cgpa", "rank", "pass", "fail",
                          "how much", "how many marks", "what did i get"]),
    (Intent.IMPROVEMENT, ["improve", "weak", "struggle", "bad", "low", "poor",
                          "lacking", "behind", "need to work", "help me"]),
    (Intent.STUDY_PLAN,  ["study plan", "schedule", "timetable", "how to study",
                          "when to study", "routine", "prepare for"]),
    (Intent.FEEDBACK,    ["feedback", "comment", "teacher said", "remark",
                          "suggestion", "advice", "review"]),
]

def detect_intent(question: str) -> Intent:
    q = question.lower()
    # Internship / resume / job questions should not be treated as marks queries.
    career_terms = ["internship", "resume", "cv", "portfolio", "job", "role", "position"]
    marks_terms = ["marks", "score", "grade", "result", "percentage", "gpa", "cgpa", "rank", "pass", "fail"]
    if any(t in q for t in career_terms) and not any(t in q for t in marks_terms):
        return Intent.IMPROVEMENT
    for intent, patterns in _INTENT_PATTERNS:
        if any(p in q for p in patterns):
            return intent
    return Intent.GENERAL

def get_role_instruction(role: str, student_name: str) -> str:
    if role == "admin":
        return f"""
You are assisting an ADMIN user.

• You can analyze ALL uploaded documents (students + professors).
• You can evaluate professors, compare students, and give high-level insights.
• You can answer strategic, analytical, and evaluation questions.
• You are allowed full access to all knowledge in the system.
"""

    elif role == "professor":
        return f"""
You are assisting a PROFESSOR.

• You can analyze student performance, marks, and feedback.
• You can suggest teaching improvements, course plans, and strategies.
• You MUST NOT provide admin-level system insights.
• Focus on helping improve students and course quality.
"""

    elif role == "student":
        return f"""
You are assisting a STUDENT ({student_name}).

• You can ONLY talk about the student's own learning.
• You MUST NOT evaluate professors or other students.
• You MUST NOT provide system-level or admin insights.
• Focus on study help, marks, improvement, and learning plans.
"""

    return ""

# ═════════════════════════════════════════════════════════════════════════════
#  SYSTEM PROMPT FACTORY
# ═════════════════════════════════════════════════════════════════════════════

def _build_system_prompt(
    intent: Intent,
    doc_names: list[str],
    context: str,
    role: str,
    student_name: str = "the student",
) -> str:
    doc_list = ", ".join(doc_names) or "(none)"
    if intent is Intent.GENERAL:
        knowledge_line = (
            "Use the student's documents as primary source. "
            "If context is thin, add general academic guidance "
            "but never claim it came from the documents."
        )
    else:
        knowledge_line = (
            "Your ONLY knowledge source is the student's uploaded documents. "
            "Never invent facts not present in the documents."
        )

    role_instruction = get_role_instruction(role, student_name)
    base = f"""You are MentorAI — a warm, encouraging academic mentor.

    ROLE GUIDELINE:
    {role_instruction}
{knowledge_line}

STUDENT: {student_name}
DOCUMENTS: {doc_list}
CONTEXT:
{context[:MAX_CONTEXT_LEN]}
---
"""

    intent_hints = {
        Intent.MARKS: "The student is asking about marks/grades/scores. "
            "List subjects with scores, highlight strengths and weaknesses.",
        Intent.IMPROVEMENT: "The student wants to know what to improve. "
            "Identify weak areas from the documents and suggest concrete steps. "
            "If documents are a resume/CV, point out skill gaps for their target role.",
        Intent.STUDY_PLAN: "The student wants a study plan. "
            "Create a practical schedule using subjects from their documents.",
        Intent.FEEDBACK: "The student is asking about feedback/comments. "
            "Quote or paraphrase relevant feedback from documents.",
        Intent.GENERAL: "General academic question. "
            "Give a clear explanation. You may use standard textbook knowledge. "
            "Do NOT mention documents or sources.",
    }

    rules = f"""
INTENT HINT: {intent_hints[intent]}

CRITICAL RULES:
• Answer ONLY what the user asked. Do NOT add extra sections or unsolicited advice.
• Keep responses concise and focused. Use short paragraphs or bullet points.
• If the user asks a simple question, give a simple answer. Do NOT force a multi-section template.
• Only use structured sections (headings, emojis) when the user explicitly asks for a plan, breakdown, or detailed analysis.
• Be encouraging and supportive.
• Keep total response under 400 words.
• For GENERAL questions: never mention documents or files.
• For other questions: use ONLY info from the context above.
"""

    return base + rules

def apply_role_guardrails(role: str, question: str) -> str:
    q = question.lower()

    if role == "student":
        forbidden_patterns = [
            "professor", "other student", "admin", 
            "college document", "faculty", "staff"
        ]
        if any(p in q for p in forbidden_patterns):
            return "❌ You can only ask about your own documents and learning."

    elif role == "professor":
        forbidden_patterns = [
            "other professor", "admin document", "college policy",
            "system", "all users"
        ]
        if any(p in q for p in forbidden_patterns):
            return "❌ You can only access your own documents and your students' records."

    return ""  # allowed
# ═════════════════════════════════════════════════════════════════════════════
#  MAIN CHAT ENDPOINT
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):

    # ── Verify student ────────────────────────────────────────────────────────
    user = db.query(User).filter(User.id == request.student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # ── Role Guardrail ─────────────────────────────────────────
    guardrail_response = apply_role_guardrails(request.role, request.question)

    if guardrail_response:
        return ChatResponse(
            answer=guardrail_response,
            intent="restricted",
            sources=[],
            history=[]
        )

    student_name = getattr(user, "name", f"Student #{request.student_id}")

    # ── Guard: no documents ───────────────────────────────────────────────────
    all_docs = (
        db.query(Document)
        .filter(Document.student_id == request.student_id)
        .order_by(Document.uploaded_at.asc())
        .all()
    )
    if not all_docs:
        return ChatResponse(
            answer=(
                "📚 **No documents uploaded yet!**\n\n"
                "MentorAI works by reading *your* study materials — "
                "reports, notes, grade sheets, assignments — and giving you "
                "personalised guidance based on what's actually in them.\n\n"
                "**To get started:**\n"
                "1. Go to the **Documents** tab\n"
                "2. Upload a PDF, Word doc, image, or text file\n"
                "3. Come back here and ask me anything!\n\n"
                "Once your documents are uploaded, I can:\n"
                "• Break down your marks subject by subject 📊\n"
                "• Build you a custom study plan 📅\n"
                "• Identify exactly what to improve and how 💡\n"
                "• Explain teacher feedback in plain language 📝"
            ),
            intent="general",
        )

    # ── Guard: no chunks ──────────────────────────────────────────────────────
    has_chunks = (
        db.query(DocumentChunk)
        .join(Document)
        .filter(Document.student_id == request.student_id)
        .first()
    )
    if not has_chunks:
        return ChatResponse(
            answer=(
                "⚠️ **Documents uploaded but not yet indexed.**\n\n"
                "Your files are saved, but their text couldn't be extracted "
                "for search. Try re-uploading as PDF or plain text.\n\n"
                "Supported: PDF, DOCX, TXT, PNG, JPG, JPEG, BMP, TIFF, WEBP."
            ),
            intent="general",
        )

    # ── Detect intent ─────────────────────────────────────────────────────────
    intent = detect_intent(request.question)

    # ── RAG: retrieve relevant chunks ─────────────────────────────────────────
    # For marks/study-plan intents fetch more chunks to capture full report.
    top_k = 6 if intent in (Intent.MARKS, Intent.STUDY_PLAN) else 4
    try:
        chunks = search_relevant_chunks(
            request.question, request.student_id, request.role, db, top_k=top_k
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {e}")

    if not chunks:
        # If no relevant chunks: for GENERAL intent, still answer using a
        # clean, mentor response without mentioning missing documents.
        if intent is Intent.GENERAL:
            doc_names = [d.filename for d in all_docs]
            context = ""
            system_prompt = _build_system_prompt(intent, doc_names, context, request.role, student_name)
            answer = _call_llm(system_prompt, [], request.question)
            if not answer:
                answer = (
                    "I can help with that! Try asking a more specific question "
                    "and I'll give you a focused answer."
                )
            return ChatResponse(answer=answer, intent=intent.value)

        # Non-GENERAL intents still need document grounding.
        fallback_answer = (
            "📌 I need relevant content from your uploaded documents to answer\n"
            "this specific request accurately. Please upload or add the\n"
            "related study material, then ask again.\n"
        )
        return ChatResponse(answer=fallback_answer, intent=intent.value)

    context    = build_rich_context(chunks)
    doc_names  = [d.filename for d in all_docs]
    source_docs = list({
        c.document.filename for c in chunks if c.document
    })

    # ── Conversation history ──────────────────────────────────────────────────
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.student_id == request.student_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )[-HISTORY_LIMIT:]

    # ── Persist user message ──────────────────────────────────────────────────
    db.add(ChatMessage(
        student_id=request.student_id,
        role="user",
        content=request.question,
    ))
    db.commit()

    # ── Call LLM ──────────────────────────────────────────────────────────────
    system_prompt = _build_system_prompt(intent, doc_names, context, request.role, student_name)
    # For GENERAL questions, or when reset=True, skip history to keep responses
    # focused on the new question only.
    if intent is Intent.GENERAL or request.reset:
        history_for_llm: list[Message] = []
    else:
        history_for_llm = history
    answer = _call_llm(system_prompt, history_for_llm, request.question)

    # ── Persist assistant reply ───────────────────────────────────────────────
    db.add(ChatMessage(
        student_id=request.student_id,
        role="assistant",
        content=answer,
    ))
    db.commit()

    # ── Return history ────────────────────────────────────────────────────────
    # For a reset request, we don't need to send all old messages back to the
    # client – that would repopulate the cleared UI. Just return the latest Q/A.
    if request.reset:
        last_msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.student_id == request.student_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(2)
            .all()
        )
        return ChatResponse(
            answer=answer,
            intent=intent.value,
            sources=source_docs,
            history=[
                Message(
                    role=m.role,
                    content=m.content,
                    created_at=m.created_at.isoformat() if m.created_at else None,
                )
                for m in reversed(last_msgs)
            ],
        )

    all_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.student_id == request.student_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return ChatResponse(
        answer=answer,
        intent=intent.value,
        sources=source_docs,
        history=[
            Message(
                role=m.role,
                content=m.content,
                created_at=m.created_at.isoformat() if m.created_at else None,
            )
            for m in all_msgs
        ],
    )


# ═════════════════════════════════════════════════════════════════════════════
#  HELPER ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/chat/history/{student_id}", response_model=List[Message])
def get_history(student_id: int, db: Session = Depends(get_db)):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.student_id == student_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        Message(
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in msgs
    ]


@router.delete("/chat/history/{student_id}")
def clear_history(student_id: int, db: Session = Depends(get_db)):
    deleted = (
        db.query(ChatMessage)
        .filter(ChatMessage.student_id == student_id)
        .delete()
    )
    db.commit()
    return {"message": f"Cleared {deleted} messages"}


@router.delete("/chat/history-item")
def delete_history_item(
    student_id: int,
    created_at: str,
    role: str = "user",
    db: Session = Depends(get_db),
):
    """
    Delete a single history entry for a student, identified by timestamp and role.
    We primarily use this for user messages shown in the history sidebar.
    """
    try:
        ts = datetime.fromisoformat(created_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid created_at timestamp")

    q = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.student_id == student_id,
            ChatMessage.role == role,
            ChatMessage.created_at == ts,
        )
    )
    deleted = q.delete()
    db.commit()
    return {"deleted": deleted}


# ═════════════════════════════════════════════════════════════════════════════
#  LLM CALLER  (GPT → Llama → plain-context fallback)
# ═════════════════════════════════════════════════════════════════════════════

def _call_llm(system_prompt: str, history: list, question: str) -> str:
    provider = get_provider()
    configs = []

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append((GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append((LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))

    # Try preferred provider first, then fall back to the other if available.
    if provider == "gpt4o":
        add_gpt()
        add_llama()
    elif provider == "llama":
        add_llama()
        add_gpt()
    else:
        add_gpt()
        add_llama()

    for api_key, base_url, model in configs:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=500,
                temperature=0.2,
                timeout=10,
            )
            return resp.choices[0].message.content
        except Exception as e:
            print(f"LLM error for {base_url} {model}: {e}")
            continue  # try next provider

    # Plain context fallback (no LLM available)
    return (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("RETRIEVED CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )