import { useAuthStore } from '../auth/authStore';
import type { TedTalk, TedTalkOrder } from './tedTalksApi';

// Copied-then-trimmed from tedTalksApi.ts — same shapes (TedTalk/TedTalkOrder are generic
// enough to reuse as-is), pointed at the backend's separate productivity-videos search + its
// own pinned list (Features/Talks/ProductivityVideos/Endpoint.cs), so pinning here never mixes
// with the TED pinned list.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchProductivityVideos(query: string, order: TedTalkOrder): Promise<TedTalk[]> {
  const qs = new URLSearchParams({ order });
  if (query.trim()) qs.set('q', query.trim());
  const res = await fetch(`${API_BASE}/talks/productivity-videos/search?${qs}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function getPinnedProductivityVideos(): Promise<TedTalk[]> {
  const res = await fetch(`${API_BASE}/api/pinned-productivity-videos`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function pinProductivityVideo(video: TedTalk): Promise<TedTalk[]> {
  const res = await fetch(`${API_BASE}/api/pinned-productivity-videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(video),
  });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}

export async function unpinProductivityVideo(videoId: string): Promise<TedTalk[]> {
  const res = await fetch(`${API_BASE}/api/pinned-productivity-videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json() as Promise<TedTalk[]>;
}
