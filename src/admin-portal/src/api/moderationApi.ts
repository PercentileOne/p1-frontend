// Comment moderation admin API client — talks directly to Explain.Api (comments live
// entirely there, no separate Function App to proxy, unlike careersApi.ts's missing-reports).

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface ReportedComment {
  id: string;
  profileUserId: string;
  authorUserId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: string;
  status: 'visible' | 'deleted';
  reportCount: number;
  reportedByUserIds: string[];
  lastReportedAt: string | null;
}

export interface RepeatOffender {
  authorUserId: string;
  authorName: string;
  reportedCommentCount: number;
}

export interface ReportedCommentsResponse {
  comments: ReportedComment[];
  repeatOffenders: RepeatOffender[];
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

export const moderationApi = {
  listReported(token: string): Promise<ReportedCommentsResponse> {
    return call('/api/admin/comments/reported', token);
  },

  resolve(token: string, id: string, profileUserId: string, action: 'delete' | 'dismiss'): Promise<ReportedComment> {
    const qs = `?profileUserId=${encodeURIComponent(profileUserId)}`;
    return call(`/api/admin/comments/${encodeURIComponent(id)}/resolve${qs}`, token, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
};
