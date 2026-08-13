"use client";

import { AlertCircle, BookOpen, Brain, ClipboardList, Lightbulb, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConceptMasteryCard } from "@/components/ConceptMasteryCard";
import { InteractionTimeline } from "@/components/InteractionTimeline";
import { RecommendationCard } from "@/components/RecommendationCard";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type LearnerProfile } from "@/lib/api";

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="h-40 w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MasteryRing({ value }: { value: number }) {
  const percentage = Math.round(value);

  return (
    <div className="relative mx-auto h-44 w-44">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(hsl(var(--primary)) ${percentage * 3.6}deg, hsl(var(--muted)) 0deg)` }}
      />
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card text-center">
        <span className="text-4xl font-semibold text-foreground">{percentage}%</span>
        <span className="mt-1 text-xs font-medium uppercase text-muted-foreground">Overall mastery</span>
      </div>
    </div>
  );
}

export default function LearnerDashboard() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const auth = useRequireAuth("learner", { learnerId, allowIncompleteDiagnostic: true });
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.loading || auth.user?.role !== "learner" || auth.user.learner_id !== learnerId) return;
    api<LearnerProfile>(`/api/learners/${learnerId}/profile`)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, [auth.loading, auth.user, learnerId]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (auth.loading || !auth.user || !profile) return <DashboardSkeleton />;

  const concepts = Object.values(profile.concept_mastery);
  const weakCount = profile.weak_concepts.length;
  const developingCount = profile.developing_concepts.length;
  const masteredCount = profile.mastered_concepts.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge">{profile.current_level}</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">{profile.display_name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your dashboard updates after diagnostic, learning, tutor, and assessment activity.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/learner/${learnerId}/diagnostic`}>
              <ClipboardList className="h-4 w-4" />
              Run diagnostic
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Target} label="Overall mastery" value={`${Math.round(profile.overall_mastery)}%`} />
        <StatCard icon={BookOpen} label="Attempts" value={String(profile.attempts_count)} />
        <StatCard icon={Lightbulb} label="Hints used" value={String(profile.hint_count)} />
        <StatCard icon={Brain} label="Weak concepts" value={String(weakCount)} />
      </section>

      <div className="mt-6">
        <RecommendationCard learnerId={learnerId} text={profile.next_recommendation} />
      </div>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Mastery visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MasteryRing value={profile.overall_mastery} />
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-muted p-3">
                <p className="font-semibold text-destructive">{weakCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Weak</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="font-semibold text-amber-600">{developingCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Developing</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="font-semibold text-emerald-600">{masteredCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommended actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
              {profile.recommended_next_action || profile.next_recommendation || "No recommendation is available yet. Complete another activity to refresh this action."}
            </p>
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
              {profile.last_action_reason || "Complete an activity to generate a stronger action reason."}
            </p>
            {profile.detected_misconceptions.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.detected_misconceptions.map((item) => (
                  <span key={item} className="badge border-destructive/30 bg-destructive/10 text-destructive">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <span className="badge">No misconceptions detected yet</span>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-ink">Concept mastery</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each card reflects current score, label, and evidence count.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {concepts.map((concept) => <ConceptMasteryCard key={concept.concept_id} concept={concept} />)}
        </div>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionTimeline interactions={profile.recent_interactions} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
