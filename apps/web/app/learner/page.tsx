"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { learnerHome } from "@/lib/api";

export default function LearnerPage() {
  const auth = useRequireAuth("learner", { allowIncompleteDiagnostic: true });
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && auth.user?.role === "learner") {
      router.replace(learnerHome(auth.user));
    }
  }, [auth.loading, auth.user, router]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Skeleton className="h-32 w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
