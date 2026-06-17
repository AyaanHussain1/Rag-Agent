"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { login } from "@/lib/api";

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
      const learnerHome = user.learner_id ? `/learner/${user.learner_id}/dashboard` : "/learner";
      router.push(params.get("next") || (user.role === "educator" ? "/educator" : learnerHome));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section>
        <h1 className="text-3xl font-semibold text-ink">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Use a demo account or a registered competition user.</p>
        {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <form className="card mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <input className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input className="input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={loading}><LogIn className="h-4 w-4" /> {loading ? "Signing in..." : "Sign in"}</button>
          <p className="text-sm text-slate-600">No account yet? <Link className="text-teal-700" href="/register">Register</Link></p>
        </form>
      </section>

      <section className="card">
        <h2 className="font-semibold">Demo credentials</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <button className="w-full rounded-md border border-slate-200 p-3 text-left hover:border-teal-500" onClick={() => setEmail("beginner@learnshift.ai")}>
            <span className="block font-medium">Learner: beginner@learnshift.ai</span>
            <span>password123</span>
          </button>
          <button className="w-full rounded-md border border-slate-200 p-3 text-left hover:border-teal-500" onClick={() => setEmail("advanced@learnshift.ai")}>
            <span className="block font-medium">Learner: advanced@learnshift.ai</span>
            <span>password123</span>
          </button>
          <button className="w-full rounded-md border border-slate-200 p-3 text-left hover:border-teal-500" onClick={() => setEmail("educator@learnshift.ai")}>
            <span className="block font-medium">Educator: educator@learnshift.ai</span>
            <span>password123</span>
          </button>
        </div>
      </section>
    </div>
  );
}
