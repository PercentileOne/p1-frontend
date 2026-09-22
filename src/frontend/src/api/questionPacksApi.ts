// "Printable Interview Questions" client (Francis, 2026-09-22) — talks to Explain.Api's Features/QuestionPacks. Public and
// anonymous, same absolute-URL rule as every other backend call from this app (see CLAUDE.md's relative-/api/* gotcha).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface QuestionPackQa { question: string; answer: string }
export interface QuestionPackContent { jobRole: string; focusAreas: string | null; difficulty: string; questions: QuestionPackQa[] }
export type QuestionPackDifficulty = 'Standard' | 'Pro' | 'Expert';

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

// Reflects the SAME admin toggle the checkout endpoint itself enforces (Features/QuestionPacks/Endpoint.cs's
// GetQuestionPackFreeOrDefaultAsync) — so the price shown on screen can never drift from what actually happens
// when the button is clicked.
export const getQuestionPackPricing = () =>
  call<{ free: boolean; priceGbp: number }>('/api/question-packs/pricing', { method: 'GET' });

export const previewQuestion = (jobRole: string, focus: string[], difficulty: QuestionPackDifficulty) =>
  call<{ question: string }>('/api/question-packs/preview', { method: 'POST', body: JSON.stringify({ jobRole, focus, difficulty }) });

// Revealable model answer for the free sample question (Francis, 2026-09-22) — its own on-demand call, not
// bundled into previewQuestion, so it's only ever paid for (in AI-call terms) when someone actually clicks reveal.
export const getPreviewAnswer = (jobRole: string, question: string) =>
  call<{ answer: string }>('/api/question-packs/preview-answer', { method: 'POST', body: JSON.stringify({ jobRole, question }) });

// Same "What's Hot" feature as the logged-in interview intake screen (InterviewPackStart.tsx's handleWhatsHot) —
// just backed by its own capped public endpoint instead of the unauthenticated/unmetered /api/ai-proxy that
// screen's generateHotTopics() calls directly (fine there, behind a login; not fine on a public page).
export const getHotTopics = (jobRole: string) =>
  call<{ topics: string[] }>('/api/question-packs/hot-topics', { method: 'POST', body: JSON.stringify({ jobRole }) });

export const startQuestionPackCheckout = (jobRole: string, focus: string[], difficulty: QuestionPackDifficulty) =>
  call<{ checkoutUrl: string }>('/api/question-packs/checkout', { method: 'POST', body: JSON.stringify({ jobRole, focus, difficulty }) });

export const getQuestionPackByCheckoutSession = (sessionId: string) =>
  call<QuestionPackContent>(`/api/question-packs/checkout-session/${encodeURIComponent(sessionId)}`, { method: 'GET' });
