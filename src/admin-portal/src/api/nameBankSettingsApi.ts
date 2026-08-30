// Name Bank kill switch — a single global setting, gated Super Admin only on the backend
// (CAN_VIEW_SYSTEM_SETTINGS). Off means every candidate gets the generic path, even for an
// already-cached name — a hard override, not just "stop generating new ones."

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface NameBankSetting {
  autoGenerateEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface NameGreeting {
  id: string;
  name: string;
  speaker: string;
  difficulty: string;
  videoUrl: string;
  useCount: number;
  generatedAt: string;
  lastUsedAt: string | null;
  status: 'ready' | 'pending' | 'failed';
  failureReason: string | null;
  startedAt: string | null;
  attemptCount: number;
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

export const nameBankSettingsApi = {
  get(token: string): Promise<NameBankSetting> {
    return call('/api/admin/settings/name-bank', token);
  },

  update(token: string, autoGenerateEnabled: boolean): Promise<NameBankSetting> {
    return call('/api/admin/settings/name-bank', token, {
      method: 'POST',
      body: JSON.stringify({ autoGenerateEnabled }),
    });
  },

  listGreetings(token: string): Promise<NameGreeting[]> {
    return call('/api/admin/name-greetings', token);
  },
};
