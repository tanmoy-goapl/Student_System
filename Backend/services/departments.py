import re


_ALIASES = {
    "COMPUTER SCIENCE": "CS",
    "CS DEPARTMENT": "CS",
    "ARTIFICIAL INTELLIGENCE": "AI",
    "AI DEPARTMENT": "AI",
    "AIML": "AI",
    # Legacy code used for the Data Science department before it was named DS.
    "303": "DS",
}


def normalize_department_code(value: str | None) -> str:
    raw = str(value or "").strip().upper()
    if not raw:
        return ""
    if raw in _ALIASES:
        return _ALIASES[raw]
    return re.sub(r"[^A-Z0-9]+", "_", raw).strip("_")


def department_display_name(code: str | None, name: str | None) -> str:
    """Return the user-facing department name without changing stored codes."""
    normalized_code = normalize_department_code(code)
    cleaned_name = str(name or "").strip()
    if cleaned_name.casefold() == "ds":
        return "DS Department"
    return cleaned_name or f"{normalized_code} Department"


def split_department_codes(value: str | None) -> set[str]:
    raw = str(value or "")
    return {
        normalize_department_code(part)
        for part in re.split(r"[,;/|]+", raw)
        if normalize_department_code(part)
    }


def valid_department_input(value: str | None) -> bool:
    code = normalize_department_code(value)
    return bool(code and len(code) <= 24 and re.fullmatch(r"[A-Z0-9]+(?:_[A-Z0-9]+)*", code))
