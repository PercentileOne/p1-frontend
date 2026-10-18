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

// A person's own saved ("watch later") and liked videos: private to them.
export interface VideoMarks { saved: string[]; liked: string[] }
export type VideoMark = 'saved' | 'liked';

function authHeaders(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function fetchVideoMarks(): Promise<VideoMarks> {
  try {
    const res = await fetch(`${API_BASE}/api/feed/videos/me`, { headers: authHeaders() });
    if (!res.ok) return { saved: [], liked: [] };
    return await res.json() as VideoMarks;
  } catch { return { saved: [], liked: [] }; }
}

/** Saves or un-saves, likes or un-likes. Returns the person's full lists; throws if it did not save, so the screen can put the button back. */
export async function setVideoMark(id: string, mark: VideoMark, on: boolean): Promise<VideoMarks> {
  const res = await fetch(`${API_BASE}/api/feed/videos/${encodeURIComponent(id)}/${mark}`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify({ on }) });
  if (!res.ok) throw new Error(res.status === 404 ? 'That video is no longer available.' : 'That did not save. Try again.');
  return await res.json() as VideoMarks;
}
