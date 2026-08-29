// ─────────────────────────────────────────────────────────────────────────────
// Reactions ("like") API client — typed wrapper for POST/GET /reactions/{type}/{id}.
// Follows profileApi.ts's fetch-wrapper conventions.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export type ReactionTargetType = 'profile';

export interface ReactionState {
  liked: boolean;
  count: number;
}

export interface ApiError { error: string; status: number }

async function call<T>(path: string, token: string, method: 'GET' | 'POST'): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export const reactionsApi = {
  get(token: string, targetType: ReactionTargetType, targetId: string): Promise<ReactionState> {
    return call(`/reactions/${targetType}/${targetId}`, token, 'GET');
  },

  toggle(token: string, targetType: ReactionTargetType, targetId: string): Promise<ReactionState> {
    return call(`/reactions/${targetType}/${targetId}/toggle`, token, 'POST');
  },
};
