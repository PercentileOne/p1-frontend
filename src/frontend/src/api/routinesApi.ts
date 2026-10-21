import { useAuthStore } from '../auth/authStore';

// My Routines (2026-10-13). Absolute URL on purpose: this SWA's own Functions runtime would 404 a relative /api/routines (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

/** check = tick box, number = tick plus a value, text = a note to write, read = a passage to read aloud with one tick, qotd = ticks itself when today's Question of the Day is answered (2026-10-19). */
export type RoutineKind = 'check' | 'number' | 'text' | 'read' | 'qotd';
export type Priority = 'essential' | 'standard' | 'low';
export interface RoutineRule { weekdays?: number[] | null; lastDayOfMonth?: boolean | null; label?: string | null }
export interface TemplateItem { id: string; text: string; section: string; kind: RoutineKind; essential: boolean; rule?: RoutineRule | null; priority?: Priority | null }
export interface DayItem { id: string; text: string; section: string; kind: RoutineKind; essential: boolean; ruleLabel?: string | null; source: 'template' | 'today'; priority?: Priority | null }
export interface RoutineDay {
  id: string; date: string; sections: string[]; items: DayItem[];
  checked: Record<string, boolean>; values: Record<string, string>;
}
export interface DaySummary { date: string; essentialsDone: number; essentialsTotal: number; done: number; total: number }
export interface RoutineTemplate { sections: string[]; items: TemplateItem[] }
export type AddScope = 'today' | 'always' | 'rule';
export type ImportMode = 'replace' | 'add';
export const MAX_ITEM_TEXT = 200;
export const MAX_READ_TEXT = 2000;
export const MAX_ITEMS = 80;
export const MAX_SECTIONS = 12;

function headers(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/routines${path}`, { ...init, signal: ctl.signal });
    if (!res.ok) {
      let msg = 'Something went wrong. Try again.';
      try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch { /* keep the default */ }
      throw new Error(msg);
    }
    return await res.json() as T;
  } finally { window.clearTimeout(timer); }
}

/** A calendar date in the person's own time zone, as yyyy-MM-dd. The server never needs to know the zone. */
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const routinesApi = {
  day: (date: string) => call<RoutineDay>(`/day/${date}`, { headers: headers() }),
  saveState: (date: string, checked: Record<string, boolean>, values: Record<string, string>) =>
    call<DaySummary>(`/day/${date}/state`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ checked, values }) }),
  /** For the moment the page is going away: keepalive lets the browser finish the request after the tab closes. Fire and forget. */
  saveStateOnExit: (date: string, checked: Record<string, boolean>, values: Record<string, string>): void => {
    try {
      void fetch(`${API_BASE}/api/routines/day/${date}/state`, {
        method: 'PUT', headers: headers(true), body: JSON.stringify({ checked, values }), keepalive: true,
      }).catch(() => { /* nothing more can be done as the page closes */ });
    } catch { /* ditto */ }
  },
  addItem: (date: string, body: { text: string; section?: string; kind?: RoutineKind; essential?: boolean; priority?: Priority; scope: AddScope; rule?: RoutineRule | null }) =>
    call<RoutineDay>(`/day/${date}/items`, { method: 'POST', headers: headers(true), body: JSON.stringify(body) }),
  updateItem: (date: string, id: string, body: { text?: string; essential?: boolean; priority?: Priority }) =>
    call<RoutineDay>(`/day/${date}/items/${id}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }),
  removeItem: (date: string, id: string, scope: 'today' | 'template') =>
    call<RoutineDay>(`/day/${date}/items/${id}?scope=${scope}`, { method: 'DELETE', headers: headers() }),
  importList: (body: { date: string; mode: ImportMode; sections: string[]; items: Omit<TemplateItem, 'id'>[] }) =>
    call<RoutineDay>('/import', { method: 'POST', headers: headers(true), body: JSON.stringify({ ...body, items: body.items.map(i => ({ ...i, id: '' })) }) }),
  /** Put one category's items in a new order (applies to the template too, so tomorrow follows). */
  reorder: (date: string, section: string, ids: string[]) =>
    call<RoutineDay>(`/day/${date}/order`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ section, ids }) }),
  /** Rename, reorder, add and delete categories. `was` is a category's current name (null when it is new). */
  editSections: (date: string, body: { sections: { was: string | null; name: string }[]; removed: { was: string; moveTo: string | null }[] }) =>
    call<RoutineDay>(`/day/${date}/sections`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }),
  /** The yyyy-MM months that have any opened days, newest first. */
  months: () => call<string[]>('/months', { headers: headers() }),
  month: (month: string) => call<DaySummary[]>(`/month/${month}`, { headers: headers() }),
};
