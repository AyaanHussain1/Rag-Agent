export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "learnshift_access_token";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "learner" | "educator";
  learner_id?: string | null;
  diagnostic_completed?: boolean | null;
  diagnostic_completed_at?: string | null;
};

export type AuthResponse = {
  access_token: string;
};

export type ConceptMastery = {
  concept_id: string;
  concept_name: string;
  score: number;
  label: "Weak" | "Developing" | "Mastered";
  evidence_count: number;
};

export type LearnerProfile = {
  learner_id: string;
  display_name: string;
  current_level: string;
  recommended_concept_id: string;
  overall_mastery: number;
  diagnostic_completed: boolean;
  diagnostic_completed_at?: string | null;
  recommended_next_action: string;
  concept_mastery: Record<string, ConceptMastery>;
  weak_concepts: ConceptMastery[];
  developing_concepts: ConceptMastery[];
  mastered_concepts: ConceptMastery[];
  attempts_count: number;
  hint_count: number;
  confidence_history: number[];
  detected_misconceptions: string[];
  last_action_reason: string;
  next_recommendation: string;
  recent_interactions?: Interaction[];
};

export type Interaction = {
  interaction_id: string;
  concept_id: string;
  interaction_type: string;
  question_id?: string;
  learner_answer?: string;
  correct?: boolean;
  confidence?: number;
  hints_used: number;
  misconception_id?: string;
  teaching_action?: string;
  mastery_before: number;
  mastery_after: number;
  evidence_summary: string;
  created_at: string;
};

export type Question = {
  question_id: string;
  concept_id: string;
  prompt: string;
  question_type: string;
  difficulty: string;
  options?: string[];
};

export type Source = {
  source_title: string;
  source_document?: string;
  chunk_id: string;
  concept_id: string;
  source_page?: string;
  similarity_score?: number;
  excerpt?: string;
};

export const concepts = [
  ["C001", "Classes and Objects"],
  ["C002", "Encapsulation"],
  ["C003", "Inheritance"],
  ["C004", "Method Overloading"],
  ["C005", "Method Overriding"],
  ["C006", "Polymorphism"]
] as const;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearStoredToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export async function login(email: string, password: string) {
  const response = await api<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setStoredToken(response.access_token);
  return getCurrentUser();
}

export async function register(name: string, email: string, password: string, role: string) {
  const response = await api<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role })
  });
  setStoredToken(response.access_token);
  return getCurrentUser();
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    clearStoredToken();
  }
}

export async function getCurrentUser() {
  return api<AuthUser>("/api/auth/me");
}

export const authenticatedFetch = api;

export function learnerHome(user: AuthUser) {
  if (user.role !== "learner" || !user.learner_id) return "/learner";
  return user.diagnostic_completed ? `/learner/${user.learner_id}/dashboard` : `/learner/${user.learner_id}/diagnostic`;
}

export function labelClass(label: string) {
  if (label === "Mastered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (label === "Weak") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}
