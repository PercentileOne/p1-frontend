// Avatar provider switch (Francis, 2026-09-29) — which service draws the interviewer avatars: HeyGen LiveAvatar (the proven default and the
// automatic backup) or Spatius (~1/10 the cost). Super-Admin only on the backend (CAN_VIEW_SYSTEM_SETTINGS), same as the LiveAvatar kill switch.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface AvatarProviderSetting {
  provider: 'heygen' | 'spatius';
  spatiusPercent: number;
  fallbackToHeygen: boolean;
  spatiusAvatarHr: string | null;
  spatiusAvatarTechnical: string | null;
  spatiusAvatarMichelle: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface AvatarProviderResponse {
  setting: AvatarProviderSetting;
  // True when the API app has Spatius__ApiKey and Spatius__AppId set (values are never sent to the browser).
  spatiusConfigured: boolean;
}

export interface AvatarProviderUpdate {
  provider: 'heygen' | 'spatius';
  spatiusPercent: number;
  fallbackToHeygen: boolean;
  spatiusAvatarHr: string;
  spatiusAvatarTechnical: string;
  spatiusAvatarMichelle: string;
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status };
  }
  return res.json() as Promise<T>;
}

export const avatarProviderSettingsApi = {
  get(token: string): Promise<AvatarProviderResponse> {
    return call('/api/admin/settings/avatar-provider', token);
  },
  update(token: string, body: AvatarProviderUpdate): Promise<AvatarProviderSetting> {
    return call('/api/admin/settings/avatar-provider', token, { method: 'POST', body: JSON.stringify(body) });
  },
};
