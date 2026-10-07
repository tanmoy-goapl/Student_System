# 08. Initial risks and open questions

These are observations for later investigation only. No fixes were applied.

| Observation | Relevant path(s) | Why it deserves later investigation |
|---|---|---|
| Authorization is distributed across caller-supplied ids, role strings, and browser `localStorage`; no centralized token validation path was observed. | `Backend/routes/auth.py`, `Backend/routes/classroom.py`, `Backend/routes/documents.py`, `frontend/src/hooks/useAuth.ts`, `frontend/src/components/login/LoginScreen.tsx` | Establish the real trust boundary and verify that a caller cannot substitute another user/role id. |
| The architecture notes describe JWT auth, but the inspected login route returns only user id/role and uses bcrypt directly. | `Backend/system_architecture_doc.md`, `Backend/routes/auth.py`, `Backend/requirements.txt` | Documentation, dependency, and runtime auth behavior may have diverged. |
| Multiple independent LLM clients duplicate provider ordering and fallback behavior. | `Backend/services/llm_client.py`, `Backend/services/practice/base.py`, `Backend/services/roadmap/roadmap_engine.py`, `Backend/routes/upload.py` | Different timeout, retry, logging, fallback, and model behavior may affect features inconsistently. |
| A hardcoded backup LLM configuration, including a static key-like credential, exists in source in multiple client paths. The value is not reproduced here. | `Backend/services/llm_client.py`, `Backend/services/practice/base.py`, `Backend/services/roadmap/roadmap_engine.py` | Secret rotation, source exposure, endpoint ownership, and production routing need immediate controlled review. |
| Startup performs schema alterations, data backfills, mock seeding, document-bundle inspection, and knowledge-base seeding. | `Backend/main.py`, `Backend/database.py` | Startup has significant side effects and may be non-idempotent or environment-sensitive; later audit should map each mutation. |
| There are seed/debug-style endpoints such as `/force-seed-db` and `/test-analytics/{class_id}` mounted by the main app. | `Backend/main.py` | Confirm whether these are reachable in any deployed environment and whether they can mutate or expose data. |
| Frontend proxy handlers use inconsistent backend URL defaults (loopback, private-network, and another local port) while Compose supplies one runtime URL. | `frontend/src/app/api/**/route.ts`, `docker-compose.yml` | Different pages may target different backend processes when the environment variable is absent or misconfigured. |
| The frontend Dockerfile is production-oriented, but Compose overrides it to run `npm run dev` with source mounts and no frontend health check. | `frontend/Dockerfile`, `docker-compose.yml` | Deployment behavior and image verification may differ from the apparent production image design. |
| The code has two chunking implementations and an architecture document that describes relational chunk mirroring, while the upload path explicitly indexes Chroma. | `Backend/services/extract.py`, `Backend/services/chunk.py`, `Backend/routes/upload.py`, `Backend/models.py`, `Backend/system_architecture_doc.md` | Retrieval consistency, orphan cleanup, and the system of record for chunks are unclear. |
| `Backend/services/extract.py` imports DOCX support, but `python-docx` is not listed in `Backend/requirements.txt`; image/OCR support and upload extension policy also differ across files. | `Backend/services/extract.py`, `Backend/requirements.txt`, `Backend/config.py`, `Backend/routes/upload.py` | Some supported-looking file types may fail only at runtime or may be rejected inconsistently. |
| Provider selection and general AI preferences are process-local global state. | `Backend/llm_state.py`, `Backend/routes/settings.py` | A change by one user/process may affect other users and may disappear on restart. |
| Background work uses in-process threads/locks and FastAPI background mechanisms rather than a durable job system. | `Backend/routes/roadmap.py`, `Backend/services/practice/`, `Backend/services/practice/question_generator.py` | Work can be lost on restart and may behave differently with multiple workers/containers. |
| Health reporting is uneven: Compose checks only PostgreSQL, `/health` is a simple backend response, and admin system status is static. | `docker-compose.yml`, `Backend/main.py`, `Backend/routes/admin.py` | A green status may not prove backend, Chroma, embedding, filesystem, or LLM readiness. |
| Runtime artifacts and potentially sensitive user documents/logs are present inside the application tree. | `Backend/uploads/`, `Backend/chroma_db/`, `Backend/chatbot.log`, `Backend/data/` | Retention, access control, backup, and repository hygiene need explicit review before production use. |

## Questions to carry into Step 2

1. What is the authoritative deployed startup path: Compose development mode, the Dockerfiles, or a manually launched Uvicorn/Next process?
2. Is PostgreSQL always used in deployment, or does a SQLite path still have active consumers?
3. What authentication mechanism is intended to protect every route, and where is the server-side session/token validation?
4. Which LLM provider/model is actually active, and which code path owns fallback behavior?
5. Is the relational `document_chunks` table intentionally unused, or is there an incomplete synchronization design?
6. Which role/visibility rules are authoritative for student, professor, admin, classroom, and institutional documents?
7. Which background jobs must survive process restarts or scale-out?
8. Which debug, seed, migration, and test endpoints are allowed outside local development?
