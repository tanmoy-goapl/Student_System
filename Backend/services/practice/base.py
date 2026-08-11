import logging
import os
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider

logger = logging.getLogger("chatbot")

CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "topics_cache.json")


def _practice_llm_call(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2048,
    timeout_seconds: float = 15.0,
    allow_fallback_chain: bool = True,
) -> str:
    """Call the LLM with a system + user prompt. Returns raw text response."""
    provider = get_provider()
    configs = []

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))

    def add_backup():
        # Hardcoded active fallback to avoid timeouts when local gpt-oss is frozen
        configs.append(("Backup-GPT", "4c8c56fede640bf281a7e36128fef8c18ad0b5f97a5a6bbb2e41e29d4f5a895d", "http://10.10.90.94:2026/v1", "gpt-4o-mini"))

    if provider == "gpt4o":
        add_gpt(); add_llama(); add_backup()
    elif provider == "llama":
        add_llama(); add_gpt(); add_backup()
    else:
        add_gpt(); add_llama(); add_backup()

    if not allow_fallback_chain:
        configs = configs[:1]

    last_error = "No configurations available"
    for name, api_key, base_url, model in configs:
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
                timeout=timeout_seconds,
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


def _practice_llm_stream(system_prompt: str, user_prompt: str, max_tokens: int = 2048, cancel_event=None):
    """Call the LLM and yield chunks of the response. Accepts an optional threading.Event to cancel early."""
    provider = get_provider()
    configs = []

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append(("GPT-4o-mini", GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))

    def add_backup():
        # Hardcoded active fallback to avoid timeouts when local gpt-oss is frozen
        configs.append(("Backup-GPT", "4c8c56fede640bf281a7e36128fef8c18ad0b5f97a5a6bbb2e41e29d4f5a895d", "http://10.10.90.94:2026/v1", "gpt-4o-mini"))

    if provider == "gpt4o":
        add_gpt(); add_llama(); add_backup()
    elif provider == "llama":
        add_llama(); add_gpt(); add_backup()
    else:
        add_gpt(); add_llama(); add_backup()

    last_error = "No configurations available"
    for name, api_key, base_url, model in configs:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            import httpx
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.3,
                timeout=httpx.Timeout(15.0, connect=1.5),
                stream=True,
            )
            for chunk in resp:
                if cancel_event and cancel_event.is_set():
                    logger.info(f"[PracticeEngine] LLM stream '{name}' cancelled by client disconnect.")
                    try:
                        resp.close()
                    except Exception:
                        pass
                    return
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            return
        except Exception as e:
            logger.error(f"[PracticeEngine] LLM Stream '{name}' failed: {e}")
            last_error = str(e)
            continue

    yield f"ERROR: {last_error}"
