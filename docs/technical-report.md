# Technical Report

## Architecture

LearnShift AI is a Java OOP adaptive learning prototype built with a FastAPI backend and a Next.js frontend. The backend stores learner state, content, questions, hints, misconceptions, interactions, educator alerts, adaptation rules, and AI usage logs in a SQLite/MySQL-compatible SQLAlchemy model. The frontend exposes learner, tutor, assessment, educator, safeguard, and disclosure flows.

The system follows this cycle:

Observe learner evidence -> Diagnose current need -> Decide next teaching action -> Act -> Evaluate response -> Update learner state.

## Backend

The backend lives in `services/ai/app/`. Main API handlers are in `main.py`, database models are in `models.py`, seed logic is in `seed.py`, adaptive behavior is in `adaptive.py`, and retrieval/generation behavior is in `rag_service.py`.

The backend supports these major APIs:

- `/api/demo/seed`
- `/api/learners`
- `/api/learners/{learner_id}/profile`
- `/api/diagnostic/start`
- `/api/diagnostic/submit`
- `/api/teach`
- `/api/tutor/confusion`
- `/api/assessment/next`
- `/api/assessment/submit`
- `/api/hints/next`
- `/api/educator/overview`
- `/api/educator/alerts`
- `/api/educator/ai-logs`
- `/api/educator/learners/{learner_id}`
- `/api/rag/answer`

The seed system loads reproducible CSV files from `data/`, creates reference content, creates five fictional learners, records 75 interactions, generates educator alerts, and inserts AI usage log rows.

## Frontend

The frontend lives in `apps/web/` and uses the Next.js App Router. Important routes include:

- `/learner`
- `/learner/[learnerId]/diagnostic`
- `/learner/[learnerId]/dashboard`
- `/learner/[learnerId]/learn`
- `/learner/[learnerId]/assessment`
- `/learner/[learnerId]/tutor`
- `/educator`
- `/educator/learners/[learnerId]`
- `/safeguards`
- `/disclosure`

The UI is intentionally workflow-focused: learner selection, diagnostic, profile, adaptive learning, assessment, tutor mode, educator dashboard, evidence review, safeguards, and disclosure.

## RAG and Source Grounding

The RAG service now prefers `data/chunks/oop_knowledge_chunks.csv`, which contains balanced chunks across all six concepts. If `GOOGLE_API_KEY` is configured, the system can use Gemini for embeddings and generation. If no key is available, it uses deterministic keyword retrieval and grounded fallback responses.

Every substantive teach, tutor, and RAG answer returns source metadata:

- source title
- source document
- chunk ID
- concept ID
- section/page marker
- confidence/similarity score when available

## Learner Profile

Learner state includes current level, recommended concept, recent correctness, attempts count, hint count, confidence history, detected misconceptions, last action reason, next recommendation, and per-concept mastery. Interactions update mastery using correctness, confidence, hints, and repeated misconceptions.

Hint usage affects mastery:

- Unaided correct answers increase mastery more.
- Correct answers after hints increase mastery less.
- Incorrect answers after multiple hints trigger remediation evidence.
- Hint requests are stored as learner evidence.

## Adaptation Logic

Formal adaptation rules live in `data/adaptation/adaptation_rules.csv`. Runtime decision logic in `adaptive.py` maps learner evidence to rule IDs. Teaching and assessment responses include matched adaptation rule IDs.

Rule coverage includes:

- low mastery
- medium mastery
- high mastery
- low confidence
- high confidence but incorrect
- repeated misconception
- repeated errors
- careless error
- high hint usage
- strong mastery
- advanced learner
- out-of-scope or direct-answer safeguard

## Assessment

The assessment engine selects questions based on concept mastery, prior correctness, confidence, hint usage, repeated misconceptions, and current level. The question bank includes Basic, Intermediate, and Advanced difficulty and five question formats. Feedback varies for repeated errors, careless errors, low confidence, strong mastery, and high-confidence incorrect answers.

## Tutor Mode

Tutor mode detects the concept and likely misconception, reframes the explanation, asks a guiding question, asks a follow-up check, stores tutor interaction evidence, updates the learner profile, and logs AI/deterministic usage. The frontend displays these fields directly.

## Educator Dashboard

The educator dashboard shows class mastery, concept difficulty summary, learner list, recurring misconceptions, recommended actions, alerts, and AI usage logs. Alerts are generated from stored interactions and include evidence summaries with seeded interaction IDs when available.

Alert types include:

- repeated misconception
- low mastery
- high confidence but incorrect
- excessive hint use
- no progress after repeated attempts
- advanced learner ready for challenge

## Safeguards

The project includes responsible AI disclosure and a safeguard demo route. Out-of-scope questions receive a refusal tied to the Java OOP module boundary. Direct-answer requests during assessment receive a guided refusal rather than the final answer. Safeguard events are logged in AI usage metadata.

## Limitations

- The official challenge DOCX was not present during implementation, so exact wording still needs manual verification.
- Team-authored reviewed source material is used instead of external academic PDFs.
- Assessment grading is lightweight and keyword/option based.
- This is a prototype and not a clinically validated cognitive profiler.
- The deterministic fallback is designed for offline demo reliability, not maximal natural-language fluency.

## Future Work

- Add teacher-authored rubrics for short-answer grading.
- Add a richer source review workflow.
- Add exportable learner evidence reports.
- Add automated browser-level Playwright demo checks.
- Add optional vector database support for larger source packs.
