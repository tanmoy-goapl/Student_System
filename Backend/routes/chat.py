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
import time
import uuid

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
from services.query_planner import plan_retrieval_strategy
from services.document_resolver import resolve_documents, get_role_visible_docs
from services.context_builder import build_context

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
        t0 = time.perf_counter()
        logger.info(f"  [Timing] FastAPI Request started processing at {t0:.3f}")
        yield json.dumps({"status": "Thinking..."}) + "\n"

        # ── Fetch user-visible documents (role-aware) ─────────────────────────
        t_docs = time.perf_counter()
        all_docs = get_role_visible_docs(request.student_id, request.role, db)

        # ── Detect mode ──────────────────────────────────────────────────────
        mode = detect_retrieval_mode(request.question, db, request.student_id)
        logger.info(f"  Detected Mode: {mode.value}")
        logger.info(f"  [Timing] Docs + Mode Detection: {time.perf_counter() - t_docs:.3f}s")

        # ── Resolve or generate session ────────────────────────────────────────
        session_id = request.session_id or str(uuid.uuid4())
        session_title = request.session_title
        if not session_title:
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

        # ── Personal Onboarding Interception ──────────────────────────────────
        from services.personal_roadmap import (
            is_onboarding_active, reset_learner_preferences, handle_preferences_onboarding,
            get_learner_preferences, generate_personalized_roadmap
        )
        
        q_lower = request.question.strip().lower()
        if q_lower == "update learning preferences" or q_lower == "edit answers":
            reset_learner_preferences(request.student_id, db)
            
        onboarding_already_active = is_onboarding_active(request.student_id, db)
        onboarding_in_progress = onboarding_already_active or q_lower == "update learning preferences" or q_lower == "edit answers"
        
        is_roadmap_request = not onboarding_already_active and (
            (mode == RetrievalMode.ROADMAP_CREATION) or ("create a roadmap" in q_lower) or ("create a personalized roadmap" in q_lower)
        )
        
        if is_roadmap_request:
            reset_learner_preferences(request.student_id, db)
            onboarding_in_progress = True

        if onboarding_in_progress:
            if q_lower == "generate roadmap":
                yield json.dumps({"status": "Creating your personalized roadmap..."}) + "\n"
                time.sleep(1.0)
                yield json.dumps({"status": "Analyzing your learning preferences..."}) + "\n"
                time.sleep(1.0)
                yield json.dumps({"status": "Building weekly learning plan..."}) + "\n"
                time.sleep(0.5)

                try:
                    res = generate_personalized_roadmap(request.student_id, db)
                except Exception as ex:
                    logger.error(f"Failed to generate personalized roadmap: {ex}", exc_info=True)
                    res = {
                        "content": f"### ❌ Error Generating Roadmap\n\nAn unexpected error occurred during generation: {ex}. Please try again.",
                        "intent": "ROADMAP_CREATION",
                        "roadmap_metadata": {
                            "title": "Error Roadmap",
                            "duration": "N/A",
                            "weeks": 0,
                            "tasks": 0
                        }
                    }

                prefs = get_learner_preferences(request.student_id, db)
                if prefs:
                    prefs.onboarding_active = False
                    db.commit()

                yield json.dumps({"status": ""}) + "\n"
                yield json.dumps({"content": res.get("content", "")}) + "\n"

                try:
                    db.add(ChatMessage(
                        student_id=request.student_id, role="assistant", content=res.get("content", ""),
                        session_id=session_id, session_title=session_title
                    ))
                    db.commit()
                except Exception as e:
                    logger.error(f"Failed to persist assistant roadmap reply: {e}")

                payload = {
                    "session_id": session_id,
                    "session_title": res.get("roadmap_metadata", {}).get("title", "Custom Roadmap"),
                    "intent": res.get("intent"),
                    "roadmap_metadata": res.get("roadmap_metadata")
                }
                yield json.dumps(payload) + "\n"
                return

            intro_prefix = ""
            if is_roadmap_request:
                intro_prefix = "Sure! Before I create a personalized roadmap, I'd like to know a little about you.\n\n"
                
            res = handle_preferences_onboarding(request.student_id, request.question, db)
            assistant_content = intro_prefix + res.get("content", "")

            try:
                db.add(ChatMessage(
                    student_id=request.student_id, role="assistant", content=assistant_content,
                    session_id=session_id, session_title=session_title
                ))
                db.commit()
            except Exception as e:
                logger.error(f"Failed to persist assistant onboarding reply: {e}")

            yield json.dumps({"status": ""}) + "\n"
            yield json.dumps({"content": assistant_content}) + "\n"
            
            payload = {
                "session_id": session_id,
                "session_title": "Learning Onboarding"
            }
            if "options" in res:
                payload["options"] = res["options"]
            if "intent" in res:
                payload["intent"] = res["intent"]
            if "roadmap_metadata" in res:
                payload["roadmap_metadata"] = res["roadmap_metadata"]
                
            yield json.dumps(payload) + "\n"
            return

        # ── ROADMAP CREATION (separate pipeline, not retrieval) ──────────────
        if mode == RetrievalMode.ROADMAP_CREATION:
            yield from _handle_roadmap(request, db)
            return

        # ── STAGE 1: Intent Resolution ──────────────────────────────────────
        # mode is already resolved by detect_retrieval_mode

        # ── STAGE 2 & 3: Document Resolution ────────────────────────────────
        target_docs, searched_docs = resolve_documents(
            mode=mode,
            question=request.question,
            student_id=request.student_id,
            role=request.role,
            db=db
        )

        all_docs = get_role_visible_docs(request.student_id, request.role, db)

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

        # ── STAGE 2: Query Planning ──────────────────────────────────────────
        strategy = plan_retrieval_strategy(
            question=request.question,
            has_specific_target_docs=bool(target_docs)
        )

        yield json.dumps({"status": "Searching documents..."}) + "\n"

        # ── STAGE 4: Context Building & Quota Ranking ────────────────────────
        t_retrieval_start = time.perf_counter()
        chunks, searched_doc_names, retrieved_doc_names, context = build_context(
            strategy=strategy,
            question=request.question,
            target_docs=target_docs,
            searched_docs=searched_docs,
            db=db
        )
        t_retrieval_end = time.perf_counter()
        logger.info(f"  [Timing] Retrieval & Context Building: {t_retrieval_end - t_retrieval_start:.3f}s")

        yield json.dumps({"status": ""}) + "\n"

        # ── STAGE 5: Prompt Construction & LLM Streaming ─────────────────────
        t_prompt_start = time.perf_counter()
        from services.personal_roadmap import get_learner_preferences
        prefs = get_learner_preferences(request.student_id, db)
        proficiency = prefs.proficiency if prefs else None

        system_prompt = _build_system_prompt(
            mode=mode,
            doc_names=searched_doc_names,
            context=context,
            role=request.role,
            user_name=student_name,
            proficiency=proficiency
        )
        source_docs = retrieved_doc_names

        # ── Conversation history ─────────────────────────────────────────────
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.student_id == request.student_id)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )[-HISTORY_LIMIT:]

        system_prompt = _build_system_prompt(mode, searched_doc_names, context, request.role, student_name, proficiency=proficiency)

        if request.reset:
            history_for_llm: list[Message] = []
        else:
            history_for_llm = [Message(role=m.role, content=m.content) for m in history]

        t_prompt_end = time.perf_counter()
        logger.info(f"  [Timing] Context + Prompt Building: {t_prompt_end - t_prompt_start:.3f}s")

        # ── Stream LLM response ──────────────────────────────────────────────
        full_answer = ""
        first_chunk = True
        t_llm_start = time.perf_counter()
        for chunk in _call_llm_stream(system_prompt, history_for_llm, request.question):
            if first_chunk:
                t_first_token = time.perf_counter()
                logger.info(f"  [Timing] Backend First Token Loop hit: {t_first_token - t_llm_start:.3f}s since LLM call")
                logger.info(f"  [Timing] Total TTFT (user → first token loop): {t_first_token - t0:.3f}s")
                first_chunk = False
            full_answer += chunk
            yield json.dumps({"content": chunk}) + "\n"
            
        t_stream_end = time.perf_counter()
        logger.info(f"  [Timing] LLM Streaming Duration: {t_stream_end - t_llm_start:.3f}s")
        logger.info(f"  [Timing] Total Response Time: {t_stream_end - t0:.3f}s")

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
        q_lower = request.question.lower()
        if any(w in q_lower for w in ["become", "prepare", "study", "learn", "how do i", "guide"]):
            final_payload["suggest_roadmap"] = True

        yield json.dumps(final_payload) + "\n"

    return StreamingResponse(
        yield_main(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
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