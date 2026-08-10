import json
import logging
import os
from typing import Optional
from sqlalchemy.orm import Session

from models import Document
from practice_models import LearningContent
from chroma_store import query_chunks
from services.practice.base import _practice_llm_call, _practice_llm_stream

logger = logging.getLogger("chatbot")


def generate_learning_content(student_id: int, topic: str, db: Session, subject: Optional[str] = None) -> dict:
    """
    Generate learning content for a specific topic, returning Notes and Revision JSON.
    Uses ChromaDB if document context exists, otherwise uses general knowledge.
    Caches the generated content in the database.
    """
    cached = db.query(LearningContent).filter(
        LearningContent.student_id == student_id,
        LearningContent.subject == subject,
        LearningContent.topic == topic
    ).first()

    if not cached:
        cached = db.query(LearningContent).filter(
            LearningContent.topic == topic
        ).first()

    if cached:
        return {
            "notesResponse": cached.content,
            "revision": cached.revision
        }

    context = _get_context(student_id, topic, subject, db)

    system_prompt = f"""You are a university professor explaining a complex concept to a student.
Teach the topic "{topic}" in a simple, highly readable, and structured learning note style (like an AI tutor, not a textbook).
Keep paragraphs short. Avoid dumping technical terms together. Use simple analogies.

You MUST output strictly a single valid JSON object containing "notes" (a list of content blocks) and "revision" (the cheat sheet).
JSON structure:
{{
    "notes": [
        {{"type": "heading", "text": "{topic}"}},
        {{"type": "heading", "text": "Concept"}},
        {{"type": "paragraph", "text": "Explain the concept in simple, natural, and friendly language."}},
        {{"type": "heading", "text": "Why is it Important?"}},
        {{"type": "paragraph", "text": "Explain why students should learn this concept and its value."}},
        {{"type": "heading", "text": "How it Works"}},
        {{"type": "paragraph", "text": "Explain step by step in a clear, logical order."}},
        {{"type": "heading", "text": "Real-world Analogy"}},
        {{"type": "paragraph", "text": "Use a simple analogy to make it easy to understand."}},
        {{"type": "heading", "text": "Example"}},
        {{"type": "code_block", "title": "Practical Example", "code": "practical code/real-world example..."}},
        {{"type": "heading", "text": "Key Takeaways"}},
        {{"type": "paragraph", "text": "Summarize key points..."}},
        {{"type": "heading", "text": "Interview Tips"}},
        {{"type": "paragraph", "text": "Common interview questions or tips..."}}
    ],
    "revision": {{
        "title": "Key Takeaways",
        "points": [
            {{"id": 1, "text": "Cheat sheet tip 1"}},
            {{"id": 2, "text": "Cheat sheet tip 2"}},
            {{"id": 3, "text": "Cheat sheet tip 3"}}
        ]
    }}
}}
"""

    extra = _get_extra_instructions(topic, subject)
    user_prompt = f"SUBJECT: {subject}\nTOPIC: {topic}\nCONTEXT: {context}\n{extra}\nGenerate the study guide and revision JSON.\nIMPORTANT: Only use the CONTEXT if it is directly about {topic}. Otherwise IGNORE it and use your general knowledge."

    logger.info(f"--- LLM PROMPT (Subject: {subject}, Topic: {topic}) ---")

    max_retries = 2
    response = ""
    for attempt in range(max_retries):
        response = _practice_llm_call(system_prompt, user_prompt, max_tokens=800)

        if subject == "Programming Fundamentals":
            forbidden_words = [
                "semaphore", "deadlock", "thread", "process", "synchronization",
                "mutex", "conditional variable", "operating system", "segmentation",
                "paging", "memory allocation", "page table", "segment table"
            ]
            resp_lower = response.lower()
            found_forbidden = [w for w in forbidden_words if w in resp_lower]

            if found_forbidden:
                logger.warning(f"Validation failed on attempt {attempt+1}. Found OS terminology: {found_forbidden}. Regenerating...")
                continue

        break

    error_reason = "LLM returned empty response" if not response else f"JSON parsing failed. Raw response: {response[:300]}"
    default_content = [
        {"type": "heading", "text": topic},
        {"type": "paragraph", "text": f"Content could not be generated. Debug info: {error_reason}"}
    ]
    default_revision = {
        "title": "Quick Revision",
        "points": [{"id": 1, "text": "Review this topic later."}]
    }

    try:
        if not response:
            raise Exception("Empty response")

        response_str = response.strip()
        if response_str.startswith("```json"):
            response_str = response_str[7:]
        elif response_str.startswith("```"):
            response_str = response_str[3:]
        if response_str.endswith("```"):
            response_str = response_str[:-3]

        parsed = json.loads(response_str)
        return {
            "notesResponse": parsed.get("notes", default_content),
            "revision": parsed.get("revision", default_revision)
        }
    except Exception as e:
        logger.error(f"[PracticeEngine] Failed to parse learning content JSON: {e}\nRaw Response:\n{response}")
        return {
            "notesResponse": default_content,
            "revision": default_revision
        }


# ── Helpers ──────────────────────────────────────────────────────

def _get_context(student_id: int, topic: str, subject: Optional[str], db: Session) -> str:
    """Retrieve at most 1 relevant chunk from ChromaDB, trimmed to 800 chars.
    Discards the chunk if it doesn't mention any word from the topic (relevance filter)."""
    try:
        docs = db.query(Document).filter(Document.student_id == student_id).all()
        if docs:
            search_query = f"{subject} {topic}" if subject else topic
            doc_ids = [d.id for d in docs]
            results = query_chunks(search_query, top_k=1, allowed_doc_ids=doc_ids)
            if results and results.get("documents") and results["documents"][0]:
                chunk = results["documents"][0][0][:800]
                # Relevance check: discard if the chunk doesn't mention the topic at all
                topic_words = [w.lower() for w in topic.split() if len(w) > 3]
                chunk_lower = chunk.lower()
                if topic_words and not any(w in chunk_lower for w in topic_words):
                    logger.info(f"[Context] Discarded irrelevant chunk for topic='{topic}'")
                    return ""
                return chunk
    except Exception as e:
        logger.warning(f"[PracticeEngine] ChromaDB query failed: {e}")
    return ""


def _get_extra_instructions(topic: str, subject: Optional[str]) -> str:
    """Return subject-specific guardrails."""
    if subject != "Programming Fundamentals":
        return ""
    lines = [
        "Generate notes ONLY within the context of Programming Fundamentals.",
        "Do NOT discuss Operating Systems concepts such as processes, threads, synchronization, semaphores, deadlocks, scheduling, memory management, segmentation, or paging."
    ]
    topic_map = {
        "Conditional Statements": "Allowed concepts: if, if-else, nested if, switch-case, comparison operators, logical operators, decision making.",
        "Functions": "Allowed concepts: function definition, function call, parameters, return values, scope, recursion, basic programming functions.",
        "Input Output Operations": "Allowed concepts: printf, scanf, standard streams, reading, writing, formatting strings.",
    }
    if topic in topic_map:
        lines.append(topic_map[topic])
    return "\n".join(lines)


# ── Fallback ─────────────────────────────────────────────────────

def generate_local_fallback_content(topic: str, subject: Optional[str], context: str) -> str:
    subj_name = subject or "General Computer Science"
    clean_context = context
    if not context or "No relevant content" in context:
        clean_context = f"This guide covers {topic} in the context of {subj_name}."

    paragraphs = [p.strip() for p in clean_context.split("\n\n") if p.strip()]
    what_is_desc = paragraphs[0] if paragraphs else f"{topic} is a key concept in {subj_name}."
    why_important = paragraphs[1] if len(paragraphs) > 1 else f"Understanding {topic} is critical to mastering the core principles of {subj_name}."
    how_works = paragraphs[2] if len(paragraphs) > 2 else f"It operates as part of the standard architecture of {subj_name} systems."

    return f"""# What is {topic}?

{what_is_desc}

---

## Why is it important?

{why_important}

---

## How does it work?

{how_works}

---

## Real-world Example

💡 Example: An analogy to help visualize {topic} is a coordinator ensuring operations flow smoothly in a system.

---REVISION---
{{"title":"Key Takeaways","points":[{{"id":1,"text":"Essential core concept of {topic} in {subj_name}."}},{{"id":2,"text":"Key performance and architectural implications."}},{{"id":3,"text":"Fundamental component for design and exams."}}]}}
"""


# ── Streaming endpoint ───────────────────────────────────────────

def stream_learning_content(student_id: int, topic: str, db: Session, subject: Optional[str] = None, cancel_event=None):
    """
    Stream learning content for a specific topic in Markdown.
    Uses Parallel Streaming to achieve ultra-fast Time-To-First-Token (3-5s):
    - Phase 1 (What, Why, How) starts streaming immediately.
    - Phase 2 (Example, Revision) generates in a background thread simultaneously.
    - Phase 2 appends seamlessly when Phase 1 finishes.
    """
    if cancel_event and cancel_event.is_set():
        return

    from roadmap_models import LearnerPreferences
    prefs = db.query(LearnerPreferences).filter(LearnerPreferences.student_id == student_id).first()
    proficiency = prefs.proficiency if prefs else "Beginner"

    # Minimal context to save input tokens (faster TTFT)
    context = _get_context(student_id, topic, subject, db)
    extra = _get_extra_instructions(topic, subject)
    ctx_block = f"\n[REF]\n{context}" if context else ""
    user_prompt = f"Subject: {subject or 'General Computer Science'}\nTopic: {topic}{ctx_block}\n{extra}"

    # --- Phase 1: Core Concepts (Fast) ---
    sys_prompt_1 = f"""AI tutor. Explain "{topic}" (~150 words). Level: {proficiency}.
Use EXACTLY these markdown headings:
# What is {topic}?
---
## Why is it important?
---
## How does it work?
(Stop after this section)."""

    # --- Phase 2: Examples & Revision (Background) ---
    sys_prompt_2 = f"""AI tutor. Generate the second half of the study guide for "{topic}". Level: {proficiency}.
Start EXACTLY with:
---
## Real-world Example
💡 Example:

---REVISION---
{{"title":"Key Takeaways","points":[{{"id":1,"text":"Tip 1"}},{{"id":2,"text":"Tip 2"}},{{"id":3,"text":"Tip 3"}}]}}
No extra text. JSON exactly 3 points, no code fences."""

    logger.info(f"[Stream] Starting sequential streaming for {topic}")
    
    full_response = ""
    had_error = False
    
    # 1. Stream Phase 1 to user
    try:
        for chunk in _practice_llm_stream(sys_prompt_1, user_prompt, max_tokens=400, cancel_event=cancel_event):
            if cancel_event and cancel_event.is_set():
                return
            if chunk.startswith("ERROR:"):
                had_error = True
                break
            full_response += chunk
            yield chunk
    except Exception as e:
        logger.error(f"[Phase1] Error: {e}")
        had_error = True

    # 2. Stream Phase 2 (Sequential, no overlapping requests to avoid single-concurrency deadlock)
    if not had_error:
        # Yield newlines to prevent concatenating with Phase 1's last line
        yield "\n\n"
        full_response += "\n\n"
        
        try:
            for chunk in _practice_llm_stream(sys_prompt_2, user_prompt, max_tokens=300, cancel_event=cancel_event):
                if cancel_event and cancel_event.is_set():
                    return
                if chunk.startswith("ERROR:"):
                    # Don't break the whole response if example fails, but log it
                    logger.warning(f"[Phase2] Stream returned error: {chunk}")
                    break
                full_response += chunk
                yield chunk
        except Exception as e:
            logger.error(f"[Phase2] Error: {e}")

    # 3. Fallback only if catastrophic failure (nothing was generated)
    if had_error or not full_response.strip() or len(full_response.strip()) < 50:
        logger.warning(f"[Stream] LLM failed entirely or generated too little. Using basic fallback.")
        full_response = generate_local_fallback_content(topic, subject, context)
        for i in range(0, len(full_response), 128):
            yield full_response[i:i+128]

    # 4. Save to cache permanently
    if not (cancel_event and cancel_event.is_set()):
        _save_to_cache(student_id, topic, subject, full_response)


def _save_to_cache(student_id: int, topic: str, subject: Optional[str], full_response: str):
    """Parse the streamed response and save it permanently to the database."""
    try:
        parts = full_response.split("---REVISION---")
        markdown_content = parts[0].strip()
        revision_data = {"title": "Quick Revision", "points": [{"id": 1, "text": "Review this topic later."}]}
        if len(parts) > 1:
            try:
                revision_data = json.loads(parts[1].strip())
            except Exception:
                pass

        from database import SessionLocal
        local_db = SessionLocal()
        try:
            existing = local_db.query(LearningContent).filter(
                LearningContent.student_id == student_id,
                LearningContent.subject == subject,
                LearningContent.topic == topic
            ).first()
            if existing:
                local_db.delete(existing)
                local_db.commit()

            new_cache = LearningContent(
                student_id=student_id,
                subject=subject,
                topic=topic,
                content=markdown_content,
                revision=revision_data
            )
            local_db.add(new_cache)
            local_db.commit()
        finally:
            local_db.close()
    except Exception as e:
        logger.error(f"[StreamContent] Failed to cache: {e}")

