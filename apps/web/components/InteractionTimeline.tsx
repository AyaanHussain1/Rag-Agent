import type { Interaction } from "@/lib/api";

export function InteractionTimeline({ interactions }: { interactions?: Interaction[] }) {
  if (!interactions?.length) {
    return <p className="text-sm text-slate-500">No interactions recorded yet.</p>;
  }
  return (
    <div className="space-y-3">
      {interactions.map((item) => (
        <article key={item.interaction_id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-slate-800">{item.interaction_type} · {item.concept_id}</p>
            <p className="text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">{item.evidence_summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {typeof item.correct === "boolean" && <span className="badge">Correct: {item.correct ? "yes" : "no"}</span>}
            {item.confidence && <span className="badge">Confidence {item.confidence}/5</span>}
            <span className="badge">Hints {item.hints_used}</span>
            {item.misconception_id && <span className="badge border-rose-200 bg-rose-50 text-rose-700">{item.misconception_id}</span>}
            <span className="badge">{Math.round(item.mastery_before)} → {Math.round(item.mastery_after)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
