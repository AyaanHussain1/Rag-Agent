import { ArrowRight, Brain } from "lucide-react";
import Link from "next/link";

export function RecommendationCard({ learnerId, text }: { learnerId: string; text: string }) {
  return (
    <section className="card border-teal-200">
      <div className="flex items-center gap-2 text-teal-800">
        <Brain className="h-5 w-5" />
        <h2 className="font-semibold">Recommended next action</h2>
      </div>
      <p className="mt-2 text-sm text-slate-700">{text}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="btn btn-primary" href={`/learner/${learnerId}/learn`}>Start learning <ArrowRight className="h-4 w-4" /></Link>
        <Link className="btn" href={`/learner/${learnerId}/assessment`}>Adaptive assessment</Link>
        <Link className="btn" href={`/learner/${learnerId}/tutor`}>Tutor mode</Link>
      </div>
    </section>
  );
}
