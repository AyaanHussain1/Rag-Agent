"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredToken, getCurrentUser, getStoredToken, logout as apiLogout, type AuthUser } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    if (!getStoredToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const current = await getCurrentUser();
      setUser(current);
      return current;
    } catch {
      clearStoredToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(() => ({ user, loading, refreshUser, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function useRequireAuth(role?: "learner" | "educator") {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (role && auth.user.role !== role) {
      router.replace(auth.user.role === "educator" ? "/educator" : "/learner");
    }
  }, [auth.loading, auth.user, pathname, role, router]);

  return auth;
}
