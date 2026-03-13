from typing import Literal

from config import DEFAULT_LLM_PROVIDER

LLMProvider = Literal["gpt4o", "llama"]

# In‑memory global state for current LLM provider.
_current_provider: LLMProvider = (  # type: ignore[assignment]
    "gpt4o" if DEFAULT_LLM_PROVIDER == "gpt4o" else "llama"
)


def get_provider() -> LLMProvider:
  """Return the currently selected LLM provider."""
  return _current_provider


def set_provider(provider: LLMProvider) -> None:
  """Update the current LLM provider in memory."""
  global _current_provider
  _current_provider = provider

