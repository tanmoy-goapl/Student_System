# 03. Tech stack and dependencies

## Evidence sources

Primary evidence is `frontend/package.json`, `frontend/package-lock.json`, `Backend/requirements.txt`, `Backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `Backend/config.py`, and the imported modules under `Backend/services/` and `Backend/routes/`.

## Application stack

| Area | Observed technology | Evidence |
|---|---|---|
| Frontend | Next.js 16.1.6, React 19.2.3, TypeScript | `frontend/package.json`, `frontend/src/app/` |
| Frontend UI | Ant Design, Lucide React, Tailwind CSS/PostCSS, Recharts, React Markdown | `frontend/package.json`, `frontend/src/components/` |
| Frontend HTTP | Native `fetch`; Axios is installed but the central wrapper uses `fetch` | `frontend/src/lib/api.ts`, `frontend/package.json` |
| Backend | FastAPI 0.115.0 with Uvicorn 0.32.0 | `Backend/requirements.txt`, `Backend/main.py` |
| Python runtime | Python 3.11 container | `Backend/Dockerfile` |
| Data access | SQLAlchemy 2.0.36 ORM, psycopg2-binary PostgreSQL driver | `Backend/requirements.txt`, `Backend/database.py` |
| Relational DB | PostgreSQL 15 Alpine in Compose; code also has SQLite branches | `docker-compose.yml`, `Backend/database.py`, `Backend/system_architecture_doc.md` |
| Vector/search | ChromaDB 0.5.0 persistent local client; metadata-filtered semantic search | `Backend/chroma_store.py`, `Backend/services/search.py` |
| Embeddings | SentenceTransformers `all-MiniLM-L6-v2` | `Backend/services/embedding.py`, `Backend/requirements.txt` |
| LLM client | OpenAI Python client 1.54.3 against OpenAI-compatible base URLs | `Backend/services/llm_client.py`, `Backend/services/practice/base.py` |
| Auth primitives | bcrypt/passlib, `python-jose` is installed; current route uses bcrypt directly | `Backend/routes/auth.py`, `Backend/requirements.txt` |
| Document parsing | pypdf, optional DOCX import, Pillow, pytesseract OCR | `Backend/services/extract.py`, `Backend/requirements.txt` |
| Validation/config | Pydantic 2.9.2, python-dotenv | `Backend/requirements.txt`, `Backend/config.py` |

## Important backend packages

- `fastapi`, `uvicorn[standard]`, `python-multipart`: HTTP API and multipart upload handling.
- `sqlalchemy`, `psycopg2-binary`: ORM and PostgreSQL connectivity.
- `pydantic`, `email-validator`: request/response models and email validation.
- `bcrypt`, `passlib`, `python-jose[cryptography]`: password/auth-related dependencies. The inspected login implementation uses bcrypt hashes and does not visibly issue JWTs.
- `chromadb`, `sentence-transformers`, `numpy`: local vector indexing and embedding generation.
- `openai`, `httpx`: OpenAI-compatible LLM calls, timeouts, and streaming.
- `pypdf`, `Pillow`, `pytesseract`: PDF/text/image extraction and OCR. `Backend/services/extract.py` also imports `docx` for DOCX handling, but `python-docx` is not listed in `Backend/requirements.txt`; verify this during the deeper audit.

## Frontend dependencies

The frontend declares `next`, `react`, `react-dom`, `antd`, `axios`, `lucide-react`, `react-markdown`, and `recharts` as runtime dependencies. Development tooling includes TypeScript, ESLint/Next ESLint configuration, Tailwind v4/PostCSS, and React/Node type packages. `frontend/Dockerfile` uses Node 20 Alpine.

## Containers, ports, and services

- `db`: `postgres:15-alpine`, container name `student_db`, host port `5451`, database name configured in Compose as `student_rag`, persistent named volume `postgres_data`, and a `pg_isready` health check.
- `backend`: built from `Backend/Dockerfile`, host-networked, intended API port `8001`, mounted source tree, and configured with `DATABASE_URL` plus offline Hugging Face behavior in Compose.
- `frontend`: built from `frontend/Dockerfile`, host-networked, intended development port `3000`, and given backend URL environment variables in Compose.

## Vector database, cache, and workers

ChromaDB is a local persistent directory, not a separate Compose service. The code has process-local caches for LLM clients, embeddings, provider state, and some topic/question content. No Redis, Celery, RabbitMQ, or other external queue is visible in the inspected files. Roadmap and practice code use in-process background threads/locks and FastAPI background-task mechanisms (`Backend/routes/roadmap.py`, `Backend/services/practice/`).

## Configuration names only

The following environment variable names are referenced by backend configuration or Compose. Values are intentionally omitted: `DATABASE_URL`, `OPENAI_API_KEY`, `GPT4O_MINI_API_KEY`, `OPENAI_API_BASE_URL`, `GPT4O_MINI_BASE_URL`, `LLM_NAME`, `GPT_MODEL`, `REDHATAI_BASE_URL`, `LLAMA_BASE_URL`, `REDHATAI_API_KEY`, `LLAMA_API_KEY`, `LLAMA_MODEL`, `REDHATAI_MODEL`, `DEFAULT_LLM_PROVIDER`, `SECRET_KEY`, `HF_HUB_OFFLINE`, `BACKEND_URL`, and `NEXT_PUBLIC_BACKEND_URL`.
