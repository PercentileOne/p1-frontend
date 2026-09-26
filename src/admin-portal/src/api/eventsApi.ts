// Admin Activity Log API client — talks directly to Explain.Api's Features/Events/Admin/Endpoint.cs.
// Same call<T> shape as moderationApi.ts, copied rather than shared (this codebase's own
// "copy then trim" convention — see CLAUDE.md).

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface SystemEvent {
  id: string;
  sessionId: string;
  userId: string | null;
  email: string | null;
  role: string | null;
  eventType: string;
  page: string | null;
  portal: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  region?: string | null;
  accuracyKm?: number | null;
  tokenIssuedAt?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListEventsParams {
  userId?: string;
  email?: string;
  eventType?: string;
  portal?: string;
  q?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface ListEventsResponse {
  total: number;
  page: number;
  size: number;
  rows: SystemEvent[];
}

export interface ApiError { error: string; status: number }

async function call<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export interface DeleteEventsFilter {
  userId?: string; email?: string; eventType?: string; portal?: string; q?: string; from?: string; to?: string;
}

async function post<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = res.statusText;
    try { const j = await res.json() as { error?: string }; message = j.error ?? message; } catch { /* not JSON */ }
    throw { error: message, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export interface IgnoredIps { ips: string[]; yourIp: string | null }

// The funnel plus which addresses were left out and how many visits that removed.
export interface FunnelReply { funnel: FunnelResponse; ignoredIps: string[]; excludedVisits: number }

export interface FunnelResponse {
  days: number;
  totalEvents: number;
  steps: { key: string; label: string; sessions: number }[];
  devices: { device: string; visits: number; real: number; tried: number }[];
  sources: { source: string; visits: number; real: number }[];
  topClicks: { type: string; label: string; area: string; href: string; visitors: number }[];
  sections: { section: string; visitors: number }[];
  medianSecondsOnPage: number | null;
  tryPage: { visits: number; phoneVisits: number; started: number; startedOnPhone: number; firstQuestion: number; completed: number; completedOnPhone: number; blocked: number };
}

export const eventsApi = {
  // Delete specific events (id + sessionId, the container's partition key) — max 500 per call.
  deleteSelected(token: string, items: { id: string; sessionId: string }[]): Promise<{ deleted: number }> {
    return post('/api/admin/events/delete', token, { items });
  },
  // Delete EVERY event matching the filter — the server refuses unless expectedCount equals the live match count.
  deleteMatching(token: string, filter: DeleteEventsFilter, expectedCount: number): Promise<{ deleted: number }> {
    return post('/api/admin/events/delete', token, { filter, expectedCount });
  },
  // What do visitors actually do? Marketing-site funnel over the last N days (max 10 — the hot window).
  funnel(token: string, days: number): Promise<FunnelReply> {
    return call(`/api/admin/events/funnel?days=${days}`, token);
  },
  // IP addresses whose visits the funnel leaves out (the owner's own — home, dialysis unit, office…).
  getIgnoredIps(token: string): Promise<IgnoredIps> {
    return call('/api/admin/events/ignored-ips', token);
  },
  setIgnoredIps(token: string, ips: string[]): Promise<IgnoredIps> {
    return post('/api/admin/events/ignored-ips', token, { ips });
  },
  list(token: string, params: ListEventsParams): Promise<ListEventsResponse> {
    const qs = new URLSearchParams();
    if (params.userId) qs.set('userId', params.userId);
    if (params.email) qs.set('email', params.email);
    if (params.eventType) qs.set('eventType', params.eventType);
    if (params.portal) qs.set('portal', params.portal);
    if (params.q) qs.set('q', params.q);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortDir) qs.set('sortDir', params.sortDir);
    qs.set('page', String(params.page ?? 1));
    qs.set('size', String(params.size ?? 50));
    return call(`/api/admin/events?${qs.toString()}`, token);
  },
};
