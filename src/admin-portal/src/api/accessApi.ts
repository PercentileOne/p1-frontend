// Admin "Access" API client (Francis, 2026-09-21) — talks to Explain.Api's Features/Entitlements admin endpoints: who gets free access
// (staff / complimentary / comps), the daily and monthly limits, and the master enforcement switch.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5000';

export interface AccessSettings { enforce: boolean; dailyCap: number; monthlyCap: number; tasterEnabled: boolean }
export interface AccessGrant {
  id: number; email: string; kind: 'staff' | 'complimentary' | 'comp'; reason: string; grantedBy: string;
  grantedAt: string; expiresAt: string | null; revokedAt: string | null;
}
export interface AccessOverview {
  settings: AccessSettings;
  grants: AccessGrant[];
  counts: { staff: number; complimentary: number; comps: number; totalAccounts: number };
  last7Days: { started: number; wouldHaveBeenBlocked: number; bySource: Record<string, number> };
}
export interface UsageRow { id: string; email: string; source: string; enforced: boolean; wouldBlock: boolean; startedAt: string; voidedAt: string | null }
export interface ApiError { error: string; status: number }

async function call<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = res.statusText;
    try { const j = await res.json() as { error?: string }; message = j.error ?? message; } catch { /* not JSON */ }
    throw { error: message, status: res.status } satisfies ApiError;
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export const accessApi = {
  overview: (token: string) => call<AccessOverview>('/api/admin/access', token),
  usage: (token: string) => call<UsageRow[]>('/api/admin/access/usage?take=100', token),
  saveSettings: (token: string, s: AccessSettings) => call<AccessSettings>('/api/admin/access/settings', token, 'PUT', s),
  addGrant: (token: string, g: { email: string; kind: 'staff' | 'comp'; reason: string }) => call<{ id: number }>('/api/admin/access/grants', token, 'POST', g),
  revokeGrant: (token: string, id: number) => call<unknown>(`/api/admin/access/grants/${id}`, token, 'DELETE'),
  grantAllExisting: (token: string) => call<{ granted: number }>('/api/admin/access/grant-all-existing', token, 'POST', {}),
  revokeComplimentary: (token: string) => call<{ revoked: number }>('/api/admin/access/revoke-complimentary', token, 'POST', {}),
};
