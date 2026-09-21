# LearnShift AI Web Prototype

LearnShift AI wraps the existing Python OOP RAG tutor with a FastAPI service and a Next.js frontend. The CLI files remain in place; the web app adds learner profiles, adaptive diagnostics, assessment, progressive hints, educator analytics, and responsible AI disclosure.

## Prerequisites

- Python 3.11+
- Node.js 20+
- MySQL 8+
- Google Gemini API key for live generation. The backend still runs with deterministic grounded fallback responses if `GOOGLE_API_KEY` is not set.

## Environment

Copy `.env` to your local environment file and set:

```bash
GOOGLE_API_KEY=your_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/learnshift_ai
```

For a quick local smoke test, omitting `DATABASE_URL` uses `sqlite:///./learnshift_ai.db`.

## Backend

```bash
cd services/ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Seed demo data:

```bash
curl -X POST http://localhost:8000/api/demo/seed \
  -H "Authorization: Bearer <educator-access-token>"
```

## Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Learners

After seeding:

- `demo_beginner`: weak beginner with repeated misconception and hint usage evidence.
- `demo_advanced`: advanced learner with challenge-ready alerts.

## Notes

For production deployments, set `NEXT_PUBLIC_API_BASE_URL` to the deployed API
URL and `CORS_ORIGINS` to a comma-separated list of deployed frontend origins.
Do not use `*` with credentialed requests.

- The existing command-line tutor remains runnable with `python Rag_Agent.py`.
- The FastAPI app loads the provided CSVs and adds missing required concept records during seeding.
- Every teaching response returns source metadata with concept ID, chunk ID, page when available, and confidence/similarity.
