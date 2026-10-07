# Mentor AI — source-based QC report

**Review date:** 6 October 2026  
**Scope:** Current files in `/home/galaxy/Desktop/Student_System`  
**Method:** Read-only source inspection plus nonmutating syntax, type, and existing unit-test checks. No application endpoints, database migrations, uploads, model calls, or containers were run.  
**Change boundary:** This report is the only new project artifact. Existing source, data, and pre-existing working-tree changes were left untouched.

## Executive assessment

Mentor AI is a three-role academic platform with substantial implementations for student document search/chat, learning, practice, roadmaps, classroom workflows, and professor/admin analytics. The most serious release blockers are the lack of an authenticated request identity, an exposed destructive seed endpoint, credential/data exposure in tracked files, and production analytics being populated with synthetic performance. Several visually complete screens are demonstrations rather than working integrations.

**QC status: not ready for use with real student data or an exposed network interface.** This is a source-based judgment, not a live penetration test or production verification.

### Evidence levels used below

- **Confirmed in source:** The cited code directly implements the behavior.
- **Likely runtime impact:** The consequence follows from the code, but was not exercised against a running service.
- **Coverage gap:** Existing checks do not establish behavior; no failure is asserted.

## 1. Project map and runtime flow

| Layer | Current implementation | Evidence |
| --- | --- | --- |
| Web application | Next.js 16, React 19, TypeScript. App Router pages and `/api/*` proxy routes. Browser login state is stored in `localStorage`. | [package.json](../frontend/package.json), [AppLayout.tsx](../frontend/src/components/AppLayout.tsx#L24), [useAuth.ts](../frontend/src/hooks/useAuth.ts#L14) |
| Main API | FastAPI on port 8001; auth, documents, uploads, dashboard, courses, learning, practice, roadmap, classroom, professor, and admin routers. Startup creates/migrates/seeds tables. | [main.py](../Backend/main.py#L15), [main.py](../Backend/main.py#L272) |
| Chat API | Separate FastAPI process on port 8002 serving `/chat` and chat history. Frontend proxies chat there. | [chat_main.py](../Backend/chat_main.py#L1), [chat route.ts](../frontend/src/app/api/chat/route.ts#L6) |
| Relational data | SQLAlchemy models for users/departments, documents, chat, practice/performance, roadmaps/preferences, and classes/resources/curricula. Docker Compose configures PostgreSQL. | [database.py](../Backend/database.py#L1), [models.py](../Backend/models.py), [practice_models.py](../Backend/practice_models.py), [roadmap_models.py](../Backend/roadmap_models.py), [classroom_models.py](../Backend/classroom_models.py), [docker-compose.yml](../docker-compose.yml) |
| Retrieval and AI | Uploaded text is extracted/chunked, embedded through SentenceTransformers, stored in local Chroma, retrieved within a role-visible document set, and sent to OpenAI-compatible LLM endpoints. Lexical retrieval is used when embedding fails. | [upload.py](../Backend/routes/upload.py#L416), [chroma_store.py](../Backend/chroma_store.py#L133), [search.py](../Backend/services/search.py#L66), [llm_client.py](../Backend/services/llm_client.py#L52) |

**Main handoffs:** login returns a user ID and role; the browser sends those IDs through Next API proxies to FastAPI. Student uploads persist metadata/files and Chroma chunks; chat retrieves documents visible to the supplied ID and streams an NDJSON response. Practice answers update session/topic performance; shared analytics functions feed student, professor, and admin views. Roadmap generation persists goals, roadmaps, and tasks, including background generation paths.

## 2. Functionality inventory

Status describes **source implementation**, not a successful live user journey.

| Area | Implemented behavior | Status and limits |
| --- | --- | --- |
| Login/account management | Email/password login and student registration; admin user creation/list/deletion; department assignment. | Implemented, but server identity is not authenticated after login (QC-01). See [auth.py](../Backend/routes/auth.py#L57). |
| Student home/courses | Home KPIs, alerts, recommendations, enrolled classes/subjects, topic progress. | Data-backed calculations exist; synthetic startup records can pollute them (QC-04). See [homepage.py](../Backend/routes/homepage.py#L26), [courses.py](../Backend/routes/courses.py#L83), [analytics_engine.py](../Backend/services/analytics_engine.py#L17). |
| Document workspace | Upload, classify, tag, list, preview/view/delete, publish to classes. PDF/text extraction, image OCR path, Chroma indexing. | Implemented with upload/resource consistency and privacy risks (QC-06 to QC-08). See [upload.py](../Backend/routes/upload.py#L244), [documents.py](../Backend/routes/documents.py#L84). |
| Mentor chat | Role-aware prompts, session/history management, document-scoped RAG, streaming answers, onboarding and personalized roadmap trigger. | Implemented; identity and provider-setting issues remain (QC-01, QC-09). See [chat.py](../Backend/routes/chat.py#L364), [search.py](../Backend/services/search.py#L66). |
| Learning | Topic content/revision, explanation/examples/summary/flashcards, notes, streaming study guide. | Implemented with cache/generation paths; some GET calls mutate cache (QC-12). See [learning routes](../Backend/routes/learning/__init__.py), [study_guide.py](../Backend/routes/learning/study_guide.py#L200). |
| Practice/performance | Topic selection, AI MCQ generation, asynchronous batches, answer submission, accuracy/confidence, revision and behavioral insights. | Implemented. The quiz response omits the correct answer until submission. Synthetic seed paths undermine measurement (QC-02, QC-04). See [session.py](../Backend/routes/practice/session.py#L47), [analytics_engine.py](../Backend/services/analytics_engine.py#L47). |
| Personal roadmaps | Goals, background roadmap generation, current/all roadmaps, task/topic completion. | Implemented in API and UI, though generation depends on LLM availability. See [roadmap.py](../Backend/routes/roadmap.py#L20). |
| Classrooms/professor | Create/join classes, curricula (upload/generate/edit), class resources, student profiles, class insights, faculty AI content/chat. | Implemented with file lifecycle issue (QC-08). See [classroom.py](../Backend/routes/classroom.py#L127), [professor.py](../Backend/routes/professor.py#L54). |
| Admin | Dashboard, user/departments, student/professor lists, recent activity, class analytics. | Data-backed endpoints, subject to identity and synthetic-data issues. See [admin.py](../Backend/routes/admin.py#L460). |
| Career/placement | Career screen shows job matches, salary, skill gaps, mock interview, resume actions. Admin placements screen uses academic readiness data. | Career API is fixed sample data; career action controls have no real backend flow. Do not treat displayed jobs/salaries/scores as live (QC-10). See [career.py](../Backend/routes/career.py#L5), [CareerPage.tsx](../frontend/src/pages/CareerPage/CareerPage.tsx#L31), [PlacementsPage.tsx](../frontend/src/admin/placements/PlacementsPage.tsx#L103). |
| Assessments/reports | Professor assessments and admin report studio screens. | UI demonstrations: assessment list is hardcoded; report generation and scheduling only update component state (QC-10). See [AssessmentsPage.tsx](../frontend/src/professor/assessments/AssessmentsPage.tsx#L57), [ReportsPage.tsx](../frontend/src/admin/reports/ReportsPage.tsx#L37). |
| Integrations page | `/integrations` renders the upload page. | No external integration workflow evidenced at this route. See [page.tsx](../frontend/src/app/integrations/page.tsx#L1). |

## 3. Findings, ordered by severity

### QC-01 — Critical — Requests can impersonate any active account

**Confirmed in source.** `/login` returns only `user_id` and `role`, without a signed session or token. Subsequent `require_user`, `require_admin`, and `require_professor` helpers look up the ID supplied in the request and check that record's role; they do not bind it to the caller. Next proxies forward client-supplied IDs, and the browser's role/ID are editable `localStorage` values. Knowing or guessing another active ID is therefore enough to invoke their scoped read/write routes, including chat history and admin operations. UI route guards do not repair the API boundary. Evidence: [auth.py](../Backend/routes/auth.py#L26), [authorization.py](../Backend/services/authorization.py#L15), [admin users proxy](../frontend/src/app/api/admin/users/route.ts#L5), [useAuth.ts](../frontend/src/hooks/useAuth.ts#L22), [chat.py](../Backend/routes/chat.py#L373).

**Fix direction:** Issue a server-verifiable session/token at login, derive identity and role from it in every backend/proxy route, and reject body/query IDs that do not match the authenticated principal. Test cross-user and cross-role access on reads and mutations.

### QC-02 — Critical — Unauthenticated GET can erase real performance and replace it with random data

**Confirmed in source.** `GET /force-seed-db` has no authentication or environment guard. It deletes `UserPerformance`, `TopicPerformance`, `QuizHistory`, `PracticeQuestion`, and `PracticeSession` for enrolled students, inserts random scores/activities, clears some AI caches, then commits. Merely fetching this URL can irreversibly replace user history. Evidence: [main.py](../Backend/main.py#L315), [main.py](../Backend/main.py#L352), [main.py](../Backend/main.py#L463), [main.py](../Backend/main.py#L517).

**Fix direction:** Remove the route from deployed applications. If sample-data tooling is needed, make it an offline, explicit command against an isolated demo database.

### QC-03 — Critical — Credential and private artifacts are in source control

**Confirmed in source/repository index.** An LLM fallback credential is hardcoded in [llm_client.py](../Backend/services/llm_client.py#L65). `git ls-files` also shows the root and backend `.env` files, Chroma database files, and uploaded PDFs with student/resume/marksheet naming tracked. I inspected environment **key names only**, not values or document contents. This is an exposure risk even if the current credential is inactive. No secret values are reproduced in this report.

**Fix direction:** Rotate/revoke the embedded credential; remove secrets and private artifacts from current and historic Git access as appropriate; use runtime secret injection and an untracked/private upload and vector-storage location. Audit access to the repository and any published copies.

### QC-04 — High — Normal startup creates fabricated student performance

**Confirmed in source.** `init_db()` runs during main API lifespan. For enrolled students without a populated `UserPerformance` record, it assigns random lifetime questions/accuracy/points/streaks, topic outcomes, practice sessions, and quiz history. Those records are indistinguishable from real attempts in downstream metrics. A new real student can thus appear to have practiced before answering anything. Evidence: [main.py](../Backend/main.py#L15), [database.py](../Backend/database.py#L81), [database.py](../Backend/database.py#L117), [database.py](../Backend/database.py#L129), [database.py](../Backend/database.py#L181).

**Fix direction:** Remove sample seeding from startup and use a separate demo fixture/database. Mark historical synthetic rows and exclude or purge them after an approved data plan.

### QC-05 — High — Web GET route executes a Git checkout

**Confirmed in source; successful execution not verified.** `GET /api/git` runs `git checkout -- routes/practice.py` through a shell with no auth. This is an unexpected mutating endpoint and could discard local work if the relative path resolves in a deployment. The `cd ../../Backend` path also appears inconsistent with the configured `/app` frontend working directory, so the route may simply return 500 in the current Compose setup. Evidence: [git route.ts](../frontend/src/app/api/git/route.ts#L1), [frontend Dockerfile](../frontend/Dockerfile#L18), [docker-compose.yml](../docker-compose.yml).

**Fix direction:** Delete the route and keep repository maintenance outside HTTP request handlers.

### QC-06 — High — Upload path has no enforced size or general extension limit

**Confirmed in source.** Configuration defines a 10 MB maximum and allowed extensions, but `/upload` reads the entire file into memory and never checks either setting. The unrestricted original filename is included in the storage name. This can exhaust memory/disk, cause unsupported files to persist, and produce filename collisions for same-user/same-second uploads. Evidence: [config.py](../Backend/config.py#L35), [upload.py](../Backend/routes/upload.py#L244), [upload.py](../Backend/routes/upload.py#L289). Chat attachments have a PDF/TXT check, but that does not cover general uploads.

**Fix direction:** Validate size while streaming, validate file type/content, generate collision-resistant server filenames, and cleanly roll back file/DB/index failures.

### QC-07 — High — Sensitive text is written to application logs

**Confirmed in source.** The upload handler prints up to 5,000 extracted characters and then every chunk; chat logs full user questions. This may put marksheets, resumes, private notes, and prompts into retained logs. Evidence: [upload.py](../Backend/routes/upload.py#L422), [upload.py](../Backend/routes/upload.py#L468), [chat.py](../Backend/routes/chat.py#L364). `Backend/chatbot.log` is present in the repository and already modified in the working tree.

**Fix direction:** Remove raw document/chat text logging; retain request IDs, timings, counts, and redacted errors with retention controls.

### QC-08 — High — Deleting a published classroom resource can break its document

**Confirmed in source; impact inferred.** Publishing a document creates a `ClassResource` pointing to the **same physical file**. `DELETE /classroom/resource/{resource_id}` removes that file and the resource row, but leaves the `Document` row and its Chroma chunks. Document preview/download then reports a missing file while search may still return stale chunks. Conversely, document deletion removes the file and Chroma data but does not clearly remove the linked resource row. Evidence: [upload.py](../Backend/routes/upload.py#L392), [documents.py](../Backend/routes/documents.py#L188), [classroom.py](../Backend/routes/classroom.py#L354), [upload.py](../Backend/routes/upload.py#L226).

**Fix direction:** Define one file owner, unlink shared references transactionally, and remove the physical file/index only when no live reference remains. Add lifecycle tests for both deletion paths.

### QC-09 — High — LLM/provider settings are global and split across processes

**Confirmed in source; user-visible result inferred.** `/api/settings/llm` writes the main API process's module-global provider, while `/api/chat` reaches the separate chat process with its own `llm_state`. Selecting a provider on the settings screen therefore does not update the chat process in the current Compose topology. Preferences are also one process-global dictionary shared by users, rather than account-scoped persisted settings. Restarting a process resets these values. Evidence: [settings proxy](../frontend/src/app/api/settings/llm/route.ts#L3), [chat proxy](../frontend/src/app/api/chat/route.ts#L6), [docker-compose.yml](../docker-compose.yml), [llm_state.py](../Backend/llm_state.py#L7), [settings.py](../Backend/routes/settings.py#L20).

**Fix direction:** Persist settings per user or deploy-wide as intended, expose them to the chat process through shared storage/config, and verify the effective model on a chat response.

### QC-10 — Medium — Several finished-looking screens present demonstration data/actions

**Confirmed in source.** `/career/data` returns fixed jobs, salaries, match scores, and recommendations; career buttons have no action handler, while interview/resume callbacks only log to the console. Professor assessments use a `mockAssessments` array. Admin report generation creates a synthetic row after a timer, and schedules only toggle local state. These should be labeled demo until the workflows are connected. Evidence: [career.py](../Backend/routes/career.py#L5), [CareerAIActions.tsx](../frontend/src/components/careerpage/Main/CareerAIActions.tsx#L20), [CareerPage.tsx](../frontend/src/pages/CareerPage/CareerPage.tsx#L44), [AssessmentsPage.tsx](../frontend/src/professor/assessments/AssessmentsPage.tsx#L57), [ReportsPage.tsx](../frontend/src/admin/reports/ReportsPage.tsx#L51).

**Fix direction:** Label demo values/actions in the UI, or implement real data sources and persisted action endpoints before claiming the features are operational.

### QC-11 — Medium — Institutional knowledge-base startup seeding is broken in this checkout

**Confirmed in source/index; runtime import not run.** Main startup imports `seed_kb`, but the checkout has no `Backend/seed_kb.py` source (only a cached bytecode file). The startup code catches the error and continues, so automatic institutional KB seeding is unlikely to occur. It also looks for an absolute workstation path, while Compose mounts the zip at `/app/mentorai-documents.zip`. Evidence: [main.py](../Backend/main.py#L247), [docker-compose.yml](../docker-compose.yml).

**Fix direction:** Restore the seeder source, use a configured/container path, and make seed success/failure observable in a health or startup check.

### QC-12 — Medium — Reading learning content can delete caches

**Confirmed in source.** `GET /learning/content` deletes invalid cache rows and, with `force=true`, deletes generated learning content and a question-bank cache. The streaming GET also deletes invalid entries. This makes nominally read-only requests mutate user data and can be triggered by caching/prefetch behavior. The force-delete uses the old `master_question_bank` cache key while current generation uses `master_question_bank_v4`, so it may leave the active question bank intact. Evidence: [study_guide.py](../Backend/routes/learning/study_guide.py#L200), [study_guide.py](../Backend/routes/learning/study_guide.py#L223), [study_guide.py](../Backend/routes/learning/study_guide.py#L313), [question_generator.py](../Backend/services/practice/question_generator.py#L21).

**Fix direction:** Move regeneration/invalidation into an authenticated POST action and use one versioned cache-key definition.

### QC-13 — Coverage gap — Current checks do not validate core journeys

Only one Python test file exists, covering eight prompt guardrail cases. There is no evidenced automated coverage for identity boundaries, upload/index rollback, RAG citations/answer grounding, LLM failover, scoring provenance, classroom file lifecycle, or student/professor/admin journeys. This is a gap in assurance, not proof those flows fail. Evidence: [test_chat_guardrails.py](../Backend/tests/test_chat_guardrails.py#L13), [frontend/package.json](../frontend/package.json).

**Fix direction:** Start with cross-user authorization and destructive-route regression tests, then one end-to-end path each for upload→RAG, answer→analytics, and publish→delete/preview. Evaluate generated questions and answers against held-out course material before claiming educational quality.

## 4. Verification performed and limitations

| Check | Result | What it establishes |
| --- | --- | --- |
| Python `ast.parse` on 75 `Backend/**/*.py` files | Pass, 0 syntax errors | Parseability only; no imports, DB, or service startup. |
| Existing `unittest` discovery in `Backend/tests` with `PYTHONDONTWRITEBYTECODE=1` | 8 passed | Prompt guardrail behavior only. The runtime warned that model frameworks were unavailable in this shell; no model inference occurred. |
| `frontend/node_modules/.bin/tsc --noEmit --incremental false --pretty false` | Pass | Current TypeScript types compile without emitting files. Does not prove Next build/runtime. |
| `git diff --check` | Failed on trailing whitespace in the **pre-existing** modified `Backend/chatbot.log` at line 22832 | Working-tree hygiene only; no product test. |
| Git status before report creation | Existing modified log and Compose file, deleted tracked `codex_system_overview_v1` files, and untracked `system_overview_v1` directory | These were present before this QC report and were not changed by this review. |

No live API, browser, DB, Chroma, Docker, or LLM verification was performed because those operations could write to project data or external services. Findings about real user impact are therefore grounded in code paths and marked where runtime confirmation remains necessary.

## 5. Recommended order of work

1. Remove `/force-seed-db` and `/api/git` from network-accessible apps; preserve a backup of any real performance data before future migrations or reseeding.
2. Introduce authenticated server-side identity everywhere, then test cross-account access for each role and data type.
3. Rotate the embedded credential and address tracked secret/private files; stop logging raw student content.
4. Remove startup mock seeding and separate demo data from real metrics; audit existing scores for synthetic provenance.
5. Fix upload limits and document/resource lifecycle; verify DB, file, and Chroma consistency.
6. Make model preferences explicit, persistent, and effective in the chat process; label or complete demonstration screens.
7. Add focused integration and AI quality tests, then run a controlled staging smoke test with non-sensitive fixtures.

