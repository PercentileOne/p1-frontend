// Admin-wide interview oversight — typed wrapper for GET /api/admin/interviews in
// Explain.Api (Features/Interviews/Admin/). Needs a bearer token from a user holding
// CAN_VIEW_ALL_INTERVIEWS.

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface AdminInterview {
  id: string;
  candidateId: string;
  candidateName: string;
  createdAt: string;
  role: string | null;
  company: string | null;
  overallScore: number;
  questionCount: number;
  isShared: boolean;
  hasVideo: boolean;
  shareToken: string | null;
}

export interface AdminInterviewListResponse {
  total: number;
  page: number;
  size: number;
  rows: AdminInterview[];
}

export interface ApiError { error: string; status: number }

export const interviewsApi = {
  async list(token: string, params?: { search?: string; page?: number; size?: number }): Promise<AdminInterviewListResponse> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.size) qs.set('size', String(params.size));
    const suffix = qs.toString() ? `?${qs}` : '';

    const res = await fetch(`${BASE}/api/admin/interviews${suffix}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<AdminInterviewListResponse>;
  },
};

export const SHARED_VIEW_BASE = 'https://candidate.interviewme.global/shared';
