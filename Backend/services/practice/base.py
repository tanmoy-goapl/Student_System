import logging
import os
import re
from config import (
    GPT_API_KEY, GPT_BASE_URL, GPT_MODEL,
    LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL,
)
from llm_state import get_provider

logger = logging.getLogger("chatbot")
_READABLE_MATH_COMMANDS = {
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ",
    "epsilon": "ε", "varepsilon": "ε", "zeta": "ζ", "eta": "η", "theta": "θ",
    "vartheta": "θ", "iota": "ι", "kappa": "κ", "lambda": "λ", "Lambda": "Λ",
    "mu": "μ", "nu": "ν", "xi": "ξ", "Xi": "Ξ", "pi": "π", "Pi": "Π",
    "rho": "ρ", "sigma": "σ", "Sigma": "Σ", "tau": "τ", "upsilon": "υ",
    "phi": "φ", "varphi": "φ", "Phi": "Φ", "chi": "χ", "psi": "ψ", "Psi": "Ψ",
    "omega": "ω", "Omega": "Ω", "ell": "ℓ", "infty": "∞", "partial": "∂",
    "nabla": "∇", "cdot": "·", "cdots": "…", "dots": "…", "ldots": "…",
    "times": "×", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥", "neq": "≠",
    "approx": "≈", "pm": "±", "to": "→", "rightarrow": "→", "leftarrow": "←",
    "in": "∈", "notin": "∉", "land": "AND", "lor": "OR", "wedge": "AND",
    "vee": "OR", "top": "T", "bot": "⊥", "vert": "|", "Vert": "||",
    "sum": "Σ", "prod": "Π", "min": "min", "max": "max", "argmin": "arg min",
    "argmax": "arg max", "exp": "exp", "log": "log", "ln": "ln", "sin": "sin",
    "cos": "cos", "tan": "tan", "lim": "lim", "quad": " ", "qquad": " ",
    "vdots": "⋮", "ddots": "⋱", "dotsb": "…", "dotsc": "…", "sim": "∼", "simeq": "≃",
    "equiv": "≡", "propto": "∝", "circ": "∘", "star": "★", "ast": "∗", "left": "", "right": "", "middle": "|",
    "displaystyle": "", "textstyle": "", "scriptstyle": "", "scriptsize": "", "limits": "", "nolimits": "",
    "big": "", "Big": "", "bigl": "", "bigr": "", "Bigl": "", "Bigr": "", "mid": "|", "colon": ":",
    ";": " ", ",": " ", "!": "", " ": " ",
}

_READABLE_UNARY_COMMANDS = {
    "mathbf", "boldsymbol", "mathrm", "mathit", "mathsf", "mathtt", "mathbb",
    "mathcal", "mathscr", "text", "textrm", "textbf", "operatorname", "overline",
    "underline", "hat", "widehat", "bar", "vec", "tilde", "widetilde", "dot",
    "ddot", "boxed", "sqrt",
}

_READABLE_BINARY_COMMANDS = {"frac", "dfrac", "tfrac", "binom"}

_SUPERSCRIPT_MAP = str.maketrans({
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵",
    "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻",
    "=": "⁼", "(": "⁽", ")": "⁾", "T": "ᵀ", "n": "ⁿ",
})
_SUBSCRIPT_MAP = str.maketrans({
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
    "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ", "k": "ₖ",
    "l": "ₗ", "m": "ₘ", "n": "ₙ", "o": "ₒ", "p": "ₚ", "r": "ᵣ",
    "s": "ₛ", "t": "ₜ", "u": "ᵤ", "v": "ᵥ", "x": "ₓ",
})


def _read_braced_value(value: str, start: int) -> tuple[str, int]:
    if start >= len(value) or value[start] != "{":
        return "", start
    depth = 1
    index = start + 1
    while index < len(value):
        if value[index] == "\\" and index + 1 < len(value):
            index += 2
            continue
        if value[index] == "{":
            depth += 1
        elif value[index] == "}":
            depth -= 1
            if depth == 0:
                return value[start + 1:index], index + 1
        index += 1
    return value[start + 1:], len(value)


def _read_math_argument(value: str, start: int) -> tuple[str, int]:
    index = start
    while index < len(value) and value[index].isspace():
        index += 1
    if index >= len(value):
        return "", index
    if value[index] == "{":
        return _read_braced_value(value, index)
    if value[index] == "[":
        end = value.find("]", index + 1)
        if end >= 0:
            return value[index + 1:end], end + 1
    if value[index] == "\\":
        end = index + 1
        while end < len(value) and value[end].isalpha():
            end += 1
        return value[index:end], end
    return value[index], index + 1


def _format_math_script(marker: str, value: str) -> str:
    compact = re.sub(r"\s+", "", value)
    if marker == "^" and compact and all(char in "0123456789+-=()Tn" for char in compact):
        return compact.translate(_SUPERSCRIPT_MAP)
    allowed_subscripts = "0123456789+-=()aehijklmnoprstuvx"
    if marker == "_" and compact and all(char in allowed_subscripts for char in compact):
        return compact.translate(_SUBSCRIPT_MAP)
    clean = value.strip()
    if marker == "_":
        return f"[{clean}]"
    return f"^{clean}" if clean.startswith("(") and clean.endswith(")") else f"^({clean})"


def _convert_math_expression(expression: str) -> str:
    output: list[str] = []
    index = 0
    while index < len(expression):
        char = expression[index]
        if expression.startswith("\\\\", index):
            output.append("; ")
            index += 2
            continue
        if char == "\\":
            if index + 1 >= len(expression):
                index += 1
                continue
            if not expression[index + 1].isalpha():
                escaped = expression[index + 1]
                output.append({"{": "{", "}": "}", "|": "|", "%": "%", "_": "_", "!": "", ",": " ", ";": " "}.get(escaped, escaped))
                index += 2
                continue
            end = index + 1
            while end < len(expression) and expression[end].isalpha():
                end += 1
            command = expression[index + 1:end]
            if command in _READABLE_BINARY_COMMANDS:
                numerator, next_index = _read_math_argument(expression, end)
                denominator, next_index = _read_math_argument(expression, next_index)
                left = _convert_math_expression(numerator)
                right = _convert_math_expression(denominator)
                output.append(f"C({left}, {right})" if command == "binom" else f"({left}) / ({right})")
                index = next_index
                continue
            if command in _READABLE_UNARY_COMMANDS:
                argument, next_index = _read_math_argument(expression, end)
                converted = _convert_math_expression(argument)
                if command in {"hat", "widehat"}:
                    output.append(f"{converted}̂")
                elif command in {"bar", "overline"}:
                    output.append(f"{converted}̄")
                elif command == "vec":
                    output.append(f"{converted}⃗")
                elif command in {"tilde", "widetilde"}:
                    output.append(f"{converted}̃")
                elif command == "sqrt":
                    output.append(f"sqrt({converted})")
                elif command == "boxed":
                    output.append(f"[{converted}]")
                else:
                    output.append(converted)
                index = next_index
                continue
            if command == "begin":
                environment, next_index = _read_math_argument(expression, end)
                output.append("[" if environment.strip().lower() in {"matrix", "pmatrix", "bmatrix"} else "")
                index = next_index
                continue
            if command == "end":
                environment, next_index = _read_math_argument(expression, end)
                output.append("]" if environment.strip().lower() in {"matrix", "pmatrix", "bmatrix"} else "")
                index = next_index
                continue
            output.append(_READABLE_MATH_COMMANDS.get(command, command))
            index = end
            continue
        if char in "{}":
            index += 1
            continue
        if char in "^_":
            argument, next_index = _read_math_argument(expression, index + 1)
            output.append(_format_math_script(char, _convert_math_expression(argument)))
            index = next_index
            continue
        if char == "&":
            next_char = expression[index + 1] if index + 1 < len(expression) else ""
            output.append(" " if next_char in "=\\<>+-" else ", ")
        else:
            output.append(char)
        index += 1
    return re.sub(r"[ \t]+", " ", "".join(output))


def normalize_generated_text(text: str) -> str:
    """Convert common LaTeX emitted by AI material into readable Unicode/plain text."""
    if not text:
        return text
    markers = (r"\(", r"\[", r"\frac", r"\mathbf", r"\boldsymbol", r"\hat", r"\text{", r"\begin{", r"\displaystyle", "$$")
    if not any(marker in text for marker in markers) and "\\" not in text:
        return text

    def replace_block(match: re.Match[str]) -> str:
        return match.group(1)

    def normalize_segment(segment: str) -> str:
        normalized = re.sub(r"\\\[(.*?)\\\]", replace_block, segment, flags=re.DOTALL)
        normalized = re.sub(r"\\\((.*?)\\\)", replace_block, normalized, flags=re.DOTALL)
        normalized = re.sub(r"\$\$(.*?)\$\$", replace_block, normalized, flags=re.DOTALL)
        normalized = re.sub(r"(?<!\$)\$(?!\s)(.*?)(?<!\s)\$(?!\$)", replace_block, normalized, flags=re.DOTALL)
        normalized = _convert_math_expression(normalized)
        return normalized.replace(r"\[", "[").replace(r"\]", "]")
    segments = re.split(r"(\x60\x60\x60[\s\S]*?\x60\x60\x60)", text)
    return "".join(
        segment if index % 2 else normalize_segment(segment)
        for index, segment in enumerate(segments)
    ).strip()

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
