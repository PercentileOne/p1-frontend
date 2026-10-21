import { useAuthStore } from '../auth/authStore';

// The feed's courses strip (2026-10-20): courses from official providers, checked against the provider's own page when an admin adds them. Title and picture are the provider's; the link goes to the provider's own site.
// Absolute URL on purpose (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

export type CourseCost = 'free' | 'free-to-audit' | 'paid' | '';

export interface FeedCourse {
  id: string;
  title: string;      // from the provider's page (or typed by an admin for platforms that cannot be checked)
  provider: string;   // our name for the provider
  imageUrl: string;   // the provider's own picture, or ''
  url: string;        // the plain course address; any affiliate tag is added only when the link is shown, see courseLink
  theme: string;
  why: string;        // our one-line reason it is here
  cost: CourseCost;   // set by an admin, never guessed
  status?: string;
  addedAt?: string;
}

/**
 * The address a card links to. Today this is the plain address. If a provider's affiliate programme is joined later, its tag is added here (and the strip must then say so), so no stored course has to be re-added.
 */
export function courseLink(c: Pick<FeedCourse, 'url'>): string {
  return c.url;
}

export const COST_LABEL: Record<Exclude<CourseCost, ''>, string> = { free: 'Free', 'free-to-audit': 'Free to audit', paid: 'Paid' };

function authHeaders(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function fetchFeedCourses(): Promise<FeedCourse[]> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/feed/courses`, { headers: authHeaders(), signal: ctl.signal });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    return Array.isArray(body) ? body as FeedCourse[] : [];
  } catch { return []; }
  finally { window.clearTimeout(timer); }
}

/** A person's own saved courses: private to them. */
export interface CourseMarks { saved: string[] }

export async function fetchCourseMarks(): Promise<CourseMarks> {
  try {
    const res = await fetch(`${API_BASE}/api/feed/courses/me`, { headers: authHeaders() });
    if (!res.ok) return { saved: [] };
    const body = await res.json() as Partial<CourseMarks>;
    return { saved: Array.isArray(body.saved) ? body.saved : [] };
  } catch { return { saved: [] }; }
}

/** Saves or un-saves a course. Returns the full list; throws if it did not save, so the screen can put the button back. */
export async function setCourseSaved(id: string, on: boolean): Promise<CourseMarks> {
  const res = await fetch(`${API_BASE}/api/feed/courses/${encodeURIComponent(id)}/saved`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify({ on }) });
  if (!res.ok) throw new Error(res.status === 404 ? 'That course is no longer in the list.' : 'That did not save. Try again.');
  return await res.json() as CourseMarks;
}
