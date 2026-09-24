// AI proxy daily-ceiling switch (Francis, 2026-09-24). On (the default until an admin changes it) means the
// unauthenticated /api/ai-proxy enforces a per-visitor and a site-wide daily ceiling. This exists as a safety valve:
// turn it off if the ceiling ever wrongly blocks real users.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface AiProxyProtectionSetting {
  protectionEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface ApiError { error: string; status: number }

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export const aiProxyProtectionSettingsApi = {
  get(token: string): Promise<AiProxyProtectionSetting> {
    return call('/api/admin/settings/ai-proxy-protection', token);
  },

  update(token: string, protectionEnabled: boolean): Promise<AiProxyProtectionSetting> {
    return call('/api/admin/settings/ai-proxy-protection', token, {
      method: 'POST',
      body: JSON.stringify({ protectionEnabled }),
    });
  },
};
