"use client";

import { HelpCircle, Send, Shuffle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, concepts, type LearnerProfile, type Question } from "@/lib/api";

type NextResponse = { question: Question; why_selected: string; profile: LearnerProfile };
type SubmitResponse = { correct?: boolean; feedback: string; safeguard?: boolean; profile: LearnerProfile };
type HintResponse = { hint: string; hint_count: number; exhausted: boolean; profile: LearnerProfile };

export default function AssessmentPage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const [conceptId, setConceptId] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [why, setWhy] = useState("");
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [hintCount, setHintCount] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  async function nextQuestion() {
    setError("");
    try {
      const response = await api<NextResponse>("/api/assessment/next", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, concept_id: conceptId || null })
      });
      setQuestion(response.question);
      setWhy(response.why_selected);
      setProfile(response.profile);
      setAnswer("");
      setFeedback("");
      setHintCount(0);
      setHints([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the next question");
    }
  }

  async function getHint() {
    if (!question || hintCount >= 3) return;
    setError("");
    setHintLoading(true);
    try {
      const response = await api<HintResponse>("/api/hints/next", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, question_id: question.question_id, current_hint_count: hintCount })
      });
      setHintCount(response.hint_count);
      setHints((prev) => [...prev, response.hint]);
      setProfile(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load a hint");
    } finally {
      setHintLoading(false);
    }
  }

  async function submit() {
    if (!question) return;
    setError("");
    try {
      const response = await api<SubmitResponse>("/api/assessment/submit", {
        method: "POST",
        body: JSON.stringify({
          learner_id: learnerId,
          question_id: question.question_id,
          learner_answer: answer,
          confidence,
          hints_used: hintCount
        })
      });
      setFeedback(response.feedback);
      setProfile(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the answer");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Adaptive assessment</h1>
      <p className="mt-2 text-sm text-slate-600">Questions respond to repeated errors, confidence, hint usage, and strong mastery.</p>
      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="card">
          <h2 className="font-semibold">Question selector</h2>
          <label className="mt-4 block text-sm font-medium">
            Concept
            <select className="input mt-1" value={conceptId} onChange={(event) => setConceptId(event.target.value)}>
              <option value="">Use recommendation</option>
              {concepts.map(([id, name]) => <option key={id} value={id}>{id} {name}</option>)}
            </select>
          </label>
          <button className="btn btn-primary mt-4" onClick={nextQuestion}><Shuffle className="h-4 w-4" /> Get next question</button>
          {profile && (
            <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
              Mastery now: {Math.round(profile.overall_mastery)}% · Hints used: {profile.hint_count}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {question ? (
            <article className="card">
              <div className="flex flex-wrap gap-2">
                <span className="badge">{question.concept_id}</span>
                <span className="badge">{question.difficulty}</span>
                <span className="badge">{question.question_type}</span>
              </div>
              <p className="mt-4 font-medium text-slate-900">{question.prompt}</p>
              {question.options && <div className="mt-3 grid gap-2 text-sm text-slate-700">{question.options.map((option) => <p key={option}>{option}</p>)}</div>}
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Why selected: {why}
              </div>
              <textarea className="input mt-4 min-h-28" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Try an answer, or test safeguard by typing 'just give me the answer'." />
              <label className="mt-3 block text-sm font-medium">
                Confidence: {confidence}/5
                <input className="mt-2 w-full" type="range" min={1} max={5} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn" onClick={getHint} disabled={hintLoading || hintCount >= 3}>
                  <HelpCircle className="h-4 w-4" /> {hintLoading ? "Loading hint..." : `Hint ${hintCount}/3`}
                </button>
                <button className="btn btn-primary" onClick={submit}><Send className="h-4 w-4" /> Submit answer</button>
              </div>
              {hints.length > 0 && (
                <div className="mt-4 space-y-2">
                  {hints.map((hint, index) => <p key={hint} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">Hint {index + 1}: {hint}</p>)}
                </div>
              )}
              {feedback && <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{feedback}</div>}
            </article>
          ) : (
            <div className="card text-sm text-slate-600">Choose a question to begin.</div>
          )}
        </div>
      </section>
    </div>
  );
}
