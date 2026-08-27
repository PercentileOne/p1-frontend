// ─────────────────────────────────────────────────────────────────────────────
// Introductions API client — typed wrapper for /api/introductions in Explain.Api.
// Recruiter side: sending an employer a link to watch one candidate's interview.
// A recruiter's introduction is fee-bearing — see Features/Introductions/Endpoint.cs
// for why that's enforced server-side, not just trusted from this request body.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface Introduction {
  id: string;
  senderId: string;
  senderType: 'recruiter' | 'candidate';
  senderName: string;
  candidateName: string;
  candidateRole: string | null;
  overallScore: number | null;
  playbackUrl: string | null;
  employerEmail: string;
  employerCompany: string | null;
  message: string | null;
  proposedFeeGbp: number | null;
  status: 'sent' | 'viewed' | 'accepted' | 'declined';
  createdAt: string;
  viewedAt: string | null;
}

export interface CreateIntroductionRequest {
  candidateName: string;
  candidateRole?: string;
  overallScore?: number;
  playbackUrl?: string;
  employerEmail: string;
  employerCompany?: string;
  message?: string;
  proposedFeeGbp?: number;
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
  return res.json() as Promise<T>;
}

export const introductionsApi = {
  send(token: string, body: CreateIntroductionRequest): Promise<Introduction> {
    return call('/api/introductions', token, { method: 'POST', body: JSON.stringify(body) });
  },

  sent(token: string): Promise<Introduction[]> {
    return call('/api/introductions', token);
  },
};
