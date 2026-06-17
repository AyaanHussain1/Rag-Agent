"use client";

import { Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/AuthProvider";
import { api, type Question } from "@/lib/api";

type AnswerState = Record<string, { learner_answer: string; confidence: number; started: number }>;

export default function DiagnosticPage() {
  const auth = useRequireAuth();
  const { learnerId } = useParams<{ learnerId: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    api<{ questions: Question[] }>("/api/diagnostic/start", { method: "POST" })
      .then((data) => {
        setQuestions(data.questions);
        const now = Date.now();
        setAnswers(Object.fromEntries(data.questions.map((q) => [q.question_id, { learner_answer: "", confidence: 3, started: now }])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not start diagnostic"));
  }, [auth.loading, auth.user]);

  function update(questionId: string, field: "learner_answer" | "confidence", value: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], [field]: value } }));
  }

  async function submit() {
    setError("");
    const payload = {
      learner_id: learnerId,
      answers: questions.map((question) => ({
        question_id: question.question_id,
        learner_answer: answers[question.question_id]?.learner_answer || "",
        confidence: Number(answers[question.question_id]?.confidence || 3),
        time_spent_seconds: Math.max(1, Math.round((Date.now() - (answers[question.question_id]?.started || Date.now())) / 1000))
      }))
    };
    try {
      const response = await api<{ starting_concept_id: string }>("/api/diagnostic/submit", { method: "POST", body: JSON.stringify(payload) });
      setResult(`Diagnostic saved. Recommended starting concept: ${response.starting_concept_id}`);
      setTimeout(() => router.push(`/learner/${learnerId}/dashboard`), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit diagnostic");
    }
  }

  if (auth.loading || !auth.user) return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Checking login...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Initial diagnostic</h1>
      <p className="mt-2 text-sm text-slate-600">Answer six Java OOP questions. Confidence affects mastery updates.</p>
      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {result && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{result}</div>}

      <div className="mt-6 space-y-4">
        {questions.map((question, index) => (
          <section key={question.question_id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">Question {index + 1}</span>
              <span className="badge">{question.concept_id}</span>
              <span className="badge">{question.difficulty}</span>
              <span className="badge">{question.question_type}</span>
            </div>
            <p className="mt-3 font-medium text-slate-900">{question.prompt}</p>
            {question.options && (
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                {question.options.map((option) => <p key={option}>{option}</p>)}
              </div>
            )}
            <textarea className="input mt-4 min-h-24" value={answers[question.question_id]?.learner_answer || ""} onChange={(event) => update(question.question_id, "learner_answer", event.target.value)} />
            <label className="mt-3 block text-sm font-medium">
              Confidence: {answers[question.question_id]?.confidence || 3}/5
              <input className="mt-2 w-full" type="range" min={1} max={5} value={answers[question.question_id]?.confidence || 3} onChange={(event) => update(question.question_id, "confidence", Number(event.target.value))} />
            </label>
          </section>
        ))}
      </div>

      <button className="btn btn-primary mt-6" onClick={submit}><Send className="h-4 w-4" /> Submit diagnostic</button>
    </div>
  );
}
