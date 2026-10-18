import { useAuthStore } from '../auth/authStore';
import { localDate } from './routinesApi';

// Question of the Day (2026-10-18), the first content type of the feed. The server never sends the correct answer until the question has been answered.
// Absolute URL on purpose: this SWA's own Functions runtime would 404 a relative /api path (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface QuestionOfTheDay {
  needsTopic: boolean;
  date: string | null;
  topic: string | null;
  question: string | null;
  options: string[] | null;
  answered: boolean;
  selectedIndex: number | null;
  correctIndex: number | null;
  isCorrect: boolean | null;
  streak: number;
  answeredTotal: number;
  correctTotal: number;
}

function headers(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// Making the day's question takes a model call, so allow it longer than an ordinary read.
async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 45000): Promise<T> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: ctl.signal });
    if (!res.ok) {
      let msg = 'Something went wrong. Try again.';
      try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch { /* keep the default */ }
      throw new Error(msg);
    }
    if (res.status === 204) return undefined as T;
    return await res.json() as T;
  } finally { window.clearTimeout(timer); }
}

export const questionOfTheDayApi = {
  today: () => call<QuestionOfTheDay>(`/api/question-of-the-day?date=${localDate()}`, { headers: headers() }),
  answer: (choice: number) => call<QuestionOfTheDay>(`/api/question-of-the-day/answer?date=${localDate()}`, { method: 'POST', headers: headers(true), body: JSON.stringify({ choice }) }),
  setTopic: (topic: string) => call<{ topic: string | null }>('/api/question-of-the-day/topic', { method: 'PUT', headers: headers(true), body: JSON.stringify({ topic }) }, 15000),
  /** Throws the day's unanswered question away so the next fetch makes a fresh one (after a topic change). An answered question stays. */
  swapToday: () => call<void>(`/api/question-of-the-day/today?date=${localDate()}`, { method: 'DELETE', headers: headers() }, 15000),
};

/** "1 day", "7 days". */
export function daysText(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`;
}
