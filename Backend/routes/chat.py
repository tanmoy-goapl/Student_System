"""
routes/chat.py  —  MentorAI Chat Router
─────────────────────────────────────────
Retrieval Modes:
  • STRICT_DOCUMENT  — answer only from a specific document
  • FACTUAL_RAG      — answer only from retrieved documents, never hallucinate
  • LEARNING         — use documents if relevant, otherwise general knowledge
  • PERSONALIZED_ADVISOR — combine documents + general knowledge for advice

Adaptive similarity filtering:
  • top_score < 0.20 → no evidence found
  • keep chunks where score >= top_score - 0.10
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import ChatMessage, Document, DocumentChunk, User
from services.search import search_relevant_chunks, build_rich_context
from schemas.chat import ChatRequest, Message, ChatResponse
from services.chat_intent import RetrievalMode, detect_retrieval_mode
from services.chat_prompts import _build_system_prompt, apply_role_guardrails
from services.llm_client import _call_llm, _call_llm_stream

import os
import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger("chatbot")
logger.setLevel(logging.INFO)

if not logger.handlers:
    c_handler = logging.StreamHandler()
    c_handler.setLevel(logging.INFO)
    c_handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(c_handler)

    log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "chatbot.log")
    f_handler = RotatingFileHandler(log_file_path, maxBytes=10*1024*1024, backupCount=5, encoding="utf-8")
    f_handler.setLevel(logging.INFO)
    f_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(f_handler)

router = APIRouter()

HISTORY_LIMIT   = 4
MAX_CONTEXT_LEN = 8000


# ═════════════════════════════════════════════════════════════════════════════
#  ADAPTIVE SIMILARITY FILTER
# ═════════════════════════════════════════════════════════════════════════════

def _adaptive_filter(chunks: list[dict], mode: RetrievalMode) -> list[dict]:
    """
    Adaptive similarity filtering (replaces all fixed thresholds).

    1. Compute top_score from the highest-scoring chunk.
    2. If top_score < 0.20 → no evidence found → return [].
    3. Otherwise keep chunks where score >= top_score - 0.10.
    4. Apply per-mode chunk limits.
    """
    if not chunks:
        return []

    def _sim(c: dict) -> float:
        return c.get("similarity", 1.0 - (c.get("distance", 2.0) / 2.0))

    # Sort descending by similarity
    scored = sorted(chunks, key=_sim, reverse=True)
    top_score = _sim(scored[0])

    logger.info(f"  Adaptive filter: top_score={top_score:.4f}")

    # Gate: minimum evidence threshold
    if top_score < 0.20:
        logger.info("  Adaptive filter: top_score < 0.20 → no evidence")
        return []

    # Keep chunks within adaptive window
    cutoff = top_score - 0.10
    kept = [c for c in scored if _sim(c) >= cutoff]
    logger.info(f"  Adaptive filter: cutoff={cutoff:.4f}, kept={len(kept)}/{len(scored)}")

    # Per-mode chunk limits
    limits = {
        RetrievalMode.FACTUAL_RAG: 5,
        RetrievalMode.STRICT_DOCUMENT: 10,
        RetrievalMode.LEARNING: 5,
        RetrievalMode.PERSONALIZED_ADVISOR: 8,
    }
    limit = limits.get(mode, 5)
    return kept[:limit]


# ═════════════════════════════════════════════════════════════════════════════
#  DOCUMENT TYPE BOOSTS
# ═════════════════════════════════════════════════════════════════════════════

def _get_boost_types(mode: RetrievalMode, question: str) -> list[str]:
    """Return document type hints for search ranking based on mode + question."""
    q = question.lower()

    if mode == RetrievalMode.FACTUAL_RAG:
        if any(w in q for w in ["attendance", "absent", "present", "leave", "holiday", "percent"]):
            return ["policy", "attendance", "academic_calendar"]
        if any(w in q for w in ["cgpa", "sgpa", "grade", "marks", "score", "gpa"]):
            return ["marksheet", "transcript", "grades"]
        if any(w in q for w in ["company", "companies", "placement", "interview", "ctc", "salary"]):
            return ["placement_record", "resume", "ats_report"]
        if "resume" in q or "cv" in q:
            return ["resume", "ats_report"]
        return ["marksheet", "policy", "academic_calendar", "resume", "placement_record"]

    if mode == RetrievalMode.LEARNING:
        return ["notes", "syllabus", "curriculum"]

    if mode == RetrievalMode.PERSONALIZED_ADVISOR:
        return ["resume", "marksheet", "placement_record"]

    return []


# ═════════════════════════════════════════════════════════════════════════════
#  ALLOWED DOCUMENTS RESOLVER
# ═════════════════════════════════════════════════════════════════════════════

def _get_role_visible_docs(request: ChatRequest, db: Session) -> list[Document]:
    """
    Return ALL documents that the current user is permitted to see,
    based on their role and the four visibility tiers:
      universal      → everyone
      admin_shared   → admins only
      course_shared  → teaching professor + enrolled students
      private        → owner_id + owner_role match only
    """
    uid = request.student_id
    role = request.role

    if role == "admin":
        return db.query(Document).filter(
            (Document.visibility == "universal") |
            (Document.visibility == "admin_shared") |
            (
                (Document.visibility == "private") &
                ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid))) &
                (Document.owner_role == "admin")
            )
        ).all()

    elif role == "professor":
        from classroom_models import Classroom
        teaches = db.query(Classroom).filter(Classroom.professor_id == uid).all()
        teach_ids = [c.id for c in teaches]

        return db.query(Document).filter(
            (Document.visibility == "universal") |
            (
                (Document.visibility == "course_shared") &
                (
                    (Document.classroom_id.in_(teach_ids) if teach_ids else False) |
                    ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid)))
                )
            ) |
            (
                (Document.visibility == "private") &
                ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid))) &
                (Document.owner_role == "professor")
            )
        ).all()

    else:  # student
        from classroom_models import StudentClass
        joined = db.query(StudentClass).filter(StudentClass.student_id == uid).all()
        class_ids = [c.class_id for c in joined]

        return db.query(Document).filter(
            (Document.visibility == "universal") |
            (
                (Document.visibility == "course_shared") &
                (Document.classroom_id.in_(class_ids) if class_ids else False)
            ) |
            (
                (Document.visibility == "private") &
                ((Document.owner_id == uid) | ((Document.owner_id == None) & (Document.student_id == uid))) &
                (Document.owner_role == "student")
            )
        ).all()


def _resolve_allowed_docs(
    mode: RetrievalMode, request: ChatRequest, db: Session, q_lower: str
) -> list[Document]:
    """
    Return the list of Document objects the retrieval is allowed to search.
    For STRICT_DOCUMENT: only the explicitly mentioned document(s) within
    the user's visible set.
    For everything else: the full visible set.
    """
    visible = _get_role_visible_docs(request, db)

    if mode == RetrievalMode.STRICT_DOCUMENT:
        from services.search import _detect_mentioned_doc

        mentioned_ids = _detect_mentioned_doc(request.question, visible)

        # Heuristic fallback: match by doc type keyword
        if not mentioned_ids:
            type_hints = []
            if "resume" in q_lower: type_hints.append("resume")
            if "marksheet" in q_lower: type_hints.append("marksheet")
            if "syllabus" in q_lower: type_hints.append("syllabus")
            if "policy" in q_lower: type_hints.append("policy")
            if type_hints:
                for doc in visible:
                    if doc.document_type in type_hints or any(h in doc.filename.lower() for h in type_hints):
                        mentioned_ids.append(doc.id)
                        break

        return [d for d in visible if d.id in mentioned_ids]

    return visible


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN CHAT ENDPOINT
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    logger.info(f"\n{'='*80}")
    logger.info(f"[{datetime.now().isoformat()}] CHAT REQUEST")
    logger.info(f"  Student ID : {request.student_id}")
    logger.info(f"  Question   : {request.question}")
    logger.info(f"  Role       : {request.role}")
    logger.info(f"{'='*80}")

    # ── Verify student ────────────────────────────────────────────────────────
    user = db.query(User).filter(User.id == request.student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # ── Role guardrail ────────────────────────────────────────────────────────
    guardrail = apply_role_guardrails(request.role, request.question)
    if guardrail:
        def yield_guardrail():
            yield json.dumps({"content": guardrail}) + "\n"
            yield json.dumps({"intent": "restricted", "sources": []}) + "\n"
        return StreamingResponse(
            yield_guardrail(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
        )

    student_name = getattr(user, "name", f"Student #{request.student_id}")

    def yield_main():
        yield json.dumps({"status": "Thinking..."}) + "\n"

        # ── Fetch user-visible documents (role-aware) ─────────────────────────
        all_docs = _get_role_visible_docs(request, db)

        # ── Detect mode ──────────────────────────────────────────────────────
        mode = detect_retrieval_mode(request.question, db, request.student_id)
        logger.info(f"  Detected Mode: {mode.value}")

        # ── Resolve or generate session ────────────────────────────────────────
        session_id = request.session_id
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())
            
        session_title = request.session_title
        if not session_title:
            # Use the first 40 chars of question as the session title
            session_title = request.question[:40] + ("..." if len(request.question) > 40 else "")

        # ── Persist user message ─────────────────────────────────────────────
        try:
            db.add(ChatMessage(
                student_id=request.student_id, role="user", content=request.question,
                session_id=session_id, session_title=session_title
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Failed to persist user message: {e}")

        # ── ROADMAP CREATION (separate pipeline, not retrieval) ──────────────
        if mode == RetrievalMode.ROADMAP_CREATION:
            yield from _handle_roadmap(request, db)
            return

        q_lower = request.question.lower()

        # ── Resolve allowed documents ────────────────────────────────────────
        allowed_docs = _resolve_allowed_docs(mode, request, db, q_lower)
        allowed_doc_ids = [d.id for d in allowed_docs]

        # ── Guard: no documents ──────────────────────────────────────────────
        if mode == RetrievalMode.STRICT_DOCUMENT and not allowed_doc_ids:
            yield json.dumps({"content": "I could not find this information in the selected document."}) + "\n"
            yield json.dumps({"intent": mode.value, "sources": []}) + "\n"
            return

        if mode == RetrievalMode.FACTUAL_RAG and not allowed_doc_ids:
            yield json.dumps({"content": "I could not find this information in the available documents."}) + "\n"
            yield json.dumps({"intent": mode.value, "sources": []}) + "\n"
            return

        if not all_docs and mode in [RetrievalMode.STRICT_DOCUMENT, RetrievalMode.FACTUAL_RAG]:
            no_docs_msg = (
                "📚 **No documents uploaded yet!**\n\n"
                "MentorAI works by reading *your* study materials — "
                "reports, notes, grade sheets, assignments — and giving you "
                "personalised guidance based on what's actually in them.\n\n"
                "**To get started:**\n"
                "1. Go to the **Documents** tab\n"
                "2. Upload a PDF, Word doc, image, or text file\n"
                "3. Come back here and ask me anything!"
            )
            yield json.dumps({"content": no_docs_msg}) + "\n"
            yield json.dumps({"intent": mode.value, "sources": []}) + "\n"
            return

        yield json.dumps({"status": "Searching documents..."}) + "\n"

        # ── RAG: retrieve relevant chunks ────────────────────────────────────
        boost_types = _get_boost_types(mode, request.question)
        chunks = []
        try:
            chunks = search_relevant_chunks(
                request.question, request.student_id, request.role, db,
                top_k=40, allowed_doc_ids=allowed_doc_ids, boost_types=boost_types,
            )
        except Exception as e:
            logger.error(f"Search error: {e}")

        logger.info(f"  Retrieved {len(chunks)} candidate chunks")

        # ── Adaptive filtering ───────────────────────────────────────────────
        chunks = _adaptive_filter(chunks, mode)
        logger.info(f"  After adaptive filter: {len(chunks)} chunks")

        # ── No evidence guard ────────────────────────────────────────────────
        if not chunks and mode in [RetrievalMode.FACTUAL_RAG, RetrievalMode.STRICT_DOCUMENT]:
            msg = (
                "I could not find this information in the selected document."
                if mode == RetrievalMode.STRICT_DOCUMENT
                else "I could not find this information in the available documents."
            )
            yield json.dumps({"content": msg}) + "\n"
            yield json.dumps({"intent": mode.value, "sources": []}) + "\n"
            return

        yield json.dumps({"status": "Generating answer..."}) + "\n"

        # ── Build context ────────────────────────────────────────────────────
        doc_names = [d.filename for d in all_docs]
        if chunks:
            yield json.dumps({"status": "Building context..."}) + "\n"
            context = build_rich_context(chunks)
        else:
            context = ""

        source_docs = list({c["document"] for c in chunks if c.get("document")})

        # ── Conversation history ─────────────────────────────────────────────
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.student_id == request.student_id)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )[-HISTORY_LIMIT:]

        system_prompt = _build_system_prompt(mode, doc_names, context, request.role, student_name)

        if request.reset:
            history_for_llm: list[Message] = []
        else:
            history_for_llm = [Message(role=m.role, content=m.content) for m in history]

        # ── Stream LLM response ──────────────────────────────────────────────
        full_answer = ""
        first_chunk = True
        for chunk in _call_llm_stream(system_prompt, history_for_llm, request.question):
            if first_chunk:
                yield json.dumps({"status": ""}) + "\n"
                first_chunk = False
            full_answer += chunk
            yield json.dumps({"content": chunk}) + "\n"

        # ── Persist assistant reply ──────────────────────────────────────────
        try:
            db.add(ChatMessage(
                student_id=request.student_id, role="assistant", content=full_answer,
                session_id=session_id, session_title=session_title
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Failed to persist assistant reply: {e}")

        # ── Final metadata ───────────────────────────────────────────────────
        yield json.dumps({"status": ""}) + "\n"

        final_payload = {
            "intent": mode.value,
            "sources": source_docs,
            "session_id": session_id,
            "session_title": session_title
        }
        if any(w in q_lower for w in ["become", "prepare", "study", "learn", "how do i", "guide"]):
            final_payload["suggest_roadmap"] = True

        yield json.dumps(final_payload) + "\n"

    return StreamingResponse(
        yield_main(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )


# ═════════════════════════════════════════════════════════════════════════════
#  ROADMAP CREATION HANDLER
# ═════════════════════════════════════════════════════════════════════════════

def _handle_roadmap(request: ChatRequest, db: Session):
    """Generator that handles the ROADMAP_CREATION pipeline."""
    yield json.dumps({"status": "Analyzing your request..."}) + "\n"

    recent_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.student_id == request.student_id)
        .order_by(ChatMessage.id.desc())
        .limit(4)
        .all()
    )
    context_str = "\n".join([f"{m.role}: {m.content}" for m in reversed(recent_msgs)])

    extract_prompt = f"""Extract the core learning goal and duration from the user's request.
CRITICAL: Use the chat context to identify the learning topic or goal if the current request is a confirmation (e.g. "yes", "please do", "sure", "ok") or does not mention the topic explicitly.
Return ONLY valid JSON with keys "goal" and "duration".
If duration is missing, default to "6 weeks" unless the user specifies a duration.

CHAT CONTEXT:
{context_str}

CURRENT REQUEST: {request.question}"""

    try:
        extraction = _call_llm(extract_prompt, [], request.question)
        json_match = re.search(r'\{.*\}', extraction, re.DOTALL)
        ext_data = json.loads(json_match.group(0)) if json_match else json.loads(extraction)
        goal_str = ext_data.get("goal", request.question)
        duration_str = ext_data.get("duration", "6 weeks")
    except Exception as e:
        logger.error(f"Failed to extract goal: {e}")
        goal_str = request.question
        duration_str = "6 weeks"

    yield json.dumps({"status": "Building custom milestone curriculum (may take ~20s)..."}) + "\n"

    from roadmap_models import UserGoal, LearningRoadmap, DailyTask
    from services.roadmap_engine import generate_roadmap_from_llm

    goal_record = UserGoal(
        student_id=request.student_id,
        goal_type="custom",
        title=goal_str,
        description=f"Generated via Chat for duration: {duration_str}",
    )
    db.add(goal_record)
    db.commit()
    db.refresh(goal_record)

    import threading
    from database import SessionLocal

    def bg_task(student_id, goal_id, goal_title, goal_duration):
        bg_db = SessionLocal()
        try:
            from services.roadmap_engine import generate_roadmap_from_llm
            from roadmap_models import LearningRoadmap, DailyTask, UserGoal

            bg_goal = bg_db.query(UserGoal).filter(UserGoal.id == goal_id).first()
            if bg_goal:
                bg_goal.status = "generating"
                bg_db.commit()

            roadmap_json = generate_roadmap_from_llm(goal_title, goal_duration, "")
            title = roadmap_json.get("title", f"Roadmap for {goal_title}")
            weeks = roadmap_json.get("weeks", [])
            tasks_count = sum(len(w.get("days", [])) for w in weeks)

            roadmap = LearningRoadmap(
                student_id=student_id, goal_id=goal_id,
                title=title, roadmap_data=roadmap_json,
            )
            bg_db.add(roadmap)
            bg_db.commit()
            bg_db.refresh(roadmap)

            for week in weeks:
                wn = week.get("week_number", 1)
                for day in week.get("days", []):
                    bg_db.add(DailyTask(
                        roadmap_id=roadmap.id, task_type="learning",
                        topic=day.get("topic", f"Day {day.get('day_number', 1)}"),
                        description=day.get("description", ""),
                        assigned_date=datetime.utcnow(),
                        week_number=wn, day_number=day.get("day_number", 1),
                        subtopics=day.get("subtopics", []),
                    ))
            bg_db.commit()

            if bg_goal:
                bg_goal.status = "active"
                bg_db.commit()

            success_msg = (
                f"### 🚀 Roadmap Created Successfully!\n\n"
                f"**{title}**\n\n"
                f"- **Duration:** {len(weeks)} weeks\n"
                f"- **Total Tasks:** {tasks_count}\n\n"
                f"[Open Personal Dashboard](/personal) to start your learning journey!"
            )
            bg_db.add(ChatMessage(student_id=student_id, role="assistant", content=success_msg))
            bg_db.commit()
        except Exception as e:
            logger.error(f"Background roadmap generation failed: {e}")
            if 'bg_goal' in locals() and bg_goal:
                bg_goal.status = "failed"
                bg_db.commit()
            bg_db.add(ChatMessage(
                student_id=student_id, role="assistant",
                content="I'm sorry, I encountered an error while trying to generate your roadmap.",
            ))
            bg_db.commit()
        finally:
            bg_db.close()

    t = threading.Thread(target=bg_task, args=(request.student_id, goal_record.id, goal_str, duration_str))
    t.start()

    reply = f"I've started building your custom curriculum for '{goal_str}' in the background. It will be ready in your Personal Dashboard shortly! Feel free to ask me questions while you wait."
    yield json.dumps({"status": ""}) + "\n"
    yield json.dumps({"content": reply}) + "\n"

    db.add(ChatMessage(student_id=request.student_id, role="assistant", content=reply))
    db.commit()


# ═════════════════════════════════════════════════════════════════════════════
#  HELPER ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/chat/sessions/{student_id}")
def get_sessions(student_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import func
    # Find the latest message timestamp for each unique session_id
    subq = (
        db.query(
            ChatMessage.session_id,
            func.max(ChatMessage.created_at).label("latest_ts")
        )
        .filter(ChatMessage.student_id == student_id)
        .filter(ChatMessage.session_id.isnot(None))
        .group_by(ChatMessage.session_id)
        .subquery()
    )

    # Fetch details for the sessions sorted by active timestamp
    sessions = (
        db.query(
            ChatMessage.session_id,
            ChatMessage.session_title,
            subq.c.latest_ts
        )
        .join(subq, ChatMessage.session_id == subq.c.session_id)
        .filter(ChatMessage.created_at == subq.c.latest_ts)
        .order_by(subq.c.latest_ts.desc())
        .all()
    )

    return [
        {
            "session_id": s.session_id,
            "session_title": s.session_title or "Untitled Chat",
            "created_at": s.latest_ts.isoformat() if s.latest_ts else None
        }
        for s in sessions
    ]


@router.get("/chat/history/{student_id}", response_model=List[Message])
def get_history(student_id: int, session_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ChatMessage).filter(ChatMessage.student_id == student_id)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    else:
        # Get latest active session
        latest = (
            db.query(ChatMessage.session_id)
            .filter(ChatMessage.student_id == student_id)
            .filter(ChatMessage.session_id.isnot(None))
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        if latest and latest[0]:
            query = query.filter(ChatMessage.session_id == latest[0])
        else:
            return []

    msgs = query.order_by(ChatMessage.created_at.asc()).all()
    return [
        Message(
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat() if m.created_at else None,
            session_id=m.session_id
        )
        for m in msgs
    ]


@router.delete("/chat/history/{student_id}")
def clear_history(student_id: int, session_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ChatMessage).filter(ChatMessage.student_id == student_id)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
        msg = f"Cleared session {session_id}"
    else:
        msg = f"Cleared all history"
    deleted = query.delete()
    db.commit()
    return {"message": msg, "deleted": deleted}


@router.delete("/chat/history-item")
def delete_history_item(
    student_id: int,
    created_at: str,
    role: str = "user",
    db: Session = Depends(get_db),
):
    """Delete a single history entry identified by timestamp and role."""
    try:
        ts = datetime.fromisoformat(created_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid created_at timestamp")

    deleted = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.student_id == student_id,
            ChatMessage.role == role,
            ChatMessage.created_at == ts,
        )
        .delete()
    )
    db.commit()
    return {"deleted": deleted}