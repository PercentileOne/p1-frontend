import { useEffect, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import { localDate } from '../api/routinesApi';

// Today's My Routines progress, asked as a summary only so it never creates a day for someone who has not opened My Routines (the same call the Dashboard's routine card makes).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface RoutineSummary { essentialsDone: number; essentialsTotal: number; done: number; total: number }

/** null until it loads, or if it cannot be loaded. */
export function useRoutineSummary(): RoutineSummary | null {
  const token = useAuthStore(s => s.token);
  const [summary, setSummary] = useState<RoutineSummary | null>(null);
  const date = localDate();
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 12000);
    fetch(`${API_BASE}/api/routines/day/${date}/summary`, { headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then((b: { summary?: RoutineSummary } | null) => { if (alive && b?.summary) setSummary(b.summary); })
      .catch(() => { /* a panel that cannot load just stays plain */ })
      .finally(() => window.clearTimeout(timer));
    return () => { alive = false; ctl.abort(); };
  }, [token, date]);
  return summary;
}

/** The figure to show: essentials when the day has any, otherwise all items. */
export function routineProgress(s: RoutineSummary | null): { done: number; total: number; label: string } | null {
  if (!s || s.total === 0) return null;
  const useEss = s.essentialsTotal > 0;
  return { done: useEss ? s.essentialsDone : s.done, total: useEss ? s.essentialsTotal : s.total, label: useEss ? 'essentials' : 'items' };
}
