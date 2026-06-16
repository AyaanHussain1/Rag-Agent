export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Responsible AI Disclosure</h1>
      <div className="mt-6 space-y-4">
        <section className="card">
          <h2 className="font-semibold">Models and APIs</h2>
          <p className="mt-2 text-sm text-slate-700">The backend can use Google Gemini for embeddings and generation when `GOOGLE_API_KEY` is configured. Without a key, it uses deterministic grounded fallback responses from the local OOP chunks.</p>
        </section>
        <section className="card">
          <h2 className="font-semibold">Frameworks and Data</h2>
          <p className="mt-2 text-sm text-slate-700">FastAPI, SQLAlchemy, Alembic, MySQL, Next.js, TypeScript, and Tailwind CSS. Data comes from the provided OOP academic CSV chunks, misconception bank, hint ladders, and clearly labeled demo assessment records.</p>
        </section>
        <section className="card">
          <h2 className="font-semibold">Limits and Privacy</h2>
          <p className="mt-2 text-sm text-slate-700">Only fictional or anonymized learners should be used. This is not AGI, not a clinically validated cognitive profiler, and not a replacement for teacher judgment.</p>
        </section>
        <section className="card">
          <h2 className="font-semibold">Human Review</h2>
          <p className="mt-2 text-sm text-slate-700">AI-generated content and questions should be reviewed by a human educator before classroom use. The educator dashboard exposes evidence so teachers can verify why an intervention was recommended.</p>
        </section>
      </div>
    </div>
  );
}
