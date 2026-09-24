// Public Learn ("Learn Anything") daily-caps switch (Francis, 2026-09-24): the marketing page's
// no-login lesson generator. Off (the default until an admin sets it) means it's uncapped.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface LearnCapsSetting {
  capsEnabled: boolean;
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

export const learnCapsSettingsApi = {
  get(token: string): Promise<LearnCapsSetting> {
    return call('/api/admin/settings/learn-caps', token);
  },

  update(token: string, capsEnabled: boolean): Promise<LearnCapsSetting> {
    return call('/api/admin/settings/learn-caps', token, {
      method: 'POST',
      body: JSON.stringify({ capsEnabled }),
    });
  },
};
