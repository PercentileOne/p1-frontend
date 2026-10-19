import { useAuthStore } from '../auth/authStore';

// The feed's books strip (2026-10-19): real books checked against Open Library when an admin adds them. Covers and links come from Open Library; nothing is re-hosted. Absolute URL on purpose (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface FeedBook {
  id: string;        // the ISBN-13
  title: string;     // from Open Library
  authors: string;
  coverUrl: string;  // Open Library's cover picture
  url: string;       // the book's own Open Library page
  theme: string;
  why: string;       // our one-line reason it is here
  status?: string;
  addedAt?: string;
}

function authHeaders(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function fetchFeedBooks(): Promise<FeedBook[]> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/feed/books`, { headers: authHeaders(), signal: ctl.signal });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    return Array.isArray(body) ? body as FeedBook[] : [];
  } catch { return []; }
  finally { window.clearTimeout(timer); }
}

/** A person's own "Want to read" list: private to them. */
export interface BookMarks { saved: string[] }

export async function fetchBookMarks(): Promise<BookMarks> {
  try {
    const res = await fetch(`${API_BASE}/api/feed/books/me`, { headers: authHeaders() });
    if (!res.ok) return { saved: [] };
    const body = await res.json() as Partial<BookMarks>;
    return { saved: Array.isArray(body.saved) ? body.saved : [] };
  } catch { return { saved: [] }; }
}

/** Adds or removes a book on the reading list. Returns the full list; throws if it did not save, so the screen can put the button back. */
export async function setBookSaved(id: string, on: boolean): Promise<BookMarks> {
  const res = await fetch(`${API_BASE}/api/feed/books/${encodeURIComponent(id)}/saved`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify({ on }) });
  if (!res.ok) throw new Error(res.status === 404 ? 'That book is no longer in the list.' : 'That did not save. Try again.');
  return await res.json() as BookMarks;
}
