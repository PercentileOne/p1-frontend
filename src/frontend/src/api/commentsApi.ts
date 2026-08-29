// ─────────────────────────────────────────────────────────────────────────────
// Profile comments API client — typed wrapper for GET/POST /profile/{userId}/comments,
// DELETE /comments/{id}, POST /comments/{id}/report. Follows profileApi.ts's
// fetch-wrapper conventions.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface ProfileComment {
  id: string;
  profileUserId: string;
  authorUserId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: string;
  status: 'visible' | 'deleted';
  reportCount: number;
  reportedByUserIds: string[];
  lastReportedAt?: string | null;
}

export interface ApiError { error: string; status: number }

async function req<T>(path: string, token: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const commentsApi = {
  list(token: string, profileUserId: string): Promise<ProfileComment[]> {
    return req(`/profile/${profileUserId}/comments`, token, 'GET');
  },

  create(token: string, profileUserId: string, text: string): Promise<ProfileComment> {
    return req(`/profile/${profileUserId}/comments`, token, 'POST', { text });
  },

  remove(token: string, id: string, profileUserId: string): Promise<void> {
    return req(`/comments/${id}?profileUserId=${encodeURIComponent(profileUserId)}`, token, 'DELETE');
  },

  report(token: string, id: string, profileUserId: string): Promise<ProfileComment> {
    return req(`/comments/${id}/report?profileUserId=${encodeURIComponent(profileUserId)}`, token, 'POST');
  },
};
