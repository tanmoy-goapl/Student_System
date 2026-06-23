import json
import os
import re
import logging
import httpx
from openai import OpenAI
from config import GPT_API_KEY, GPT_BASE_URL, GPT_MODEL, LLAMA_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL
from llm_state import get_provider

logger = logging.getLogger(__name__)

def _roadmap_llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 8000) -> str:
    """Make an LLM call using the active provider with a fallback chain."""
    provider = get_provider()
    configs = []

    logger.info(f"[RoadmapEngine] Preferred provider: {provider}")

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))
        else:
            logger.warning("[RoadmapEngine] GPT config missing API_KEY or BASE_URL")

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))
        else:
            logger.warning("[RoadmapEngine] Llama config missing API_KEY or BASE_URL")

    # Try preferred provider first, then fall back to the other if available.
    if provider == "gpt4o":
        add_gpt()
        add_llama()
    elif provider == "llama":
        add_llama()
        add_gpt()
    else:
        add_gpt()
        add_llama()

    logger.info(f"[RoadmapEngine] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"[RoadmapEngine] Trying provider '{name}' at {base_url} using model {model}...")
            client = OpenAI(api_key=api_key, base_url=base_url)

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
                timeout=120.0
            )
            logger.info(f"[RoadmapEngine] Success with provider '{name}'!")
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[RoadmapEngine] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            continue

    logger.error("[RoadmapEngine] All configured LLM providers failed.")
    return ""

def generate_roadmap_from_llm(goal: str, deadline: str, document_context: str = "") -> dict:
    
    system_prompt = "You are a helpful JSON-generating assistant for educational roadmaps."
    
    user_prompt = f"""
    You are an expert AI personalized mentor for a B.Tech CSE student.
    Your task is to generate a structured weekly learning roadmap based on the user's goal.
    
    USER GOAL: {goal}
    DEADLINE / TIMEFRAME: {deadline}
    
    OPTIONAL CONTEXT (Resume/Marksheet/Syllabus):
    {document_context if document_context else "No additional documents provided."}
    
    CRITICAL INSTRUCTION FOR PLACEMENT/INTERNSHIP GOALS:
    If the goal involves placements, internships, or job preparation, the roadmap MUST be highly rigorous. Do NOT generate generic "overview" or "basics" topics. Instead, include advanced Data Structures & Algorithms (Leetcode Medium/Hard patterns), System Design principles, deep-dive technical interview topics, and complex project building. The daily tasks should reflect the difficulty of top-tier tech company interviews.

    Based on this, create a concise, logical, week-by-week learning roadmap.
    CRITICAL PERFORMANCE LIMITATION: To keep the response fast, generate a MAXIMUM of 4 weeks. If the timeframe is longer, condense the entire plan into 4 high-yield milestone weeks.
    For each week, provide exactly 3 achievable, technically deep learning units (Days).
    
    Output strictly in the following JSON format without Markdown formatting or code blocks:
    {{
        "title": "A catchy title for this roadmap",
        "weeks": [
            {{
                "week_number": 1,
                "focus_area": "Introduction and Basics",
                "days": [
                    {{"day_number": 1, "topic": "Day 1: HTML Basics", "description": "Read about HTML structure and semantics", "subtopics": ["HTML Structure", "Common Tags", "Semantic HTML"]}},
                    {{"day_number": 2, "topic": "Day 2: Forms and Tables", "description": "Learn about creating forms and tables", "subtopics": ["Forms", "Input Types", "Tables"]}}
                ]
            }},
            {{
                "week_number": 2,
                "focus_area": "Intermediate Concepts",
                "days": [
                    {{"day_number": 1, "topic": "Day 1: Advanced Concepts", "description": "Dive deep into advanced concepts", "subtopics": ["Concept 1", "Concept 2"]}}
                ]
            }}
        ]
    }}
    """
    
    content = _roadmap_llm_call(system_prompt, user_prompt)
    
    if not content:
        logger.warning("[RoadmapEngine] Empty LLM response, returning fallback")
        return _fallback_roadmap("All configured LLM providers failed or timed out")
        
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

        # Find the outermost curly braces to extract raw JSON
        start_idx = content_str.find('{')
        end_idx = content_str.rfind('}')
        if start_idx != -1 and end_idx != -1:
            content_str = content_str[start_idx:end_idx + 1]

        return json.loads(content_str)
    except Exception as e:
        logger.error(f"[RoadmapEngine] Failed to parse LLM JSON: {e}")
        return _fallback_roadmap(f"Parse Error: {str(e)}")


def _fallback_roadmap(error_msg: str = "") -> dict:
    title = "Fallback Roadmap"
    if error_msg:
        title += f" ({error_msg})"
        
    return {
        "title": title,
        "weeks": [
            {
                "week_number": 1,
                "focus_area": "Getting Started",
                "days": [
                    {
                        "day_number": 1,
                        "topic": "Day 1: Introduction",
                        "description": "Start learning",
                        "subtopics": ["Getting Started", "Setup"]
                    }
                ]
            }
        ]
    }

