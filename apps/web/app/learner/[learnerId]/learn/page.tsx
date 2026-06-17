"use client";

import { AlertCircle, BookOpen, LoaderCircle, Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SourceReferenceBox } from "@/components/SourceReferenceBox";
import { MasteryProgressBar } from "@/components/MasteryProgressBar";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, concepts, type LearnerProfile, type Source } from "@/lib/api";

type TeachResponse = {
  concept_id: string;
  teaching_action: string;
  why_selected: string;
  response: string;
  guiding_question: string;
  sources: Source[];
  matched_adaptation_rule_id?: string;
  message?: string;
  profile?: LearnerProfile;
};

export default function LearnPage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const auth = useRequireAuth("learner", { learnerId });
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [conceptId, setConceptId] = useState("C001");
  const [action, setAction] = useState("");
  const [result, setResult] = useState<TeachResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.loading || auth.user?.role !== "learner" || auth.user.learner_id !== learnerId || !auth.user.diagnostic_completed) return;
    setProfileLoading(true);
    api<LearnerProfile>(`/api/learners/${learnerId}/profile`)
      .then((data) => {
        setProfile(data);
        setConceptId(data.recommended_concept_id || "C001");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load learner profile"))
      .finally(() => setProfileLoading(false));
  }, [auth.loading, auth.user, learnerId]);

  async function teach() {
    setError("");
    setLoading(true);
    try {
      const response = await api<TeachResponse>("/api/teach", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, concept_id: conceptId, action: action || null })
      });
      setResult(response);
      if (response.profile) setProfile(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate lesson");
    } finally {
      setLoading(false);
    }
  }

  if (auth.loading || !auth.user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-36 w-full" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <span className="badge">Adaptive learning</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Generate a lesson matched to learner evidence</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Teaching actions are selected from mastery, confidence, misconception, and hint evidence.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Learning issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Learning controls</CardTitle>
              <CardDescription>Choose a concept or let the profile recommendation guide you.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="text-sm font-medium text-foreground" htmlFor="learn-concept">Concept</label>
              <select id="learn-concept" className="input mt-2" value={conceptId} disabled={loading} onChange={(event) => setConceptId(event.target.value)}>
                {concepts.map(([id, name]) => (
                  <option key={id} value={id}>{id} {name}</option>
                ))}
              </select>
              <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="teaching-action">Teaching action</label>
              <select id="teaching-action" className="input mt-2" value={action} disabled={loading} onChange={(event) => setAction(event.target.value)}>
                <option value="">Let LearnShift choose</option>
                <option>simplified explanation</option>
                <option>analogy</option>
                <option>step-by-step explanation</option>
                <option>Java code example</option>
                <option>prerequisite review</option>
                <option>advanced application</option>
              </select>
              <Button className="mt-4 w-full" onClick={teach} disabled={loading || profileLoading}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? "Generating..." : "Teach this concept"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Learner snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : profile ? (
                <>
                  <MasteryProgressBar
                    score={profile.overall_mastery}
                    label={profile.overall_mastery >= 70 ? "Mastered" : profile.overall_mastery < 40 ? "Weak" : "Developing"}
                  />
                  <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{profile.next_recommendation}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No profile loaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {loading && <Skeleton className="h-96 w-full" />}
          {!result && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
                <BookOpen className="h-8 w-8 text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">Select a concept to generate an adaptive lesson.</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">The generated lesson will include the teaching action, why it was selected, a quick check, and grounded sources.</p>
              </CardContent>
            </Card>
          )}
          {result?.message && <Alert><AlertDescription>{result.message}</AlertDescription></Alert>}
          {result?.response && !loading && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <span className="badge">{result.concept_id}</span>
                  <span className="badge border-primary/30 bg-primary/10 text-primary">{result.teaching_action}</span>
                  {result.matched_adaptation_rule_id && <span className="badge">{result.matched_adaptation_rule_id}</span>}
                </div>
                <CardTitle className="text-lg">Adaptive lesson</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm leading-7 text-foreground">{result.response}</div>
                <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                  <span className="font-medium">Why this action was selected:</span> {result.why_selected}
                </div>
                <div className="mt-4 rounded-md border border-border p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Quick check:</span> {result.guiding_question}
                </div>
              </CardContent>
            </Card>
          )}
          <SourceReferenceBox sources={result?.sources} />
        </div>
      </section>
    </div>
  );
}
