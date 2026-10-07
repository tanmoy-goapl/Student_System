# Mentor AI — Step 1 system overview

## Scope

This folder is the read-only high-level reconnaissance requested for the inherited `STUDENT_SYSTEM` project. It does not begin the Backend-only deep audit. Heavy/generated/runtime directories were summarized, and no secret values were copied.

## What the product appears to be

Mentor AI is an academic mentoring platform for students, professors, and management. It provides document-grounded chat, learning content, adaptive practice, performance analytics, personalized roadmaps, classroom resources/curricula, career support, and admin dashboards.

## Architecture at a glance

```text
Browser -> Next.js pages/components -> Next.js /api proxy
        -> FastAPI backend -> PostgreSQL + filesystem + ChromaDB
                                 -> SentenceTransformer embeddings
                                 -> OpenAI-compatible GPT/Llama/GPT-OSS-style endpoints
```

Primary evidence: `docker-compose.yml`, `frontend/src/lib/api.ts`, `frontend/src/app/api/`, `Backend/main.py`, `Backend/database.py`, `Backend/chroma_store.py`, and `Backend/services/`.

## Main technologies

- Frontend: Next.js 16, React 19, TypeScript, Ant Design, Tailwind/PostCSS, Recharts, Lucide, React Markdown.
- Backend: Python 3.11, FastAPI, Uvicorn, Pydantic, SQLAlchemy.
- Data: PostgreSQL 15 in Compose; local ChromaDB persistent vector index; filesystem uploads.
- AI: OpenAI-compatible client paths, SentenceTransformers `all-MiniLM-L6-v2`, PDF/TXT/DOCX/image extraction and OCR support.
- Operations: Docker Compose with database healthcheck; no separate queue, cache, reverse proxy, or model container is visible in Compose.

## Major folders

`Backend/` contains the API, models, routes, AI/RAG services, static curriculum configuration, uploads, ChromaDB data, and logs. `frontend/` contains App Router pages, proxy routes, shared components, professor/admin areas, client API code, and static assets. See `01_project_structure.md` and `project_tree.txt`.

## Role organization

Student, professor, and admin areas have distinct frontend page/component groups and backend route groups, but share the same users/database/services. Role separation is implemented through `User.role`, classroom ownership/enrollment, document visibility logic, and route-level checks. The current auth flow visibly returns/stores ids and roles; centralized token enforcement remains an open question.

## LLM/RAG at a glance

Uploads flow through extraction, chunking, embeddings, and ChromaDB. Chat resolves role-visible documents, selects a retrieval mode/strategy, rewrites queries when needed, reranks/expands context, builds a grounded prompt, and streams through an OpenAI-compatible client. General chat, practice/content, roadmap, and document classification have separate LLM helper paths. See `07_llm_and_external_services_preview.md`.

## Most important files for Step 2

Start with `Backend/main.py`, `Backend/database.py`, `Backend/config.py`, `Backend/models.py`, `Backend/routes/auth.py`, `Backend/routes/chat.py`, `Backend/routes/upload.py`, `Backend/routes/documents.py`, `Backend/services/llm_client.py`, `Backend/services/context_builder.py`, `Backend/services/document_resolver.py`, and the `Backend/routes/practice/` plus `Backend/services/practice/` groups.

## Top unanswered questions

- What authentication/session mechanism is actually intended in production?
- Which startup/deployment path is authoritative, and what startup mutations are safe?
- Which LLM endpoint/model and fallback path are active?
- Is PostgreSQL the only supported relational database?
- Is ChromaDB the sole chunk store or should SQL chunks stay synchronized?
- Which role/document visibility checks are security boundaries versus UI conventions?
- Which background jobs need durable execution and retry semantics?

## Report index

- `01_project_structure.md` — structure and important files
- `02_component_overview.md` — architecture and component communication
- `03_tech_stack_and_dependencies.md` — technologies, packages, services, configuration names
- `04_runtime_and_service_flow.md` — startup and request flow
- `05_backend_high_level_preview.md` — Backend module map
- `06_student_professor_management_map.md` — product-area mapping
- `07_llm_and_external_services_preview.md` — AI/RAG and external integration preview
- `08_initial_risks_and_questions.md` — observations for later investigation
