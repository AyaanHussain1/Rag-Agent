import { labelClass } from "@/lib/api";

export function MasteryProgressBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`badge ${labelClass(label)}`}>{label}</span>
        <span className="font-medium text-slate-700">{Math.round(score)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={label === "Mastered" ? "h-full bg-emerald-600" : label === "Weak" ? "h-full bg-rose-600" : "h-full bg-amber-500"}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}
