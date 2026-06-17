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
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
# from opentelemetry import context
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import ChatMessage, Document, DocumentChunk, User
from services.search import search_relevant_chunks, build_rich_context
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider, get_user_preferences
import os
import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger("chatbot")
logger.setLevel(logging.INFO)

if not logger.handlers:
    # Console Handler
    c_handler = logging.StreamHandler()
    c_handler.setLevel(logging.INFO)
    c_handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(c_handler)

    # File Handler
    log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "chatbot.log")
    f_handler = RotatingFileHandler(log_file_path, maxBytes=10*1024*1024, backupCount=5, encoding="utf-8")
    f_handler.setLevel(logging.INFO)
    f_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(f_handler)

router = APIRouter()

HISTORY_LIMIT   = 4     # max turns kept verbatim (smaller for speed)
MAX_CONTEXT_LEN = 8000  # max chars of retrieved context sent to LLM


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
    DOCUMENT_QUERY = "DOCUMENT_QUERY"
    GENERAL_QUERY = "GENERAL_QUERY"
    HYBRID_QUERY = "HYBRID_QUERY"


def detect_intent(question: str) -> Intent:
    system_prompt = """Classify the query into one category:

1. DOCUMENT_QUERY 
2. GENERAL_QUERY
3. HYBRID_QUERY

DOCUMENT_QUERY:
Questions about the user's resume, profile, skills, projects, academics, achievements, experience, placements, career goals.

GENERAL_QUERY:
General knowledge, answering any question across all academic subjects, science, general trivia, pop culture, sports, programming, interview questions, or literally any topic the user asks about.

HYBRID_QUERY:
Questions that require both user profile information and general knowledge.

Return only one label."""
    try:
        # Re-using the synchronous _call_llm defined below
        # since python resolves this at runtime.
        response = _call_llm(system_prompt, [], question).strip()
        for cat in Intent:
            if cat.value in response:
                return cat
    except Exception as e:
        logger.error(f"Error classifying query: {e}")
    return Intent.HYBRID_QUERY

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

    # We restrict DOCUMENT_QUERY to rely heavily on the documents.
    if intent == Intent.DOCUMENT_QUERY:
        knowledge_line = (
            "You MUST prioritize answering using the CONTEXT below. "
            "If the answer is not clearly present in the context, state that based on the documents you don't know, but you can provide general guidance."
        )
        context_header = "CONTEXT (PRIMARY SOURCE OF TRUTH)"
    elif intent == Intent.GENERAL_QUERY:
        knowledge_line = (
            "You MUST answer using your general knowledge regarding coding, DSA, Python, OS, DBMS, aptitude, or interview questions. "
            "The context provided might not be relevant, but you can use it if it helps."
        )
        context_header = "REFERENCE CONTEXT (supplementary)"
    else:
        knowledge_line = (
            "You should answer using BOTH the provided CONTEXT below and your general knowledge. "
            "Combine information from the documents and external knowledge to provide a comprehensive answer."
        )
        context_header = "REFERENCE CONTEXT"

    role_instruction = get_role_instruction(role, student_name)

    # Fetch preferences
    prefs = get_user_preferences()
    pref_style = prefs.get("response_style", "Detailed")
    pref_tone = prefs.get("tone", "Friendly")

    style_guide = ""
    if pref_style == "Simple":
        style_guide = "• RESPONSE STYLE: Keep explanations very simple, direct, and brief. Avoid jargon."
    elif pref_style == "Step-by-Step":
        style_guide = "• RESPONSE STYLE: Break down your answer into a clear, numbered step-by-step walkthrough."
    else:
        style_guide = "• RESPONSE STYLE: Provide a detailed, deep, and thoroughly structured response."

    tone_guide = ""
    if pref_tone == "Friendly":
        tone_guide = "• TONE: Keep your tone friendly, warm, conversational, and encouraging."
    elif pref_tone == "Professional":
        tone_guide = "• TONE: Keep your tone formal, objective, professional, and academic."
    elif pref_tone == "Concise":
        tone_guide = "• TONE: Be direct, clear, and highly concise. Do not use fluff or filler words."

    base = f"""You are MentorAI — a warm, encouraging academic mentor.
 
ROLE GUIDELINE:
{role_instruction}

{knowledge_line}

STUDENT: {student_name}
DOCUMENTS: {doc_list}

===== {context_header} =====
{context[:MAX_CONTEXT_LEN]}
===== END CONTEXT =====
"""

    intent_hints = {
        Intent.DOCUMENT_QUERY: "Extract info exactly as written in the documents regarding the user's resume, academics, or profile.",
        Intent.GENERAL_QUERY: "Answer the user's question based on your broad general knowledge. You can answer any topic ranging from academics and programming to sports, pop culture, and trivia.",
        Intent.HYBRID_QUERY: "Blend information from the documents with your general knowledge to provide a complete answer.",
    }

    if intent == Intent.DOCUMENT_QUERY:
        context_rule = (
            "• Use information from the provided CONTEXT as much as possible.\n"
            "• If the context lacks details, say what is missing but provide whatever relevant general info you can.\n"
            "• Prefer quoting or closely paraphrasing the CONTEXT.\n"
        )
    elif intent == Intent.GENERAL_QUERY:
        context_rule = (
            "• USE YOUR OWN KNOWLEDGE to answer.\n"
            "• The context may not contain the answer, and that is perfectly fine. DO NOT say 'I could not find this information in the provided documents.'\n"
            "• Provide detailed explanations, code snippets, or interview tips as appropriate.\n"
        )
    else:
        context_rule = (
            "• Provide a hybrid response utilizing both the user's document context and your broad knowledge.\n"
            "• DO NOT refuse to answer just because it's not fully in the documents.\n"
        )

    rules = f"""
INTENT HINT: {intent_hints[intent]}

CRITICAL RULES:
{context_rule}
• NEVER invent policies, rules, or facts.
• Keep answer concise and relevant.
{style_guide}
{tone_guide}
• Maximum 300–400 words.
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

@router.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    logger.info("\n" + "="*80)
    logger.info(f"[{datetime.now().isoformat()}] CHATBOT REQUEST RECEIVED (STREAMING)")
    logger.info(f"  Student ID : {request.student_id}")
    logger.info(f"  Question   : {request.question}")
    logger.info(f"  Role       : {request.role}")
    logger.info(f"  Reset      : {request.reset}")
    logger.info("="*80)

    # ── Verify student ────────────────────────────────────────────────────────
    user = db.query(User).filter(User.id == request.student_id).first()
    if not user:
        logger.error(f"❌ Error: Student with ID {request.student_id} not found in database!")
        raise HTTPException(status_code=404, detail="Student not found")

    # ── Role Guardrail ─────────────────────────────────────────
    guardrail_response = apply_role_guardrails(request.role, request.question)

    if guardrail_response:
        logger.warning(f"⚠️ Guardrail triggered: {guardrail_response}")
        def yield_guardrail():
            yield json.dumps({"content": guardrail_response}) + "\n"
            yield json.dumps({"intent": "restricted", "sources": []}) + "\n"
        return StreamingResponse(
            yield_guardrail(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )

    student_name = getattr(user, "name", f"Student #{request.student_id}")
    logger.info(f"  Student Name: {student_name}")

    # ── Guard: no documents ───────────────────────────────────────────────────
    all_docs = (
        db.query(Document)
        .filter(Document.student_id == request.student_id)
        .order_by(Document.uploaded_at.asc())
        .all()
    )
    if not all_docs:
        logger.warning("⚠️ No documents uploaded yet for this student!")
        no_docs_msg = (
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
        )
        def yield_no_docs():
            yield json.dumps({"content": no_docs_msg}) + "\n"
            yield json.dumps({"intent": "general", "sources": []}) + "\n"
        return StreamingResponse(
            yield_no_docs(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )

    logger.info(f"  Uploaded documents: {[d.filename for d in all_docs]}")

    # ── Detect intent ─────────────────────────────────────────────────────────
    intent = detect_intent(request.question)
    logger.info(f"  Detected Intent: {intent}")

    # ── RAG: retrieve relevant chunks ─────────────────────────────────────────
    top_k = 10 if intent == Intent.DOCUMENT_QUERY else 8
    logger.info(f"  Retrieving top_{top_k} chunks from vector DB...")
    try:
        chunks = search_relevant_chunks(
            request.question, request.student_id, request.role, db, top_k=top_k
        )
    except Exception as e:
        import traceback
        logger.error("❌ Search error:")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Search error: {e}")

    logger.info(f"  Retrieved {len(chunks)} chunks from ChromaDB.")
    for idx, c in enumerate(chunks):
        doc_info = c.get("document", "Unknown Doc")
        snippet = c.get("text", "")[:100].replace('\n', ' ')
        logger.info(f"    Chunk {idx+1}: Doc='{doc_info}' | Snippet: {snippet}...")

    if not chunks:
        logger.warning("⚠️ No relevant chunks returned from search. Allowing LLM to answer anyway.")
        
        doc_names = [d.filename for d in all_docs]
        context = ""
        system_prompt = _build_system_prompt(intent, doc_names, context, request.role, student_name)
        
        # Persist user message
        db.add(ChatMessage(
            student_id=request.student_id,
            role="user",
            content=request.question,
        ))
        db.commit()

        def yield_fallback():
            full_answer = ""
            for chunk in _call_llm_stream(system_prompt, [], request.question):
                full_answer += chunk
                yield json.dumps({"content": chunk}) + "\n"
            
            if not full_answer:
                fallback_empty = "I can help with that! Try asking a more specific question and I'll give you a focused answer."
                yield json.dumps({"content": fallback_empty}) + "\n"
                full_answer = fallback_empty

            db.add(ChatMessage(
                student_id=request.student_id,
                role="assistant",
                content=full_answer,
            ))
            db.commit()
            yield json.dumps({"intent": intent.value, "sources": []}) + "\n"
            
        return StreamingResponse(
            yield_fallback(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )

    context    = build_rich_context(chunks)
    logger.info("\n--- CONTEXT SENT TO LLM ---")
    logger.info(context)
    logger.info("---------------------------\n")
    doc_names  = [d.filename for d in all_docs]
    source_docs = list({
        c["document"] for c in chunks if c.get("document")
    })

    # ── Conversation history ──────────────────────────────────────────────────
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.student_id == request.student_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )[-HISTORY_LIMIT:]
    logger.info(f"  Conversation history loaded: {len(history)} messages.")

    # ── Persist user message ──────────────────────────────────────────────────
    db.add(ChatMessage(
        student_id=request.student_id,
        role="user",
        content=request.question,
    ))
    db.commit()

    # ── Call LLM ──────────────────────────────────────────────────────────────
    system_prompt = _build_system_prompt(intent, doc_names, context, request.role, student_name)
    # For GENERAL_QUERY questions, or when reset=True, skip history to keep responses
    # focused on the new question only.
    if intent == Intent.GENERAL_QUERY or request.reset:
        history_for_llm: list[Message] = []
    else:
        history_for_llm = [Message(role=m.role, content=m.content) for m in history]

    def yield_main():
        full_answer = ""
        for chunk in _call_llm_stream(system_prompt, history_for_llm, request.question):
            full_answer += chunk
            yield json.dumps({"content": chunk}) + "\n"

        # Persist assistant reply
        try:
            db.add(ChatMessage(
                student_id=request.student_id,
                role="assistant",
                content=full_answer,
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Failed to persist assistant reply: {e}")

        yield json.dumps({"intent": intent.value, "sources": source_docs}) + "\n"

    return StreamingResponse(
        yield_main(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
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

    logger.info(f"  [LLM Call] Preferred provider: {provider}")

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))
        else:
            logger.warning("  [LLM Call] GPT config missing API_KEY or BASE_URL")

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))
        else:
            logger.warning("  [LLM Call] Llama config missing API_KEY or BASE_URL")

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

    logger.info(f"  [LLM Call] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"  [LLM Call] Trying provider '{name}' at {base_url} using model {model}...")
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048,
                temperature=0.2,
                timeout=30,
            )
            logger.info(f"  [LLM Call] Success with provider '{name}'!")
            return resp.choices[0].message.content
        except Exception as e:
            import traceback
            logger.error(f"  [LLM Call] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            logger.error(traceback.format_exc())
            continue  # try next provider

    logger.error("  [LLM Call] ❌ All configured LLM providers failed. Falling back to plain context.")
    # Plain context fallback (no LLM available)
    return (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("REFERENCE CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )


def _call_llm_stream(system_prompt: str, history: list, question: str):
    provider = get_provider()
    configs = []

    logger.info(f"  [LLM Stream] Preferred provider: {provider}")

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))
        else:
            logger.warning("  [LLM Stream] GPT config missing API_KEY or BASE_URL")

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))
        else:
            logger.warning("  [LLM Stream] Llama config missing API_KEY or BASE_URL")

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

    logger.info(f"  [LLM Stream] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"  [LLM Stream] Trying provider '{name}' at {base_url} using model {model}...")
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048,
                temperature=0.2,
                timeout=30,
                stream=True,
            )
            for chunk in resp:
                if not getattr(chunk, "choices", None):
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    yield content
            logger.info(f"  [LLM Stream] Success with provider '{name}'!")
            return  # Success, exit generator
        except Exception as e:
            import traceback
            logger.error(f"  [LLM Stream] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            logger.error(traceback.format_exc())
            continue  # try next provider

    logger.error("  [LLM Stream] ❌ All configured LLM providers failed. Falling back to plain context.")
    # Plain context fallback (no LLM available)
    fallback_text = (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("REFERENCE CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )
    yield fallback_text