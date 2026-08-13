# LearnShift AI Remaining Work Audit

Date: 2026-06-17

> Note: This audit captured the pre-completion state. The current competition-ready status is tracked in `docs/competition-readiness-checklist.md` and validated by `scripts/validate_competition_readiness.py`.

## A. Overall Status

- Estimated completion: **58% competition-ready**, based on the repository, `WEB_FEATURES.txt`, local docs, code, CSVs, and SQLite DB.
- Major caveat: **`AI_Rapid_Forge_LearnShift_AI_Participant_Challenge_Brief.docx` was not found** in `d:\agent\Rag-Agent` or under `D:\agent`, so this audit could not verify against the official brief itself.
- Biggest judging risks:
  - Dataset minimums are not met.
  - Source documents are not verifiably present.
  - Demo seed is too small and not reproducible for required learner/interactions counts.
  - RAG content is heavily imbalanced: 111/112 chunks are `C001`.
  - Adaptation rules exist as code logic, but no formal 12-rule dataset/table was found.

## B. Completed Features

- Web routes exist:
  - `/`
  - `/learner`
  - `/learner/[learnerId]/diagnostic`
  - `/learner/[learnerId]/dashboard`
  - `/learner/[learnerId]/learn`
  - `/learner/[learnerId]/assessment`
  - `/learner/[learnerId]/tutor`
  - `/educator`
  - `/educator/learners/[learnerId]`
  - `/disclosure`
- Backend APIs exist in `services/ai/app/main.py`:
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
  - `/api/educator/learners/{learner_id}`
  - `/api/rag/answer`
- Stored learner interaction data is genuinely used:
  - `services/ai/app/models.py` defines learners, mastery, interactions, attempts, alerts, and AI logs.
  - `services/ai/app/adaptive.py` updates mastery from correctness, confidence, hints, and misconceptions.
  - Teaching action and question selection use stored recent interactions.
  - Educator alerts are regenerated from stored interactions.
- Responsible AI disclosure exists:
  - `apps/web/app/disclosure/page.tsx`
  - `docs/ai-disclosure.md`
- RAG service exists:
  - `services/ai/app/rag_service.py`
  - Uses `pure_academic_chunks_with_vectors.csv`.
  - Returns source metadata with chunk ID, concept ID, source page, and confidence.

## C. Partially Completed Features

- Official requirements trace: **partial / blocked**
  - Challenge brief DOCX: **not found**.
  - Need to add the file or provide its contents before exact official compliance can be verified.
- Dataset seeding:
  - `services/ai/app/seed.py` seeds 18 questions, 6 base misconceptions, 18 hint ladders, and 2 demo learners.
  - This is useful, but below several stated minimums.
- Questions:
  - Runtime DB/seed has 18 questions.
  - Required minimum is 36.
  - Needs work in `services/ai/app/seed.py` or a proper question dataset file/table.
- Misconceptions:
  - Runtime DB currently has 7.
  - Seed has 6 base misconceptions; `Misconception.csv` has 3.
  - Required minimum is 12.
- Learner profiles:
  - `seed_demo()` creates only 2 learners.
  - Current SQLite DB has 6 because of manual/local use, but this is not reproducible from seed.
- Learner interactions:
  - `seed_demo()` creates 8 interactions.
  - Current SQLite DB has 35.
  - Required minimum is 75.
- RAG/source content:
  - 112 chunks exist, so chunk count passes.
  - But only `C001` and `C004` appear in `pure_academic_chunks.csv`; no chunks for `C002`, `C003`, `C005`, `C006`.
  - Original verified source documents or a source manifest were **not found**.
- Responsible handling:
  - Assessment direct-answer safeguard exists.
  - Out-of-scope handling exists in `/api/rag/answer`.
  - No normal frontend page was found for free-form `/api/rag/answer`; demo may need API/manual endpoint.

## D. Missing Features

- Official challenge brief file:
  - `AI_Rapid_Forge_LearnShift_AI_Participant_Challenge_Brief.docx`: **not found**.
- Verified source documents:
  - Required 3 verified source documents: **not found** as PDFs/DOCX/source manifest.
  - Likely add under `data/sources/` or `docs/sources.md`.
- Formal 12 adaptation rules dataset:
  - Code rules exist in `adaptive.py`, but no `adaptation_rules.csv`, table, or seeded rule records were found.
- Full minimum demo dataset:
  - Add/seed 5 learners and 75 interactions reproducibly.
  - Best location: `services/ai/app/seed.py`, possibly backed by CSV/JSON files under `data/`.
- Full question bank:
  - Need 18 more questions minimum.
  - Best location: replace hardcoded list or supplement it in `services/ai/app/seed.py`.
- AI usage log visibility:
  - Table exists and `/api/rag/answer` plus `/api/teach` log usage.
  - No educator/admin UI for AI usage logs found.
  - Tutor/assessment AI/logging coverage is incomplete.

## E. Dataset Gaps

- 3 verified source documents: **Not found**
- 24 knowledge chunks: **Met by count**, but weak quality/balance
  - `C001`: 111
  - `C004`: 1
  - `C002`, `C003`, `C005`, `C006`: 0
- 36 questions: **Incomplete**
  - Found 18 seeded/runtime questions.
- 12 misconceptions: **Incomplete**
  - Found 3 in CSV, 6 in seed, 7 in current DB.
- 12 hint ladders: **Partial**
  - CSV has 3.
  - Runtime seed creates 18 generic ladders.
- 5 learner profiles: **Partial**
  - Seed creates 2.
  - Current DB has 6, but not reproducible from seed.
- 75 learner interactions: **Incomplete**
  - Seed creates 8.
  - Current DB has 35.
- 12 adaptation rules: **Not found as dataset**
  - Logic exists in `adaptive.py`, but no formal rule dataset/table.
- 6 educator alerts: **Mostly met**
  - Current DB has 16 alerts across 6 alert types.
  - Alert generation rules exist.
- AI usage log: **Partial**
  - `AIUsageLog` table exists.
  - Current DB has 6 rows.
  - Not fully surfaced in UI and not comprehensively logged.

## F. Demo-Readiness Checklist

- Run diagnostic: **Ready**
- Show learner profile and starting recommendation: **Ready**
- Teach same concept to two learners differently: **Ready**
- Process incorrect answer: **Ready**
- Show progressive hints or tutor mode: **Ready**
- Show learner profile/mastery update: **Ready**
- Open educator dashboard: **Ready**
- Show alert and evidence: **Partially ready**
  - Alerts and timeline exist, but alert cards do not link to exact interaction IDs.
- Handle out-of-scope or direct-answer request responsibly: **Partially ready**
  - Direct-answer safeguard works in assessment.
  - Out-of-scope works through `/api/rag/answer`, but not clearly exposed in main frontend flow.

## G. Prioritized Remaining Work

### Must Finish Before Submission

- Add/provide the official challenge brief and re-run compliance trace.
- Expand reproducible seed data to 5 learners and 75 interactions.
- Expand questions to 36.
- Expand misconceptions to 12.
- Add/verify 3 source documents or a source manifest.
- Balance RAG chunks across all six concepts.
- Add formal 12 adaptation rules as data or documented seeded records.
- Ensure out-of-scope demo is available from UI or documented API flow.

### Nice To Have

- Add AI usage log dashboard or educator-visible log section.
- Add exact evidence links from alerts to interactions.
- Move hardcoded seed lists into CSV/JSON dataset files.
- Add automated smoke tests for diagnostic, assessment, hints, teach, tutor, and educator alerts.

### Optional Bonus

- Add richer source citations per chunk.
- Add more diverse learner profiles.
- Add teacher-facing explanation of adaptation rules.
- Add exportable demo evidence report.

## H. Recommended Codex Implementation Plan

1. Add the missing challenge brief or paste its contents, then build a formal requirement checklist.
2. Create a dataset inventory file under `data/` documenting sources, counts, and validation status.
3. Expand source/RAG content so all six concepts have usable chunks.
4. Add 36 total questions across concepts and difficulty levels.
5. Add 12 misconception records.
6. Add or formalize at least 12 adaptation rules.
7. Update `seed_demo()` to reproducibly create 5 learners and 75 interactions.
8. Ensure educator alerts are seeded/generated from those interactions.
9. Add AI usage logging coverage for tutor and other AI-like responses, or clearly document deterministic-only paths.
10. Add UI or demo route for out-of-scope handling.
11. Add smoke tests for the judge demo flow.
12. Re-run the audit and produce a final submission-readiness checklist.
