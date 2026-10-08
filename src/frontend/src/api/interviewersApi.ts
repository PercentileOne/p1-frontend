// The interviewers a candidate can meet (public, read-only): the active ones from Admin > Interviewers. Voice IDs and audit fields are never sent to the browser.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface PublicInterviewer {
  id: string;
  displayName: string;
  role: 'hr' | 'technical' | 'briefing';
  avatarId: string;
  description: string;
  traits: { depth: number; strictness: number; warmth: number; humour: number; pace: number };
  sortOrder: number;
  backgroundUrl: string | null; // full URL of the uploaded background, or null
  portraitUrl: string | null;   // full URL of the uploaded portrait (their face), or null: the picture files shipped with the site are then used
  defaultFor: 'hr' | 'technical' | 'briefing' | null;
}

let cache: { at: number; list: PublicInterviewer[] } | null = null;

/** The active interviewers, ordered. Any failure gives an empty list, and the interview carries on with the default interviewers. Cached for a minute. */
export async function fetchInterviewers(): Promise<PublicInterviewer[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.list;
  try {
    const res = await fetch(`${API_BASE}/interviews/interviewers`);
    if (!res.ok) return [];
    const raw = await res.json() as (Omit<PublicInterviewer, 'backgroundUrl' | 'portraitUrl'> & { backgroundUrl: string | null; portraitUrl?: string | null })[];
    const full = (u: string | null | undefined) => (u && u.startsWith('/') ? `${API_BASE}${u}` : null);
    const list = raw.map(i => ({ ...i, backgroundUrl: full(i.backgroundUrl), portraitUrl: full(i.portraitUrl) }));
    cache = { at: Date.now(), list };
    return list;
  } catch { return []; }
}
