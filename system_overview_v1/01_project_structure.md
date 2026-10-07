# 01. Project structure

## Scope

This is a high-level structural reconnaissance only. Generated files, runtime data, logs, compiled Python files, the local vector index, uploaded documents, and `node_modules/` were summarized rather than dumped. No existing project file was modified.

The concise tree is in [project_tree.txt](./project_tree.txt).

## Root-level items

- `Backend/` is the Python/FastAPI application. It contains the app entrypoint, SQLAlchemy models and database setup, API routers, AI/RAG services, static configuration data, local vector data, uploads, and runtime logs.
- `frontend/` is the Next.js/React application. It contains App Router pages, browser-facing components, role-specific areas, and server-side `/api` proxy handlers.
- `docker-compose.yml` defines a PostgreSQL 15 service, a FastAPI backend on port 8001, and a Next.js frontend intended to run on port 3000.
- `.env` and `Backend/.env` are environment files. Their values were not read into this report. The names used by the backend are documented in `03_tech_stack_and_dependencies.md` and `07_llm_and_external_services_preview.md`.
- `.vscode/` contains editor settings.
- `mentorai-documents.zip` is a document/seed artifact referenced by backend startup code. Its contents were not expanded as part of this overview.
- `node_modules/` is an installed/generated JavaScript dependency directory and is intentionally summarized.
- `.git/` is repository metadata and is intentionally summarized.

## Backend second-level organization

- `Backend/main.py`: creates the FastAPI application, runs lifespan initialization, registers routers, and exposes root/health plus seed/test-style endpoints.
- `Backend/routes/`: HTTP API surface. It includes shared authentication, chat, upload/document handling, student learning/practice/analytics, classroom/professor workflows, roadmap, career, settings, and admin routes.
- `Backend/services/`: application logic. The most important groups are general LLM/RAG services, chatbot prompt/intent helpers, adaptive-practice generation, roadmap generation, analytics, recommendations, and dashboard engines.
- `Backend/models.py`, `practice_models.py`, `roadmap_models.py`, and `classroom_models.py`: SQLAlchemy entities for users, documents, chat history, learning/practice state, goals, classrooms, resources, and curriculum.
- `Backend/schemas/`: Pydantic request/response definitions, currently most visibly used by chat and feature routes.
- `Backend/config/`: static curriculum, subject/topic, and resource JSON used by course and analytics logic.
- `Backend/uploads/`: runtime file storage for user documents, classroom resources, and extracted material. It includes PDFs and text fixtures/data, so it is not source-only code.
- `Backend/chroma_db/`: persistent local ChromaDB files for the `document_chunks` collection.
- `Backend/data/`: runtime/cache/debug artifacts such as topic caches and sync logs.
- `Backend/scratch/`: helper scripts for inspection, testing, repair, and seed work; these are not part of the main request path based on names and imports.

## Frontend second-level organization

- `frontend/src/app/`: Next.js App Router. Student-facing routes include dashboard/home, chat, documents, learning, practice, performance, courses, career, personal/roadmap, settings, profile, analytics, and classrooms.
- `frontend/src/app/api/`: server-side proxy handlers that forward browser requests to the backend. These are the main frontend/backend integration boundary.
- `frontend/src/professor/` and `frontend/src/admin/`: role-specific feature components and page modules.
- `frontend/src/components/`: shared UI and feature components, including learning, practice, performance, documents, classroom, career, sidebar, and navigation areas.
- `frontend/src/pages/`: older/page-level feature components still used by parts of the app.
- `frontend/src/lib/api.ts`: central browser-side API wrapper; it calls local Next `/api/*` paths rather than the backend directly.
- `frontend/src/hooks/`, `src/types/`, and `src/constants/`: client state helpers, TypeScript types, and static UI/config data.
- `frontend/public/`: static images and icons.

## Initial structural reading

The repository is a single product split into a Next.js presentation/proxy layer and a Python service layer. Backend behavior is more centralized and feature-rich than the frontend tree alone suggests: most product areas ultimately use the same user, document, classroom, practice, analytics, and LLM services.
