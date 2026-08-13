"use client";

import { AlertCircle, CheckCircle2, ClipboardList, LoaderCircle, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, type Question } from "@/lib/api";

type AnswerState = Record<string, { learner_answer: string; confidence: number; started: number }>;

export default function DiagnosticPage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const auth = useRequireAuth("learner", { learnerId, allowIncompleteDiagnostic: true });
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.loading || auth.user?.role !== "learner" || auth.user.learner_id !== learnerId) return;
    setError("");
    api<{ questions: Question[] }>("/api/diagnostic/start", { method: "POST" })
      .then((data) => {
        setQuestions(data.questions);
        const now = Date.now();
        setAnswers(Object.fromEntries(data.questions.map((q) => [q.question_id, { learner_answer: "", confidence: 3, started: now }])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not start diagnostic"));
  }, [auth.loading, auth.user, learnerId]);

  function update(questionId: string, field: "learner_answer" | "confidence", value: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], [field]: value } }));
  }

  async function submit() {
    setError("");
    setSubmitting(true);
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
      await auth.refreshUser();
      setResult(`Diagnostic saved. Recommended starting concept: ${response.starting_concept_id}`);
      setTimeout(() => router.push(`/learner/${learnerId}/dashboard`), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit diagnostic");
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.loading || !auth.user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-20 w-full" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-hero-gradient p-6 text-primary-foreground shadow-lg shadow-slate-900/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
              <ClipboardList className="h-3.5 w-3.5" />
              Initial diagnostic
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Map your Java OOP starting point</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/80">
              Answer each question and rate your confidence. LearnShift uses both signals to personalize your first learning path.
            </p>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-sm">
            <p className="font-medium">{questions.length || 6} questions</p>
            <p className="mt-1 text-primary-foreground/75">Confidence changes mastery updates.</p>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Diagnostic issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {result && (
        <Alert className="mt-5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 space-y-4">
        {!questions.length && !error
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-4 p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))
          : questions.map((question, index) => (
          <Card key={question.question_id} className="overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">Question {index + 1}</span>
              <span className="badge">{question.concept_id}</span>
              <span className="badge">{question.difficulty}</span>
              <span className="badge">{question.question_type}</span>
            </div>
              <CardTitle className="text-lg leading-7">{question.prompt}</CardTitle>
              <CardDescription>Use your own words when possible; short answers are fine.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
            {question.options && (
              <div className="grid gap-2 text-sm text-muted-foreground">
                {question.options.map((option) => (
                  <p key={option} className="rounded-md border border-border bg-background px-3 py-2">
                    {option}
                  </p>
                ))}
              </div>
            )}
            <Textarea
              className="mt-4"
              placeholder="Type your answer..."
              value={answers[question.question_id]?.learner_answer || ""}
              disabled={submitting}
              onChange={(event) => update(question.question_id, "learner_answer", event.target.value)}
            />
            <label className="mt-4 block text-sm font-medium text-foreground">
              <span className="flex items-center justify-between">
                <span>Confidence</span>
                <span className="badge">{answers[question.question_id]?.confidence || 3}/5</span>
              </span>
              <input
                className="mt-3 w-full accent-primary"
                type="range"
                min={1}
                max={5}
                value={answers[question.question_id]?.confidence || 3}
                disabled={submitting}
                onChange={(event) => update(question.question_id, "confidence", Number(event.target.value))}
              />
            </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button onClick={submit} disabled={submitting || !questions.length}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting..." : "Submit diagnostic"}
        </Button>
      </div>
    </div>
  );
}
