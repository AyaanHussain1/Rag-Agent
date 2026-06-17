import { ArrowRight, Brain, ClipboardCheck, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RecommendationCard({ learnerId, text }: { learnerId: string; text: string }) {
  const recommendation = text?.trim() || "No recommendation is available yet. Complete a learning, tutor, or assessment activity to generate the next action.";

  return (
    <Card className="overflow-hidden border-primary/30 bg-hero-gradient text-primary-foreground">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h2 className="font-semibold">Recommended next action</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/85">{recommendation}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/learner/${learnerId}/learn`}>
                Start learning
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={`/learner/${learnerId}/assessment`}>
                <ClipboardCheck className="h-4 w-4" />
                Assessment
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={`/learner/${learnerId}/tutor`}>
                <MessagesSquare className="h-4 w-4" />
                Tutor
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
