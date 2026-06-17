"use client";

import { MessageSquareText, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SourceReferenceBox } from "@/components/SourceReferenceBox";
import { useRequireAuth } from "@/components/AuthProvider";
import { api, type LearnerProfile, type Source } from "@/lib/api";

type TutorResponse = {
  concept_id: string;
  response: string;
  sources: Source[];
  detected_concept_id?: string;
  detected_misconception_id?: string;
  reframe?: string;
  guiding_question?: string;
  follow_up_check?: string;
  profile_update_reason?: string;
  matched_adaptation_rule_id?: string;
  source_references?: Source[];
  misconception?: { misconception_id: string; description: string; recommended_intervention: string };
  profile?: LearnerProfile;
  message?: string;
};

export default function TutorPage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const auth = useRequireAuth("learner", { learnerId });
  const [message, setMessage] = useState("I think overriding is when the same class has two methods with different parameters.");
  const [confidence, setConfidence] = useState(2);
  const [result, setResult] = useState<TutorResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (auth.user?.learner_id !== learnerId || !auth.user.diagnostic_completed) return;
    setLoading(true);
    try {
      setResult(await api<TutorResponse>("/api/tutor/confusion", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, message, confidence })
      }));
    } finally {
      setLoading(false);
    }
  }

  if (auth.loading || !auth.user) return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Checking login...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Tutor mode</h1>
      <p className="mt-2 text-sm text-slate-600">Type a confusion, wrong answer, or Java OOP question. The tutor identifies the concept and reframes the explanation.</p>
      <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="card">
          <div className="flex items-center gap-2 font-semibold"><MessageSquareText className="h-5 w-5 text-teal-700" /> Learner message</div>
          <textarea className="input mt-4 min-h-40" value={message} onChange={(event) => setMessage(event.target.value)} />
          <label className="mt-4 block text-sm font-medium">
            Confidence: {confidence}/5
            <input className="mt-2 w-full" type="range" min={1} max={5} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
          </label>
          <button className="btn btn-primary mt-4" onClick={submit} disabled={loading}><Send className="h-4 w-4" /> {loading ? "Thinking..." : "Ask tutor"}</button>
        </div>

        <div className="space-y-4">
          {result?.message && <div className="card">{result.message}</div>}
          {result?.response && (
            <article className="card">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="badge">{result.detected_concept_id || result.concept_id}</span>
                {result.detected_misconception_id && <span className="badge border-rose-200 bg-rose-50 text-rose-700">{result.detected_misconception_id}</span>}
                {result.matched_adaptation_rule_id && <span className="badge border-teal-200 bg-teal-50 text-teal-800">{result.matched_adaptation_rule_id}</span>}
              </div>
              <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-800">{result.reframe || result.response}</pre>
              {result.guiding_question && (
                <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                  <span className="font-medium">Guiding question:</span> {result.guiding_question}
                </div>
              )}
              {result.follow_up_check && (
                <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="font-medium">Follow-up check:</span> {result.follow_up_check}
                </div>
              )}
              {result.misconception && (
                <p className="mt-3 text-sm text-slate-600">
                  Misconception bank used: {result.misconception.description}
                </p>
              )}
              {result.profile_update_reason && (
                <p className="mt-3 text-sm text-slate-600">
                  Profile update: {result.profile_update_reason}
                </p>
              )}
            </article>
          )}
          <SourceReferenceBox sources={result?.source_references || result?.sources} />
        </div>
      </section>
    </div>
  );
}
