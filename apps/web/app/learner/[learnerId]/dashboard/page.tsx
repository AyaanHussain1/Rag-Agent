"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConceptMasteryCard } from "@/components/ConceptMasteryCard";
import { InteractionTimeline } from "@/components/InteractionTimeline";
import { RecommendationCard } from "@/components/RecommendationCard";
import { useRequireAuth } from "@/components/AuthProvider";
import { api, type LearnerProfile } from "@/lib/api";

export default function LearnerDashboard() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const auth = useRequireAuth("learner", { learnerId });
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.loading || auth.user?.role !== "learner" || auth.user.learner_id !== learnerId || !auth.user.diagnostic_completed) return;
    api<LearnerProfile>(`/api/learners/${learnerId}/profile`)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, [auth.loading, auth.user, learnerId]);

  if (auth.loading || !auth.user) return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Checking login...</div>;
  if (error) return <div className="mx-auto max-w-4xl px-4 py-8 text-rose-700">{error}</div>;
  if (!profile) return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Loading profile...</div>;

  const concepts = Object.values(profile.concept_mastery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{profile.display_name}</h1>
          <p className="mt-2 text-sm text-slate-600">{profile.current_level} · Overall mastery {Math.round(profile.overall_mastery)}%</p>
        </div>
        <Link className="btn" href={`/learner/${learnerId}/diagnostic`}><ClipboardList className="h-4 w-4" /> Run diagnostic</Link>
      </div>

      <div className="mt-6">
        <RecommendationCard learnerId={learnerId} text={profile.next_recommendation} />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {concepts.map((concept) => <ConceptMasteryCard key={concept.concept_id} concept={concept} />)}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="card">
          <h2 className="font-semibold">Learner evidence</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <p>Attempts: {profile.attempts_count}</p>
            <p>Hint usage: {profile.hint_count}</p>
            <p>Misconceptions: {profile.detected_misconceptions.length ? profile.detected_misconceptions.join(", ") : "None yet"}</p>
            <p>Last change: {profile.last_action_reason || "No profile-changing interaction yet."}</p>
          </div>
        </div>
        <div className="card">
          <h2 className="mb-4 font-semibold">Recent interactions</h2>
          <InteractionTimeline interactions={profile.recent_interactions} />
        </div>
      </section>
    </div>
  );
}
