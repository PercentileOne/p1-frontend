// ─────────────────────────────────────────────────────────────────────────────
// Minimal profile client — GET /profile/{userId} in Explain.Api. Just enough to
// render a candidate-search result's full detail view.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface PublicProfile {
  userId: string;
  name: string;
  username: string;
  bio: string;
  jobRole: string | null;
  jobTitle: string | null;
  company: string | null;
  interests: string[];
  avatar: string | null;
  banner: string | null;
  location: string | null;
  commentsEnabled: boolean;
  employmentTypePreference?: string | null;
  remotePreference?: string | null;
  bestScore?: number | null;
  country?: string | null;
}

export interface ApiError { error: string; status: number }

export const profileApi = {
  async getPublicProfile(token: string, userId: string): Promise<PublicProfile> {
    const res = await fetch(`${BASE}/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<PublicProfile>;
  },
};
