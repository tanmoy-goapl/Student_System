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
    
    if cached:
        return {
            "notesResponse": cached.content,
            "revision": cached.revision
        }

    subtopics_str = ""
    is_curriculum_subject = False
    is_document_topic = False
    
    if subject:
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            p = os.path.join(base_dir, "config", "subject_topics.json")
            if os.path.exists(p):
                with open(p, "r") as f:
                    subject_topics = json.load(f)
                if subject in subject_topics:
                    is_curriculum_subject = True
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to load subject_topics: {e}")

    context = ""
    try:
        docs = db.query(Document).filter(Document.student_id == student_id).all()
        if docs:
            search_query = f"{subject} {topic}" if subject else topic
            doc_ids = [d.id for d in docs]
            results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
            if results and results.get("documents") and results["documents"][0]:
                context = "\n\n".join(results["documents"][0])
    except Exception as e:
        logger.warning(f"[PracticeEngine] Failed to query documents from ChromaDB: {e}")
                
    if not context:
        context = "(Use highly rigorous general knowledge for a college level curriculum)"

    extra_instructions = ""
    if subject == "Programming Fundamentals":
        extra_instructions += "\nGenerate notes ONLY within the context of Programming Fundamentals.\n"
        extra_instructions += "Do NOT discuss Operating Systems concepts such as processes, threads, synchronization, semaphores, deadlocks, scheduling, memory management, segmentation, or paging.\n"
        if topic == "Conditional Statements":
            extra_instructions += "Allowed concepts: if, if-else, nested if, switch-case, comparison operators, logical operators, decision making.\n"
        elif topic == "Functions":
            extra_instructions += "Allowed concepts: function definition, function call, parameters, return values, scope, recursion, basic programming functions.\n"
        elif topic == "Input Output Operations":
            extra_instructions += "Allowed concepts: printf, scanf, standard streams, reading, writing, formatting strings.\n"

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

    context_str = f"Subject / Context: {subject or 'General Computer Science'}\n"
    user_prompt = f"SUBJECT:\n{subject}\n\nTOPIC:\n{topic}\n\nCONTEXT:\n{context_str}{context}\n\n{subtopics_str}Generate the study guide and revision JSON.\nIMPORTANT: Only use the CONTEXT if it strictly belongs to the SUBJECT ({subject}). If the context is about a different subject (e.g., Operating Systems), IGNORE the context entirely and use your general knowledge.\n{extra_instructions}"

    logger.info(f"--- LLM PROMPT (Subject: {subject}, Topic: {topic}) ---")
    
    max_retries = 2
    response = ""
    for attempt in range(max_retries):
        response = _practice_llm_call(system_prompt, user_prompt, max_tokens=2000)
        
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

def generate_local_fallback_content(topic: str, subject: Optional[str], context: str) -> str:
    subj_name = subject or "General Computer Science"
    clean_context = context
    if "No relevant content" in context or "use highly rigorous" in context:
        clean_context = f"This guide covers {topic} in the context of {subj_name}."
    
    paragraphs = [p.strip() for p in clean_context.split("\n\n") if p.strip()]
    what_is_desc = paragraphs[0] if len(paragraphs) > 0 else f"{topic} is a key concept in {subj_name}."
    why_important = paragraphs[1] if len(paragraphs) > 1 else f"Understanding {topic} is critical to mastering the core principles of {subj_name}."
    how_works = paragraphs[2] if len(paragraphs) > 2 else f"It operates as part of the standard architecture of {subj_name} systems."
    
    fallback_text = f"""# What is {topic}?

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
{{
    "title": "Key Takeaways",
    "points": [
        {{"id": 1, "text": "Essential core concept of {topic} in {subj_name}."}},
        {{"id": 2, "text": "Key performance and architectural implications."}},
        {{"id": 3, "text": "Fundamental component for design and exams."}}
    ]
}}
"""
    return fallback_text

def stream_learning_content(student_id: int, topic: str, db: Session, subject: Optional[str] = None):
    """
    Stream learning content for a specific topic in Markdown, returning chunks.
    Yields chunks of the study guide, and at the end, the revision JSON block.
    """
    subtopics_str = ""
    is_curriculum_subject = False
    is_document_topic = False
    
    if subject:
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            p = os.path.join(base_dir, "config", "subject_topics.json")
            if os.path.exists(p):
                with open(p, "r") as f:
                    subject_topics = json.load(f)
                if subject in subject_topics:
                    is_curriculum_subject = True
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to load subject_topics: {e}")

    context = ""
    try:
        docs = db.query(Document).filter(Document.student_id == student_id).all()
        if docs:
            search_query = f"{subject} {topic}" if subject else topic
            doc_ids = [d.id for d in docs]
            results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
            if results and results.get("documents") and results["documents"][0]:
                context = "\n\n".join(results["documents"][0])
    except Exception as e:
        logger.warning(f"[PracticeEngine] Failed to query documents from ChromaDB: {e}")
                
    if not context:
        context = "(Use highly rigorous general knowledge for a college level curriculum)"

    extra_instructions = ""
    if subject == "Programming Fundamentals":
        extra_instructions += "\nGenerate notes ONLY within the context of Programming Fundamentals.\n"
        extra_instructions += "Do NOT discuss Operating Systems concepts such as processes, threads, synchronization, semaphores, deadlocks, scheduling, memory management, segmentation, or paging.\n"

    from roadmap_models import LearnerPreferences
    prefs = db.query(LearnerPreferences).filter(LearnerPreferences.student_id == student_id).first()
    proficiency = prefs.proficiency if prefs else "Beginner"

    system_prompt = f"""You are a university professor explaining a complex concept to a student.
Teach the topic "{topic}" in a simple, highly readable, and structured learning note style (like an AI tutor, not a textbook).
Keep paragraphs short. Avoid dumping technical terms together. Use simple analogies.

Adjust the complexity and technical depth of your explanation to match the student's proficiency level: "{proficiency}".
- For Beginner/Basic: Use simple language, focus on high-level concepts, and use clear relatable analogies.
- For Intermediate/Advanced: Gradually increase technical depth, include architecture details, process states, and advanced implications.

CRITICAL: You MUST structure your markdown explanation exactly and ONLY with the following four headings. Do NOT output any other headings, subheadings, or numbered subtopics:

# What is {topic}?

Simple explanation.

---

## Why is it important?

Explain why students should learn it.

---

## How does it work?

Step-by-step explanation.

---

## Real-world Example

Simple example/analogy. Start with:
💡 Example: ...

---REVISION---
{{
    "title": "Key Takeaways",
    "points": [
        {{"id": 1, "text": "Hard-hitting interview tip or takeaway 1"}},
        {{"id": 2, "text": "Hard-hitting interview tip or takeaway 2"}},
        {{"id": 3, "text": "Hard-hitting interview tip or takeaway 3"}}
    ]
}}

CRITICAL RULES:
- Generate content ONLY within the context of the provided subject.
- Use callouts specifically starting with:
  - 💡 Example:
  - ⚠️ Important:
  - 🎯 Interview Tip:
  - 📌 Remember:
- The JSON block MUST have exactly 3 bullet points and be placed after the ---REVISION--- separator.
- Do not use markdown code block fencing around the JSON block.
- NEVER use emoji numbers or icon blocks (like 1️⃣, 2️⃣) for headings or lists.
- NEVER output raw markdown tables (using | columns). Present comparisons or grids using structured text or bullet points.
- NEVER output LaTeX mathematical formatting. Express all formulas in simple plain text (e.g. "R(h) = (1/N) * sum(L(...))").
"""

    context_str = f"Subject / Context: {subject or 'General Computer Science'}\n"
    user_prompt = f"SUBJECT:\n{subject}\n\nTOPIC:\n{topic}\n\nCONTEXT:\n{context_str}{context}\n\n{subtopics_str}Generate the study guide and revision JSON.\nIMPORTANT: Only use the CONTEXT if it strictly belongs to the SUBJECT ({subject}). Map all technical facts from the CONTEXT strictly under the four mandated headings: '# What is...', '## Why is it important?', '## How does it work?', and '## Real-world Example'. Do NOT output any slide titles, custom subtopic headings, or numbered sections (like '1. ...') from the CONTEXT.\n{extra_instructions}"

    logger.info(f"--- LLM PROMPT (Subject: {subject}, Topic: {topic}) ---")
    
    full_response = ""
    had_error = False
    try:
        for chunk in _practice_llm_stream(system_prompt, user_prompt, max_tokens=2000):
            if chunk.startswith("ERROR:"):
                had_error = True
                break
            full_response += chunk
            yield chunk
    except Exception as stream_err:
        logger.error(f"[PracticeEngine] Streaming error: {stream_err}")
        had_error = True

    if had_error or not full_response.strip():
        logger.warning(f"[PracticeEngine] LLM failed to stream. Generating local fallback study guide for '{topic}'...")
        fallback_data = generate_local_fallback_content(topic, subject, context)
        full_response = fallback_data
        chunk_size = 64
        for i in range(0, len(fallback_data), chunk_size):
            yield fallback_data[i:i+chunk_size]
        return
        
    try:
        parts = full_response.split("---REVISION---")
        markdown_content = parts[0].strip()
        revision_data = {"title": "Quick Revision", "points": [{"id": 1, "text": "Review this topic later."}]}
        if len(parts) > 1:
            try:
                revision_data = json.loads(parts[1].strip())
            except:
                pass
                
        from database import SessionLocal
        local_db = SessionLocal()
        try:
            # Delete any existing cache first to avoid duplicates
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
            logger.info(f"Successfully cached streamed content for topic='{topic}', subject='{subject}'")
        finally:
            local_db.close()
    except Exception as e:
        logger.error(f"[PracticeEngine] Failed to cache streamed content: {e}")
