"use client";

import { Plus, RefreshCcw, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Learner = {
  learner_id: string;
  display_name: string;
  current_level: string;
  overall_mastery: number;
  recommended_concept_id?: string;
};

export default function LearnerPage() {
  const router = useRouter();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [name, setName] = useState("Fictional Learner");
  const [level, setLevel] = useState("BEGINNER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setLearners(await api<Learner[]>("/api/learners"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load learners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createLearner() {
    const learner = await api<Learner>("/api/learners", {
      method: "POST",
      body: JSON.stringify({ display_name: name, current_level: level })
    });
    router.push(`/learner/${learner.learner_id}/diagnostic`);
  }

  async function seedDemo() {
    await api("/api/demo/seed", { method: "POST" });
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Select a learner</h1>
          <p className="mt-2 text-sm text-slate-600">Use fictional or anonymized learners only.</p>
        </div>
        <button className="btn" onClick={seedDemo}><RefreshCcw className="h-4 w-4" /> Seed demo data</button>
      </div>

      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="card">
          <h2 className="font-semibold">Existing learners</h2>
          <div className="mt-4 grid gap-3">
            {loading && <p className="text-sm text-slate-500">Loading learners...</p>}
            {!loading && learners.length === 0 && <p className="text-sm text-slate-500">No learners yet. Seed demo data or create one.</p>}
            {learners.map((learner) => (
              <button
                key={learner.learner_id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-teal-500"
                onClick={() => router.push(`/learner/${learner.learner_id}/dashboard`)}
              >
                <span className="flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-teal-700" />
                  <span>
                    <span className="block font-medium">{learner.display_name}</span>
                    <span className="text-xs text-slate-500">{learner.current_level} · {Math.round(learner.overall_mastery)}% mastery</span>
                  </span>
                </span>
                <span className="badge">{learner.recommended_concept_id || "Diagnostic"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold">Create fictional learner</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Display name
              <input className="input mt-1" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Starting level
              <select className="input mt-1" value={level} onChange={(event) => setLevel(event.target.value)}>
                <option>BEGINNER</option>
                <option>INTERMEDIATE</option>
                <option>ADVANCED</option>
              </select>
            </label>
            <button className="btn btn-primary" onClick={createLearner}><Plus className="h-4 w-4" /> Create and start diagnostic</button>
          </div>
        </div>
      </section>
    </div>
  );
}
