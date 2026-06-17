"use client";

import { AlertCircle, Bell, Brain, Database, FileText, LoaderCircle, RefreshCcw, Sparkles, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EducatorAlertCard } from "@/components/EducatorAlertCard";
import { MasteryProgressBar } from "@/components/MasteryProgressBar";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

type Overview = {
  learner_count: number;
  overall_class_mastery: number;
  concept_difficulty_summary: { concept_id: string; concept_name: string; average_mastery: number; weak_count: number }[];
  recurring_misconceptions: [string, number][];
  learners: { learner_id: string; display_name: string; current_level: string; overall_mastery: number; next_recommendation: string }[];
  recommended_actions: string[];
};

type EducatorAlert = Parameters<typeof EducatorAlertCard>[0]["alert"];
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

function EducatorSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="h-40 w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)}
      </div>
      <Skeleton className="mt-6 h-96 w-full" />
    </div>
  );
}

function AnalyticsCard({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EducatorPage() {
  const auth = useRequireAuth("educator");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<EducatorAlert[]>([]);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [error, setError] = useState("");
  const [gemini, setGemini] = useState<GeminiDiag | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
        error: err instanceof Error ? err.message : "request failed"
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
        api<EducatorAlert[]>("/api/educator/alerts"),
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
    setSeeding(true);
    try {
      await api("/api/demo/seed", { method: "POST" });
      await load();
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    if (!auth.loading && auth.user?.role === "educator") load();
  }, [auth.loading, auth.user]);

  if (auth.loading || !auth.user || auth.user.role !== "educator") return <EducatorSkeleton />;
  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load educator dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!overview) return <EducatorSkeleton />;

  const weakConcepts = overview.concept_difficulty_summary.reduce((total, concept) => total + concept.weak_count, 0);
  const groundedLogs = aiLogs.filter((log) => log.source_grounding_used).length;
  const safeguardLogs = aiLogs.filter((log) => log.safeguard_triggered).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge">Educator workspace</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Class analytics and intervention signals</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Analytics are calculated from stored prototype interactions, alerts, misconceptions, and AI usage logs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={testGemini} disabled={testingGemini}>
              {testingGemini ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {testingGemini ? "Testing..." : "Test Gemini key"}
            </Button>
            <Button variant="outline" onClick={seedAndLoad} disabled={seeding}>
              {seeding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {seeding ? "Seeding..." : "Seed demo data"}
            </Button>
          </div>
        </div>
      </section>

      {gemini && (
        <Alert className="mt-5">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Gemini key test: {gemini.status.toUpperCase()}</AlertTitle>
          <AlertDescription>
            {gemini.detail} / {gemini.model_name} / {gemini.api_key_present ? "key present" : "no key"} /{" "}
            {gemini.client_initialized ? "client ready" : "client not built"}
            {gemini.sample_response ? ` / ${gemini.sample_response}` : ""}
            {gemini.error ? ` / ${gemini.error}` : ""}
          </AlertDescription>
        </Alert>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard icon={Users} label="Learners" value={String(overview.learner_count)} detail="Profiles in demo cohort" />
        <AnalyticsCard icon={TrendingUp} label="Class mastery" value={`${Math.round(overview.overall_class_mastery)}%`} detail="Average current mastery" />
        <AnalyticsCard icon={Bell} label="Alerts" value={String(alerts.length)} detail="Active intervention signals" />
        <AnalyticsCard icon={Brain} label="Weak signals" value={String(weakConcepts)} detail="Weak concept counts" />
      </section>

      <Tabs defaultValue="analytics" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
          <TabsTrigger value="logs">AI logs</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Class mastery</CardTitle>
                <CardDescription>Overall class mastery across the cohort.</CardDescription>
              </CardHeader>
              <CardContent>
                <MasteryProgressBar
                  score={overview.overall_class_mastery}
                  label={overview.overall_class_mastery >= 70 ? "Mastered" : overview.overall_class_mastery < 40 ? "Weak" : "Developing"}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Concept difficulty summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.concept_difficulty_summary.map((concept) => (
                  <div key={concept.concept_id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{concept.concept_id} {concept.concept_name}</span>
                      <span className="text-muted-foreground">{concept.weak_count} weak</span>
                    </div>
                    <MasteryProgressBar
                      score={concept.average_mastery}
                      label={concept.average_mastery >= 70 ? "Mastered" : concept.average_mastery < 40 ? "Weak" : "Developing"}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learners">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Learner table</CardTitle>
              <CardDescription>Open a learner to inspect evidence and alerts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4 font-medium">Learner</th>
                      <th className="py-3 pr-4 font-medium">Level</th>
                      <th className="py-3 pr-4 font-medium">Mastery</th>
                      <th className="py-3 pr-4 font-medium">Recommendation</th>
                      <th className="py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {overview.learners.map((learner) => (
                      <tr key={learner.learner_id} className="hover:bg-muted/40">
                        <td className="py-3 pr-4 font-medium text-foreground">{learner.display_name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{learner.current_level}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{Math.round(learner.overall_mastery)}%</td>
                        <td className="max-w-md py-3 pr-4 text-muted-foreground">{learner.next_recommendation}</td>
                        <td className="py-3">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/educator/learners/${learner.learner_id}`}>Open</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid gap-3">
            {alerts.map((alert) => <EducatorAlertCard key={alert.alert_id} alert={alert} />)}
            {alerts.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">No active alerts yet.</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="misconceptions">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recurring misconceptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.recurring_misconceptions.length ? overview.recurring_misconceptions.map(([id, count]) => (
                  <div key={id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                    <span className="font-medium text-foreground">{id}</span>
                    <span className="badge">{count} occurrence(s)</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">None detected yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommended educator actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.recommended_actions.length ? overview.recommended_actions.map((action) => (
                  <div key={action} className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                    {action}
                  </div>
                )) : (
                  <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No recommendations yet. Seed demo data or wait for more learner evidence.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                AI usage log
              </CardTitle>
              <CardDescription>{groundedLogs} grounded calls / {safeguardLogs} safeguard events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiLogs.slice(0, 12).map((log) => (
                <div key={log.log_id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge">{log.feature_area}</span>
                    <span className="badge"><Database className="h-3 w-3" /> {log.model_name}</span>
                    {log.source_grounding_used && <span className="badge border-primary/30 bg-primary/10 text-primary">grounded</span>}
                    {log.safeguard_triggered && <span className="badge border-destructive/30 bg-destructive/10 text-destructive">safeguard</span>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</p>
                  <p className="mt-1 text-muted-foreground">{log.prompt_summary}</p>
                </div>
              ))}
              {aiLogs.length === 0 && <p className="text-sm text-muted-foreground">No AI usage logs yet. Seed demo data or run tutor, teach, and safeguard flows.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
