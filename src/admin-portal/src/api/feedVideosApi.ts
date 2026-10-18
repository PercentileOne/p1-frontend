// The feed's video strip (admin page) — talks to Explain.Api's Features/FeedVideos/Endpoint.cs. Same call shape as subjectsApi.ts.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface ApiError { error: string; status: number }

export interface FeedVideo {
  id: string; title: string; channel: string; channelUrl: string; thumbnail: string; theme: string; status: 'published' | 'hidden'; addedAt: string
}

export const THEMES: { value: string; label: string }[] = [
  { value: 'pitching', label: 'Pitching (Shark Tank, Dragons’ Den)' },
  { value: 'rejection', label: 'Turned down, then succeeded' },
  { value: 'founders', label: 'Founder stories' },
  { value: 'interviews', label: 'Interview tips' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'business', label: 'Business' },
  { value: 'success', label: 'Success' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'routines', label: 'Morning and daily routines, systems' },
  { value: 'habits', label: 'Habits and focus' },
  { value: 'learning', label: 'Learning how to learn' },
  { value: 'speaking', label: 'Public speaking and storytelling' },
  { value: 'career-change', label: 'Changing career' },
  { value: 'software-and-cloud', label: 'Software and cloud' },
]

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (!res.ok) {
    let message = res.statusText
    try { const b = await res.json() as { error?: string }; if (b.error) message = b.error } catch { /* keep the status text */ }
    throw { error: message, status: res.status } satisfies ApiError
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>)
}

export const feedVideosApi = {
  list: (token: string) => call<FeedVideo[]>(token, '/api/admin/feed-videos'),
  add: (token: string, url: string, theme: string) => call<FeedVideo>(token, '/api/admin/feed-videos', { method: 'POST', body: JSON.stringify({ url, theme }) }),
  patch: (token: string, id: string, body: { status?: string; theme?: string }) => call<FeedVideo>(token, `/api/admin/feed-videos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (token: string, id: string) => call<void>(token, `/api/admin/feed-videos/${id}`, { method: 'DELETE' }),
}
