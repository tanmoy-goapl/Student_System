# 04. Runtime and service flow

## Compose startup path

`docker-compose.yml` defines the apparent primary startup path:

1. PostgreSQL 15 starts as `db`, exposes host port `5451`, persists data in `postgres_data`, and must pass `pg_isready` before the backend is started.
2. The backend is built from `Backend/Dockerfile`, mounted at `/app`, uses `uvicorn main:app`, host `0.0.0.0`, port `8001`, and reload mode in the Compose command. Compose supplies a database URL and Hugging Face offline flag and loads `Backend/.env`.
3. The frontend is built from `frontend/Dockerfile` but the Compose command overrides the image command with `npm run dev`. It uses host networking and is expected to be available on the normal Next.js development port, 3000. Compose supplies `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL`.

The backend has an explicit dependency on a healthy database. The frontend has no Compose `depends_on` declaration for the backend.

## Backend application creation

`Backend/main.py` imports the route modules, creates a FastAPI app with a lifespan handler, adds CORS middleware, includes all feature routers, and exposes `/` and `/health`. The route prefixes are mostly feature-oriented (`/chat`, `/learning`, `/practice`, `/professor`, `/classroom`, `/admin`, etc.); the roadmap router itself includes the `/api/roadmap` prefix.

## Lifespan initialization

At backend startup, the lifespan handler in `Backend/main.py`:

- calls `init_db()` from `Backend/database.py`;
- executes a series of best-effort `ALTER TABLE` migrations and data backfills;
- performs database-backed student/class/performance seeding logic;
- inspects the referenced document bundle and writes an extraction log under uploads;
- calls `seed_knowledge_base()` when available;
- then yields control to the running application.

`Backend/database.py` itself calls `Base.metadata.create_all`, performs more schema additions, and includes another mock performance-seeding path. This means startup is not only server initialization; it also contains schema mutation and seed behavior that should be mapped carefully in the Backend-only phase. No mutation was triggered by this audit.

## Request flow

```text
Browser UI
  -> frontend/src/lib/api.ts
  -> frontend/src/app/api/<feature>/route.ts
  -> BACKEND_URL + backend route
  -> SQLAlchemy session / ChromaDB / filesystem / LLM client
  -> JSON, streamed text, or NDJSON
  -> proxy response
  -> browser UI
```

The central browser client uses same-origin `/api/*` paths. Individual Next route handlers forward requests and, for streaming features, pass through a response body. `Backend/routes/chat.py` returns newline-delimited JSON containing status, content chunks, and final metadata. Learning streams use similar route-level forwarding.

## Configuration loading

`Backend/config.py` calls `load_dotenv()` and reads `DATABASE_URL`, LLM provider variables, `SECRET_KEY`, upload settings, and CORS origins. Compose explicitly overrides the database URL for the container. The backend Dockerfile uses `/app` as its working directory, so the loaded backend environment file is the one configured by Compose (`Backend/.env`).

## Health checks and observability

- Database health is checked by Compose using `pg_isready`.
- Backend health is exposed by `GET /health` in `Backend/main.py`; no Compose health check for the backend is defined.
- Chat logging uses a rotating file handler in `Backend/routes/chat.py` and writes to `Backend/chatbot.log`.
- Admin's `/admin/system-status` returns a static status payload in `Backend/routes/admin.py`; it is not an observed live dependency check based on the inspected code.

## Runtime questions for later

The Compose development command, the production-oriented frontend Dockerfile, the mounted source trees, and multiple frontend backend-URL fallbacks indicate more than one intended runtime mode. The next phase should establish which path is actually deployed and whether `Backend/.env`, Compose overrides, and Next route defaults agree.
