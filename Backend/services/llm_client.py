import logging
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider

logger = logging.getLogger(__name__)

def _call_llm(system_prompt: str, history: list, question: str) -> str:
    provider = get_provider()
    configs = []

    logger.info(f"  [LLM Call] Preferred provider: {provider}")

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append((GPT_MODEL, GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))
        else:
            logger.warning("  [LLM Call] GPT config missing API_KEY or BASE_URL")

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))
        else:
            logger.warning("  [LLM Call] Llama config missing API_KEY or BASE_URL")

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

    logger.info(f"  [LLM Call] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"  [LLM Call] Trying provider '{name}' at {base_url} using model {model}...")
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048,
                temperature=0.2,
                timeout=30,
            )
            logger.info(f"  [LLM Call] Success with provider '{name}'!")
            return resp.choices[0].message.content
        except Exception as e:
            import traceback
            logger.error(f"  [LLM Call] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            logger.error(traceback.format_exc())
            continue  # try next provider

    logger.error("  [LLM Call] ❌ All configured LLM providers failed. Falling back to plain context.")
    # Plain context fallback (no LLM available)
    return (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("REFERENCE CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )


def _call_llm_stream(system_prompt: str, history: list, question: str):
    provider = get_provider()
    configs = []

    logger.info(f"  [LLM Stream] Preferred provider: {provider}")

    def add_gpt():
        if GPT_API_KEY and GPT_BASE_URL:
            configs.append((GPT_MODEL, GPT_API_KEY, GPT_BASE_URL, GPT_MODEL))
        else:
            logger.warning("  [LLM Stream] GPT config missing API_KEY or BASE_URL")

    def add_llama():
        if LLAMA_API_KEY and LLAMA_BASE_URL:
            configs.append(("Llama", LLAMA_API_KEY or GPT_API_KEY, LLAMA_BASE_URL, LLAMA_MODEL))
        else:
            logger.warning("  [LLM Stream] Llama config missing API_KEY or BASE_URL")

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

    logger.info(f"  [LLM Stream] Resolved configuration chain: {[c[0] for c in configs]}")

    for name, api_key, base_url, model in configs:
        try:
            logger.info(f"  [LLM Stream] Trying provider '{name}' at {base_url} using model {model}...")
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": question})

            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048,
                temperature=0.2,
                timeout=30,
                stream=True,
            )
            for chunk in resp:
                if not getattr(chunk, "choices", None):
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    yield content
            logger.info(f"  [LLM Stream] Success with provider '{name}'!")
            return  # Success, exit generator
        except Exception as e:
            import traceback
            logger.error(f"  [LLM Stream] ERROR trying provider '{name}' ({base_url} {model}): {e}")
            logger.error(traceback.format_exc())
            continue  # try next provider

    logger.error("  [LLM Stream] ❌ All configured LLM providers failed. Falling back to plain context.")
    # Plain context fallback (no LLM available)
    fallback_text = (
        "⚠️ AI service temporarily unavailable.\n\n"
        "**Relevant content from your documents:**\n\n"
        + system_prompt[system_prompt.find("REFERENCE CONTEXT"):system_prompt.find("━━━", 300)][:800]
    )
    yield fallback_text
