import { CheckCircle2, Clock3, HelpCircle, XCircle } from "lucide-react";
import type { Interaction } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

export function InteractionTimeline({ interactions }: { interactions?: Interaction[] }) {
  if (!interactions?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
        <Clock3 className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">No interactions recorded yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Learning, tutor, and assessment events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
      {interactions.map((item) => {
        const CorrectIcon = typeof item.correct !== "boolean" ? HelpCircle : item.correct ? CheckCircle2 : XCircle;

        return (
          <article key={item.interaction_id} className="relative pl-10">
            <span className="absolute left-0 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
              <CorrectIcon className="h-4 w-4" />
            </span>
            <Card className="transition hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {item.interaction_type} <span className="text-muted-foreground">/</span> {item.concept_id}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.evidence_summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {typeof item.correct === "boolean" && <span className="badge">Correct: {item.correct ? "yes" : "no"}</span>}
                  {item.confidence && <span className="badge">Confidence {item.confidence}/5</span>}
                  <span className="badge">Hints {item.hints_used}</span>
                  {item.misconception_id && (
                    <span className="badge border-destructive/30 bg-destructive/10 text-destructive">{item.misconception_id}</span>
                  )}
                  <span className="badge">{Math.round(item.mastery_before)} to {Math.round(item.mastery_after)}%</span>
                </div>
              </CardContent>
            </Card>
          </article>
        );
      })}
    </div>
  );
}
