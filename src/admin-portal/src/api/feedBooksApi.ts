// The feed's books strip (admin page) — talks to Explain.Api's Features/FeedBooks/Endpoint.cs. Same call shape as feedVideosApi.ts; the themes are the same as the videos'.

import { THEMES } from './feedVideosApi'
import type { ApiError } from './feedVideosApi'
export { THEMES }
export type { ApiError }

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000'

export interface FeedBook {
  id: string; title: string; authors: string; coverUrl: string; url: string; theme: string; why: string; status: 'published' | 'hidden'; addedAt: string
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

export const feedBooksApi = {
  list: (token: string) => call<FeedBook[]>(token, '/api/admin/feed-books'),
  add: (token: string, isbn: string, theme: string, why: string, authors: string) =>
    call<FeedBook>(token, '/api/admin/feed-books', { method: 'POST', body: JSON.stringify({ isbn, theme, why: why || null, authors: authors || null }) }),
  patch: (token: string, id: string, body: { status?: string; theme?: string; why?: string; authors?: string }) =>
    call<FeedBook>(token, `/api/admin/feed-books/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (token: string, id: string) => call<void>(token, `/api/admin/feed-books/${id}`, { method: 'DELETE' }),
}

/**
 * One pasted line: `ISBN | theme | why it is here | authors (optional)`. Splits on the pipe, trims each part, and leaves anything missing empty.
 * The theme part may be left empty to use the page's chosen theme. Returns null for a blank line.
 */
export function parseBookLine(line: string): { isbn: string; theme: string; why: string; authors: string } | null {
  const text = line.trim()
  if (!text) return null
  const [isbn = '', theme = '', why = '', authors = ''] = text.split('|').map(p => p.trim())
  return { isbn, theme, why, authors }
}
