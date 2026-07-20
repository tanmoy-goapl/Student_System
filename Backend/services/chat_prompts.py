from services.chat_intent import RetrievalMode
from llm_state import get_user_preferences

MAX_CONTEXT_LEN = 12000


def get_role_instruction(role: str, user_name: str) -> str:
    if role == "admin":
        return f"""
You are assisting an ADMIN user named {user_name}.

• You have access to universal documents, admin-shared documents, and the admin's own private documents.
• You can analyze institutional data, evaluate trends, and give high-level insights from accessible documents.
• You can answer strategic, analytical, and general knowledge questions.
• You MUST NOT reference documents that are private to students or professors.
"""
    elif role == "professor":
        return f"""
You are assisting a PROFESSOR named {user_name}.

• You have access to universal documents, course-shared documents for courses you teach, and your own private documents.
• You can analyze student performance data from accessible documents.
• You can suggest teaching improvements, course plans, and strategies.
• You can answer general knowledge and learning questions freely.
• You MUST NOT reference documents that are private to students or admins.
"""
    elif role == "student":
        return f"""
You are assisting a STUDENT ({user_name}).

• You have access to universal documents, course-shared documents for enrolled courses, and your own private documents.
• You can ask about study help, marks, improvement, and learning plans.
• You can ask general knowledge, coding, and learning questions freely.
• You MUST NOT reference documents that are private to professors or admins.
"""
    return ""


def _build_system_prompt(
    mode: RetrievalMode,
    doc_names: list[str],
    context: str,
    role: str,
    user_name: str = "the user",
) -> str:
    doc_list = ", ".join(doc_names) or "(none)"
    role_instruction = get_role_instruction(role, user_name)

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

    role_label = "STUDENT" if role == "student" else "PROFESSOR" if role == "professor" else "ADMIN"

    base = f"""You are MentorAI — a warm, encouraging academic mentor.

ROLE GUIDELINE:
{role_instruction}

CURRENT USER ({role_label}): {user_name}
AVAILABLE DOCUMENTS: {doc_list}
"""

    # ── Mode-specific rules ──────────────────────────────────────────────────
    if mode == RetrievalMode.STRICT_DOCUMENT:
        rules = f"""
MODE: STRICT DOCUMENT MODE
CRITICAL RULES:
• Use ONLY the provided CONTEXT.
• Ignore all other documents.
• Ignore your own knowledge.
• If the answer is missing from the CONTEXT, explicitly state that it does not exist in the document.
• Never infer or estimate missing information.
• Every factual statement derived from a document MUST contain its source filename (e.g. 'Source: filename.pdf').

===== CONTEXT (STRICT) =====
{context[:MAX_CONTEXT_LEN]}
===== END CONTEXT =====
"""
    elif mode == RetrievalMode.FACTUAL_RAG:
        rules = f"""
MODE: FACTUAL RAG MODE
CRITICAL RULES:
• Use ONLY the retrieved CONTEXT documents.
• Never use external knowledge.
• Never estimate values.
• Never hallucinate facts, scores, attendance, CGPA, companies or policies.
• If the answer is not in the context, you MUST say exactly: "I could not find this information in the available documents."
• Every factual statement derived from a document MUST contain its source filename (e.g. 'Source: filename.pdf').

===== CONTEXT (FACTS ONLY) =====
{context[:MAX_CONTEXT_LEN]}
===== END CONTEXT =====
"""
    elif mode == RetrievalMode.LEARNING:
        rules = f"""
MODE: LEARNING MODE
CRITICAL RULES:
• Use educational documents from CONTEXT if they are relevant.
• If educational documents are unavailable or irrelevant, answer using your broad general knowledge.
• CLEARLY SEPARATE your answer into two distinct sections:
    1. 'Information from documents' (attribute chunks to source documents, e.g. 'Source: notes.pdf')
    2. 'Information from general knowledge'
• Never hallucinate facts.

===== REFERENCE CONTEXT =====
{context[:MAX_CONTEXT_LEN]}
===== END CONTEXT =====
"""
    elif mode == RetrievalMode.PERSONALIZED_ADVISOR:
        rules = f"""
MODE: PERSONALIZED ADVISOR MODE
CRITICAL RULES:
• Combine information from the provided CONTEXT (resume, marksheets, placement reports, learning analytics) with your broad general knowledge to give career advice, improvement plans, or study strategy.
• Never fabricate scores, attendance, CGPA, companies or policies.
• Every factual statement derived from a document MUST contain its source filename (e.g. 'Source: filename.pdf').
• Provide actionable, personalized advice.

===== REFERENCE CONTEXT =====
{context[:MAX_CONTEXT_LEN]}
===== END CONTEXT =====
"""
    else:
        rules = """
CRITICAL RULES:
• Answer carefully.
• Every factual statement derived from a document MUST contain its source filename.
"""

    formatting = f"""
GENERAL FORMATTING RULES:
• DO NOT output raw markdown or ASCII tables (using pipe | characters). Instead, present schedules, comparisons, or plans using clean bullet points, bold headers, and numbered lists to structure your response beautifully.
{style_guide}
{tone_guide}
• Maximum 300–400 words.
"""

    return base + rules + formatting


def apply_role_guardrails(role: str, question: str) -> str:
    """Role guardrails are now minimal — role controls document visibility,
    not question capability. All users can ask general knowledge questions."""
    return ""  # allowed
