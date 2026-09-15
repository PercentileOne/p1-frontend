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
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListEventsParams {
  userId?: string;
  email?: string;
  eventType?: string;
  portal?: string;
  from?: string;
  to?: string;
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

export const eventsApi = {
  list(token: string, params: ListEventsParams): Promise<ListEventsResponse> {
    const qs = new URLSearchParams();
    if (params.userId) qs.set('userId', params.userId);
    if (params.email) qs.set('email', params.email);
    if (params.eventType) qs.set('eventType', params.eventType);
    if (params.portal) qs.set('portal', params.portal);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    qs.set('page', String(params.page ?? 1));
    qs.set('size', String(params.size ?? 50));
    return call(`/api/admin/events?${qs.toString()}`, token);
  },
};
