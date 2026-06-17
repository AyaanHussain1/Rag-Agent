import { labelClass } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MasteryProgressBar({ score, label }: { score: number; label: string }) {
  const value = Math.max(4, Math.min(100, score));
  const tone =
    label === "Mastered"
      ? "from-emerald-500 to-emerald-600"
      : label === "Weak"
        ? "from-rose-500 to-rose-600"
        : "from-amber-400 to-amber-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`badge ${labelClass(label)}`}>{label}</span>
        <span className="font-medium text-foreground">{Math.round(score)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", tone)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
