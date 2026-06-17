import { BookOpen } from "lucide-react";
import type { Source } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

export function SourceReferenceBox({ sources }: { sources?: Source[] }) {
  if (!sources?.length) return null;
  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <BookOpen className="h-4 w-4" />
          Source references
        </div>
        <div className="grid gap-2 text-sm">
          {sources.map((source) => (
            <div key={`${source.chunk_id}-${source.concept_id}`} className="rounded-md border border-border bg-background/80 p-3">
              <p className="font-medium text-foreground">{source.source_title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Chunk {source.chunk_id} / Concept {source.concept_id}
                {source.source_page ? ` / Section ${source.source_page}` : ""}
                {source.source_document ? ` / ${source.source_document}` : ""}
                {source.similarity_score ? ` / confidence ${source.similarity_score}` : ""}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
