// ─────────────────────────────────────────────────────────────────────────────
// Candidate Search API client — GET /api/candidates/search in Explain.Api.
// Only returns candidates who've opted in (UserProfile.SearchableByRecruiters).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface CandidateSearchResult {
  userId: string;
  name: string;
  avatar: string | null;
  jobRole: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  interests: string[];
  projectsSummary: string[];
  employmentTypePreference: string | null;
  remotePreference: string | null;
  bestScore: number | null;
  country: string | null;
}

export interface CandidateSearchResponse {
  total: number;
  page: number;
  size: number;
  rows: CandidateSearchResult[];
}

export interface CandidateInterviewSummary {
  id: string;
  createdAt: string;
  role: string | null;
  company: string | null;
  overallScore: number;
  isShared: boolean;
  hasVideo: boolean;
}

export interface ApiError { error: string; status: number }

async function call<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export const candidateSearchApi = {
  search(token: string, params: {
    q?: string; location?: string; interest?: string; role?: string;
    employmentType?: string; remote?: string; country?: string; minScore?: number;
    radiusMiles?: number; page?: number; size?: number;
  }): Promise<CandidateSearchResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.location) qs.set('location', params.location);
    if (params.interest) qs.set('interest', params.interest);
    if (params.role) qs.set('role', params.role);
    if (params.employmentType) qs.set('employmentType', params.employmentType);
    if (params.remote) qs.set('remote', params.remote);
    if (params.country) qs.set('country', params.country);
    if (params.minScore !== undefined) qs.set('minScore', String(params.minScore));
    if (params.radiusMiles !== undefined) qs.set('radiusMiles', String(params.radiusMiles));
    qs.set('page', String(params.page ?? 1));
    qs.set('size', String(params.size ?? 20));
    return call(`/api/candidates/search?${qs.toString()}`, token);
  },

  getCandidateInterviews(token: string, userId: string): Promise<CandidateInterviewSummary[]> {
    return call(`/api/candidates/${userId}/interviews`, token);
  },
};
