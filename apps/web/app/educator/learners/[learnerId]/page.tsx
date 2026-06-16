"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConceptMasteryCard } from "@/components/ConceptMasteryCard";
import { EducatorAlertCard } from "@/components/EducatorAlertCard";
import { InteractionTimeline } from "@/components/InteractionTimeline";
import { api, type LearnerProfile, type Interaction } from "@/lib/api";

type Detail = {
  profile: LearnerProfile;
  timeline: Interaction[];
  alerts: Parameters<typeof EducatorAlertCard>[0]["alert"][];
  recommended_intervention: string;
};

export default function EducatorLearnerDetail() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    api<Detail>(`/api/educator/learners/${learnerId}`).then(setDetail);
  }, [learnerId]);

  if (!detail) return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Loading learner evidence...</div>;
  const concepts = Object.values(detail.profile.concept_mastery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">{detail.profile.display_name}</h1>
      <p className="mt-2 text-sm text-slate-600">Recommended intervention: {detail.recommended_intervention}</p>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {concepts.map((concept) => <ConceptMasteryCard key={concept.concept_id} concept={concept} />)}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Evidence timeline</h2>
          <InteractionTimeline interactions={detail.timeline} />
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Alerts and misconceptions</h2>
          <div className="space-y-3">
            {detail.alerts.map((alert) => <EducatorAlertCard key={alert.alert_id} alert={alert} />)}
            {detail.alerts.length === 0 && <div className="card text-sm text-slate-600">No active alerts for this learner.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
