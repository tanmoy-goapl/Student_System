import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env")

# ── LLM configuration ─────────────────────────────────────

# Cloud GPT-4o-mini (proxy)
GPT_API_KEY:  str = os.getenv("GPT4O_MINI_API_KEY", "")
GPT_BASE_URL: str = os.getenv("GPT4O_MINI_BASE_URL", "")
GPT_MODEL:    str = os.getenv("GPT_MODEL", "gpt-4o-mini")

# On‑premise Llama (uses OpenAI‑compatible Red Hat AI endpoint)
# Supports both REDHATAI_* and LLAMA_* env var names for flexibility
LLAMA_BASE_URL: str = os.getenv("REDHATAI_BASE_URL") or os.getenv("LLAMA_BASE_URL", "")
LLAMA_API_KEY:  str = os.getenv("REDHATAI_API_KEY") or os.getenv("LLAMA_API_KEY", "")
LLAMA_MODEL:    str = (
    os.getenv("LLAMA_MODEL")
    or os.getenv("REDHATAI_MODEL")
    or "RedHatAI/Llama-3.3-70B-Instruct-quantized.w4a16"
)

# Default provider used at startup: "gpt4o" or "llama"
DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "gpt4o")

# ── Auth ──────────────────────────────────────────────────
SECRET_KEY:   str = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM:    str = "HS256"

# ── Upload ────────────────────────────────────────────────
BASE_DIR:       str = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR:     str = os.path.join(BASE_DIR, "uploads")
MAX_FILE_SIZE:  int = 10 * 1024 * 1024   # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".doc"}

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3500",
    "http://10.10.90.95:3500",
]
