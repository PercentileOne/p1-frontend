import { useAuthStore } from '../auth/authStore';

// Telling a recruiter how far a candidate has got with the prep they were sent (2026-10-18). The recruiter sees THAT the prep was opened and started, how many times the
// candidate practised, and how many questions they answered. Never the answers and never the scores (Francis's decision), so nothing here can carry either.
// Absolute URL on purpose: this SWA's own Functions runtime would 404 a relative /api path (see CLAUDE.md). Fire and forget: a report that fails must never get in the way of the practice.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

export interface PrepRef { id: string; recruiterId: string }
export type PrepStep = 'opened' | 'started' | 'answered' | 'finished';

export function reportPrepProgress(prep: PrepRef | undefined | null, step: PrepStep, counts?: { answered?: number; total?: number }): void {
  if (!prep?.id || !prep.recruiterId) return;
  const token = useAuthStore.getState().token;
  if (!token) return;
  try {
    void fetch(`${API_BASE}/api/interview-preps/${encodeURIComponent(prep.id)}/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recruiterId: prep.recruiterId, step, answered: counts?.answered, total: counts?.total }),
      keepalive: true,   // the finishing report is sent as the page moves on to the summary
    }).catch(() => { /* nothing to do: the practice carries on */ });
  } catch { /* ditto */ }
}
