"""
services/practice_engine.py — Adaptive Learning Engine
═══════════════════════════════════════════════════════
Core engine that:
  • Analyzes uploaded documents to extract topics/subtopics
  • Generates quiz questions via LLM using document context
  • Adapts difficulty based on student performance
  • Detects behavioral patterns from answer history
  • Tracks per-topic mastery
"""

from __future__ import annotations

import json
import logging
import os
import glob
import re
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models import Document
from practice_models import (
    PracticeSession, PracticeQuestion,
    TopicPerformance, BehavioralInsight, LearningContent
)
from chroma_store import query_chunks
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider

logger = logging.getLogger("chatbot")


# ═════════════════════════════════════════════════════════════════════════════
#  LLM HELPER (reuses same provider chain as chatbot)
# ═════════════════════════════════════════════════════════════════════════════

def _practice_llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
    """Call the LLM with a system + user prompt. Returns raw text response."""
    provider = get_provider()
    configs = []

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))

    if provider == "gpt4o":
        add_gpt(); add_llama()
    elif provider == "llama":
        add_llama(); add_gpt()
    else:
        add_gpt(); add_llama()

    for name, api_key, base_url, model in configs:
        last_error = "No configurations available"
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.3,
                timeout=120,
            )
            content = resp.choices[0].message.content
            if not content:
                finish_reason = resp.choices[0].finish_reason if resp.choices else "unknown"
                raise Exception(f"Provider returned empty content. Finish reason: {finish_reason}")
            return content
        except Exception as e:
            logger.error(f"[PracticeEngine] LLM '{name}' failed: {e}")
            last_error = str(e)
            continue

    logger.error("[PracticeEngine] All LLM providers failed!")
    return f"ERROR: {last_error}"


CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "topics_cache.json")

def load_topics_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                data = json.load(f)
                # Key is saved as string: "user_id,(doc1, doc2)" -> convert back to tuple
                cache = {}
                for k, v in data.items():
                    # Parse key tuple safely
                    parts = k.strip("()").split(", ")
                    student_id = int(parts[0])
                    if len(parts) > 1 and parts[1].strip():
                        # handles tuple of doc IDs
                        doc_ids = tuple(int(x.strip("(),")) for x in parts[1:] if x.strip("(),"))
                    else:
                        doc_ids = ()
                    cache[(student_id, doc_ids)] = v
                return cache
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to load topics cache from disk: {e}")
    return {}

def save_topics_cache(cache):
    try:
        data = {}
        for k, v in cache.items():
            # Convert tuple key to string key
            key_str = f"({k[0]}, {', '.join(str(x) for x in k[1])})"
            data[key_str] = v
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"[PracticeEngine] Failed to save topics cache to disk: {e}")

_TOPICS_CACHE = load_topics_cache()


# ═════════════════════════════════════════════════════════════════════════════
#  DOCUMENT → TOPIC EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

def extract_topics_from_documents(student_id: int, db: Session) -> dict:
    """
    Query all of a student's document chunks from ChromaDB and use LLM
    to extract a structured subject/topic/subtopic hierarchy.
    """
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        return {"subjects": []}

    doc_ids = sorted([d.id for d in docs])
    cache_key = str(student_id) + "_" + "_".join(map(str, doc_ids))
    
    cache_file = "data/topics_cache.json"
    import os, json
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                disk_cache = json.load(f)
                if cache_key in disk_cache:
                    return disk_cache[cache_key]
        except Exception:
            pass

    # If it's not cached, doing an LLM call here blocks the entire page load!
    # Return a placeholder and let it generate next time or in background
    import threading
    def generate_and_save():
        try:
            doc_names = {d.id: d.filename for d in docs}
            all_text_snippets = []
            for doc in docs:
                results = query_chunks("overview summary topics chapters", top_k=5, allowed_doc_ids=[doc.id])
                if results and results.get("documents") and results["documents"][0]:
                    for chunk_text in results["documents"][0]:
                        all_text_snippets.append(f"[{doc.filename}]: {chunk_text[:500]}")
            if not all_text_snippets:
                return
            combined_context = "\n\n".join(all_text_snippets[:20])
            system_prompt = """You are an educational content analyzer.
Given document excerpts from a student's study materials, extract a structured hierarchy of subjects, topics, and subtopics.
RULES:
- Identify the subject
- Identify major topics
- Identify subtopics
- Estimate difficulty and importance
Return ONLY valid JSON.
{"subjects": [{"name":"Subject", "topics":[{"name":"Topic", "subtopics":[], "difficulty":"medium", "importance":"high"}]}]}"""
            user_prompt = f"Analyze these document excerpts and extract the educational topic structure:\n\n{combined_context}"
            response = _practice_llm_call(system_prompt, user_prompt, max_tokens=2048)
            if response:
                import re
                json_match = re.search(r"\\{.*\\}", response, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                    
                    # Save to disk cache
                    disk_cache = {}
                    if os.path.exists(cache_file):
                        with open(cache_file, "r") as f:
                            disk_cache = json.load(f)
                    disk_cache[cache_key] = data
                    os.makedirs("data", exist_ok=True)
                    with open(cache_file, "w") as f:
                        json.dump(disk_cache, f)
        except Exception as e:
            logger.error(f"Background topic extraction failed: {e}")

    threading.Thread(target=generate_and_save).start()
    
    return {"subjects": [{"name": "Processing Documents...", "topics": [{"name": "Check back later", "subtopics": []}]}]}

    doc_names = {d.id: d.filename for d in docs}

    # Gather representative chunks from each document
    all_text_snippets = []
    for doc in docs:
        results = query_chunks("overview summary topics chapters", top_k=5, allowed_doc_ids=[doc.id])
        if results and results.get("documents") and results["documents"][0]:
            for chunk_text in results["documents"][0]:
                all_text_snippets.append(f"[{doc.filename}]: {chunk_text[:500]}")

    if not all_text_snippets:
        return {"subjects": []}

    combined_context = "\n\n".join(all_text_snippets[:20])  # limit context

    system_prompt = """You are an educational content analyzer. 
Given document excerpts from a student's study materials, extract a structured hierarchy of subjects, topics, and subtopics.

RULES:
- Identify the subject (e.g., Physics, Mathematics, Computer Science, Biology, etc.)
- Under each subject, identify major topics
- Under each topic, identify subtopics if visible
- Estimate difficulty (easy/medium/hard) for each topic based on content complexity
- Estimate importance (high/medium/low) based on how much content covers that topic

Return ONLY valid JSON in this exact format, no markdown fencing:
{
  "subjects": [
    {
      "name": "Subject Name",
      "topics": [
        {
          "name": "Topic Name",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "difficulty": "medium",
          "importance": "high"
        }
      ]
    }
  ]
}"""

    user_prompt = f"Analyze these document excerpts and extract the educational topic structure:\n\n{combined_context}"

    response = _practice_llm_call(system_prompt, user_prompt, max_tokens=2048)

    if not response:
        return {"subjects": []}

    # Parse JSON from LLM response
    try:
        # Try to extract JSON from response (handle markdown fencing)
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            parsed = json.loads(json_match.group())
            if "subjects" in parsed:
                _TOPICS_CACHE[cache_key] = parsed
                save_topics_cache(_TOPICS_CACHE)
                return parsed
    except (json.JSONDecodeError, AttributeError) as e:
        logger.error(f"[PracticeEngine] Failed to parse topic extraction: {e}")
        logger.error(f"[PracticeEngine] Raw response: {response[:500]}")

    return {"subjects": []}

def generate_learning_content(student_id: int, topic: str, db: Session, subject: Optional[str] = None) -> dict:
    """
    Generate learning content for a specific topic, returning Notes and Revision JSON.
    Uses ChromaDB if document context exists, otherwise uses general knowledge.
    Caches the generated content in the database.
    """
    # 1. Check Cache
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

    # Fetch specific subtopics from curriculum if available
    subtopics_str = ""
    is_curriculum_subject = False
    if subject:
        try:
            with open("config/subject_topics.json", "r") as f:
                subject_topics = json.load(f)
                
            if subject in subject_topics:
                is_curriculum_subject = True
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to load subject_topics: {e}")

    # Retrieve relevant chunks from the student's documents
    if is_curriculum_subject:
        # Prevent document poisoning by skipping semantic search for predefined curriculum topics
        context = "(Curriculum topic — use highly rigorous general knowledge for a college level curriculum)"
    else:
        search_query = f"{subject} {topic}" if subject else topic
        docs = db.query(Document).filter(Document.student_id == student_id).all()
        if not docs:
            context = "(No documents uploaded — use general knowledge for a college level curriculum)"
        else:
            doc_ids = [d.id for d in docs]
            try:
                results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
                if results and results.get("documents") and results["documents"][0]:
                    context = "\n\n".join(results["documents"][0])
                else:
                    context = "(No relevant content found in documents — use general knowledge for a college level curriculum)"
            except Exception as e:
                logger.warning(f"[PracticeEngine] Failed to query documents from ChromaDB: {e}")
                context = "(Document search failed due to database error — use general knowledge for a college level curriculum)"

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

    system_prompt = """You are teaching a first-year B.Tech CSE student.
Given the topic and context, generate a concise and high-yield technical study guide using ONLY valid JSON. Keep it punchy and fast to read.

Your output must follow this strict JSON format:
{
    "notes": [
        {"type": "heading", "text": "Advanced Concept / Deep Dive"},
        {"type": "paragraph", "text": "In-depth technical explanation, covering edge cases, under-the-hood workings, and performance implications..."},
        {"type": "highlight", "variant": "constructive", "title": "Interview Pro-Tip", "text": "Crucial detail often asked in interviews..."},
        {"type": "code_block", "language": "python", "title": "Complex Implementation", "code": "def complex_algo(): pass"},
        {"type": "note", "text": "Advanced side note or historical context"}
    ],
    "revision": {
        "title": "Interview Cheat Sheet",
        "points": [
            {"id": 1, "text": "Advanced point 1"},
            {"id": 2, "text": "Advanced point 2"}
        ]
    }
}

RULES:
- `notes` array must use types: 'heading', 'paragraph', 'highlight' (variant: 'constructive' or 'destructive'), 'code_block' (include 'language', 'title', 'code'), or 'note'.
- The content MUST be technically deep but CONCISE. Limit the entire `notes` array to EXACTLY 4 highly-impactful sections. Do NOT generate long walls of text.
- NEVER generate basic, high-level, or "kidish" overviews. Assume the reader is preparing for a Senior or top-tier placement.
- Generate content ONLY within the context of the provided subject.
- `revision` should have exactly 3 hard-hitting, concise bullet points.
- Do not use markdown fencing (e.g. ```json). Just return the raw JSON object.
"""

    context_str = f"Subject / Context: {subject or 'General Computer Science'}\n"
    user_prompt = f"SUBJECT:\n{subject}\n\nTOPIC:\n{topic}\n\nCONTEXT:\n{context_str}{context}\n\n{subtopics_str}Generate the study guide JSON.\nIMPORTANT: Only use the CONTEXT if it strictly belongs to the SUBJECT ({subject}). If the context is about a different subject (e.g., Operating Systems), IGNORE the context entirely and use your general knowledge.\n{extra_instructions}"

    logger.info(f"--- LLM PROMPT (Subject: {subject}, Topic: {topic}) ---")
    logger.info(f"SYSTEM PROMPT:\n{system_prompt}")
    logger.info(f"USER PROMPT:\n{user_prompt}")
    logger.info(f"-------------------------------------------------------")

    max_retries = 2
    response = ""
    for attempt in range(max_retries):
        response = _practice_llm_call(system_prompt, user_prompt, max_tokens=6000)
        
        # Step 4: Content Validation
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

    # Fallback default if parsing fails
    error_reason = "LLM returned empty response" if not response else f"JSON parsing failed. Raw response: {response[:300]}"
    default_content = [
        {"type": "heading", "text": topic},
        {"type": "paragraph", "text": f"Content could not be generated. Debug info: {error_reason}"}
    ]
    default_revision = {
        "title": "Quick Revision",
        "points": [{"id": 1, "text": "Review this topic later."}]
    }

    notes_response = default_content
    revision_response = default_revision

    if response:
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                parsed = json.loads(json_match.group())
                if "notes" in parsed:
                    notes_response = parsed["notes"]
                if "revision" in parsed:
                    revision_response = parsed["revision"]
        except (json.JSONDecodeError, AttributeError) as e:
            logger.error(f"[PracticeEngine] Failed to parse learning content for topic '{topic}': {e}")
            logger.error(f"[PracticeEngine] Raw response: {response[:500]}")

    # 3. Save to cache only if successful
    if "could not be generated" not in str(notes_response):
        new_cache = LearningContent(
            student_id=student_id,
            subject=subject,
            topic=topic,
            content=notes_response,
            revision=revision_response
        )
        db.add(new_cache)
        try:
            db.commit()
        except Exception as e:
            logger.error(f"[PracticeEngine] Failed to save learning content cache: {e}")
            db.rollback()

    return {
        "notesResponse": notes_response,
        "revision": revision_response
    }


# ═════════════════════════════════════════════════════════════════════════════
#  QUIZ QUESTION GENERATION
# ═════════════════════════════════════════════════════════════════════════════

def generate_questions(
    student_id: int,
    topic: str,
    difficulty: str,
    count: int,
    db: Session,
    subtopic: Optional[str] = None,
    mode: str = "topic",
) -> list[dict]:
    """
    Generate quiz questions using LLM based on document content.
    Uses ChromaDB to retrieve relevant chunks for the topic.
    """
    # 1. Retrieve relevant chunks from the student's documents
    search_query = f"{topic} {subtopic or ''}"
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        # Fallback: generate questions from general knowledge
        context = "(No documents uploaded — use general knowledge)"
        doc_ids = []
    else:
        doc_ids = [d.id for d in docs]
        results = query_chunks(search_query, top_k=8, allowed_doc_ids=doc_ids)
        if results and results.get("documents") and results["documents"][0]:
            context = "\n\n".join(results["documents"][0])
        else:
            context = "(No relevant content found in documents — use general knowledge)"

    # 2. Check for previously asked questions to avoid repetition
    recent_questions = (
        db.query(PracticeQuestion.question_text)
        .join(PracticeSession)
        .filter(PracticeSession.student_id == student_id)
        .filter(PracticeQuestion.topic == topic)
        .order_by(PracticeQuestion.created_at.desc())
        .limit(20)
        .all()
    )
    avoid_list = [q.question_text[:80] for q in recent_questions] if recent_questions else []
    avoid_text = ""
    if avoid_list:
        avoid_text = f"\n\nAVOID repeating these recently asked questions:\n" + "\n".join(f"- {q}" for q in avoid_list[:10])

    # 3. Build the generation prompt
    difficulty_guidance = {
        "easy": "Generate EASY questions focusing on basic definitions, recall, and simple concepts. Suitable for beginners.",
        "medium": "Generate MEDIUM difficulty questions that test understanding, application, and analysis.",
        "hard": "Generate HARD questions that test deep understanding, multi-step problem solving, and advanced application.",
        "mixed": "Generate a MIX of easy, medium, and hard questions.",
    }

    system_prompt = f"""You are an expert quiz generator for educational content.
Generate exactly {count} multiple-choice questions on the topic: "{topic}"{f' / subtopic: "{subtopic}"' if subtopic else ''}.

DIFFICULTY: {difficulty_guidance.get(difficulty, difficulty_guidance['mixed'])}

CONTEXT FROM STUDENT'S DOCUMENTS:
{context[:4000]}

RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Exactly ONE correct answer per question
- Include a clear, educational explanation for the correct answer
- Questions should be factually accurate
- Base questions on the document content when possible
- Use general knowledge to supplement when documents lack sufficient detail
- Mix question types: conceptual, numerical, application-based, analytical
- Set appropriate difficulty per question{avoid_text}

Return ONLY valid JSON array, no markdown fencing:
[
  {{
    "topic": "{topic}",
    "subtopic": "specific subtopic",
    "difficulty": "easy|medium|hard",
    "question": "Question text here?",
    "options": [
      {{"id": "A", "text": "Option A text"}},
      {{"id": "B", "text": "Option B text"}},
      {{"id": "C", "text": "Option C text"}},
      {{"id": "D", "text": "Option D text"}}
    ],
    "correct_answer": "B",
    "explanation": "Clear explanation of why B is correct."
  }}
]"""

    user_prompt = f"Generate {count} MCQ questions on '{topic}' at {difficulty} difficulty level."

    response = _practice_llm_call(system_prompt, user_prompt, max_tokens=3000)

    if not response:
        logger.error("[PracticeEngine] LLM returned empty response for question generation")
        return []

    # Parse the JSON response
    try:
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            questions = json.loads(json_match.group())
            # Validate structure
            validated = []
            for q in questions:
                if all(k in q for k in ("question", "options", "correct_answer")):
                    validated.append({
                        "topic": q.get("topic", topic),
                        "subtopic": q.get("subtopic", subtopic or "General"),
                        "difficulty": q.get("difficulty", difficulty),
                        "question": q["question"],
                        "options": q["options"][:4],  # ensure max 4 options
                        "correct_answer": q["correct_answer"],
                        "explanation": q.get("explanation", ""),
                    })
            return validated[:count]
    except (json.JSONDecodeError, AttributeError) as e:
        logger.error(f"[PracticeEngine] Failed to parse questions: {e}")
        logger.error(f"[PracticeEngine] Raw response: {response[:500]}")

    return []


# ═════════════════════════════════════════════════════════════════════════════
#  ADAPTIVE DIFFICULTY
# ═════════════════════════════════════════════════════════════════════════════

def get_adaptive_difficulty(student_id: int, topic: str, db: Session) -> str:
    """Determine difficulty based on student's accuracy for a topic."""
    perf = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.topic == topic)
        .first()
    )

    if not perf or perf.total_attempts < 3:
        return "easy"  # start easy for new topics

    if perf.accuracy < 50:
        return "easy"
    elif perf.accuracy < 75:
        return "medium"
    else:
        return "hard"


def get_mastery_level(accuracy: float, total_attempts: int) -> str:
    """Calculate mastery level from accuracy and attempt count."""
    if total_attempts < 2:
        return "weak"
    if accuracy < 50:
        return "weak"
    elif accuracy < 85:
        return "medium"
    else:
        return "strong"


# ═════════════════════════════════════════════════════════════════════════════
#  PERFORMANCE TRACKING
# ═════════════════════════════════════════════════════════════════════════════

def update_topic_performance(
    student_id: int,
    topic: str,
    is_correct: bool,
    db: Session,
    subject: Optional[str] = None,
):
    """Update aggregated performance stats for a topic after an answer."""
    perf = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.topic == topic)
        .first()
    )

    if not perf:
        # Try to find the correct subject for this topic from curriculum
        resolved_subject = subject
        try:
            import json, os
            
            # Check subject_topics.json first (highest priority)
            subject_topics_path = os.path.join(os.path.dirname(__file__), "..", "config", "subject_topics.json")
            if os.path.exists(subject_topics_path):
                with open(subject_topics_path, "r") as f:
                    subject_topics = json.load(f)
                for subj_name, topics_list in subject_topics.items():
                    if topic in topics_list:
                        resolved_subject = subj_name
                        break
            
            # If not found, check default_curriculum.json
            if resolved_subject == subject:
                config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_curriculum.json")
                with open(config_path, "r") as f:
                    curriculum_data = json.load(f)
                for sem in curriculum_data.get("semesters", []):
                    for subj_name, topics_list in sem.get("subjects", {}).items():
                        if topic in topics_list:
                            resolved_subject = subj_name
                            break
        except Exception as e:
            pass

        perf = TopicPerformance(
            student_id=student_id,
            topic=topic,
            subject=resolved_subject,
            total_attempts=0,
            correct_count=0,
        )
        db.add(perf)
    else:
        # If perf exists but has wrong subject (like a subtopic), fix it
        try:
            import json, os
            subject_topics_path = os.path.join(os.path.dirname(__file__), "..", "config", "subject_topics.json")
            found_subject = None
            if os.path.exists(subject_topics_path):
                with open(subject_topics_path, "r") as f:
                    subject_topics = json.load(f)
                for subj_name, topics_list in subject_topics.items():
                    if topic in topics_list:
                        found_subject = subj_name
                        break
            
            if not found_subject:
                config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_curriculum.json")
                with open(config_path, "r") as f:
                    curriculum_data = json.load(f)
                for sem in curriculum_data.get("semesters", []):
                    for subj_name, topics_list in sem.get("subjects", {}).items():
                        if topic in topics_list:
                            found_subject = subj_name
                            break
            
            if found_subject and perf.subject != found_subject:
                perf.subject = found_subject
        except Exception:
            pass

    perf.total_attempts += 1
    if is_correct:
        perf.correct_count += 1

    perf.accuracy = (perf.correct_count / perf.total_attempts) * 100 if perf.total_attempts > 0 else 0
    perf.current_difficulty = get_adaptive_difficulty(student_id, topic, db)
    perf.mastery_level = get_mastery_level(perf.accuracy, perf.total_attempts)
    perf.last_practiced = datetime.utcnow()

    db.commit()
    db.refresh(perf)
    
    logger.info(f"PERFORMANCE UPDATED | Topic: {topic} | Accuracy: {perf.accuracy}% | Attempts: {perf.total_attempts} | Mastery Level: {perf.mastery_level}")
    
    return perf


def finalize_session_history(session, db: Session):
    """Save session to QuizHistory and update UserPerformance after session completes."""
    from practice_models import UserPerformance, QuizHistory, PracticeQuestion
    
    questions = db.query(PracticeQuestion).filter(PracticeQuestion.session_id == session.id).all()
    attempted = sum(1 for q in questions if q.student_answer is not None)
    correct = sum(1 for q in questions if q.is_correct)
    time_spent = sum(q.time_spent_seconds or 0 for q in questions)
    
    score_percentage = (correct / attempted * 100) if attempted > 0 else 0.0
    points_earned = correct * 10
    
    # 1. Create QuizHistory
    history = QuizHistory(
        student_id=session.student_id,
        session_id=session.id,
        topic=session.topic or "General",
        questions_attempted=attempted,
        correct_answers=correct,
        score_percentage=score_percentage,
        points_earned=points_earned,
        time_spent=time_spent
    )
    db.add(history)
    
    # 2. Update UserPerformance
    perf = db.query(UserPerformance).filter(UserPerformance.student_id == session.student_id).first()
    if not perf:
        perf = UserPerformance(
            student_id=session.student_id,
            total_questions_attempted=0,
            total_correct_answers=0,
            lifetime_accuracy=0.0,
            total_points=0,
            topics_covered=0,
            badges_earned=0,
            current_streak=0,
            longest_streak=0,
            total_time_seconds=0
        )
        db.add(perf)
        
    perf.total_questions_attempted += attempted
    perf.total_correct_answers += correct
    perf.total_time_seconds += time_spent
    perf.total_points += points_earned
    
    if perf.total_questions_attempted > 0:
        perf.lifetime_accuracy = (perf.total_correct_answers / perf.total_questions_attempted) * 100
        
    perf.last_practiced = datetime.utcnow()
    
    db.commit()
    
    # Recalculate streak (consecutive days with at least one completed session)
    # Get distinct days from QuizHistory
    histories = db.query(QuizHistory.created_at).filter(QuizHistory.student_id == session.student_id).order_by(QuizHistory.created_at.desc()).all()
    days = sorted(list(set(h.created_at.date() for h in histories)), reverse=True)
    
    streak = 0
    current_date = datetime.utcnow().date()
    # Check if they practiced today or yesterday to start the streak count
    if days and (days[0] == current_date or days[0] == current_date - timedelta(days=1)):
        for i, d in enumerate(days):
            if d == current_date - timedelta(days=i) or (days[0] != current_date and d == current_date - timedelta(days=i+1)):
                streak += 1
            else:
                break
    
    perf.current_streak = streak
    if streak > perf.longest_streak:
        perf.longest_streak = streak
        
    # Recalculate topics covered (unique topics successfully attempted / attempted)
    unique_topics = db.query(QuizHistory.topic).filter(QuizHistory.student_id == session.student_id).distinct().count()
    perf.topics_covered = unique_topics
    
    db.commit()

    # Auto-complete Roadmap Task if accuracy >= 75%
    if score_percentage >= 75.0:
        from roadmap_models import LearningRoadmap, DailyTask
        from sqlalchemy import desc
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == session.student_id).order_by(desc(LearningRoadmap.created_at)).first()
        if roadmap:
            task = db.query(DailyTask).filter(
                DailyTask.roadmap_id == roadmap.id,
                DailyTask.topic == session.topic,
                DailyTask.task_type == "quiz",
                DailyTask.status != "completed"
            ).first()
            
            if task:
                task.status = "completed"
                task.completed_at = datetime.utcnow()
                db.commit()
                
                # Recalculate progress
                all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
                if all_tasks:
                    completed_count = sum(1 for t in all_tasks if t.status == "completed")
                    roadmap.overall_progress = (completed_count / len(all_tasks)) * 100
                    db.commit()


# ═════════════════════════════════════════════════════════════════════════════
#  WEAK TOPICS
# ═════════════════════════════════════════════════════════════════════════════

def get_weak_topics(student_id: int, db: Session) -> list[dict]:
    """Return topics sorted by accuracy ascending (weakest first)."""
    perfs = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.student_id == student_id)
        .filter(TopicPerformance.total_attempts >= 1)
        .order_by(TopicPerformance.accuracy.asc())
        .all()
    )

    return [
        {
            "topic": p.topic,
            "subject": p.subject or "General",
            "accuracy": round(p.accuracy, 1),
            "total_attempts": p.total_attempts,
            "mastery_level": p.mastery_level,
            "current_difficulty": p.current_difficulty,
        }
        for p in perfs
    ]


def get_weakness_topics_for_quiz(student_id: int, db: Session, limit: int = 3) -> list[str]:
    """Get the weakest topic names for weakness-based quiz generation."""
    weak = get_weak_topics(student_id, db)
    if not weak:
        return []
    return [w["topic"] for w in weak[:limit]]


# ═════════════════════════════════════════════════════════════════════════════
#  BEHAVIORAL INSIGHTS
# ═════════════════════════════════════════════════════════════════════════════

def detect_behavioral_patterns(student_id: int, db: Session) -> list[dict]:
    """Analyze recent answers to identify behavioral patterns."""
    # Get recent answered questions
    recent = (
        db.query(PracticeQuestion)
        .join(PracticeSession)
        .filter(PracticeSession.student_id == student_id)
        .filter(PracticeQuestion.student_answer.isnot(None))
        .order_by(PracticeQuestion.answered_at.desc())
        .limit(50)
        .all()
    )

    if len(recent) < 3:
        return []

    insights = []
    wrong_answers = [q for q in recent if not q.is_correct]
    fast_wrong = [q for q in wrong_answers if q.time_spent_seconds and q.time_spent_seconds < 10]
    slow_answers = [q for q in recent if q.time_spent_seconds and q.time_spent_seconds > 120]

    # 1. Guessing detection (fast + wrong)
    if len(fast_wrong) >= 3:
        ratio = len(fast_wrong) / len(recent) * 100
        insights.append({
            "type": "guessing",
            "title": "Possible guessing detected",
            "description": f"You answered {len(fast_wrong)} questions incorrectly in under 10 seconds. Slow down and think through the options.",
            "frequency": len(fast_wrong),
        })

    # 2. Time pressure (slow answers)
    if len(slow_answers) >= 3:
        insights.append({
            "type": "time_pressure",
            "title": "Time management needed",
            "description": f"You spent over 2 minutes on {len(slow_answers)} questions. Practice similar problems to build speed.",
            "frequency": len(slow_answers),
        })

    # 3. Repeated topic errors
    topic_errors = {}
    for q in wrong_answers:
        topic_errors[q.topic] = topic_errors.get(q.topic, 0) + 1

    for topic_name, error_count in topic_errors.items():
        if error_count >= 3:
            insights.append({
                "type": "repeated_error",
                "title": f"Recurring mistakes in {topic_name}",
                "description": f"You've made {error_count} errors in {topic_name}. Consider reviewing the fundamentals before practicing more.",
                "frequency": error_count,
            })

    # 4. Overall accuracy trend
    total = len(recent)
    correct = len([q for q in recent if q.is_correct])
    accuracy = (correct / total) * 100 if total > 0 else 0

    if accuracy < 40:
        insights.append({
            "type": "conceptual_gap",
            "title": "Low overall accuracy",
            "description": f"Your recent accuracy is {accuracy:.0f}%. Focus on understanding core concepts before attempting harder questions.",
            "frequency": total - correct,
        })

    # Persist insights
    for insight in insights:
        existing = (
            db.query(BehavioralInsight)
            .filter(BehavioralInsight.student_id == student_id)
            .filter(BehavioralInsight.insight_type == insight["type"])
            .first()
        )
        if existing:
            existing.title = insight["title"]
            existing.description = insight["description"]
            existing.frequency = insight["frequency"]
            existing.detected_at = datetime.utcnow()
        else:
            db.add(BehavioralInsight(
                student_id=student_id,
                insight_type=insight["type"],
                title=insight["title"],
                description=insight["description"],
                frequency=insight["frequency"],
            ))

    db.commit()
    return insights


def get_stored_insights(student_id: int, db: Session) -> list[dict]:
    """Get persisted behavioral insights."""
    insights = (
        db.query(BehavioralInsight)
        .filter(BehavioralInsight.student_id == student_id)
        .order_by(BehavioralInsight.detected_at.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "type": insight.insight_type,
            "title": insight.title,
            "description": insight.description,
            "frequency": insight.frequency,
        }
        for insight in insights
    ]


# ═════════════════════════════════════════════════════════════════════════════
#  SESSION STATS
# ═════════════════════════════════════════════════════════════════════════════

def get_session_stats(session: PracticeSession, db: Session) -> dict:
    """Calculate live session statistics."""
    questions = (
        db.query(PracticeQuestion)
        .filter(PracticeQuestion.session_id == session.id)
        .all()
    )

    answered = [q for q in questions if q.student_answer is not None]
    correct = [q for q in answered if q.is_correct]

    # Calculate streak (consecutive correct from most recent)
    streak = 0
    for q in sorted(answered, key=lambda x: x.answered_at or datetime.min, reverse=True):
        if q.is_correct:
            streak += 1
        else:
            break

    # Calculate total time
    total_time = sum(q.time_spent_seconds or 0 for q in answered)
    avg_time = total_time / len(answered) if answered else 0

    # Points: easy=10, medium=20, hard=30 + streak bonus
    points = 0
    for q in correct:
        base = {"easy": 10, "medium": 20, "hard": 30}.get(q.difficulty, 15)
        points += base

    # Streak bonus
    if streak >= 5:
        points += streak * 5

    accuracy = (len(correct) / len(answered) * 100) if answered else 0

    return {
        "total_questions": len(questions),
        "answered": len(answered),
        "correct": len(correct),
        "accuracy": round(accuracy, 1),
        "streak": streak,
        "points": points,
        "avg_time_seconds": round(avg_time, 1),
        "total_time_seconds": total_time,
    }
