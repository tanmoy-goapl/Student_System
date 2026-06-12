from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from llm_state import get_provider, set_provider, LLMProvider, get_user_preferences, set_user_preferences


router = APIRouter(prefix="/settings")


class LLMConfig(BaseModel):
    provider: LLMProvider  # "gpt4o" or "llama"


class UserPreferences(BaseModel):
    default_mode: str
    response_style: str
    tone: str


@router.get("/preferences", response_model=UserPreferences)
def get_preferences_endpoint():
    """Return current user settings preferences."""
    prefs = get_user_preferences()
    return UserPreferences(
        default_mode=prefs["default_mode"],
        response_style=prefs["response_style"],
        tone=prefs["tone"]
    )


@router.post("/preferences", response_model=UserPreferences)
def update_preferences_endpoint(prefs: UserPreferences):
    """Update user preferences."""
    set_user_preferences(
        default_mode=prefs.default_mode,
        response_style=prefs.response_style,
        tone=prefs.tone
    )
    current_prefs = get_user_preferences()
    return UserPreferences(
        default_mode=current_prefs["default_mode"],
        response_style=current_prefs["response_style"],
        tone=current_prefs["tone"]
    )


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

SETTINGS_DATA = {
    "defaultModes": [
        {"id": 1, "title": "Explain", "subheading": "Break down concepts"},
        {"id": 2, "title": "Practice", "subheading": "Hands-on exercises"},
        {"id": 3, "title": "Analyze", "subheading": "Deep analysis"},
        {"id": 4, "title": "Improve", "subheading": "Improve your work"},
        {"id": 5, "title": "Career", "subheading": "Career guidance"},
    ],
    "responseStyles": [
        {"id": 1, "title": "Simple", "subheading": "Quick concise answers"},
        {"id": 2, "title": "Detailed", "subheading": "In-depth explanations"},
        {"id": 3, "title": "Step-by-Step", "subheading": "Guided walkthroughs"},
    ],
    "tones": [
        {"id": 1, "title": "Friendly"},
        {"id": 2, "title": "Professional"},
        {"id": 3, "title": "Concise"},
    ]
}

@router.get("/data")
def get_settings_data():
    return SETTINGS_DATA


