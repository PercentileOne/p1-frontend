// LiveAvatar kill switch — a single global setting, gated Super Admin only on the backend
// (CAN_VIEW_SYSTEM_SETTINGS), same shape as Name Bank's. Off means every interview falls back
// to its pre-LiveAvatar path instantly (static photo + ElevenLabs TTS) — a real circuit
// breaker for HeyGen usage/cost, not just "stop starting new sessions."

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface LiveAvatarSetting {
  enabled: boolean;
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const liveAvatarSettingsApi = {
  get(token: string): Promise<LiveAvatarSetting> {
    return call('/api/admin/settings/live-avatar', token);
  },

  update(token: string, enabled: boolean): Promise<LiveAvatarSetting> {
    return call('/api/admin/settings/live-avatar', token, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },
};
