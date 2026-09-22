// Question Packs free-launch-period switch (Francis, 2026-09-22, from dialysis): "for now, it's free... the same
// way other services were free to start with until they got a good amount of users." On (the default until an
// admin sets it) means the checkout endpoint skips Stripe entirely and delivers the pack for £0.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface QuestionPackFreeSetting {
  freeEnabled: boolean;
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

export const questionPackFreeSettingsApi = {
  get(token: string): Promise<QuestionPackFreeSetting> {
    return call('/api/admin/settings/question-pack-free', token);
  },

  update(token: string, freeEnabled: boolean): Promise<QuestionPackFreeSetting> {
    return call('/api/admin/settings/question-pack-free', token, {
      method: 'POST',
      body: JSON.stringify({ freeEnabled }),
    });
  },
};
