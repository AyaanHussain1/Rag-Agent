"use client";

import { AlertCircle, CheckCircle2, HelpCircle, LoaderCircle, Send, Shuffle, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { MasteryProgressBar } from "@/components/MasteryProgressBar";
import { useRequireAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, concepts, type LearnerProfile, type Question } from "@/lib/api";

type NextResponse = { question: Question; why_selected: string; matched_adaptation_rule_id?: string; profile: LearnerProfile };
type SubmitResponse = { correct?: boolean; feedback: string; safeguard?: boolean; matched_adaptation_rule_id?: string; profile: LearnerProfile };
type HintResponse = { hint: string; hint_count: number; exhausted: boolean; profile: LearnerProfile };

export default function AssessmentPage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const auth = useRequireAuth("learner", { learnerId });
  const [conceptId, setConceptId] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [why, setWhy] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [hintCount, setHintCount] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackRuleId, setFeedbackRuleId] = useState("");
  const [error, setError] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  async function nextQuestion() {
    if (auth.user?.learner_id !== learnerId || !auth.user.diagnostic_completed) return;
    setError("");
    setQuestionLoading(true);
    try {
      const response = await api<NextResponse>("/api/assessment/next", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, concept_id: conceptId || null })
      });
      setQuestion(response.question);
      setWhy(response.why_selected);
      setRuleId(response.matched_adaptation_rule_id || "");
      setProfile(response.profile);
      setAnswer("");
      setFeedback("");
      setFeedbackRuleId("");
      setHintCount(0);
      setHints([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the next question");
    } finally {
      setQuestionLoading(false);
    }
  }

  async function getHint() {
    if (auth.user?.learner_id !== learnerId || !auth.user.diagnostic_completed) return;
    if (!question || hintCount >= 3) return;
    setError("");
    setHintLoading(true);
    try {
      const response = await api<HintResponse>("/api/hints/next", {
        method: "POST",
        body: JSON.stringify({ learner_id: learnerId, question_id: question.question_id, current_hint_count: hintCount })
      });
      setHintCount(response.hint_count);
      setHints((prev) => [...prev, response.hint]);
      setProfile(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load a hint");
    } finally {
      setHintLoading(false);
    }
  }

  async function submit() {
    if (auth.user?.learner_id !== learnerId || !auth.user.diagnostic_completed || !question) return;
    setError("");
    setSubmitLoading(true);
    try {
      const response = await api<SubmitResponse>("/api/assessment/submit", {
        method: "POST",
        body: JSON.stringify({
          learner_id: learnerId,
          question_id: question.question_id,
          learner_answer: answer,
          confidence,
          hints_used: hintCount
        })
      });
      setFeedback(response.feedback);
      setFeedbackRuleId(response.matched_adaptation_rule_id || "");
      setProfile(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the answer");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (auth.loading || !auth.user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-36 w-full" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-lg border border-border bg-panel-gradient p-6 shadow-sm">
        <span className="badge">Adaptive assessment</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Practice with evidence-aware questions</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Questions respond to repeated errors, confidence, hint usage, and mastery. Hints are limited so every attempt still produces useful evidence.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Assessment issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question selector</CardTitle>
              <CardDescription>Use the recommendation or target a concept.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="text-sm font-medium text-foreground" htmlFor="concept">
                Concept
              </label>
              <select
                id="concept"
                className="input mt-2"
                value={conceptId}
                disabled={questionLoading}
                onChange={(event) => setConceptId(event.target.value)}
              >
                <option value="">Use recommendation</option>
                {concepts.map(([id, name]) => (
                  <option key={id} value={id}>
                    {id} {name}
                  </option>
                ))}
              </select>
              <Button className="mt-4 w-full" onClick={nextQuestion} disabled={questionLoading}>
                {questionLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                {questionLoading ? "Loading question..." : "Get next question"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hint system</CardTitle>
              <CardDescription>{hintCount}/3 hints used for this question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hints.length ? (
                hints.map((hint, index) => (
                  <div key={`${hint}-${index}`} className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-6">
                    <span className="font-medium text-foreground">Hint {index + 1}:</span> {hint}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Ask for a hint after loading a question. Each hint updates learner evidence.
                </div>
              )}
            </CardContent>
          </Card>

          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mastery snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <MasteryProgressBar
                  score={profile.overall_mastery}
                  label={profile.overall_mastery >= 70 ? "Mastered" : profile.overall_mastery < 40 ? "Weak" : "Developing"}
                />
                <p className="mt-3 text-sm text-muted-foreground">Total hints used: {profile.hint_count}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {questionLoading && <Skeleton className="h-96 w-full" />}
          {!question && !questionLoading && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">Choose a question to begin.</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">The next card will show the prompt, selection reason, confidence slider, hints, and feedback.</p>
              </CardContent>
            </Card>
          )}
          {question && !questionLoading && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <span className="badge">{question.concept_id}</span>
                  <span className="badge">{question.difficulty}</span>
                  <span className="badge">{question.question_type}</span>
                </div>
                <CardTitle className="text-lg leading-7">{question.prompt}</CardTitle>
              </CardHeader>
              <CardContent>
                {question.options && (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {question.options.map((option) => (
                      <p key={option} className="rounded-md border border-border bg-background px-3 py-2">
                        {option}
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                  <span className="font-medium">Why selected:</span> {why} {ruleId ? `(${ruleId})` : ""}
                </div>
                <Textarea
                  className="mt-4 min-h-32"
                  value={answer}
                  disabled={submitLoading}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Try an answer, or test safeguard by typing 'just give me the answer'."
                />
                <label className="mt-4 block text-sm font-medium text-foreground">
                  <span className="flex items-center justify-between">
                    <span>Confidence</span>
                    <span className="badge">{confidence}/5</span>
                  </span>
                  <input className="mt-3 w-full accent-primary" type="range" min={1} max={5} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={getHint} disabled={hintLoading || hintCount >= 3}>
                    {hintLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
                    {hintLoading ? "Loading hint..." : `Hint ${hintCount}/3`}
                  </Button>
                  <Button onClick={submit} disabled={submitLoading || !answer.trim()}>
                    {submitLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitLoading ? "Submitting..." : "Submit answer"}
                  </Button>
                </div>
                {feedback && (
                  <Alert className="mt-4 border-primary/30 bg-primary/10">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Feedback</AlertTitle>
                    <AlertDescription>{feedbackRuleId ? `[${feedbackRuleId}] ` : ""}{feedback}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
