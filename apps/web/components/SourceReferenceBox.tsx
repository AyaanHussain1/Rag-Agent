import { BookOpen } from "lucide-react";
import type { Source } from "@/lib/api";

export function SourceReferenceBox({ sources }: { sources?: Source[] }) {
  if (!sources?.length) return null;
  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-800">
        <BookOpen className="h-4 w-4" />
        Source references
      </div>
      <div className="grid gap-2 text-sm text-teal-950">
        {sources.map((source) => (
          <div key={`${source.chunk_id}-${source.concept_id}`} className="rounded-md bg-white/70 p-3">
            <p>{source.source_title}</p>
            <p className="text-xs text-teal-800">
              Chunk {source.chunk_id} · Concept {source.concept_id}
              {source.source_page ? ` · Page ${source.source_page}` : ""}
              {source.similarity_score ? ` · confidence ${source.similarity_score}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
