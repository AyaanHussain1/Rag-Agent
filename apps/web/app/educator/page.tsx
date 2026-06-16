"use client";

import { RefreshCcw, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EducatorAlertCard } from "@/components/EducatorAlertCard";
import { MasteryProgressBar } from "@/components/MasteryProgressBar";
import { api } from "@/lib/api";

type Overview = {
  learner_count: number;
  overall_class_mastery: number;
  concept_difficulty_summary: { concept_id: string; concept_name: string; average_mastery: number; weak_count: number }[];
  recurring_misconceptions: [string, number][];
  learners: { learner_id: string; display_name: string; current_level: string; overall_mastery: number; next_recommendation: string }[];
  recommended_actions: string[];
};

type Alert = Parameters<typeof EducatorAlertCard>[0]["alert"];
type AILog = {
  log_id: string;
  timestamp: string;
  feature_area: string;
  model_name: string;
  prompt_summary: string;
  source_grounding_used: boolean;
  safeguard_triggered: boolean;
};

type GeminiDiag = {
  status: "ok" | "error" | "no_key" | "client_unavailable";
  detail: string;
  model_name: string;
  api_key_present: boolean;
  client_initialized: boolean;
  sample_response?: string;
  error?: string;
};

export default function EducatorPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [error, setError] = useState("");
  const [gemini, setGemini] = useState<GeminiDiag | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);

  async function testGemini() {
    setTestingGemini(true);
    setGemini(null);
    try {
      setGemini(await api<GeminiDiag>("/api/diag/gemini"));
    } catch (err) {
      setGemini({
        status: "error",
        detail: "Could not reach the diagnostic endpoint.",
        model_name: "unknown",
        api_key_present: false,
        client_initialized: false,
        error: err instanceof Error ? err.message : "request failed",
      });
    } finally {
      setTestingGemini(false);
    }
  }

  async function load() {
    setError("");
    try {
      const [overviewData, alertData, aiLogData] = await Promise.all([
        api<Overview>("/api/educator/overview"),
        api<Alert[]>("/api/educator/alerts"),
        api<AILog[]>("/api/educator/ai-logs")
      ]);
      setOverview(overviewData);
      setAlerts(alertData);
      setAiLogs(aiLogData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load educator data");
    }
  }

  async function seedAndLoad() {
    await api("/api/demo/seed", { method: "POST" });
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="mx-auto max-w-4xl px-4 py-8 text-rose-700">{error}</div>;
  if (!overview) return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Loading educator dashboard...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Educator dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Analytics are calculated from stored prototype interactions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={testGemini} disabled={testingGemini}>
            <Sparkles className="h-4 w-4" /> {testingGemini ? "Testing Gemini..." : "Test Gemini key"}
          </button>
          <button className="btn" onClick={seedAndLoad}><RefreshCcw className="h-4 w-4" /> Seed demo data</button>
        </div>
      </div>

      {gemini && (
        <div
          className={`card mt-4 border ${
            gemini.status === "ok"
              ? "border-teal-300 bg-teal-50"
              : gemini.status === "error"
              ? "border-rose-300 bg-rose-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Gemini key test:</span>
            <span className="badge">{gemini.status.toUpperCase()}</span>
            <span className="badge">{gemini.model_name}</span>
            <span className="badge">{gemini.api_key_present ? "key present" : "no key"}</span>
            <span className="badge">{gemini.client_initialized ? "client ready" : "client not built"}</span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{gemini.detail}</p>
          {gemini.sample_response && (
            <p className="mt-1 text-sm text-slate-600">Live response: <span className="font-mono">{gemini.sample_response}</span></p>
          )}
          {gemini.error && <p className="mt-1 text-sm font-mono text-rose-700">{gemini.error}</p>}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card"><p className="text-sm text-slate-500">Learners</p><p className="mt-2 text-3xl font-semibold">{overview.learner_count}</p></div>
        <div className="card md:col-span-2"><p className="mb-3 text-sm text-slate-500">Class mastery</p><MasteryProgressBar score={overview.overall_class_mastery} label={overview.overall_class_mastery >= 70 ? "Mastered" : overview.overall_class_mastery < 40 ? "Weak" : "Developing"} /></div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="card">
          <h2 className="font-semibold">Learners</h2>
          <div className="mt-4 space-y-3">
            {overview.learners.map((learner) => (
              <Link key={learner.learner_id} href={`/educator/learners/${learner.learner_id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-teal-500">
                <span className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-teal-700" />
                  <span>
                    <span className="block font-medium">{learner.display_name}</span>
                    <span className="text-xs text-slate-500">{learner.current_level} - {Math.round(learner.overall_mastery)}%</span>
                  </span>
                </span>
                <span className="badge">Open</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold">Concept difficulty summary</h2>
          <div className="mt-4 space-y-3">
            {overview.concept_difficulty_summary.map((concept) => (
              <div key={concept.concept_id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between text-sm"><span>{concept.concept_id} {concept.concept_name}</span><span>{concept.weak_count} weak</span></div>
                <div className="mt-2"><MasteryProgressBar score={concept.average_mastery} label={concept.average_mastery >= 70 ? "Mastered" : concept.average_mastery < 40 ? "Weak" : "Developing"} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Alerts</h2>
          <div className="space-y-3">{alerts.map((alert) => <EducatorAlertCard key={alert.alert_id} alert={alert} />)}</div>
          {alerts.length === 0 && <div className="card text-sm text-slate-600">No active alerts yet.</div>}
        </div>
        <div className="space-y-5">
          <div className="card">
            <h2 className="font-semibold">Recurring misconceptions</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {overview.recurring_misconceptions.length ? overview.recurring_misconceptions.map(([id, count]) => <p key={id}>{id}: {count} occurrence(s)</p>) : <p>None detected yet.</p>}
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold">Recommended educator actions</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">{overview.recommended_actions.map((action) => <p key={action}>{action}</p>)}</div>
          </div>
          <div className="card">
            <h2 className="font-semibold">AI usage log</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {aiLogs.slice(0, 8).map((log) => (
                <div key={log.log_id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge">{log.feature_area}</span>
                    <span className="badge">{log.model_name}</span>
                    {log.source_grounding_used && <span className="badge border-teal-200 bg-teal-50 text-teal-800">grounded</span>}
                    {log.safeguard_triggered && <span className="badge border-rose-200 bg-rose-50 text-rose-700">safeguard</span>}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</p>
                  <p className="mt-1">{log.prompt_summary}</p>
                </div>
              ))}
              {aiLogs.length === 0 && <p>No AI usage logs yet. Seed demo data or run tutor, teach, and safeguard flows.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
