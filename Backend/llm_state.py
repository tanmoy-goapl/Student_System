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


# In‑memory global state for AI preferences.
_user_preferences = {
    "default_mode": "Explain",
    "response_style": "Detailed",
    "tone": "Friendly"
}


def get_user_preferences() -> dict:
  """Return the current user preferences."""
  return _user_preferences


def set_user_preferences(default_mode: str, response_style: str, tone: str) -> None:
  """Update the user preferences in memory."""
  global _user_preferences
  _user_preferences["default_mode"] = default_mode
  _user_preferences["response_style"] = response_style
  _user_preferences["tone"] = tone


