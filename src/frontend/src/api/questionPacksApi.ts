// "Printable Interview Questions" client (Francis, 2026-09-22) — talks to Explain.Api's Features/QuestionPacks. Public and
// anonymous, same absolute-URL rule as every other backend call from this app (see CLAUDE.md's relative-/api/* gotcha).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface QuestionPackQa { question: string; answer: string }
export interface QuestionPackContent { jobRole: string; focusAreas: string | null; questions: QuestionPackQa[] }

export type QuestionPacksResult<T> = { ok: true; data: T } | { ok: false; capped: boolean; message: string };

async function call<T>(path: string, init?: RequestInit): Promise<QuestionPacksResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const json = await res.json().catch(() => ({})) as { error?: string; message?: string; capped?: boolean };
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, capped: !!json.capped, message: json.message ?? json.error ?? "Something went wrong — please try again." };
  } catch {
    return { ok: false, capped: false, message: "We couldn't reach the server — please check your connection and try again." };
  }
}

export const previewQuestion = (jobRole: string, focus: string[]) =>
  call<{ question: string }>('/api/question-packs/preview', { method: 'POST', body: JSON.stringify({ jobRole, focus }) });

// Same "What's Hot" feature as the logged-in interview intake screen (InterviewPackStart.tsx's handleWhatsHot) —
// just backed by its own capped public endpoint instead of the unauthenticated/unmetered /api/ai-proxy that
// screen's generateHotTopics() calls directly (fine there, behind a login; not fine on a public page).
export const getHotTopics = (jobRole: string) =>
  call<{ topics: string[] }>('/api/question-packs/hot-topics', { method: 'POST', body: JSON.stringify({ jobRole }) });

export const startQuestionPackCheckout = (jobRole: string, focus: string[]) =>
  call<{ checkoutUrl: string }>('/api/question-packs/checkout', { method: 'POST', body: JSON.stringify({ jobRole, focus }) });

export const getQuestionPackByCheckoutSession = (sessionId: string) =>
  call<QuestionPackContent>(`/api/question-packs/checkout-session/${encodeURIComponent(sessionId)}`, { method: 'GET' });
