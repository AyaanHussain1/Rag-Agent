"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { learnerHome, register } from "@/lib/api";

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
      const user = await register(name, email, password, role);
      await refreshUser();
      router.push(user.role === "educator" ? "/educator" : learnerHome(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-ink">Register</h1>
      <p className="mt-2 text-sm text-slate-600">Create a JWT-only demo account. Learner accounts get a new learner profile.</p>
      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <form className="card mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Name
          <input className="input mt-1" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input className="input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select className="input mt-1" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="learner">learner</option>
            <option value="educator">educator</option>
          </select>
        </label>
        <button className="btn btn-primary" disabled={loading}><UserPlus className="h-4 w-4" /> {loading ? "Creating..." : "Create account"}</button>
        <p className="text-sm text-slate-600">Already registered? <Link className="text-teal-700" href="/login">Login</Link></p>
      </form>
    </div>
  );
}
