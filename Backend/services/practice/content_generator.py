import json
import logging
import os
import re
from typing import Optional
from sqlalchemy.orm import Session

from models import Document
from practice_models import LearningContent
from chroma_store import query_chunks
from services.practice.base import _practice_llm_call, _practice_llm_stream

logger = logging.getLogger("chatbot")


def _fallback_revision(topic: str, subject: Optional[str] = None) -> dict:
    subject_name = subject or "the subject"
    return {
        "title": "Key Takeaways",
        "points": [
            {"id": 1, "text": f"Understand the core purpose and components of {topic}."},
            {"id": 2, "text": f"Know how {topic} works in {subject_name}."},
            {"id": 3, "text": f"Review the important uses, trade-offs, and exam points for {topic}."},
        ],
    }


def _parse_json_object(raw_response: str):
    """Parse JSON even when a model adds a short prefix or markdown fence."""
    if not raw_response:
        raise ValueError("Empty JSON response")

    response = raw_response.strip()
    fence = chr(96) * 3
    if response.startswith(fence + "json"):
        response = response[7:]
    elif response.startswith(fence):
        response = response[3:]
    if response.endswith(fence):
        response = response[:-3]
    response = response.strip()

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        start = response.find("{")
        end = response.rfind("}")
        if start < 0 or end <= start:
            raise
        return json.loads(response[start:end + 1])


def normalize_revision(revision, topic: str = "the topic", subject: Optional[str] = None) -> dict:
    """Return one predictable, non-empty three-point revision payload."""
    points = revision.get("points") if isinstance(revision, dict) else revision
    if isinstance(revision, dict) and not points:
        points = revision.get("bullets")

    normalized = []
    if isinstance(points, list):
        for point in points:
            if isinstance(point, dict):
                text = point.get("text") or point.get("point") or point.get("content")
            else:
                text = point
            if isinstance(text, str) and text.strip():
                normalized.append({"id": len(normalized) + 1, "text": text.strip()})

    fallback_text = "review this topic later"
    if len(normalized) < 3 or any(fallback_text in p["text"].lower() for p in normalized):
        return _fallback_revision(topic, subject)

    title = revision.get("title") if isinstance(revision, dict) else None
    return {"title": title or "Key Takeaways", "points": normalized[:6]}


def has_valid_revision(revision) -> bool:
    """Identify old/corrupt cache entries that only contain the placeholder point."""
    if not isinstance(revision, dict) or not isinstance(revision.get("points"), list):
        return False
    points = revision["points"]
    return len(points) >= 3 and all(
        isinstance(point, dict)
        and isinstance(point.get("text"), str)
        and point["text"].strip()
        and "review this topic later" not in point["text"].lower()
        for point in points[:3]
    )


def split_revision_payload(content: str, topic: str = "the topic", subject: Optional[str] = None):
    """Return clean lesson text and the optional structured revision trailer."""
    if not isinstance(content, str):
        return content, None

    marker = re.search(r"---\s*REVISION\s*---", content, flags=re.IGNORECASE)
    if not marker:
        return content, None

    clean_content = content[:marker.start()].strip()
    revision = None
    try:
        parsed = _parse_json_object(content[marker.end():])
        revision = normalize_revision(parsed, topic, subject)
    except Exception:
        logger.debug("Could not parse embedded revision payload for topic '%s'", topic)
    return clean_content, revision


def _generate_revision(topic: str, subject: Optional[str], markdown_content: str) -> dict:
    """Generate the short revision payload separately from the long study guide."""
    system_prompt = """You are a university professor creating a quick revision card.
Return ONLY one valid JSON object with this exact shape:
{"title":"Key Takeaways","points":[{"id":1,"text":"..."},{"id":2,"text":"..."},{"id":3,"text":"..."}]}
Write exactly three concise, topic-specific takeaways. Do not use markdown, code fences, or commentary."""
    user_prompt = (
        f"SUBJECT: {subject or 'General Computer Science'}\nTOPIC: {topic}\n"
        f"STUDY GUIDE:\n{markdown_content[-7000:]}"
    )
    try:
        raw = _practice_llm_call(system_prompt, user_prompt, max_tokens=400)
        return normalize_revision(_parse_json_object(raw), topic, subject)
    except Exception as exc:
        logger.warning(f"[PracticeEngine] Revision generation failed for '{topic}': {exc}")
        return _fallback_revision(topic, subject)


def _revision_from_response(full_response: str, topic: str, subject: Optional[str]) -> dict:
    markdown_content, embedded_revision = split_revision_payload(full_response, topic, subject)
    if embedded_revision and has_valid_revision(embedded_revision):
        return embedded_revision
    return _generate_revision(topic, subject, markdown_content)

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

    if cached:
        cached_content, embedded_revision = split_revision_payload(cached.content, topic, subject)
        return {
            "notesResponse": cached_content,
            "revision": cached.revision or embedded_revision
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
        response = _practice_llm_call(system_prompt, user_prompt, max_tokens=1800)

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
    default_revision = _fallback_revision(topic, subject)

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

        parsed = _parse_json_object(response_str)
        notes = parsed.get("notes", default_content)
        revision = normalize_revision(parsed.get("revision"), topic, subject)
        if not has_valid_revision(parsed.get("revision")):
            revision = _generate_revision(topic, subject, json.dumps(notes))
        return {
            "notesResponse": notes,
            "revision": revision
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

    # --- Detailed Single Stream ---
    sys_prompt = f"""You are a university professor explaining a complex concept to a student. Level: {proficiency}.
Teach the topic "{topic}" in a highly readable, structured, and detailed learning note style. Be comprehensive and thorough, making it extremely helpful for the student. Provide a full, rich explanation.

Use EXACTLY these markdown headings:
# What is {topic}?
---
## Why is it important?
---
## How does it work?
---
## Real-world Example
💡 Example:
[Insert your detailed real-world example here]

After the example, you MUST append the revision section exactly in this format:
---REVISION---
{{"title":"Key Takeaways","points":[{{"id":1,"text":"First key point"}},{{"id":2,"text":"Second key point"}},{{"id":3,"text":"Third key point"}}]}}

Ensure the JSON is valid and contains exactly 3 key takeaways. Do not wrap the JSON in markdown code blocks or code fences."""

    logger.info(f"[Stream] Starting detailed streaming for {topic}")
    
    full_response = ""
    had_error = False
    
    try:
        for chunk in _practice_llm_stream(sys_prompt, user_prompt, max_tokens=4000, cancel_event=cancel_event):
            if cancel_event and cancel_event.is_set():
                return
            if chunk.startswith("ERROR:"):
                had_error = True
                break
            full_response += chunk
            yield chunk
    except Exception as e:
        logger.error(f"[Stream] Error: {e}")
        had_error = True

    # Fallback only if catastrophic failure (nothing was generated)
    if had_error or not full_response.strip() or len(full_response.strip()) < 50:
        logger.warning(f"[Stream] LLM failed entirely or generated too little. Using basic fallback.")
        full_response = generate_local_fallback_content(topic, subject, context)
        for i in range(0, len(full_response), 128):
            yield full_response[i:i+128]

    # Generate the short revision separately so a long guide cannot truncate it.
    if not had_error and full_response.strip():
        markdown_content, _ = split_revision_payload(full_response, topic, subject)
        revision_data = _revision_from_response(full_response, topic, subject)
        full_response = f"{markdown_content}\n\n---REVISION---\n{json.dumps(revision_data)}"
        yield f"\n\n---REVISION---\n{json.dumps(revision_data)}"

    # Save to cache permanently
    if not (cancel_event and cancel_event.is_set()):
        _save_to_cache(student_id, topic, subject, full_response)


def _save_to_cache(student_id: int, topic: str, subject: Optional[str], full_response: str):
    """Parse the streamed response and save it permanently to the database."""
    try:
        markdown_content, embedded_revision = split_revision_payload(full_response, topic, subject)
        revision_data = embedded_revision or _fallback_revision(topic, subject)

        if not has_valid_revision(revision_data):
            revision_data = _generate_revision(topic, subject, markdown_content)

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

