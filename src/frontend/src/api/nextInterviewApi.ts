import { useAuthStore } from '../auth/authStore';
import { daysUntil } from './planningApi';

// "Next interview" (2026-10-18): the interviews a person says are coming up, plus the ones a recruiter sent a prep for (those already carry a date).
// Absolute URL on purpose: this SWA's own Functions runtime would 404 a relative /api path (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

export interface NextInterview {
  id: string;          // "prep:{id}" for a recruiter's prep, so the two kinds never clash
  date: string;        // yyyy-MM-dd
  role: string;
  company: string;
  source: 'self' | 'recruiter';
  from?: string;       // the recruiter's name, for a prep
}
export interface NextInterviewInput { date: string; role?: string; company?: string }

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
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: ctl.signal });
    if (!res.ok) {
      let msg = 'Something went wrong. Try again.';
      try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch { /* keep the default */ }
      throw new Error(msg);
    }
    return await res.json() as T;
  } finally { window.clearTimeout(timer); }
}

interface SelfReply { id: string; date: string; role: string; company: string }
interface PrepReply { id: string; role: string; recruiterName: string; interviewDate: string }

export const nextInterviewApi = {
  /** Everything with a date: the person's own entries and the recruiter-sent preps. A failure of one never hides the other. */
  async all(): Promise<NextInterview[]> {
    const [own, preps] = await Promise.all([
      call<SelfReply[]>('/api/next-interviews', { headers: headers() }).catch(() => [] as SelfReply[]),
      call<PrepReply[]>('/api/interview-preps/received', { headers: headers() }).catch(() => [] as PrepReply[]),
    ]);
    const mine: NextInterview[] = own.map(i => ({ id: i.id, date: i.date, role: i.role, company: i.company, source: 'self' }));
    const fromRecruiters: NextInterview[] = preps.filter(p => p.interviewDate).map(p => ({
      id: `prep:${p.id}`, date: p.interviewDate.slice(0, 10), role: p.role, company: '', source: 'recruiter', from: p.recruiterName,
    }));
    return [...mine, ...fromRecruiters];
  },
  create: (body: NextInterviewInput) => call<SelfReply>('/api/next-interviews', { method: 'POST', headers: headers(true), body: JSON.stringify(body) }),
  update: (id: string, body: NextInterviewInput) => call<SelfReply>(`/api/next-interviews/${id}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }),
  remove: (id: string) => call<{ ok: boolean }>(`/api/next-interviews/${id}`, { method: 'DELETE', headers: headers() }),
};

/** Interviews that have not happened yet (today counts), soonest first. */
export function upcoming(list: NextInterview[], today: string): NextInterview[] {
  return list.filter(i => i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

/** How many of them fall in the next seven days, today included. */
export function inNextWeek(list: NextInterview[], today: string): number {
  return upcoming(list, today).filter(i => daysUntil(i.date, today) <= 6).length;
}

/** "today", "tomorrow" or "in 5 days". */
export function whenText(date: string, today: string): string {
  const n = daysUntil(date, today);
  return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
}
