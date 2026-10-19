// Industry news for the Feed's right-hand panel (2026-10-19): the same real RSS business and startup headlines the Dashboard's Business Pulse card uses (backend CareerNews, GET /api/business-news).
// Short headline, source and link only, never copied text. Absolute URL on purpose (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface FeedNewsItem { tag: string; headline: string; source: string; url: string; publishedAt: string }

export async function fetchIndustryNews(limit = 3): Promise<FeedNewsItem[]> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/business-news`, { signal: ctl.signal });
    if (!res.ok) return [];
    const data = await res.json() as { news?: FeedNewsItem[] };
    return (data.news ?? []).filter(n => n.headline && n.url && /^https?:\/\//.test(n.url)).slice(0, limit);
  } catch { return []; }
  finally { window.clearTimeout(timer); }
}

/** "5 min ago", "3 h ago", "2 days ago". Empty when the date cannot be read. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
