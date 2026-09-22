// "Try it live" client (Francis, 2026-09-21) — talks to Explain.Api's Features/TryOut. Public and anonymous; every call is capped
// server-side (per visitor and per day), so a `capped` reply is a normal outcome to show kindly, not an error.
import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface TryOutStart {
  subject: string;
  interviewer: 'hr' | 'technical';
  interviewerName: string;
  questions: string[];
  avatarAvailable: boolean;
  ticket: string | null;
  unlimited?: boolean;   // true when the signed-in user is staff (or on an allow-listed address): no limits apply
}

export interface TryOutFeedback {
  overall: number;
  headline: string | null;
  dimensions: { clarity: number; relevance: number; accuracy: number; depth: number; confidence: number };
  questions: { score: number; feedback: string | null; strongerAnswer: string | null }[];
  nextStep: string | null;
}

export interface TryOutCoaching { coaching: string; score: number }

export type TryOutResult<T> = { ok: true; data: T } | { ok: false; capped: boolean; message: string };

async function post<T>(path: string, body: unknown): Promise<TryOutResult<T>> {
  try {
    // A signed-in visitor sends their token, so staff (the founder, demoing anywhere) are recognised and never limited; everyone else stays anonymous.
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({})) as { error?: string; message?: string; capped?: boolean };
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, capped: !!json.capped, message: json.message ?? json.error ?? "Something went wrong — please try again." };
  } catch {
    return { ok: false, capped: false, message: "We couldn't reach the server — please check your connection and try again." };
  }
}

export const startTryOut = (topic: string) => post<TryOutStart>('/api/tryout/start', { topic });
export const scoreTryOut = (topic: string, answers: { question: string; answer: string }[], name: string) => post<TryOutFeedback>('/api/tryout/feedback', { topic, answers, name });
export const coachTryOut = (topic: string, question: string, answer: string, name: string) => post<TryOutCoaching>('/api/tryout/coach', { topic, question, answer, name });
