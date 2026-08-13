import re


_ALIASES = {
    "COMPUTER SCIENCE": "CS",
    "CS DEPARTMENT": "CS",
    "ARTIFICIAL INTELLIGENCE": "AI",
    "AI DEPARTMENT": "AI",
    "AIML": "AI",
}


def normalize_department_code(value: str | None) -> str:
    raw = str(value or "").strip().upper()
    if not raw:
        return ""
    if raw in _ALIASES:
        return _ALIASES[raw]
    return re.sub(r"[^A-Z0-9]+", "_", raw).strip("_")


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
