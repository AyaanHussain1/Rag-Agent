"use client";

import { AlertTriangle, ClipboardList, Target } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConceptMasteryCard } from "@/components/ConceptMasteryCard";
import { EducatorAlertCard } from "@/components/EducatorAlertCard";
import { InteractionTimeline } from "@/components/InteractionTimeline";
import { MasteryProgressBar } from "@/components/MasteryProgressBar";
import { useRequireAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type LearnerProfile, type Interaction } from "@/lib/api";

type Detail = {
  profile: LearnerProfile;
  timeline: Interaction[];
  alerts: Parameters<typeof EducatorAlertCard>[0]["alert"][];
  recommended_intervention: string;
};

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="h-36 w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
      </div>
      <Skeleton className="mt-6 h-96 w-full" />
    </div>
  );
}

export default function EducatorLearnerDetail() {
  const auth = useRequireAuth("educator");
  const { learnerId } = useParams<{ learnerId: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    if (auth.loading || auth.user?.role !== "educator") return;
    api<Detail>(`/api/educator/learners/${learnerId}`).then(setDetail);
  }, [auth.loading, auth.user, learnerId]);

  if (auth.loading || !auth.user || auth.user.role !== "educator" || !detail) return <DetailSkeleton />;

  const concepts = Object.values(detail.profile.concept_mastery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <span className="badge">Learner evidence</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">{detail.profile.display_name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Recommended intervention: {detail.recommended_intervention}</p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Overall mastery</p>
                <p className="text-2xl font-semibold">{Math.round(detail.profile.overall_mastery)}%</p>
              </div>
            </div>
            <div className="mt-4">
              <MasteryProgressBar
                score={detail.profile.overall_mastery}
                label={detail.profile.overall_mastery >= 70 ? "Mastered" : detail.profile.overall_mastery < 40 ? "Weak" : "Developing"}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Timeline events</p>
              <p className="text-2xl font-semibold">{detail.timeline.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Active alerts</p>
              <p className="text-2xl font-semibold">{detail.alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-xl font-semibold text-ink">Concept mastery</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {concepts.map((concept) => <ConceptMasteryCard key={concept.concept_id} concept={concept} />)}
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evidence timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionTimeline interactions={detail.timeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alerts and misconceptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.alerts.map((alert) => <EducatorAlertCard key={alert.alert_id} alert={alert} />)}
            {detail.alerts.length === 0 && <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No active alerts for this learner.</div>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
