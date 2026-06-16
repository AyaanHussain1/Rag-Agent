"use client";

import { BookOpen, Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SourceReferenceBox } from "@/components/SourceReferenceBox";
import { api, concepts, type LearnerProfile, type Source } from "@/lib/api";

type TeachResponse = {
  concept_id: string;
  teaching_action: string;
  why_selected: string;
  response: string;
  guiding_question: string;
  sources: Source[];
  message?: string;
  profile?: LearnerProfile;
};

export default function LearnPage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [conceptId, setConceptId] = useState("C001");
  const [action, setAction] = useState("");
  const [result, setResult] = useState<TeachResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<LearnerProfile>(`/api/learners/${learnerId}/profile`).then((data) => {
      setProfile(data);
      setConceptId(data.recommended_concept_id || "C001");
    });
  }, [learnerId]);

  async function teach() {
    setLoading(true);
    try {
      const response = await api<TeachResponse>("/api/teach", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, concept_id: conceptId, action: action || null })
      });
      setResult(response);
      if (response.profile) setProfile(response.profile);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Adaptive learning</h1>
      <p className="mt-2 text-sm text-slate-600">Teaching action is selected from mastery, confidence, misconception, and hint evidence.</p>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="card">
          <h2 className="font-semibold">Learning controls</h2>
          <label className="mt-4 block text-sm font-medium">
            Concept
            <select className="input mt-1" value={conceptId} onChange={(event) => setConceptId(event.target.value)}>
              {concepts.map(([id, name]) => <option key={id} value={id}>{id} {name}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            Teaching action
            <select className="input mt-1" value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">Let LearnShift choose</option>
              <option>simplified explanation</option>
              <option>analogy</option>
              <option>step-by-step explanation</option>
              <option>Java code example</option>
              <option>prerequisite review</option>
              <option>advanced application</option>
            </select>
          </label>
          <button className="btn btn-primary mt-4" onClick={teach} disabled={loading}>
            <Wand2 className="h-4 w-4" /> {loading ? "Generating..." : "Teach this concept"}
          </button>
          {profile && <p className="mt-4 text-sm text-slate-600">Recommended: {profile.next_recommendation}</p>}
        </div>

        <div className="space-y-4">
          {!result && <div className="card text-sm text-slate-600"><BookOpen className="mb-3 h-5 w-5 text-teal-700" />Select a concept to generate an adaptive lesson.</div>}
          {result?.message && <div className="card text-sm text-slate-700">{result.message}</div>}
          {result?.response && (
            <article className="card">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="badge">{result.concept_id}</span>
                <span className="badge border-teal-200 bg-teal-50 text-teal-800">{result.teaching_action}</span>
              </div>
              <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-800">{result.response}</pre>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-medium">Why this action was selected:</span> {result.why_selected}
              </div>
              <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                <span className="font-medium">Quick check:</span> {result.guiding_question}
              </div>
            </article>
          )}
          <SourceReferenceBox sources={result?.sources} />
        </div>
      </section>
    </div>
  );
}
