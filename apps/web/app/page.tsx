import { BarChart3, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Adaptive Java OOP learning prototype</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-ink md:text-5xl">LearnShift AI</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            A competition-ready tutor that changes explanations, hints, assessments, and educator alerts based on learner evidence.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/learner" className="btn btn-primary"><GraduationCap className="h-4 w-4" /> Start as Learner</Link>
            <Link href="/educator" className="btn"><BarChart3 className="h-4 w-4" /> Open Educator Dashboard</Link>
            <Link href="/safeguards" className="btn"><ShieldCheck className="h-4 w-4" /> Safeguard demo</Link>
            <Link href="/disclosure" className="btn"><ShieldCheck className="h-4 w-4" /> AI disclosure</Link>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold">What judges can see</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <p>Mastery changes after diagnostic and assessment attempts.</p>
            <p>Teaching action changes for weak, developing, and advanced learners.</p>
            <p>Every grounded explanation includes source chunk metadata.</p>
            <p>Educator alerts are generated from stored learner interactions.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
