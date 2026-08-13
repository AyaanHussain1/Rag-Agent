"use client";

import { AlertCircle, Brain, HelpCircle, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SourceReferenceBox } from "@/components/SourceReferenceBox";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  const [error, setError] = useState("");

  async function submit() {
    if (auth.user?.learner_id !== learnerId || !auth.user.diagnostic_completed) return;
    setError("");
    setLoading(true);
    try {
      setResult(await api<TutorResponse>("/api/tutor/confusion", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, message, confidence })
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not ask tutor");
    } finally {
      setLoading(false);
    }
  }

  if (auth.loading || !auth.user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-36 w-full" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <span className="badge">Tutor mode</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Untangle a confusion with grounded guidance</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          The tutor detects the concept, checks misconception evidence, reframes the explanation, and asks a follow-up.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tutor issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Learner message
            </CardTitle>
            <CardDescription>Paste a wrong answer, confusion, or Java OOP question.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea className="min-h-44" value={message} disabled={loading} onChange={(event) => setMessage(event.target.value)} />
            <label className="mt-4 block text-sm font-medium text-foreground">
              <span className="flex items-center justify-between">
                <span>Confidence</span>
                <span className="badge">{confidence}/5</span>
              </span>
              <input className="mt-3 w-full accent-primary" type="range" min={1} max={5} value={confidence} disabled={loading} onChange={(event) => setConfidence(Number(event.target.value))} />
            </label>
            <Button className="mt-4 w-full" onClick={submit} disabled={loading || !message.trim()}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Thinking..." : "Ask tutor"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading && <Skeleton className="h-96 w-full" />}
          {!result && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
                <Brain className="h-8 w-8 text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">Ask the tutor to begin.</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">Tutor responses will show detected concepts, misconceptions, source grounding, and follow-up checks.</p>
              </CardContent>
            </Card>
          )}
          {result?.message && <Alert><AlertDescription>{result.message}</AlertDescription></Alert>}
          {result?.response && !loading && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <span className="badge">{result.detected_concept_id || result.concept_id}</span>
                  {result.detected_misconception_id && <span className="badge border-destructive/30 bg-destructive/10 text-destructive">{result.detected_misconception_id}</span>}
                  {result.matched_adaptation_rule_id && <span className="badge border-primary/30 bg-primary/10 text-primary">{result.matched_adaptation_rule_id}</span>}
                </div>
                <CardTitle className="text-lg">Tutor response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm leading-7 text-foreground">{result.reframe || result.response}</div>
                {result.guiding_question && (
                  <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
                    <span className="font-medium">Guiding question:</span> {result.guiding_question}
                  </div>
                )}
                {result.follow_up_check && (
                  <div className="mt-3 rounded-md border border-border p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Follow-up check:</span> {result.follow_up_check}
                  </div>
                )}
                {result.misconception && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
                    <span className="font-medium">Misconception bank:</span> {result.misconception.description}
                  </div>
                )}
                {result.profile_update_reason && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <HelpCircle className="mt-0.5 h-4 w-4 text-primary" />
                    <span><span className="font-medium text-foreground">Profile update:</span> {result.profile_update_reason}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <SourceReferenceBox sources={result?.source_references || result?.sources} />
        </div>
      </section>
    </div>
  );
}
