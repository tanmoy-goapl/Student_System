# 02. Component overview

## Product identity

The project appears to be **Mentor AI**, an academic mentoring platform. It combines personal study assistance, document-grounded chat, adaptive practice, learning content, personalized roadmaps, classroom collaboration, professor analytics, and management dashboards. Evidence: `frontend/src/app/layout.tsx`, `frontend/src/app/*`, `Backend/main.py`, `Backend/routes/`, and `Backend/system_architecture_doc.md`.

## High-level architecture

```text
Browser
  -> Next.js App Router pages/components
  -> Next.js /api proxy handlers
  -> FastAPI routes on the backend
       -> PostgreSQL via SQLAlchemy
       -> local ChromaDB document_chunks collection
            ^ SentenceTransformer all-MiniLM-L6-v2 embeddings
       -> filesystem uploads/classroom resources
       -> OpenAI-compatible GPT/Llama/GPT-OSS-style endpoints
  -> streamed JSON/NDJSON responses back through Next.js
```

This flow is based on `frontend/src/lib/api.ts`, the handlers under `frontend/src/app/api/`, `docker-compose.yml`, `Backend/main.py`, `Backend/database.py`, `Backend/chroma_store.py`, `Backend/services/embedding.py`, `Backend/routes/chat.py`, and `Backend/services/llm_client.py`. There is no separately identified reverse proxy, message broker, or dedicated worker service in the inspected configuration.

## Major components

### Frontend and API gateway boundary

Next.js 16 with React 19 renders the UI. The client API wrapper in `frontend/src/lib/api.ts` calls same-origin `/api/*` endpoints. Route handlers under `frontend/src/app/api/` forward those calls to the FastAPI backend and stream some learning/chat responses. This keeps backend base URLs server-side for those proxy calls, but the handlers contain several different fallback URL defaults that need later consolidation.

### Backend/API

`Backend/main.py` creates the FastAPI application and includes routers for auth, documents, uploads, chat, settings, performance, homepage, career, practice, learning, chat sidebar, roadmap, courses, analytics, professor, classroom, and admin features. Most business logic is in `Backend/services/` and the route modules call SQLAlchemy sessions through `Backend/database.py`.

### Student capability set

Student-facing functions are spread across `Backend/routes/homepage.py`, `courses.py`, `documents.py`, `upload.py`, `chat.py`, `learning/`, `practice/`, `performance.py`, `analytics.py`, `roadmap.py`, `career.py`, and `classroom.py`. The frontend has corresponding routes/components for dashboard, learning, practice, performance, courses, documents, chat, career, personal roadmap, analytics, profile, settings, and classes.

### Professor capability set

Professor workflows use `Backend/routes/professor.py` for classes, class analytics, insights, and dashboard data, plus `Backend/routes/classroom.py` for class/resource/curriculum management. The frontend exposes `frontend/src/app/professor/` and `frontend/src/professor/` areas for dashboard, students, classrooms, content, assessments, chatbot, documents, and insights.

### Management/admin capability set

Management is represented by `Backend/routes/admin.py` and admin operations in `Backend/routes/auth.py`. The frontend has `frontend/src/app/admin/` and `frontend/src/admin/` modules for dashboard, users, analytics, reports, placements, documents, and chatbot. Admin views reuse shared analytics, user, document, and classroom data rather than having an entirely separate backend subsystem.

### Authentication and authorization

`Backend/routes/auth.py` verifies bcrypt password hashes and returns a user id and role. The frontend stores those values in browser `localStorage` (`frontend/src/hooks/useAuth.ts` and `frontend/src/components/login/LoginScreen.tsx`). Role and id values are then supplied to many APIs as request fields or query/path parameters. The requirements and architecture notes mention JWT-related packages/claims, but the inspected auth route does not create or validate a JWT; this is an important distinction for the next audit.

### Database and storage

The compose path provisions PostgreSQL 15 (`docker-compose.yml`). SQLAlchemy models cover users, documents, document chunks, chats, adaptive practice, learning caches, goals/roadmaps, classrooms, enrollments, resources, and curricula. Uploaded source files are stored on the backend filesystem (`Backend/uploads/`); ChromaDB stores the semantic index under `Backend/chroma_db/`.

### RAG and AI

Upload processing in `Backend/routes/upload.py` extracts text, chunks it, embeds it, and upserts it to ChromaDB. Chat in `Backend/routes/chat.py` detects retrieval mode, resolves role-visible documents, chooses a retrieval strategy, builds/reranks context, constructs a prompt, and streams an LLM response. Practice, learning-content, classroom-curriculum, classifier, and roadmap flows call either shared or feature-specific LLM helpers.
