import logging
import os
import time
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider
from openai import OpenAI

logger = logging.getLogger(__name__)


class LLMStreamTimeout(Exception):
    """Raised when a chat generation exceeds its wall-clock budget."""


def _chat_stream_budget() -> float:
    try:
        return max(10.0, float(os.getenv("CHAT_LLM_MAX_SECONDS", "90")))
    except (TypeError, ValueError):
        return 90.0

# ═══════════════════════════════════════════════════════════════════════════════
#  CACHED CLIENTS — avoids re-creating HTTP sessions + TLS on every call
# ═══════════════════════════════════════════════════════════════════════════════

_cached_clients: dict[str, OpenAI] = {}

def _get_client(api_key: str, base_url: str) -> OpenAI:
    """Return a cached OpenAI client for the given base_url."""
    cache_key = f"{base_url}|{api_key[:8]}"
    if cache_key not in _cached_clients:
        _cached_clients[cache_key] = OpenAI(api_key=api_key, base_url=base_url)
    return _cached_clients[cache_key]


def _build_configs():
    """Build the ordered provider config list based on current preference."""
    provider = get_provider()
    configs = []

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append((GPT_MODEL, GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))

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

    return provider, configs


def _call_llm(system_prompt: str, history: list, question: str) -> str:
    provider, configs = _build_configs()
    logger.info(f"  [LLM Call] Preferred provider: {provider}")
    logger.info(f"  [LLM Call] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"  [LLM Call] Trying provider '{name}' at {base_url} using model {model}...")
            client = _get_client(api_key, base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048,
                temperature=0.2,
                timeout=10.0,
            )
            logger.info(f"  [LLM Call] Success with provider '{name}'!")
            return resp.choices[0].message.content
        except Exception as e:
            import traceback
            logger.error(f"  [LLM Call] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            logger.error(traceback.format_exc())
            continue

    logger.error("  [LLM Call] ❌ All configured LLM providers failed. Falling back to plain context.")
    return (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("REFERENCE CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )


def _call_llm_stream(system_prompt: str, history: list, question: str):
    provider, configs = _build_configs()
    logger.info(f"  [LLM Stream] Preferred provider: {provider}")
    logger.info(f"  [LLM Stream] Resolved configuration chain: {[c[0] for c in configs]}")
    deadline = time.monotonic() + _chat_stream_budget()

    for name, api_key, base_url, model in configs:
        if time.monotonic() >= deadline:
            raise LLMStreamTimeout("chat generation exceeded its time limit")
        try:
            logger.info(f"  [LLM Stream] Trying provider '{name}' at {base_url} using model {model}...")
            client = _get_client(api_key, base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            t_sent = time.perf_counter()
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048,
                temperature=0.2,
                timeout=10.0,
                stream=True,
            )
            
            first_byte_received = False
            for chunk in resp:
                if time.monotonic() >= deadline:
                    try:
                        resp.close()
                    except Exception:
                        pass
                    raise LLMStreamTimeout("chat generation exceeded its time limit")
                if not first_byte_received:
                    t_first_byte = time.perf_counter()
                    logger.info(f"  [Timing] Network: LLM Request sent -> First byte received: {t_first_byte - t_sent:.3f}s")
                    first_byte_received = True
                    
                if not getattr(chunk, "choices", None):
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    yield content
            logger.info(f"  [LLM Stream] Success with provider '{name}'!")
            return
        except LLMStreamTimeout:
            raise
        except Exception as e:
            import traceback
            logger.error(f"  [LLM Stream] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            logger.error(traceback.format_exc())
            continue

    logger.error("  [LLM Stream] ❌ All configured LLM providers failed. Falling back to plain context.")
    fallback_text = (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("REFERENCE CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )
    yield fallback_text
