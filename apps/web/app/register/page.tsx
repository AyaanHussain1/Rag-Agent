"use client";

import { AlertCircle, BarChart3, GraduationCap, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { learnerHome, register } from "@/lib/api";
import { cn } from "@/lib/utils";

const roleOptions = [
  {
    value: "learner",
    label: "Learner",
    description: "Create a learner profile and start with diagnostics.",
    icon: GraduationCap
  },
  {
    value: "educator",
    label: "Educator",
    description: "Review learner evidence, alerts, and progress.",
    icon: BarChart3
  }
];

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("Fictional Learner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("learner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(name.trim(), email.trim(), password, role);
      await refreshUser(user);
      router.push(user.role === "educator" ? "/educator" : learnerHome(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
      <Card className="border-border/80 shadow-lg shadow-slate-900/5 dark:shadow-black/20">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Learner accounts get a new profile. Educators get immediate dashboard access.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to create account</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="name">
                  Name
                </label>
                <Input
                  id="name"
                  autoComplete="name"
                  minLength={2}
                  required
                  value={name}
                  disabled={loading}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  disabled={loading}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <fieldset className="space-y-3" disabled={loading}>
              <legend className="text-sm font-medium text-foreground">Role</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = role === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "cursor-pointer rounded-md border bg-background p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:border-primary/60 hover:bg-accent/10 hover:shadow-md hover:shadow-primary/10 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60 disabled:shadow-none",
                        selected && "border-primary bg-primary/10 ring-2 ring-ring/20"
                      )}
                      disabled={loading}
                      onClick={() => setRole(option.value)}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground",
                            selected && "bg-primary text-primary-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                      </span>
                      <span className="mt-3 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link className="font-medium text-primary hover:underline" href="/login">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <section>
        <span className="badge">JWT demo account</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Set up your adaptive learning workspace</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Register as a learner to generate a fresh profile, or join as an educator to inspect learner progress and alerts.
        </p>
        <div className="mt-8 grid gap-3">
          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Authentication stays local to the prototype API.</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Learners are routed into diagnostics before their dashboard.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
