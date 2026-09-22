// ─────────────────────────────────────────────────────────────────────────────
// Team API client — typed wrapper for /api/organisations/team in Explain.Api
// (Features/Organisations/Team/). A shared message feed for an organisation's own
// people, plus the seat roster ("8 of 10 seats used"). Francis, 2026-09-22.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface TeamMember {
  id: number;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface TeamInfo {
  organisationId: number;
  organisationName: string;
  seatCount: number;
  seatsUsed: number;
  seatsRemaining: number;
  members: TeamMember[];
}

export interface TeamPost {
  id: string;
  organisationId: string;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  authorRole: 'admin' | 'member';
  createdAt: string;
  text: string;
}

export interface ApiError {
  error: string;
  status: number;
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

export const teamApi = {
  info(token: string): Promise<TeamInfo> {
    return call('/api/organisations/team', token);
  },
  posts(token: string, limit = 60): Promise<TeamPost[]> {
    return call(`/api/organisations/team/posts?limit=${limit}`, token);
  },
  post(token: string, text: string): Promise<TeamPost> {
    return call('/api/organisations/team/posts', token, { method: 'POST', body: JSON.stringify({ text }) });
  },
  remove(token: string, id: string): Promise<void> {
    return call(`/api/organisations/team/posts/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
  },
};
