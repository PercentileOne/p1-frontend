import { useAuthStore } from '../auth/authStore';

// The feed's video strip (2026-10-18): verified videos from official YouTube channels, added by an admin. Absolute URL on purpose (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

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
export interface VideoMarks { saved: string[]; liked: string[]; shareLikes: boolean }
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
    if (!res.ok) return { saved: [], liked: [], shareLikes: false };
    return await res.json() as VideoMarks;
  } catch { return { saved: [], liked: [], shareLikes: false }; }
}

/** Saves or un-saves, likes or un-likes. Returns the person's full lists; throws if it did not save, so the screen can put the button back. */
export async function setVideoMark(id: string, mark: VideoMark, on: boolean): Promise<VideoMarks> {
  const res = await fetch(`${API_BASE}/api/feed/videos/${encodeURIComponent(id)}/${mark}`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify({ on }) });
  if (!res.ok) throw new Error(res.status === 404 ? 'That video is no longer available.' : 'That did not save. Try again.');
  return await res.json() as VideoMarks;
}

/** The opt-in switch: show my liked videos to the people who follow me. Off until it is switched on. Throws if it did not save. */
export async function setLikesShared(on: boolean): Promise<VideoMarks> {
  const res = await fetch(`${API_BASE}/api/feed/videos/sharing`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify({ on }) });
  if (!res.ok) throw new Error('That did not save. Try again.');
  return await res.json() as VideoMarks;
}

/** Someone's liked videos. `visible` is false unless they share them and the person asking follows them (or it is their own). */
export async function fetchLikedBy(userId: string): Promise<{ visible: boolean; videos: FeedVideo[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/feed/videos/liked-by/${encodeURIComponent(userId)}`, { headers: authHeaders() });
    if (!res.ok) return { visible: false, videos: [] };
    return await res.json() as { visible: boolean; videos: FeedVideo[] };
  } catch { return { visible: false, videos: [] }; }
}

/** The public Watch page's list. `enabled` is false while an admin has the public page switched off. No sign-in needed. */
export async function fetchPublicVideos(): Promise<{ enabled: boolean; videos: FeedVideo[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/public/feed/videos`);
    if (!res.ok) return { enabled: false, videos: [] };
    return await res.json() as { enabled: boolean; videos: FeedVideo[] };
  } catch { return { enabled: false, videos: [] }; }
}

/** A link that opens our Watch page with this video playing. Tagged so the Activity Log shows shares as a source. */
export function shareUrl(id: string): string {
  const local = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const origin = local ? window.location.origin : 'https://candidate.theinterviewchair.com';
  return `${origin}/watch?v=${encodeURIComponent(id)}&utm_source=share&utm_medium=video&utm_campaign=feed-share`;
}

/** Opens the phone's own share sheet where there is one, otherwise copies the link. 'cancelled' means the person closed the sheet. */
export async function shareVideo(v: FeedVideo): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = shareUrl(v.id);
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try { await navigator.share({ title: v.title, text: `${v.title} (${v.channel})`, url }); return 'shared'; }
    catch (e) { if ((e as DOMException)?.name === 'AbortError') return 'cancelled'; /* fall through to copying */ }
  }
  try { await navigator.clipboard.writeText(url); return 'copied'; }
  catch { return 'failed'; }
}
