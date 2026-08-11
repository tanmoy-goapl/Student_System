# 05. Backend high-level preview

This is intentionally a preview, not the requested deep Backend audit.

## Entry point and cross-cutting modules

| Path | Purpose | Main responsibility |
|---|---|---|
| `Backend/main.py` | Application entrypoint | Creates FastAPI app, startup lifespan, migrations/seeding, middleware, router registration, root/health endpoints |
| `Backend/config.py` | Runtime configuration | Loads environment-backed DB, LLM, auth, upload, and CORS settings |
| `Backend/database.py` | Persistence boundary | Creates SQLAlchemy engine/session, declares `Base`, initializes tables, performs schema additions, provides `get_db` |
| `Backend/models.py` | Core ORM models | Users, documents, document chunks, chat messages |
| `Backend/practice_models.py` | Learning ORM models | Sessions, questions, topic/user performance, quiz history, AI caches, notes, learning content |
| `Backend/roadmap_models.py` | Roadmap ORM models | Goals, roadmaps, daily tasks, learner preferences |
| `Backend/classroom_models.py` | Classroom ORM models | Classrooms, student enrollment, resources, curriculum |
| `Backend/schemas/` | API schemas | Pydantic request/response contracts, especially chat |
| `Backend/llm_state.py` | Process-local state | Current LLM provider and shared AI preference values |
| `Backend/chroma_store.py` | Vector storage adapter | Persistent Chroma client, collection creation, chunk upsert/query/delete/get |

## Route/controller organization

| Path | Main responsibility |
|---|---|
| `Backend/routes/auth.py` | Login, registration, admin user create/list/delete |
| `Backend/routes/chat.py` | Main streaming chat, mode detection, document resolution, context retrieval, prompt construction, chat history, roadmap handoff |
| `Backend/routes/upload.py` | Generic uploads, metadata/classification, extraction, chunking, Chroma indexing |
| `Backend/routes/documents.py` | Role-aware document workspace listing and document deletion |
| `Backend/routes/learning/` | Learning data, generated material/content streams, AI actions, notes, revision |
| `Backend/routes/practice/` | Topics, custom topics, practice sessions, answers, status, performance, repair/data endpoints |
| `Backend/routes/roadmap.py` | Goals, generation, current/all roadmap views, task/topic completion, deletion |
| `Backend/routes/classroom.py` | Classroom creation/joining, resources, downloads, curriculum extraction/regeneration/editing |
| `Backend/routes/professor.py` | Professor classes, dashboard, class analytics, insights |
| `Backend/routes/admin.py` | Management dashboards, users/professors/students summaries, recent activity, classroom analytics, system status |
| `Backend/routes/homepage.py` | Aggregated student dashboard/readiness/recommendations |
| `Backend/routes/performance.py` and `analytics.py` | Student performance sidebar/main and analytics payloads |
| `Backend/routes/courses.py` | Course, subject, topic, curriculum/resource and progress views |
| `Backend/routes/career.py` | Career data response |
| `Backend/routes/settings.py` | In-memory preferences and active LLM provider selection |

## Service organization

- `Backend/services/llm_client.py`: general chat OpenAI-compatible client with provider ordering, streaming, cached clients, timeouts, and a final fallback response.
- `Backend/services/embedding.py`: lazy singleton SentenceTransformer model and embedding helpers.
- `Backend/services/extract.py` and `Backend/services/chunk.py`: extraction and two different chunking implementations. Upload flow uses the extractor module's chunk function based on imports in `upload.py`.
- `Backend/services/search.py`, `context_builder.py`, `document_resolver.py`, `query_planner.py`, and `query_rewriter.py`: document visibility, retrieval mode, query expansion, semantic search, reranking, neighbor expansion, and prompt context assembly.
- `Backend/services/chatbot/`: chat intent detection, role/prompt construction, and personalized roadmap onboarding helpers.
- `Backend/services/practice/`: question/content generation, adaptive session state, topic extraction, performance analytics, and local/LLM fallback behavior.
- `Backend/services/roadmap/roadmap_engine.py`: structured roadmap LLM generation and JSON repair/fallback.
- `Backend/services/analytics_engine.py`, `homepage_engine.py`, and `recommendation_engine.py`: calculated readiness, accuracy, topic, engagement, recommendation, alert, and behavioral-insight data.

## High-level data path

The apparent request path is:

```text
route -> SQLAlchemy models/session
      -> optional static JSON/config data
      -> optional Chroma retrieval and embedding
      -> optional OpenAI-compatible LLM call
      -> persisted cache/history/performance state
      -> response to frontend proxy
```

Important next-phase files for detailed inspection are `Backend/main.py`, `database.py`, `models.py`, `routes/auth.py`, `routes/chat.py`, `routes/upload.py`, `services/llm_client.py`, `services/context_builder.py`, `services/document_resolver.py`, and the `routes/practice/` and `services/practice/` groups.
