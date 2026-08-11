# 06. Student / Professor / Management map

## Summary

The three product areas are represented in both frontend folders/pages and backend route groups, but they share the same `users` table, document models, classroom models, performance models, and database session. Separation is primarily by a `User.role` string plus route-level checks and frontend navigation. It is not currently represented by separate backend services or databases.

## Product-area mapping

| Area | Frontend evidence | Backend evidence | Shared data/services |
|---|---|---|---|
| Student | `frontend/src/app/dashboard/`, `learning/`, `practice/`, `performance/`, `courses/`, `documents/`, `chat/`, `career/`, `personal/`, `roadmap/`, `classes/`, `profile/`, `settings/`; shared student components | `routes/homepage.py`, `learning/`, `practice/`, `performance.py`, `courses.py`, `documents.py`, `upload.py`, `chat.py`, `roadmap.py`, `career.py`, `analytics.py`, `classroom.py` | `User`, `Document`, `ChatMessage`, practice/performance/roadmap models, ChromaDB, LLM services |
| Professor | `frontend/src/app/professor/`, `frontend/src/professor/` for dashboard, students, classrooms, content, assessments, chatbot, documents, insights | `routes/professor.py`, `routes/classroom.py`, shared `documents.py`/`upload.py`, selected analytics/performance routes | `Classroom`, `StudentClass`, `ClassResource`, `ClassCurriculum`, student performance models, document visibility |
| Management/Admin | `frontend/src/app/admin/`, `frontend/src/admin/` for dashboard, users, analytics, reports, placements, documents, chatbot | `routes/admin.py` and admin operations in `routes/auth.py`; shared classroom/document/analytics routes | `User` role, classes, enrollment, practice/quiz data, documents, calculated analytics |

## Student areas visible for later work

The most visible Student backend areas are:

- `Backend/routes/chat.py` and `Backend/services/chatbot/`: document-grounded mentor chat, chat history, role-aware prompts, roadmap onboarding.
- `Backend/routes/upload.py`, `Backend/routes/documents.py`, `Backend/services/extract.py`, `chroma_store.py`: personal/institutional document ingestion and retrieval index.
- `Backend/routes/learning/` and `Backend/services/practice/content_generator.py`: explanations, examples, flashcards, generated learning material, notes, and revision.
- `Backend/routes/practice/` and `Backend/services/practice/`: adaptive sessions, question batches, answers, custom topics, performance, weak topics, and behavioral patterns.
- `Backend/routes/homepage.py`, `services/homepage_engine.py`, `services/recommendation_engine.py`: readiness, study plan, alerts, recommendations, focus, and next actions.
- `Backend/routes/roadmap.py` and `Backend/services/roadmap/roadmap_engine.py`: goals, LLM-generated learning roadmaps, daily tasks, completion state.
- `Backend/routes/courses.py`, `analytics.py`, and `performance.py`: course/topic progress and student analytics.
- `Backend/routes/classroom.py`: student joining, class access, resource access, and curriculum consumption.

## Professor separation

Professor ownership is represented by `Classroom.professor_id`, and classroom endpoints check that the supplied user is the class professor for creation, resource upload, resource deletion, and class deletion (`Backend/routes/classroom.py`). Professor dashboards aggregate enrolled students through `StudentClass` and performance models (`Backend/routes/professor.py`). Document visibility also has course-shared and professor-owned paths (`Backend/routes/documents.py`, `Backend/services/document_resolver.py`).

## Management separation

Admin routes compute platform-level counts and summaries across students, professors, classrooms, quizzes, and practice sessions (`Backend/routes/admin.py`). Admin user-management endpoints are in `Backend/routes/auth.py`. Admin document visibility is handled in `Backend/routes/documents.py`; the frontend provides distinct admin pages but the backend still uses shared tables and engines.

## Authorization shape observed

The code checks roles in several route handlers, but many APIs accept `student_id`, `user_id`, `admin_id`, or `professor_id` directly. The frontend gets role/user identity from browser `localStorage`. No centralized authenticated request dependency or token validation path was observed in the inspected files. This is an architectural observation for Step 2, not a remediation.
