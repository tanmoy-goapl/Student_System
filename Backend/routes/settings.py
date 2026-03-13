from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from llm_state import get_provider, set_provider, LLMProvider


router = APIRouter(prefix="/settings")


class LLMConfig(BaseModel):
    provider: LLMProvider  # "gpt4o" or "llama"


@router.get("/llm", response_model=LLMConfig)
def get_llm_config():
    """Return the currently selected LLM provider."""
    return LLMConfig(provider=get_provider())


@router.post("/llm", response_model=LLMConfig)
def update_llm_config(config: LLMConfig):
    """Update the LLM provider that Mentor AI will use for answers."""
    if config.provider not in ("gpt4o", "llama"):
        raise HTTPException(status_code=400, detail="Invalid LLM provider")

    set_provider(config.provider)
    return LLMConfig(provider=get_provider())

