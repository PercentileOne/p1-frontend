import { useAuthStore } from '../auth/authStore';

// Following another person (2026-10-18). Absolute URL on purpose (see CLAUDE.md).
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface FollowState { following: boolean; followers: number }

function headers(json = false): Record<string, string> {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export const followsApi = {
  async get(userId: string): Promise<FollowState> {
    try {
      const res = await fetch(`${API_BASE}/api/follows/${encodeURIComponent(userId)}`, { headers: headers() });
      if (!res.ok) return { following: false, followers: 0 };
      return await res.json() as FollowState;
    } catch { return { following: false, followers: 0 }; }
  },
  /** Throws if it did not save, so the button can go back. */
  async set(userId: string, on: boolean): Promise<FollowState> {
    const res = await fetch(`${API_BASE}/api/follows/${encodeURIComponent(userId)}`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ on }) });
    if (!res.ok) throw new Error('That did not save. Try again.');
    return await res.json() as FollowState;
  },
};
