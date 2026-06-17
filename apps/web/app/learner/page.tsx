"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/AuthProvider";
import { learnerHome } from "@/lib/api";

export default function LearnerPage() {
  const auth = useRequireAuth("learner", { allowIncompleteDiagnostic: true });
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && auth.user?.role === "learner") {
      router.replace(learnerHome(auth.user));
    }
  }, [auth.loading, auth.user, router]);

  return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Opening your learner dashboard...</div>;
}
