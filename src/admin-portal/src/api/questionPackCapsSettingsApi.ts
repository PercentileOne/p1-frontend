// Question Packs daily-caps switch (Francis, 2026-09-22): "please leave it uncapped for now, or add a switch
// in the admin portal for me to switch it on and off." Off (the default until an admin sets it) means every
// /questions call — preview, What's Hot, the paid 25-question generation — skips its daily allowance entirely.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface QuestionPackCapsSetting {
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

export const questionPackCapsSettingsApi = {
  get(token: string): Promise<QuestionPackCapsSetting> {
    return call('/api/admin/settings/question-pack-caps', token);
  },

  update(token: string, capsEnabled: boolean): Promise<QuestionPackCapsSetting> {
    return call('/api/admin/settings/question-pack-caps', token, {
      method: 'POST',
      body: JSON.stringify({ capsEnabled }),
    });
  },
};
