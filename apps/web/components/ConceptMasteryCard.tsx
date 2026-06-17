import type { ConceptMastery } from "@/lib/api";
import { MasteryProgressBar } from "./MasteryProgressBar";
import { Card, CardContent } from "@/components/ui/card";

export function ConceptMasteryCard({ concept }: { concept: ConceptMastery }) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">{concept.concept_id}</p>
            <h3 className="mt-1 text-base font-semibold text-ink">{concept.concept_name}</h3>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {concept.evidence_count} evidence
          </span>
        </div>
      <MasteryProgressBar score={concept.score} label={concept.label} />
      </CardContent>
    </Card>
  );
}
