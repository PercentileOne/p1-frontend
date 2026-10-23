// The homepage talking guide's public on/off switch (admin page) — talks to Explain.Api's Features/SiteAgents/Endpoint.cs.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface ApiError { error: string; status: number }

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw { error: (body as { error?: string }).error ?? `Request failed (${res.status}).`, status: res.status } as ApiError
  return body as T
}

export const siteGuideApi = {
  getPublic: (token: string) => call<{ enabled: boolean }>(token, '/api/admin/site-agent/public'),
  setPublic: (token: string, on: boolean) => call<{ enabled: boolean }>(token, '/api/admin/site-agent/public', { method: 'PUT', body: JSON.stringify({ on }) }),
}
