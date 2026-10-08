// "Try it live" client (Francis, 2026-09-21) — talks to Explain.Api's Features/TryOut. Public and anonymous; every call is capped
// server-side (per visitor and per day), so a `capped` reply is a normal outcome to show kindly, not an error.
import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface TryOutStart {
  subject: string;
  interviewer: 'hr' | 'technical';
  interviewerName: string;
  /** Registry id of whoever is interviewing (the choice, else the seat's default); its portrait is the photo shown when the live face is off. */
  interviewerId?: string | null;
  /** Their uploaded portrait (a path on the API), if one has been added in Admin > Interviewers. */
  interviewerPortraitUrl?: string | null;
  /** The interviewer the visitor chose (their voice, photo and personality); absent or null for the default, Wayne. */
  chosenInterviewer?: { id: string; displayName: string; role: 'hr' | 'technical'; avatarId: string; description: string; traits: { depth: number; strictness: number; warmth: number; humour: number; pace: number } } | null;
  questions: string[];
  // A greeting written in the visitor's language with {name} / {interviewer} placeholders; null for English (the page then uses its own greeting).
  intro?: string | null;
  // A short spoken privacy reassurance in the visitor's language, said before question 1; null for English (the page has its own English line).
  privacy?: string | null;
  /** The Guardian Angel's short spoken links between questions, in the interview language (absent for English — the page's own wording is used). */
  transitions?: { first?: string | null; next?: string | null; skipped?: string | null; finish?: string | null } | null;
  avatarAvailable: boolean;
  // Which service draws the avatar for this visitor (admin setting). Absent on older servers = HeyGen.
  avatarProvider?: 'heygen' | 'spatius';
  spatiusAvatarId?: string | null;
  // If Spatius can't start, quietly use HeyGen instead of voice-only.
  fallbackToHeygen?: boolean;
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
export interface TryOutModelAnswer { answer: string }

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

// What the visitor chose on the form (2026-09-30): the interview language (one of the 32), the question difficulty, and their country (ISO code).
// The server validates all three and quietly falls back to English / Standard / no country, so an old link or a tampered value can't break anything.
export interface TryOutOptions { language: string; difficulty: string; country: string }

export const startTryOut = (topic: string, options: TryOutOptions, avoid: string[] = [], interviewerId?: string) =>
  post<TryOutStart>('/api/tryout/start', { topic, language: options.language, difficulty: options.difficulty, country: options.country || null, avoid, interviewerId: interviewerId || null });
export const scoreTryOut = (topic: string, answers: { question: string; answer: string }[], name: string, language: string, asked: number) =>
  post<TryOutFeedback>('/api/tryout/feedback', { topic, answers, name, language, asked });
export const modelAnswerTryOut = (topic: string, question: string, language: string) =>
  post<TryOutModelAnswer>('/api/tryout/answer', { topic, question, language });
export const coachTryOut = (topic: string, question: string, answer: string, name: string, language: string) =>
  post<TryOutCoaching>('/api/tryout/coach', { topic, question, answer, name, language });

/** The visitor's country (ISO code) for pre-selecting the dropdown; null if it can't be worked out or the call fails — never throws. */
export async function getVisitorCountry(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/tryout/country`);
    if (!res.ok) return null;
    const json = await res.json() as { country?: string | null };
    return json.country ?? null;
  } catch { return null; }
}
// "Email me my score" (2026-09-30) — one transactional email with the visitor's own score; the tips opt-in is a separate, unticked choice.
export const emailTryOutScore = (body: { email: string; name: string; subject: string; score: number; strongest: string | null; weakest: string | null; tipsOptIn: boolean }) =>
  post<{ sent: boolean }>('/api/tryout/email-score', body);

// The questions this browser has already been asked, per subject (2026-10-03) — sent with the next start so the same questions are not asked twice.
// Kept on this device only (localStorage), at most the last nine per subject and twelve subjects; anything unreadable simply means "none seen".
const SEEN_KEY = 'tryQuestionsSeen';
const seenKey = (topic: string) => topic.trim().toLowerCase().slice(0, 90);
export function questionsSeen(topic: string): string[] {
  try { const all = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string[]>; return Array.isArray(all[seenKey(topic)]) ? all[seenKey(topic)] : []; } catch { return []; }
}
export function rememberQuestionsSeen(topic: string, questions: string[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string[]>;
    const k = seenKey(topic);
    const next = { ...all, [k]: [...questions, ...(all[k] ?? [])].slice(0, 9) };
    const keys = Object.keys(next);
    if (keys.length > 12) delete next[keys[0]];
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch { /* private mode — the server's random angles still keep it varied */ }
}
