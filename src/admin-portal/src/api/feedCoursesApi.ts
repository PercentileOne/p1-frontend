// The feed's courses strip (admin page) — talks to Explain.Api's Features/FeedCourses/Endpoint.cs. Same call shape as feedBooksApi.ts; the themes are the same as the videos'.

import { THEMES } from './feedVideosApi'
import type { ApiError } from './feedVideosApi'
export { THEMES }
export type { ApiError }

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000'

export const COSTS = ['free', 'free-to-audit', 'paid'] as const

export interface FeedCourse {
  id: string; title: string; provider: string; imageUrl: string; url: string; theme: string; why: string; cost: string; status: 'published' | 'hidden'; addedAt: string
  /** False for platforms the page check cannot read (Udemy and the like): an admin opened the course and typed its title. */
  verified: boolean
}

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

export const feedCoursesApi = {
  list: (token: string) => call<FeedCourse[]>(token, '/api/admin/feed-courses'),
  add: (token: string, p: { url: string; theme: string; why: string; cost: string; title: string }) =>
    call<FeedCourse>(token, '/api/admin/feed-courses', { method: 'POST', body: JSON.stringify({ url: p.url, theme: p.theme, why: p.why || null, cost: p.cost || null, title: p.title || null }) }),
  patch: (token: string, id: string, body: { status?: string; theme?: string; why?: string; cost?: string; title?: string }) =>
    call<FeedCourse>(token, `/api/admin/feed-courses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (token: string, id: string) => call<void>(token, `/api/admin/feed-courses/${id}`, { method: 'DELETE' }),
}

/**
 * One pasted line: `address | theme | why it is here | cost | title (optional)`. Splits on the pipe, trims each part, and leaves anything missing empty.
 * The theme may be left empty to use the page's chosen theme; the cost is free, free-to-audit or paid; the title is only needed for platforms the check cannot read, or to replace the provider's own.
 * Returns null for a blank line.
 */
export function parseCourseLine(line: string): { url: string; theme: string; why: string; cost: string; title: string } | null {
  const text = line.trim()
  if (!text) return null
  const [url = '', theme = '', why = '', cost = '', title = ''] = text.split('|').map(p => p.trim())
  return { url, theme, why, cost, title }
}
