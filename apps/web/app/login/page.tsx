"use client";

import { AlertCircle, ArrowRight, GraduationCap, LoaderCircle, LogIn, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { learnerHome, login } from "@/lib/api";

const demoAccounts = [
  {
    email: "beginner@learnshift.ai",
    label: "Beginner learner",
    description: "Starts with more guided support.",
    icon: GraduationCap
  },
  {
    email: "advanced@learnshift.ai",
    label: "Advanced learner",
    description: "Shows stronger mastery signals.",
    icon: UserRound
  },
  {
    email: "educator@learnshift.ai",
    label: "Educator",
    description: "Opens class-level monitoring.",
    icon: ShieldCheck
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("beginner@learnshift.ai");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      await refreshUser();
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || (user.role === "educator" ? "/educator" : learnerHome(user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-12">
      <section className="order-2 lg:order-1">
        <div className="max-w-xl">
          <span className="badge">Secure prototype access</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Welcome back to LearnShift AI</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Continue as a learner or educator and jump straight into the adaptive Java OOP workflow.
          </p>
        </div>

        <Card className="mt-8 overflow-hidden bg-panel-gradient">
          <CardHeader>
            <CardTitle className="text-xl">Demo credentials</CardTitle>
            <CardDescription>Select an account to fill the email field. All demo users share the same password.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {demoAccounts.map((account) => {
              const Icon = account.icon;

              return (
                <button
                  key={account.email}
                  type="button"
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md border border-border bg-background/70 p-3 text-left transition-all duration-200 hover:scale-[1.01] hover:border-primary/60 hover:bg-accent/10 hover:shadow-md hover:shadow-primary/10"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("password123");
                  }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{account.label}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{account.email}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{account.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card className="order-1 border-border/80 shadow-lg shadow-slate-900/5 dark:shadow-black/20 lg:order-2">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use a demo account or a registered competition user.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to sign in</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button className="w-full" disabled={loading}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account yet?{" "}
              <Link className="font-medium text-primary hover:underline" href="/register">
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
