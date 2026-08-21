import json
import os
import re
import logging
from services.roadmap.base import _roadmap_llm_call

logger = logging.getLogger(__name__)


class RoadmapGenerationError(RuntimeError):
    """Raised when a grounded, subject-specific roadmap cannot be generated."""


def _balance_json(s: str) -> str:
    """Balances JSON brackets/braces and closes open strings if cut off."""
    start_idx = s.find('{')
    if start_idx == -1:
        return s
    s = s[start_idx:]
    import re
    
    # Fix unquoted keys (e.g. {title: "A"} -> {"title": "A"})
    s = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', s)
    
    # Remove single-line comments (// ...) safely (only at start of line or after spaces to avoid breaking URLs)
    s = re.sub(r'(?m)^\s*//.*$', '', s)
    
    # Remove trailing commas that appear at the very end before cut-off
    s = re.sub(r',\s*$', '', s)
    # Remove trailing commas before closing braces/brackets
    s = re.sub(r',\s*([\]}])', r'\1', s)
    
    stack = []
    in_string = False
    escape = False
    for char in s:
        if escape:
            escape = False
            continue
        if char == '\\':
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
            
        if not in_string:
            if char == '{':
                stack.append('}')
            elif char == '[':
                stack.append(']')
            elif char in '}]':
                if stack and stack[-1] == char:
                    stack.pop()
                    
    if in_string:
        s += '"'
        
    while stack:
        s += stack.pop()
        
    return s

def _is_meaningful_roadmap_text(value: str) -> bool:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    compact = re.sub(r"[^a-z]", "", text.lower())
    keyboard_patterns = ("asdfgh", "qwerty", "zxcvbn", "qazwsx", "poiuyt", "lkjhg")
    if any(pattern in compact for pattern in keyboard_patterns):
        return False
    if len(text) < 3:
        return text.isupper() and text.isalpha() and len(text) >= 2
    letters = re.findall(r"[A-Za-z]", text)
    if len(letters) < 3 or len(letters) / max(1, len(text)) < 0.55:
        return False
    if re.search(r"(.)\1{4,}", text.lower()):
        return False
    if not any(char in "aeiou" for char in text.lower()) and not text.isupper():
        return False
    return len(set("".join(letters).lower())) >= 3


_GENERIC_FOCUS_WORDS = {
    "a", "an", "the", "and", "or", "for", "with", "from", "into", "using",
    "goal", "goals", "preparation", "prepare", "learning", "learn", "study",
    "studying", "skill", "skills", "exam", "exams", "internship", "internships",
    "job", "jobs", "placement", "placements", "career", "custom", "semester",
    "roadmap", "plan", "plans", "project", "projects", "build", "master",
    "mastery", "improve", "improvement", "focus", "subject", "topic", "topics",
    "category", "outcome", "success", "criteria", "interview", "interviews",
    "want", "would", "like", "need", "working", "work", "current", "level",
    "basic", "basics", "beginner", "intermediate", "advanced", "include",
    "including", "target", "constraints", "available", "time", "daily", "hours",
    "minutes", "documents", "document", "uploaded", "notes", "only", "yes",
    "no", "none", "new", "this", "that", "your", "my", "our", "use", "based",
}

_FOCUS_PREFIX_RE = re.compile(
    r"^(?:goal(?:\s+category)?|focus(?:\s+(?:description|topic))?|subject|topic|"
    r"primary focus|specific goal|requested learning focus|requested focus(?:\s+and\s+constraints)?|"
    r"roadmap category)\s*[:\-]\s*",
    flags=re.IGNORECASE,
)
_CONTEXT_PREFIX_RE = re.compile(
    r"^(?:(?:internship|job|placement|competitive\s+exam|"
    r"semester(?:\s+(?:study|exam))?|learn\s+a\s+new\s+skill|build\s+projects|"
    r"custom)(?:\s+(?:goal|focus|for|in|on))?\s*[:\-]?\s*)",
    flags=re.IGNORECASE,
)
_METADATA_LINE_RE = re.compile(
    r"^(?:available time|current proficiency|daily study time|learning style|"
    r"use uploaded documents|roadmap category)\s*[:\-]",
    flags=re.IGNORECASE,
)

_TEMPLATE_TOPIC_PREFIXES = (
    "prerequisite",
    "core vocabulary",
    "baseline assessment",
    "guided example",
    "foundations checkpoint",
    "first principle",
    "key models and methods",
    "worked example",
    "compare approaches",
    "core concepts checkpoint",
    "foundational exercise",
    "intermediate exercise",
    "debug or verify",
    "timed practice",
    "practice checkpoint",
    "choose a realistic",
    "plan the",
    "complete the first",
    "test and refine",
    "demonstrate the outcome",
    "diagnose weak areas",
    "solve a mixed",
    "explain a",
    "polish the",
)


def _is_template_topic(value: str) -> bool:
    """Reject fallback-style labels that do not name a real concept or task."""
    text = re.sub(r"\s+", " ", str(value or "")).strip().lower()
    if not text:
        return True
    if any(text.startswith(prefix) for prefix in _TEMPLATE_TOPIC_PREFIXES):
        return True
    return bool(re.match(r"^final(?: .*)? assessment(?: .*)?$", text))


def _normalise_focus_candidate(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = re.sub(r"^[\-\*\u2022]+\s*", "", text)
    for _ in range(4):
        before = text
        text = _FOCUS_PREFIX_RE.sub("", text).strip()
        text = _CONTEXT_PREFIX_RE.sub("", text).strip()
        text = re.sub(
            r"^(?:i|we)\s+(?:want|would like|need|plan|am trying)\s+to\s+",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"^(?:learn|study|master|prepare(?:\s+for)?|focus(?:\s+on)?|work\s+on)\s+",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(r"^(?:a|an|the)\s+", "", text, flags=re.IGNORECASE)
        if text == before:
            break
    text = re.sub(
        r"\s+(?:internship|internships|job|jobs|placement|placements|"
        r"role|position|preparation|exam|exams|roadmap|goal)$",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bfor\s+(?:an?\s+)?(?:internship|job|placement)s?\b",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+", " ", text).strip(" .,:;-\u2013\u2014")
    return text[:180]


def _derive_focus_topic(goal: str, description: str) -> str:
    """Resolve the learner's subject without letting context silently replace it."""
    candidates = []
    goal_candidates = []
    description_candidates = []
    for source_priority, value in enumerate((goal, description)):
        raw = str(value or "").strip()
        if not raw:
            continue
        fragments = re.split(r"[\n;|]+|(?<=[.!?])\s+", raw)
        for fragment in fragments:
            fragment = fragment.strip()
            if _METADATA_LINE_RE.match(fragment):
                continue
            candidate = _normalise_focus_candidate(fragment)
            if not _is_meaningful_roadmap_text(candidate):
                continue
            words = re.findall(r"[A-Za-z][A-Za-z0-9+#.-]*", candidate.lower())
            specific_words = [
                re.sub(r"[^a-z]", "", word)
                for word in words
                if len(re.sub(r"[^a-z]", "", word)) >= 3
                and re.sub(r"[^a-z]", "", word) not in _GENERIC_FOCUS_WORDS
            ]
            if not specific_words:
                continue

            # Prefer a concise subject over a whole explanatory sentence.
            score = (
                (5 if source_priority == 0 else 0)
                + len(specific_words) * 10
                + sum(min(len(word), 12) for word in specific_words)
                - max(0, len(words) - 6) * 4
            )
            item = (score, -len(candidate), candidate, len(specific_words))
            candidates.append(item)
            if source_priority == 0:
                goal_candidates.append(item)
            else:
                description_candidates.append(item)

    if goal_candidates:
        best_goal = max(goal_candidates)
        raw_goal = str(goal or "").strip()
        goal_is_planning_label = bool(
            re.search(
                r"(?:^|\s)(?:preparation|roadmap|learning goal|study plan|course plan)(?:$|\s)",
                raw_goal,
                flags=re.IGNORECASE,
            )
            or re.match(
                r"^(?:build|create|make|develop|design|launch|implement|ship|learn|study|master|prepare)\b",
                raw_goal,
                flags=re.IGNORECASE,
            )
        )

        # A broad planning label can use a clearly stated subject from the
        # description. A real topic title remains authoritative when the
        # description only adds level, outcome, or constraints.
        if goal_is_planning_label and best_goal[3] <= 1 and description_candidates:
            return max(description_candidates)[2]
        return best_goal[2]

    if description_candidates:
        return max(description_candidates)[2]
    if candidates:
        return max(candidates)[2]
    return ""


def _focus_terms(value: str) -> list[str]:
    terms = []
    for word in re.findall(r"[A-Za-z][A-Za-z0-9+#.-]*", str(value or "").lower()):
        cleaned = re.sub(r"[^a-z]", "", word)
        if len(cleaned) >= 4 and cleaned not in _GENERIC_FOCUS_WORDS and cleaned not in terms:
            terms.append(cleaned)
    return terms


def _topic_is_present(topic: str, roadmap_text: str) -> bool:
    normalized = re.sub(r"[^a-z0-9+#]+", " ", str(roadmap_text or "").lower())
    return all(
        re.search(rf"\b{re.escape(term)}(?:s|es)?\b", normalized)
        for term in _focus_terms(topic)
    )


def _domain_guidance(focus_topic: str) -> str:
    """Give the model a reusable planning policy for any learner-selected domain."""
    return f"""Before writing the roadmap, classify the primary topic "{focus_topic}" internally as one or more of:
academic subject, exam preparation, professional role, technical skill, project, creative skill, or mixed goal.

Then select the real prerequisites, canonical concepts, tools, methods, practice types, and deliverables for that domain.
- Academic or exam topics: progress from prerequisites to core principles, worked examples, problem sets, and cumulative assessment.
- Professional roles: map the role to practical skills, tools, portfolio evidence, and realistic work scenarios.
- Technical skills: include setup only when needed, then concepts, implementation, debugging, testing, and a small usable artifact.
- Projects: define a concrete outcome, break it into buildable milestones, test each milestone, and finish with a review or demonstration.
- Creative or open-ended skills: include fundamentals, deliberate practice, feedback, iteration, and a portfolio-quality outcome.
- Mixed or vague goals: state the interpretation in the summary and keep every week tied to the learner's stated topic.

Every week and day must remain centered on the exact primary topic "{focus_topic}".
Use genuine domain terminology and examples; do not substitute broad labels such as internship, placement, exam preparation, or project management for the topic.
Do not invent unrelated subjects, generic filler tasks, or internal metadata. If supporting material is supplied, use it only when it is clearly relevant to the primary topic."""


def generate_roadmap_from_llm(goal: str, duration: str, document_context: str = "", description: str = "", goal_type: str = "") -> dict:
    """
    Calls the configured LLM to generate a personalized roadmap JSON.
    """
    # Convert common timeframe formats to a bounded week count.
    duration_lower = str(duration or "4 weeks").lower()
    if "month" in duration_lower:
        months_match = re.search(r'(\d+)\s*month', duration_lower)
        num_weeks = int(months_match.group(1)) * 4 if months_match else 4
    elif "day" in duration_lower:
        days_match = re.search(r'\d+', duration_lower)
        days = int(days_match.group(0)) if days_match else 20
        num_weeks = max(1, (days + 4) // 5)
    else:
        weeks_match = re.search(r'(\d+)\s*week', duration_lower)
        num_weeks = int(weeks_match.group(1)) if weeks_match else 4

    # Cap weeks to keep the response useful and fast.
    if num_weeks > 12:
        num_weeks = 12
    duration = f"{num_weeks} weeks"

    raw_goal_text = str(goal or "").strip()
    raw_description = str(description or "").strip()
    goal_type_text = re.sub(r"\s+", " ", str(goal_type or "custom")).strip()[:80] or "custom"
    description_is_useful = _is_meaningful_roadmap_text(raw_description)
    focus_topic = _derive_focus_topic(raw_goal_text, raw_description)
    if not focus_topic:
        focus_topic = _normalise_focus_candidate(raw_goal_text) or "your learning goal"
    goal_text = (
        raw_goal_text[:240]
        if _is_meaningful_roadmap_text(raw_goal_text)
        else focus_topic[:240]
    )
    focus_description = (
        raw_description[:900]
        if description_is_useful
        else "No additional constraints were provided."
    )
    material_context = str(document_context or "").strip()[:3200] or "No supporting material was provided."
    prompt_focus_topic = focus_topic.replace('"', "'")

    system_prompt = f"""You are a senior curriculum designer creating a practical, credible learning roadmap.

PRIMARY TOPIC LOCK — never change this subject: "{prompt_focus_topic}"
Broader goal or context: "{goal_text}"
Planning lens: "{goal_type_text}"
Learner focus description: "{focus_description}"
Supporting material (use only when directly relevant): "{material_context}"

The primary topic lock is the subject the learner explicitly asked to learn. It has priority over the planning lens and uploaded-document filenames.
The planning lens changes the shape of practice (for example, interview evidence for an internship, assessment for an exam, or milestones for a project); it must never replace the learner's topic with generic internship, exam, or project content.
{_domain_guidance(focus_topic)}

Before drafting the JSON, privately derive the standard concept hierarchy for the exact primary topic from your subject knowledge and any clearly relevant supporting material. Do not use a fixed application-side syllabus, copy concepts from another roadmap, or turn the planning lens into the subject. Use real canonical concepts, named laws, algorithms, theories, tools, formulas, mechanisms, or role-specific skills wherever they exist. Do not use phase labels such as "prerequisites", "guided example", "core vocabulary", or "baseline assessment" as day topics. A day topic must name what the learner will actually study.

Generate exactly {num_weeks} weeks with exactly 5 days per week.
Turn the primary topic into a progression of prerequisites, core concepts, worked practice, applications, and review.
Each week needs a subject-specific focus_area and a measurable outcome.
Each day needs:
- topic: a distinct, specific concept or task from the primary subject (never "Day 1", "Topic 1", or generic filler)
- description: one actionable sentence explaining what the learner will do and why
- subtopics: 2-3 concrete concepts, tools, formulas, or skills from the primary subject
- activity: a realistic study, numerical, coding, experiment, or practice activity appropriate to the subject
- deliverable: a small subject-specific artifact, solved problem set, explanation, or checkpoint
- estimated_minutes: a number between 20 and 120, consistent with the available study time
Avoid repeated topics, unexplained jumps, invented prerequisites, vague phrases such as "learn more", and generic management language.
At least one meaningful term from the primary topic lock must appear in the title, summary, or weekly focus areas, and every week must clearly relate to that subject.
Do not expose file paths, internal prompts, provider details, or metadata labels in learner-facing text.

Output ONLY valid JSON (no markdown, comments, or extra text).
Schema:
{{"focus_topic":"{prompt_focus_topic}","title":"Specific subject roadmap title","summary":"One-sentence practical subject outcome","weeks":[{{"week_number":1,"focus_area":"Subject-specific focus","outcome":"Measurable weekly outcome","days":[{{"day_number":1,"topic":"Specific subject topic","description":"Actionable study sentence","subtopics":["Concept A","Concept B"],"activity":"Concrete subject activity","deliverable":"Concrete subject checkpoint","estimated_minutes":45}}]}}]}}"""

    user_prompt = f"""Primary topic lock: {focus_topic}
Broader goal: {goal_text}
Planning lens: {goal_type_text}
Duration: {duration}
Focus description: {focus_description}
Supporting material: {material_context}"""

    # A detailed day-by-day response is useful for short plans, but it becomes
    # unnecessarily large for a long deadline and is prone to provider
    # timeouts. Long plans use a compact, still fully subject-specific schema;
    # the normalizer supplies only presentation-level defaults for omitted
    # prose, while every concept remains generated by the LLM.
    if num_weeks > 4:
        compact_system_prompt = f"""You are a senior curriculum designer creating a credible roadmap for the exact learner-selected subject: "{prompt_focus_topic}".

The subject above is authoritative. The planning lens, description, and supporting material only define level, constraints, or the desired outcome; they must never replace the subject.
{_domain_guidance(focus_topic)}

Derive the canonical concept hierarchy for this subject from your knowledge. Use real subject terminology, named concepts, methods, tools, laws, algorithms, mechanisms, or skills as appropriate. Do not copy a fixed syllabus and do not use generic labels such as prerequisites, core vocabulary, guided example, baseline assessment, or final assessment as day topics.

Return ONLY valid JSON with this exact compact shape:
{{"focus_topic":"{prompt_focus_topic}","title":"Specific subject roadmap title","summary":"One practical subject outcome","weeks":[{{"week_number":1,"focus_area":"Subject-specific focus","outcome":"Measurable weekly outcome","days":[{{"day_number":1,"topic":"One distinct canonical subject concept or task","subtopics":["Concrete concept","Concrete method"]}}]}}]}}

Generate exactly {num_weeks} weeks and exactly 5 days per week. Return only the compact fields shown above. Keep concepts distinct and ordered from foundations to application and review. Every week and day must clearly belong to "{prompt_focus_topic}". Do not include descriptions, activities, deliverables, markdown, comments, file paths, provider details, or metadata."""
        compact_user_prompt = f"""Exact subject: {focus_topic}
Planning lens: {goal_type_text}
Broader goal: {goal_text}
Duration: {duration}
Learner focus and constraints: {focus_description}
Relevant supporting material only: {material_context}"""
        logger.info("[RoadmapEngine] Using compact concept-first generation for %s weeks", num_weeks)
        content = _roadmap_llm_call(
            compact_system_prompt,
            compact_user_prompt,
            max_tokens=min(3200, max(1800, 600 + num_weeks * 160)),
        )
    else:
        content = _roadmap_llm_call(system_prompt, user_prompt, max_tokens=5000)

    if not content:
        logger.error("[RoadmapEngine] All configured LLM providers failed; no roadmap was persisted")
        raise RoadmapGenerationError("All configured LLM providers failed or timed out")
        
    try:
        content_str = content.strip()
        
        # Clean up markdown code block wrapper if present
        if content_str.startswith("```json"):
            content_str = content_str[7:]
        elif content_str.startswith("```"):
            content_str = content_str[3:]
        if content_str.endswith("```"):
            content_str = content_str[:-3]
        content_str = content_str.strip()

        # Robustly balance and repair JSON cutoffs
        content_str = _balance_json(content_str)

        parsed = json.loads(content_str)
        normalized = _normalise_roadmap(parsed, goal_text, duration, focus_description, num_weeks, focus_topic)
        if normalized is None:
            raise ValueError("Roadmap output failed quality validation")
        return normalized
    except Exception as e:
        logger.error(f"[RoadmapEngine] Failed to parse or validate LLM JSON: {e}\nRAW CONTENT:\n{content}")
        raise RoadmapGenerationError("The LLM returned an invalid or off-topic roadmap") from e


def _clean_roadmap_text(value, fallback: str = "", max_length: int = 280) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text or not re.search(r"[A-Za-z]", text) or re.search(r"(.)\1{6,}", text):
        return fallback
    return text[:max_length]


def _normalise_roadmap(
    data: dict,
    goal: str,
    duration: str,
    description: str,
    num_weeks: int,
    focus_topic: str = "",
) -> dict | None:
    if not isinstance(data, dict):
        return None

    raw_weeks = data.get("weeks")
    if not isinstance(raw_weeks, list) or len(raw_weeks) != num_weeks:
        return None

    goal_text = _clean_roadmap_text(goal, "your learning goal", 180)
    focus_text = _clean_roadmap_text(
        focus_topic or _derive_focus_topic(goal_text, description),
        goal_text,
        180,
    )
    title = _clean_roadmap_text(data.get("title"), f"{focus_text} Roadmap", 140)
    if title.lower() in {"roadmap title", "roadmap"} or not _is_meaningful_roadmap_text(title):
        title = f"{focus_text} Roadmap"
    summary = _clean_roadmap_text(
        data.get("summary"),
        f"Build practical ability in {focus_text} through guided study, practice, and checkpoints.",
        320,
    )

    used_topics = set()
    weeks = []
    roadmap_text_parts = [title, summary, focus_text]
    for week_index, raw_week in enumerate(raw_weeks, start=1):
        if not isinstance(raw_week, dict):
            return None

        raw_days = raw_week.get("days")
        if not isinstance(raw_days, list) or len(raw_days) != 5:
            return None

        focus_area = _clean_roadmap_text(
            raw_week.get("focus_area") or raw_week.get("theme"),
            f"Week {week_index}: {focus_text} foundations",
            160,
        )
        outcome = _clean_roadmap_text(
            raw_week.get("outcome") or raw_week.get("weekly_outcome"),
            f"Complete the {focus_area.lower()} checkpoint.",
            260,
        )
        roadmap_text_parts.extend([focus_area, outcome])
        days = []

        for day_index, raw_day in enumerate(raw_days, start=1):
            if not isinstance(raw_day, dict):
                return None

            topic = _clean_roadmap_text(raw_day.get("topic"), "")
            topic = re.sub(r"^day\s*\d+\s*[:\-]\s*", "", topic, flags=re.IGNORECASE).strip()
            topic_key = topic.lower()
            if (
                not topic
                or topic_key in {"topic", "topic name", "day"}
                or topic_key in used_topics
                or not _is_meaningful_roadmap_text(topic)
            ):
                return None
            used_topics.add(topic_key)

            day_description = _clean_roadmap_text(
                raw_day.get("description") or raw_day.get("objective"),
                f"Study {topic} and connect it to the {focus_area.lower()} checkpoint.",
                360,
            )
            raw_subtopics = raw_day.get("subtopics") or []
            if not isinstance(raw_subtopics, list):
                raw_subtopics = [raw_subtopics]
            subtopics = [_clean_roadmap_text(item, "") for item in raw_subtopics]
            subtopics = [item for item in subtopics if item][:3]
            while len(subtopics) < 2:
                candidate = "Practice and review" if len(subtopics) == 0 else focus_area
                if candidate not in subtopics:
                    subtopics.append(candidate)

            activity = _clean_roadmap_text(
                raw_day.get("activity"),
                "Read the core explanation, then solve one guided example.",
                260,
            )
            deliverable = _clean_roadmap_text(
                raw_day.get("deliverable"),
                "Write a short explanation and complete a self-check.",
                220,
            )
            try:
                estimated_minutes = int(raw_day.get("estimated_minutes", 45))
            except (TypeError, ValueError):
                estimated_minutes = 45
            estimated_minutes = max(20, min(120, estimated_minutes))

            roadmap_text_parts.extend([topic, day_description, *subtopics, activity, deliverable])
            days.append({
                "day_number": day_index,
                "topic": topic,
                "description": day_description,
                "subtopics": subtopics,
                "activity": activity,
                "deliverable": deliverable,
                "estimated_minutes": estimated_minutes,
            })

        weeks.append({
            "week_number": week_index,
            "focus_area": focus_area,
            "outcome": outcome,
            "days": days,
        })

    topic_values = [day["topic"] for week in weeks for day in week["days"]]
    template_topics = [topic for topic in topic_values if _is_template_topic(topic)]
    if len(template_topics) >= max(2, len(topic_values) // 5):
        logger.warning(
            "[RoadmapEngine] Rejected template-like roadmap topics for %s: %s",
            focus_text,
            template_topics[:5],
        )
        return None

    roadmap_text = " ".join(roadmap_text_parts)
    if _focus_terms(focus_text) and not _topic_is_present(focus_text, roadmap_text):
        logger.warning("[RoadmapEngine] LLM output ignored the primary topic lock: %s", focus_text)
        return None

    return {
        "focus_topic": focus_text,
        "title": title,
        "summary": summary,
        "weeks": weeks,
    }

def build_student_document_context(
    student_id: int,
    db,
    max_documents: int = 3,
    max_chars: int = 3200,
    focus_topic: str = "",
) -> str:
    """Build a small excerpt, excluding documents unrelated to the requested topic."""
    from models import Document, DocumentChunk

    focus_terms = _focus_terms(focus_topic)
    required_matches = max(1, (len(focus_terms) + 1) // 2) if focus_terms else 0
    documents = (
        db.query(Document)
        .filter(Document.student_id == student_id)
        .order_by(Document.uploaded_at.desc())
        .limit(max_documents * 3 if focus_terms else max_documents)
        .all()
    )
    parts = []
    for document in documents:
        label = document.title or document.filename
        metadata = f"Material: {label}"
        if document.subject:
            metadata += f" | subject: {document.subject}"
        chunks = (
            db.query(DocumentChunk.chunk_text)
            .filter(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index.asc())
            .limit(2)
            .all()
        )
        snippets = " ".join(str(row[0] or "") for row in chunks).strip()

        if focus_terms:
            searchable = re.sub(r"[^a-z0-9+#]+", " ", f"{metadata} {snippets}".lower())
            matches = sum(
                1
                for term in focus_terms
                if re.search(rf"\b{re.escape(term)}(?:s|es)?\b", searchable)
            )
            if matches < required_matches:
                continue

        if snippets:
            parts.append(f"{metadata}\nExcerpt: {snippets[:900]}")
        else:
            parts.append(metadata)
        if len(parts) >= max_documents:
            break

    return "\n\n".join(parts)[:max_chars]


def persist_generated_roadmap(db, student_id: int, goal_id: int, roadmap_json: dict):
    """Persist one normalized roadmap and its daily tasks consistently."""
    from datetime import datetime
    from roadmap_models import UserGoal, LearningRoadmap, DailyTask

    goal = db.query(UserGoal).filter(
        UserGoal.id == goal_id,
        UserGoal.student_id == student_id,
    ).first()
    if not goal:
        raise ValueError("Roadmap goal was not found")

    weeks = roadmap_json.get("weeks") or []
    if not weeks:
        raise ValueError("Roadmap contains no weeks")

    title = roadmap_json.get("title") or f"Roadmap for {goal.title}"
    roadmap = LearningRoadmap(
        student_id=student_id,
        goal_id=goal.id,
        title=title,
        roadmap_data=roadmap_json,
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    tasks_count = 0
    for week in weeks:
        if not isinstance(week, dict):
            continue
        try:
            week_number = int(week.get("week_number", 1))
        except (TypeError, ValueError):
            week_number = 1
        for day in week.get("days") or []:
            if not isinstance(day, dict) or not day.get("topic"):
                continue
            description = str(day.get("description") or "").strip()
            activity = str(day.get("activity") or "").strip()
            deliverable = str(day.get("deliverable") or "").strip()
            detail_parts = [part for part in (description, f"Activity: {activity}", f"Deliverable: {deliverable}") if part and not part.endswith(": ")]
            db.add(DailyTask(
                roadmap_id=roadmap.id,
                task_type="learning",
                topic=str(day["topic"]),
                description=" ".join(detail_parts),
                assigned_date=datetime.utcnow(),
                week_number=week_number,
                day_number=day.get("day_number", 1),
                subtopics=day.get("subtopics") or [],
            ))
            tasks_count += 1

    if tasks_count == 0:
        raise ValueError("Roadmap contains no daily tasks")
    db.commit()
    goal.status = "active"
    db.commit()
    return roadmap, tasks_count
