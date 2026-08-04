import json
import logging
import re
import os
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from database import get_db

logger = logging.getLogger("chatbot")

router = APIRouter()

from services.practice.base import _practice_llm_stream

from practice_models import AICache

@router.get("/explain/stream")
def explain_topic_stream(student_id: int, topic_name: str, db: Session = Depends(get_db)):
    cached = db.query(AICache).filter(
        AICache.topic == topic_name,
        AICache.action_type == "explain"
    ).first()

    if cached and "[CONCEPT]" not in cached.content:
        try:
            db.delete(cached)
            db.commit()
            logger.info(f"Invalidated old explain cache format for topic '{topic_name}'")
        except Exception:
            db.rollback()
        cached = None

    if cached:
        def yield_cached():
            yield cached.content
        return StreamingResponse(
            yield_cached(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )

    system_prompt = f"""You are a helpful teaching assistant.
Explain the concept "{topic_name}" in extremely simple, friendly, and plain English.
Use the following structure exactly. Do not add any other text outside these tags.
Use '===' as the block separator. Keep the text concise and easy to read.

[CONCEPT]
Explain the concept here in 2-3 short, clear sentences.

===

[ANALOGY]
Provide a simple, relatable analogy here.

===

[TAKEAWAY]
Provide a single-sentence key takeaway here."""
    user_prompt = f"Explain the topic: {topic_name}"

    def generate_and_cache():
        full_text = ""
        for chunk in _practice_llm_stream(system_prompt, user_prompt):
            full_text += chunk
            yield chunk
        try:
            from database import SessionLocal
            local_db = SessionLocal()
            try:
                local_db.add(AICache(
                    student_id=student_id,
                    topic=topic_name,
                    action_type="explain",
                    content=full_text
                ))
                local_db.commit()
                logger.info(f"Cached explain action for topic='{topic_name}'")
            finally:
                local_db.close()
        except Exception as e:
            logger.error(f"Failed to cache explain action: {e}")

    return StreamingResponse(
        generate_and_cache(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
    )

@router.get("/examples/stream")
def give_examples_stream(student_id: int, topic_name: str, db: Session = Depends(get_db)):
    cached = db.query(AICache).filter(
        AICache.topic == topic_name,
        AICache.action_type == "examples"
    ).first()

    if cached and "[TITLE]" not in cached.content:
        try:
            db.delete(cached)
            db.commit()
            logger.info(f"Invalidated old examples cache format for topic '{topic_name}'")
        except Exception:
            db.rollback()
        cached = None

    if cached:
        def yield_cached():
            yield cached.content
        return StreamingResponse(
            yield_cached(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )


    system_prompt = f"""You are a helpful teaching assistant.
Provide exactly 3 highly relatable real-world examples for the concept "{topic_name}".
Use the following structure exactly. Do not add any other text outside these tags.
Use '===' as the block separator. Keep descriptions concise.

[TITLE]
1. Real-World Scenario
[CONTENT]
A short, 2-3 sentence description of the example and why it applies.

===

[TITLE]
2. Industry Application
[CONTENT]
A short, 2-3 sentence description of the example and why it applies.

===

[TITLE]
3. Everyday Analogy
[CONTENT]
A short, 2-3 sentence description of the example and why it applies."""
    user_prompt = f"Generate examples for the topic: {topic_name}"

    def generate_and_cache():
        full_text = ""
        for chunk in _practice_llm_stream(system_prompt, user_prompt):
            full_text += chunk
            yield chunk
        try:
            from database import SessionLocal
            local_db = SessionLocal()
            try:
                local_db.add(AICache(
                    student_id=student_id,
                    topic=topic_name,
                    action_type="examples",
                    content=full_text
                ))
                local_db.commit()
                logger.info(f"Cached examples action for topic='{topic_name}'")
            finally:
                local_db.close()
        except Exception as e:
            logger.error(f"Failed to cache examples action: {e}")

    return StreamingResponse(
        generate_and_cache(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
    )

@router.get("/flashcard/stream")
def flashcard_topic_stream(student_id: int, topic_name: str, db: Session = Depends(get_db)):
    cached = db.query(AICache).filter(
        AICache.topic == topic_name,
        AICache.action_type == "flashcard"
    ).first()

    if cached and "[QUESTION]" not in cached.content:
        try:
            db.delete(cached)
            db.commit()
            logger.info(f"Invalidated old flashcard cache format for topic '{topic_name}'")
        except Exception:
            db.rollback()
        cached = None


    if cached:
        def yield_cached():
            yield cached.content
        return StreamingResponse(
            yield_cached(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
        )


    system_prompt = f"""You are a helpful teaching assistant.
Generate exactly 5 interactive exam flashcards for the concept "{topic_name}".
Use the following structure exactly. Do not add any other text outside these tags.
Use '===' as the block separator. Keep questions and answers concise.

[QUESTION]
Question 1 text here?
[ANSWER]
Answer 1 text here.

===

[QUESTION]
Question 2 text here?
[ANSWER]
Answer 2 text here.

===

[QUESTION]
Question 3 text here?
[ANSWER]
Answer 3 text here.

===

[QUESTION]
Question 4 text here?
[ANSWER]
Answer 4 text here.

===

[QUESTION]
Question 5 text here?
[ANSWER]
Answer 5 text here."""
    user_prompt = f"Generate study flashcards for the topic: {topic_name}"


    def generate_and_cache():
        full_text = ""
        for chunk in _practice_llm_stream(system_prompt, user_prompt):
            full_text += chunk
            yield chunk
        try:
            from database import SessionLocal
            local_db = SessionLocal()
            try:
                local_db.add(AICache(
                    student_id=student_id,
                    topic=topic_name,
                    action_type="flashcard",
                    content=full_text
                ))
                local_db.commit()
                logger.info(f"Cached flashcard action for topic='{topic_name}'")
            finally:
                local_db.close()
        except Exception as e:
            logger.error(f"Failed to cache flashcard action: {e}")

    return StreamingResponse(
        generate_and_cache(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
    )


class ExplainRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class ExampleRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class SummarizeRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class CheatSheetRequest(BaseModel):
    student_id: int
    topic_name: str
    topic_content: Optional[str] = None

class SaveNotesRequest(BaseModel):
    student_id: int
    topic_name: str
    generated_notes: str


@router.post("/explain")
def explain_topic(req: ExplainRequest):
    from routes.chat import _call_llm
    prompt = f"""You are an expert tutor explaining a technical concept.
Explain the topic "{req.topic_name}" in very simple language for a beginner.
Provide:
1. A simplified explanation in plain English.
2. A couple of simple examples.
3. The key take-away idea.

Format your response as a valid JSON object with EXACTLY the following keys:
"simplified_explanation": "A string explaining the concept simply.",
"examples": ["example 1", "example 2"],
"key_idea": "The main takeaway in one sentence."

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Explain simpler: {req.topic_name}")
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in explain_topic: {e}")
        return {
            "success": True, 
            "data": {
                "simplified_explanation": f"Concept explanation for {req.topic_name} in simple terms.",
                "examples": [f"Visualizing {req.topic_name} using standard analogies."],
                "key_idea": f"Simplifying {req.topic_name}."
            }
        }


@router.post("/examples")
def give_examples(req: ExampleRequest):
    from routes.chat import _call_llm
    prompt = f"""You are an expert instructor.
Provide 3 real-world, highly relatable examples or scenarios for the concept "{req.topic_name}".
Also list practical applications where this concept is used.

Format your response as a valid JSON object with EXACTLY the following keys:
"examples": [
    {{"title": "Example Title", "description": "Relatable scenario explanation."}},
    ...
],
"practical_applications": ["Application 1", "Application 2"]

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Give examples for: {req.topic_name}")
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in give_examples: {e}")
        return {
            "success": True,
            "data": {
                "examples": [
                    {"title": f"Scenario for {req.topic_name}", "description": "Real world analogy."}
                ],
                "practical_applications": [f"Standard implementation of {req.topic_name}."]
            }
        }


@router.post("/summarize")
def summarize_topic(req: SummarizeRequest):
    from routes.chat import _call_llm
    prompt = f"""You are an educational assistant.
Summarize "{req.topic_name}" for quick exam revision.
Provide 5 concise bullet points covering key facts, definitions, and exam notes.

Format your response as a valid JSON object with EXACTLY the following keys:
"summary_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
"important_concepts": ["Concept A", "Concept B"]

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Summarize topic: {req.topic_name}")
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in summarize_topic: {e}")
        return {
            "success": True,
            "data": {
                "summary_points": [f"Revision point for {req.topic_name}"],
                "important_concepts": [req.topic_name]
            }
        }


@router.get("/related/{topic}")
def get_related_concepts(topic: str, student_id: int = 1, db: Session = Depends(get_db)):
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        subject_topics_path = os.path.join(base_dir, "config", "subject_topics.json")
        with open(subject_topics_path, "r") as f:
            subject_topics = json.load(f)
        for subj, topics in subject_topics.items():
            if topic in topics:
                idx = topics.index(topic)
                related = []
                if idx > 0:
                    related.append({"topic": topics[idx-1], "relation": "Prerequisite"})
                if idx < len(topics) - 1:
                    related.append({"topic": topics[idx+1], "relation": "Next Topic"})
                for t in topics:
                    if t != topic and t not in [r["topic"] for r in related]:
                        related.append({"topic": t, "relation": "Related Topic"})
                return related[:4]
    except Exception as e:
        logger.error(f"Error reading subject_topics: {e}")
        
    return [
        {"topic": "Process Scheduling", "relation": "Next Topic"},
        {"topic": "Kernel Mode", "relation": "Prerequisite"}
    ]


@router.post("/cheatsheet")
def get_cheatsheet(req: CheatSheetRequest):
    from routes.chat import _call_llm
    prompt = f"""You are a technical interviewer.
Provide 3-5 high-yield interview cheat sheet points for "{req.topic_name}".
Highlight key technical details, interview questions, and must-know facts.

Format your response as a valid JSON object with EXACTLY the following keys:
"bullets": ["Point 1", "Point 2", "Point 3", "Point 4"]

Do not include any backticks or markdown markers. Return ONLY the JSON object.
"""
    try:
        response_str = _call_llm(prompt, [], f"Interview cheatsheet for: {req.topic_name}")
        json_match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(response_str)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error in get_cheatsheet: {e}")
        return {
            "success": True,
            "data": {
                "bullets": [
                    f"{req.topic_name} is critical for system performance.",
                    "Understand time complexity of core algorithms."
                ]
            }
        }


@router.post("/save-notes")
def save_notes(req: SaveNotesRequest, db: Session = Depends(get_db)):
    from practice_models import UserNote
    new_note = UserNote(
        student_id=req.student_id,
        topic=req.topic_name,
        notes=req.generated_notes
    )
    db.add(new_note)
    db.commit()
    return {"success": True, "message": "Notes saved."}


@router.get("/generate_material/stream")
def generate_material_stream(
    topic: str,
    subject: str = "Computer Science",
    user_id: int = 1,
    classroom_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Professor-only: Generate comprehensive, in-depth study material from scratch.
    This is a completely separate pipeline from the student study guide generator.
    Always generates fresh content via LLM — never uses cache.
    Saves to a real physical file in UPLOAD_DIR for download support.
    """

    system_prompt = f"""You are a senior university professor and published textbook author preparing comprehensive lecture notes for distribution to students.

Generate an extremely detailed, rigorous, and well-structured study material document for the topic: "{topic}" under the subject "{subject}".

Your output must be thorough enough to serve as a standalone reference for students preparing for university exams. Cover the following in depth:

# {topic}

## 1. Introduction & Definition
Provide a precise academic definition. Explain the concept's origin, its role within {subject}, and why it exists. Give 2-3 sentences of historical context if applicable.

---

## 2. Core Concepts & Theory
Break down every fundamental aspect of {topic} in detail. Explain the underlying principles, mathematical models (in plain text, no LaTeX), algorithms, data structures, or theoretical frameworks involved. Use numbered steps for processes. Be thorough — assume you are writing a textbook chapter.

---

## 3. How It Works (Step-by-Step)
Provide an extremely detailed, step-by-step walkthrough of how {topic} operates in practice. Include state transitions, decision points, edge cases, and failure scenarios. Use bullet points for clarity.

---

## 4. Types & Classifications
If applicable, enumerate and explain all major types, categories, or variations of {topic}. Compare them with pros/cons. Use structured bullet points.

---

## 5. Real-World Applications & Examples
Provide at least 3 concrete, real-world examples or case studies where {topic} is applied. Explain each example in 3-5 sentences. Include industry applications (e.g., how operating systems, databases, or networks use this concept).

---

## 6. Common Pitfalls & Edge Cases
Describe at least 3 common mistakes, misconceptions, or tricky edge cases related to {topic}. Explain why they happen and how to avoid them.

---

## 7. Interview & Exam Preparation
List 3-4 high-yield interview questions or exam-style questions related to {topic}. For each, provide a model answer (2-3 sentences).

---

## 8. Summary & Key Takeaways
Provide a concise bulleted summary of the most critical points. These should be dense, fact-packed revision bullets.

RULES:
- Write in clear, professional academic English.
- Use markdown formatting: headings (#, ##), bold (**text**), bullet points (-), and numbered lists.
- DO NOT use LaTeX. Express formulas in plain text.
- DO NOT use emoji numbers (1️⃣, 2️⃣) or markdown tables.
- DO NOT use code block fencing unless showing actual code.
- Aim for 1000-1200 words of dense, substantive content.
- Every section must have real, detailed content — no placeholders or one-liners.
"""

    user_prompt = f"Generate the complete, in-depth study material for the topic \"{topic}\" in the subject \"{subject}\". Be extremely thorough and detailed."

    logger.info(f"[ProfessorGen] Generating fresh study material for topic='{topic}', subject='{subject}', user_id={user_id}, classroom_id={classroom_id}")

    # Generate a unique key for tracking this task
    import threading
    import time
    
    # Shared variables for tracking background generation
    if not hasattr(generate_material_stream, "_bg_generators"):
        generate_material_stream._bg_generators = {}
        generate_material_stream._bg_lock = threading.Lock()
        
    bg_generators = generate_material_stream._bg_generators
    bg_lock = generate_material_stream._bg_lock
    
    task_key = f"{user_id}_{classroom_id or 0}_{topic.replace(' ', '_').lower()}"

    def bg_worker():
        logger.info(f"[BgGen] Worker thread started for key: {task_key}")
        full_text = ""
        try:
            for chunk in _practice_llm_stream(system_prompt, user_prompt, max_tokens=4096):
                if chunk.startswith("ERROR:"):
                    with bg_lock:
                        bg_generators[task_key]["error"] = chunk
                        bg_generators[task_key]["completed"] = True
                    return
                full_text += chunk
                with bg_lock:
                    bg_generators[task_key]["buffer"] += chunk
                    
            # Complete! Now save files, insert database records, and index vector database
            if full_text.strip():
                from database import SessionLocal
                import datetime
                from models import Document
                from config import UPLOAD_DIR

                local_db = SessionLocal()
                try:
                    doc_name = f"AI Study Material - {topic}.md"
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    safe_name = f"{user_id}_{timestamp}_{doc_name}"
                    file_path = os.path.join(UPLOAD_DIR, safe_name)

                    # Save text to markdown file
                    os.makedirs(UPLOAD_DIR, exist_ok=True)
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(full_text)

                    # Remove old generated doc duplicate
                    existing = local_db.query(Document).filter(
                        Document.student_id == user_id,
                        Document.filename == doc_name
                    ).first()
                    if existing:
                        if existing.file_path and os.path.exists(existing.file_path):
                            try:
                                os.remove(existing.file_path)
                            except Exception:
                                pass
                        local_db.delete(existing)
                        local_db.commit()

                    # Save new Document metadata
                    new_doc = Document(
                        student_id=user_id,
                        filename=doc_name,
                        file_path=file_path,
                        category="Studies",
                        subject=subject,
                        uploaded_at=datetime.datetime.now(),
                        visibility="course_shared",
                        document_type="notes",
                        classroom_id=classroom_id,
                        document_format="MD",
                        file_size=os.path.getsize(file_path),
                        pages=max(1, len(full_text) // 3000),
                        title=f"AI Study Material - {topic}"
                    )
                    local_db.add(new_doc)
                    local_db.commit()
                    local_db.refresh(new_doc)

                    # Index generated notes into Chroma vector store
                    try:
                        from services.extract import chunk_text
                        from chroma_store import upsert_chunks, delete_document_chunks
                        
                        delete_document_chunks(new_doc.id)
                        chunks_to_store = chunk_text(full_text)
                        upsert_chunks(new_doc.id, chunks_to_store)
                        logger.info(f"[BgGen] Indexed {len(chunks_to_store)} chunks into Chroma for doc_id={new_doc.id}")
                        
                        # Immediately trigger background topic extraction
                        from services.practice.topic_extractor import extract_topics_from_documents
                        extract_topics_from_documents(user_id, local_db)
                    except Exception as e:
                        logger.error(f"[BgGen] Failed to index generated notes in Chroma: {e}")

                    # Save classroom resource association
                    if classroom_id:
                        from classroom_models import ClassResource
                        
                        existing_res = local_db.query(ClassResource).filter(
                            ClassResource.class_id == classroom_id,
                            ClassResource.title == f"AI Study Material - {topic}"
                        ).first()
                        if existing_res:
                            local_db.delete(existing_res)
                            local_db.commit()

                        new_resource = ClassResource(
                            class_id=classroom_id,
                            title=f"AI Study Material - {topic}",
                            type="notes",
                            file_path=file_path,
                            uploaded_by=user_id,
                            uploaded_at=datetime.datetime.now()
                        )
                        local_db.add(new_resource)
                        local_db.commit()
                        logger.info(f"[BgGen] Saved generated resource in class_resources for classroom_id={classroom_id}")

                    logger.info(f"[BgGen] Saved generated material as document & file: '{doc_name}' associated with classroom={classroom_id}")
                finally:
                    local_db.close()
        except Exception as e:
            logger.error(f"[BgGen] Background worker error: {e}", exc_info=True)
            with bg_lock:
                bg_generators[task_key]["error"] = str(e)
        finally:
            with bg_lock:
                bg_generators[task_key]["completed"] = True
            logger.info(f"[BgGen] Worker thread finished for key: {task_key}")

    # Kickoff worker thread if not already running
    with bg_lock:
        if task_key not in bg_generators or bg_generators[task_key]["completed"] or bg_generators[task_key]["error"]:
            bg_generators[task_key] = {
                "buffer": "",
                "completed": False,
                "error": None
            }
            thread = threading.Thread(target=bg_worker, daemon=True)
            thread.start()

    def generate_stream():
        read_offset = 0
        while True:
            with bg_lock:
                state = bg_generators.get(task_key)
                if not state:
                    break
                
                buffer = state["buffer"]
                completed = state["completed"]
                error = state["error"]

                if error:
                    yield f"\n\n⚠️ Generation failed: {error}"
                    break

                if len(buffer) > read_offset:
                    chunk = buffer[read_offset:]
                    read_offset = len(buffer)
                    yield chunk

                if completed and len(buffer) <= read_offset:
                    break
            
            time.sleep(0.1)

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
    )
