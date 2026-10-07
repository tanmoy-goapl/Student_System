import logging
import os
import httpx
from openai import OpenAI
from config import GPT_API_KEY, GPT_BASE_URL, GPT_MODEL, LLAMA_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL
from llm_state import get_provider

logger = logging.getLogger(__name__)

def _roadmap_llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
    """Make an LLM call using the active provider with a fast fallback chain."""
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

    # Try the configured provider first. The backup endpoint is useful for
    # failover, but trying it first made a slow or unavailable backup delay
    # every roadmap request even when the active provider was healthy.
    if provider == "gpt4o":
        add_gpt(); add_backup(); add_llama()
    elif provider == "llama":
        add_llama(); add_gpt(); add_backup()
    else:
        add_gpt(); add_backup(); add_llama()

    logger.info(f"[RoadmapEngine] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"[RoadmapEngine] Trying provider '{name}' at {base_url} using model {model}...")
            # Roadmaps can contain several weeks of structured content. Keep
            # connection failover quick, but allow the model enough time to
            # finish a compact long-roadmap response.
            try:
                # Roadmaps are structured multi-week responses. The previous
                # 25-second default frequently expired while the model was
                # still producing valid JSON, especially for four-week plans.
                read_timeout = max(30.0, float(os.getenv("ROADMAP_LLM_TIMEOUT_SECONDS", "90")))
            except (TypeError, ValueError):
                read_timeout = 90.0
            timeout = httpx.Timeout(read_timeout, connect=1.5)
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
