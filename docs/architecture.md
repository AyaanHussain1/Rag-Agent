# LearnShift AI Architecture

## Overview

The project now has three layers:

- Existing Python RAG assets in the repo root.
- `services/ai`: FastAPI, SQLAlchemy ORM, Alembic migrations, adaptive logic, CSV seeding, and RAG wrapper.
- `apps/web`: Next.js App Router frontend with TypeScript and Tailwind.

## Backend Flow

1. CSV seed loads concepts, chunks, misconceptions, hint ladders, and demo questions.
2. Learner interactions are stored in MySQL tables.
3. Adaptive logic updates concept mastery from correctness, confidence, hint usage, repeated misconceptions, and recent performance.
4. Teaching action selection uses learner evidence, not a fixed script.
5. RAG retrieval uses `pure_academic_chunks_with_vectors.csv` where available and returns visible source metadata.
6. Educator alerts are regenerated from stored interaction evidence.

## Frontend Flow

The UI calls backend endpoints directly:

- `/learner` selects or creates fictional learners.
- `/learner/[learnerId]/diagnostic` records initial evidence.
- `/learner/[learnerId]/dashboard` displays profile changes.
- `/learner/[learnerId]/learn` generates adaptive grounded lessons.
- `/learner/[learnerId]/tutor` reframes confusion using the misconception bank.
- `/learner/[learnerId]/assessment` selects adaptive questions and supports three progressive hints.
- `/educator` and `/educator/learners/[learnerId]` show class analytics, alerts, and evidence.

## Persistence

Tables include learners, concepts, content chunks, questions, hint ladders, misconceptions, learner mastery, interactions, assessment attempts, educator alerts, and AI usage logs.
