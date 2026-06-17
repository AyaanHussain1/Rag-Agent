"use client";

import { LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SourceReferenceBox } from "@/components/SourceReferenceBox";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
        body: JSON.stringify({ learner_id: "demo_beginner", concept_id: "C005" })
      });
      setDirectAnswer(await api<SubmitResponse>("/api/assessment/submit", {
        method: "POST",
        body: JSON.stringify({
          learner_id: "demo_beginner",
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Safeguard demo</h1>
          <p className="mt-2 text-sm text-muted-foreground">Judge-visible checks for grounded answers, scope limits, and assessment integrity.</p>
        </div>
        <Link className="btn" href="/disclosure"><ShieldCheck className="h-4 w-4" /> AI disclosure</Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Safeguard check failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card">
          <h2 className="font-semibold">In-scope OOP question</h2>
          <button className="btn btn-primary mt-4" onClick={askInScope} disabled={loading === "in"}>
            {loading === "in" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading === "in" ? "Checking..." : "Ask in-scope"}
          </button>
          {inScope && (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="badge border-secondary/30 bg-secondary/10 text-secondary">allowed and grounded</span>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-foreground">{inScope.answer || inScope.message}</pre>
              <SourceReferenceBox sources={inScope.sources} />
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">Out-of-scope question</h2>
          <button className="btn btn-primary mt-4" onClick={askOutOfScope} disabled={loading === "out"}>
            {loading === "out" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading === "out" ? "Checking..." : "Ask out-of-scope"}
          </button>
          {outOfScope && (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="badge border-destructive/30 bg-destructive/10 text-destructive">refused: outside Java OOP module</span>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-foreground">{outOfScope.answer || outOfScope.message}</pre>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">Assessment direct answer</h2>
          <button className="btn btn-primary mt-4" onClick={askDirectAnswer} disabled={loading === "direct"}>
            {loading === "direct" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading === "direct" ? "Testing..." : "Test direct answer"}
          </button>
          {directAnswer && (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="badge border-destructive/30 bg-destructive/10 text-destructive">safeguard: assessment integrity</span>
              {directAnswer.matched_adaptation_rule_id && <span className="badge">{directAnswer.matched_adaptation_rule_id}</span>}
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-foreground">{directAnswer.feedback}</pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
