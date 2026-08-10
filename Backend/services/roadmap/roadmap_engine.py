import json
import os
import re
import logging
import httpx
from openai import OpenAI
from config import GPT_API_KEY, GPT_BASE_URL, GPT_MODEL, LLAMA_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL
from llm_state import get_provider

logger = logging.getLogger(__name__)

def _roadmap_llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
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

    def add_backup():
        # Hardcoded active fallback to avoid timeouts when local gpt-oss is frozen
        configs.append(("Backup-GPT", "4c8c56fede640bf281a7e36128fef8c18ad0b5f97a5a6bbb2e41e29d4f5a895d", "http://10.10.90.94:2026/v1", "gpt-4o-mini"))

    # Try preferred provider first, then fall back to the other if available.
    if provider == "gpt4o":
        add_gpt(); add_llama(); add_backup()
    elif provider == "llama":
        add_llama(); add_gpt(); add_backup()
    else:
        add_gpt(); add_llama(); add_backup()

    logger.info(f"[RoadmapEngine] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"[RoadmapEngine] Trying provider '{name}' at {base_url} using model {model}...")
            # Use httpx.Timeout for proper connect + read timeout separation.
            timeout = httpx.Timeout(15.0, connect=3.0)
            client = OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.3,
            )
            logger.info(f"[RoadmapEngine] Success with provider '{name}'!")
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[RoadmapEngine] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            continue

    logger.error("[RoadmapEngine] All configured LLM providers failed.")
    return ""


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

def generate_roadmap_from_llm(goal: str, duration: str, document_context: str = "") -> dict:
    """
    Calls the configured LLM to generate a personalized roadmap JSON.
    """
    # Convert days to weeks for the week-by-week curriculum generator
    duration_lower = duration.lower()
    if "day" in duration_lower:
        days_match = re.search(r'\d+', duration_lower)
        if days_match:
            days = int(days_match.group(0))
            weeks = max(1, (days + 4) // 5)
            duration = f"{weeks} weeks"

    # Cap weeks to avoid huge outputs that time out
    weeks_match = re.search(r'(\d+)\s*week', duration.lower())
    num_weeks = int(weeks_match.group(1)) if weeks_match else 4
    if num_weeks > 12:
        num_weeks = 12
        duration = "12 weeks"

    system_prompt = f"""You are an expert curriculum designer. Create a week-by-week roadmap for learning "{goal}" over "{duration}".
Generate exactly {num_weeks} weeks with exactly 5 days per week.
For placement/job/internship goals, include DSA, System Design, and project-building topics.

Output ONLY valid JSON (no markdown, no comments, no extra whitespace). Do NOT include descriptions or subtopics.
Format exactly like this:
{{"title":"Roadmap Title","weeks":[{{"week_number":1,"focus_area":"Area","days":[{{"day_number":1,"topic":"Topic Name"}}]}}]}}"""
    
    user_prompt = f"Goal: {goal}\nDuration: {duration}"
    
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

        # Robustly balance and repair JSON cutoffs
        content_str = _balance_json(content_str)

        return json.loads(content_str)
    except Exception as e:
        logger.error(f"[RoadmapEngine] Failed to parse LLM JSON: {e}\nRAW CONTENT:\n{content}")
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
