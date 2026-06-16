import type { ConceptMastery } from "@/lib/api";
import { MasteryProgressBar } from "./MasteryProgressBar";

export function ConceptMasteryCard({ concept }: { concept: ConceptMastery }) {
  return (
    <article className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{concept.concept_id}</p>
          <h3 className="text-base font-semibold text-ink">{concept.concept_name}</h3>
        </div>
      </div>
      <MasteryProgressBar score={concept.score} label={concept.label} />
      <p className="mt-3 text-xs text-slate-500">{concept.evidence_count} evidence item(s)</p>
    </article>
  );
}
