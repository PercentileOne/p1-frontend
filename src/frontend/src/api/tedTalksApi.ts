import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

export interface TedTalk {
  id: string;
  title: string;
  channel: string;
  duration: string;
  viewCount: number;
  publishedAt: string;
  thumbnail: string;
}

export type TedTalkOrder = 'relevance' | 'viewCount' | 'date';

// Nothing on the Talks page may wait for ever on one slow or failed call (2026-10-12: during a live demo the page sat loading). Every call here gives up after 12 seconds
// and returns the "nothing" answer, so the rest of the page is never held up behind the Watch & Learn row.
const LIMIT_MS = 12000;
async function limited(url: string, init: RequestInit = {}): Promise<Response | null> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), LIMIT_MS);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  catch { return null; }
  finally { window.clearTimeout(t); }
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchTedTalks(query: string, order: TedTalkOrder): Promise<TedTalk[]> {
  const qs = new URLSearchParams({ order });
  if (query.trim()) qs.set('q', query.trim());
  const res = await limited(`${API_BASE}/talks/ted-talks/search?${qs}`, { headers: authHeaders() });
  if (!res || !res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function getPinnedTalks(): Promise<TedTalk[]> {
  const res = await limited(`${API_BASE}/api/pinned-talks`, { headers: authHeaders() });
  if (!res || !res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function pinTalk(talk: TedTalk): Promise<TedTalk[]> {
  const res = await limited(`${API_BASE}/api/pinned-talks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(talk),
  });
  if (!res || !res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function unpinTalk(videoId: string): Promise<TedTalk[]> {
  const res = await limited(`${API_BASE}/api/pinned-talks/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res || !res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}
