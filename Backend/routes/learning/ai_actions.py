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
