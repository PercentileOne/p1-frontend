import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

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

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchTedTalks(query: string, order: TedTalkOrder): Promise<TedTalk[]> {
  const qs = new URLSearchParams({ order });
  if (query.trim()) qs.set('q', query.trim());
  const res = await fetch(`${API_BASE}/talks/ted-talks/search?${qs}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function getPinnedTalks(): Promise<TedTalk[]> {
  const res = await fetch(`${API_BASE}/api/pinned-talks`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function pinTalk(talk: TedTalk): Promise<TedTalk[]> {
  const res = await fetch(`${API_BASE}/api/pinned-talks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(talk),
  });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function unpinTalk(videoId: string): Promise<TedTalk[]> {
  const res = await fetch(`${API_BASE}/api/pinned-talks/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}
