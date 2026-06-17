"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-normal text-ink">LearnShift AI</Link>
        <nav className="flex items-center gap-3 text-sm text-slate-600">
          <Link href="/learner" className="hover:text-teal-700">Learner</Link>
          <Link href="/educator" className="hover:text-teal-700">Educator</Link>
          <Link href="/safeguards" className="hover:text-teal-700">Safeguards</Link>
          <Link href="/disclosure" className="hover:text-teal-700">Disclosure</Link>
          {user ? (
            <span className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs">
              <UserRound className="h-3.5 w-3.5" />
              <span>{user.name}</span>
              <span className="badge py-0.5">{user.role}</span>
              <button className="text-slate-500 hover:text-rose-700" onClick={handleLogout} title="Log out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <Link href="/login" className="hover:text-teal-700">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
