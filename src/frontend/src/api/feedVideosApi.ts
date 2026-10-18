import { useAuthStore } from '../auth/authStore';

// The feed's video strip (2026-10-18): verified videos from official YouTube channels, added by an admin. Absolute URL on purpose (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface FeedVideo {
  id: string;          // the YouTube video id
  title: string;       // from YouTube, not ours
  channel: string;     // credited on every card and under the player
  channelUrl: string;
  thumbnail: string;
  theme: string;
}

export async function fetchFeedVideos(): Promise<FeedVideo[]> {
  const token = useAuthStore.getState().token;
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/feed/videos`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: ctl.signal });
    if (!res.ok) return [];
    return await res.json() as FeedVideo[];
  } catch { return []; }
  finally { window.clearTimeout(timer); }
}

/** YouTube's privacy-enhanced player: no tracking cookies until the person plays. Never re-hosted, never downloaded. */
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}
