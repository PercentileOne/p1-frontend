import { useAuthStore } from '../auth/authStore';

// Goals and reviews (2026-10-18), for the Routines & Systems page. Absolute URL on purpose: this SWA's own Functions runtime would 404 a relative /api path (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export type GoalStatus = 'active' | 'paused' | 'completed';
export type GoalTrack = 'milestones' | 'number';
export interface Milestone { id?: string | null; text: string; done: boolean }
export interface GoalUpdate { date: string; note: string; value?: number | null }
export interface Goal {
  id: string; title: string; description: string; category: string; startDate: string; targetDate: string;
  status: GoalStatus; track: GoalTrack; milestones: Milestone[]; targetValue?: number | null; currentValue?: number | null; unit?: string | null;
  updates: GoalUpdate[]; progress: number; createdAt: string; completedAt?: string | null;
}
export interface GoalInput {
  title?: string; description?: string; category?: string; startDate?: string; targetDate?: string; status?: GoalStatus; track?: GoalTrack;
  milestones?: Milestone[]; targetValue?: number | null; currentValue?: number | null; unit?: string;
}
export const GOAL_CATEGORIES = ['Career', 'Learning', 'Interviews', 'Health', 'Money', 'Family and home', 'Personal'];
export const MAX_GOAL_TITLE = 120;
export const MAX_GOAL_DESCRIPTION = 1000;
export const MAX_MILESTONES = 30;

export type Cadence = 'weekly' | 'monthly' | 'yearly';
export interface LookBack { essentialsDone: number; essentialsTotal: number; daysOpened: number; daysAllEssentials: number; practiceInterviews: number }
export interface Review {
  cadence: Cadence; periodStart: string; periodEnd: string; rating: number;
  wentWell: string; didntGoWell: string; learned: string; notes: string; priorities: string[]; lookBack?: LookBack | null; updatedAt: string;
}
export interface ReviewInput { rating: number; wentWell: string; didntGoWell: string; learned: string; notes: string; priorities: string[]; lookBack?: LookBack | null }
export interface PeriodReply { cadence: Cadence; periodStart: string; periodEnd: string; review: Review | null }
/** A day starred in Routines, with an optional note about why it matters. */
export interface FavouriteDay { date: string; note: string }
export const MAX_FAVOURITE_NOTE = 100;
export const MAX_DAY_NOTE = 4000;
export const MAX_REVIEW_TEXT = 2000;
export const MAX_REVIEW_NOTES = 4000;
export const MAX_PRIORITIES = 5;

function headers(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { ...init, signal: ctl.signal });
    if (!res.ok) {
      let msg = 'Something went wrong. Try again.';
      try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch { /* keep the default */ }
      throw new Error(msg);
    }
    return await res.json() as T;
  } finally { window.clearTimeout(timer); }
}

export const planningApi = {
  goals: () => call<Goal[]>('/goals', { headers: headers() }),
  createGoal: (body: GoalInput) => call<Goal>('/goals', { method: 'POST', headers: headers(true), body: JSON.stringify(body) }),
  updateGoal: (id: string, body: GoalInput) => call<Goal>(`/goals/${id}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }),
  addUpdate: (id: string, body: { note?: string; value?: number | null }) =>
    call<Goal>(`/goals/${id}/updates`, { method: 'POST', headers: headers(true), body: JSON.stringify(body) }),
  deleteGoal: (id: string) => call<{ ok: boolean }>(`/goals/${id}`, { method: 'DELETE', headers: headers() }),

  period: (cadence: Cadence, date: string) =>
    call<PeriodReply>(`/reviews/period?cadence=${cadence}&date=${date}`, { headers: headers() }),
  reviews: (cadence: Cadence) => call<Review[]>(`/reviews?cadence=${cadence}`, { headers: headers() }),
  saveReview: (cadence: Cadence, date: string, body: ReviewInput) =>
    call<Review>(`/reviews/${cadence}/${date}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }),
  dayNote: (date: string) => call<{ date: string; text: string }>(`/day-notes/${date}`, { headers: headers() }),
  saveDayNote: (date: string, text: string) => call<{ date: string; text: string }>(`/day-notes/${date}`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ text }) }),
  /** For the moment the page is going away: keepalive lets the browser finish the request after the tab closes. Fire and forget. */
  saveDayNoteOnExit: (date: string, text: string): void => {
    try {
      void fetch(`${API_BASE}/api/day-notes/${date}`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ text }), keepalive: true }).catch(() => { /* nothing more can be done as the page closes */ });
    } catch { /* ditto */ }
  },
  favourites: () => call<FavouriteDay[]>('/favourite-days', { headers: headers() }),
  setFavourite: (date: string, note: string) => call<FavouriteDay>(`/favourite-days/${date}`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ note }) }),
  removeFavourite: (date: string) => call<{ ok: boolean }>(`/favourite-days/${date}`, { method: 'DELETE', headers: headers() }),
  /** Every saved interview with its date, so a review can say how many practice interviews the period held. */
  interviewDates: async (): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/interviews`, { headers: headers() });
      if (!res.ok) return [];
      const items = await res.json() as { createdAt?: string }[];
      return Array.isArray(items) ? items.map(i => (i.createdAt ?? '').slice(0, 10)).filter(Boolean) : [];
    } catch { return []; }
  },
};

/** The period that holds a date. A week runs Monday to Sunday, matching the server. Dates are yyyy-MM-dd. */
export function periodOf(cadence: Cadence, date: string): { start: string; end: string } {
  const [y, m, d] = date.split('-').map(Number);
  const p = (n: number) => String(n).padStart(2, '0');
  const fmt = (dt: Date) => `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  if (cadence === 'monthly') return { start: `${y}-${p(m)}-01`, end: fmt(new Date(y, m, 0)) };
  if (cadence === 'yearly') return { start: `${y}-01-01`, end: `${y}-12-31` };
  const dt = new Date(y, m - 1, d);
  const back = (dt.getDay() + 6) % 7;
  const s = new Date(y, m - 1, d - back);
  return { start: fmt(s), end: fmt(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)) };
}

/** A date inside the previous (-1) or next (+1) period. */
export function shiftPeriod(cadence: Cadence, start: string, by: number): string {
  const [y, m, d] = start.split('-').map(Number);
  const p = (n: number) => String(n).padStart(2, '0');
  if (cadence === 'monthly') { const dt = new Date(y, m - 1 + by, 1); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-01`; }
  if (cadence === 'yearly') return `${y + by}-01-01`;
  const dt = new Date(y, m - 1, d + 7 * by);
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** Whole days from today to a date (negative when it has passed). */
export function daysUntil(date: string, today: string): number {
  const [y1, m1, d1] = date.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000);
}
