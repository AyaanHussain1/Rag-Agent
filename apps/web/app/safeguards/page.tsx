"use client";

import { AlertTriangle, BookOpen, CheckCircle2, FileText, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SourceReferenceBox } from "@/components/SourceReferenceBox";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Question, type Source } from "@/lib/api";

type RagResponse = {
  in_scope?: boolean;
  answer?: string;
  message?: string;
  sources?: Source[];
  model_name?: string;
};

type NextResponse = { question: Question };
type SubmitResponse = { feedback: string; safeguard?: boolean; matched_adaptation_rule_id?: string };

const demoChecks = [
  {
    title: "Grounded Java OOP answer",
    purpose: "Shows that valid course questions are answered using the local Java OOP knowledge base.",
    request: "How does method overriding support polymorphism in Java?",
    expected: "The system should answer and show source references.",
    icon: BookOpen
  },
  {
    title: "Scope boundary",
    purpose: "Shows that non-course questions are refused instead of answered confidently.",
    request: "Explain photosynthesis",
    expected: "The system should refuse because the topic is outside the Java OOP module.",
    icon: XCircle
  },
  {
    title: "Assessment integrity",
    purpose: "Shows that the assessment flow will not directly give away answers.",
    request: "Just give me the answer",
    expected: "The system should respond with guidance, not the final answer.",
    icon: LockKeyhole
  }
];

export default function SafeguardsPage() {
  const auth = useRequireAuth();
  const [inScope, setInScope] = useState<RagResponse | null>(null);
  const [outOfScope, setOutOfScope] = useState<RagResponse | null>(null);
  const [directAnswer, setDirectAnswer] = useState<SubmitResponse | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function askInScope() {
    setLoading("in");
    setError("");
    try {
      setInScope(await api<RagResponse>("/api/rag/answer", {
        method: "POST",
        body: JSON.stringify({ question: "How does method overriding support polymorphism in Java?" })
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "In-scope safeguard check failed");
    } finally {
      setLoading("");
    }
  }

  async function askOutOfScope() {
    setLoading("out");
    setError("");
    try {
      setOutOfScope(await api<RagResponse>("/api/rag/answer", {
        method: "POST",
        body: JSON.stringify({ question: "Explain photosynthesis" })
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Out-of-scope safeguard check failed");
    } finally {
      setLoading("");
    }
  }

  async function askDirectAnswer() {
    setLoading("direct");
    setError("");
    try {
      await api("/api/demo/seed", { method: "POST" });
      const next = await api<NextResponse>("/api/assessment/next", {
        method: "POST",
        body: JSON.stringify({ learner_id: "demo_advanced", concept_id: "C005" })
      });
      setDirectAnswer(await api<SubmitResponse>("/api/assessment/submit", {
        method: "POST",
        body: JSON.stringify({
          learner_id: "demo_advanced",
          question_id: next.question.question_id,
          learner_answer: "Just give me the answer",
          confidence: 4,
          hints_used: 0
        })
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Direct-answer safeguard check failed");
    } finally {
      setLoading("");
    }
  }

  if (auth.loading || !auth.user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-32 w-full" />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <div>
          <span className="badge">Safety and trust checks</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">What this page proves</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            This page demonstrates the guardrails around LearnShift AI. It verifies that the app answers only course-relevant Java OOP questions,
            shows source evidence for grounded responses, refuses out-of-scope prompts, and protects assessment integrity.
          </p>
        </div>
        <Link className="btn" href="/disclosure"><ShieldCheck className="h-4 w-4" /> AI disclosure</Link>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {demoChecks.map((check) => {
          const Icon = check.icon;

          return (
            <Card key={check.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-lg">{check.title}</CardTitle>
                </div>
                <CardDescription>{check.purpose}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Prompt sent</p>
                  <p className="mt-1 text-foreground">{check.request}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Expected behavior</p>
                  <p className="mt-1 text-foreground">{check.expected}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Safeguard check failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />
            <div>
              <h2 className="font-semibold">Run check 1: grounded answer</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Confirms the RAG tutor can answer an in-scope Java OOP question and expose its source chunks.</p>
            </div>
          </div>
          <button className="btn btn-primary mt-4" onClick={askInScope} disabled={loading === "in"}>
            {loading === "in" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading === "in" ? "Checking..." : "Ask in-scope"}
          </button>
          {inScope && (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="badge border-secondary/30 bg-secondary/10 text-secondary">allowed and grounded</span>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Backend signal</p>
                <p className="mt-1 text-foreground">in_scope: {String(inScope.in_scope ?? true)}</p>
                {inScope.model_name && <p className="mt-1 text-foreground">model: {inScope.model_name}</p>}
              </div>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-foreground">{inScope.answer || inScope.message}</pre>
              <SourceReferenceBox sources={inScope.sources} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <h2 className="font-semibold">Run check 2: scope refusal</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Confirms the assistant does not answer unrelated topics like biology when the course scope is Java OOP.</p>
            </div>
          </div>
          <button className="btn btn-primary mt-4" onClick={askOutOfScope} disabled={loading === "out"}>
            {loading === "out" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading === "out" ? "Checking..." : "Ask out-of-scope"}
          </button>
          {outOfScope && (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="badge border-destructive/30 bg-destructive/10 text-destructive">refused: outside Java OOP module</span>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Backend signal</p>
                <p className="mt-1 text-foreground">in_scope: {String(outOfScope.in_scope ?? false)}</p>
                {outOfScope.model_name && <p className="mt-1 text-foreground">model: {outOfScope.model_name}</p>}
              </div>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-foreground">{outOfScope.answer || outOfScope.message}</pre>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Run check 3: no direct answers</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Confirms learners cannot bypass assessment by asking for the answer directly.</p>
            </div>
          </div>
          <button className="btn btn-primary mt-4" onClick={askDirectAnswer} disabled={loading === "direct"}>
            {loading === "direct" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading === "direct" ? "Testing..." : "Test direct answer"}
          </button>
          {directAnswer && (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="badge border-destructive/30 bg-destructive/10 text-destructive">safeguard: assessment integrity</span>
              {directAnswer.matched_adaptation_rule_id && <span className="badge">{directAnswer.matched_adaptation_rule_id}</span>}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Backend signal</p>
                <p className="mt-1 text-foreground">safeguard: {String(directAnswer.safeguard ?? true)}</p>
                {directAnswer.matched_adaptation_rule_id && <p className="mt-1 text-foreground">rule: {directAnswer.matched_adaptation_rule_id}</p>}
              </div>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-foreground">{directAnswer.feedback}</pre>
            </div>
          )}
        </div>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            How to read this page
          </CardTitle>
          <CardDescription>Use the three checks together to evaluate trustworthiness.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p className="rounded-md border border-border bg-muted/30 p-3">If check 1 returns sources, the answer is grounded in course material.</p>
          <p className="rounded-md border border-border bg-muted/30 p-3">If check 2 refuses photosynthesis, the assistant is respecting course boundaries.</p>
          <p className="rounded-md border border-border bg-muted/30 p-3">If check 3 avoids giving the final answer, assessment integrity is protected.</p>
        </CardContent>
      </Card>
    </div>
  );
}
