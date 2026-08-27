// ─────────────────────────────────────────────────────────────────────────────
// Introductions API client — typed wrapper for /api/introductions in Explain.Api
// (Features/Introductions/). A recruiter or candidate sends a link to one
// candidate's interview; the employer watches free (no auth), acting on it
// (accept/decline) needs a real employer account.
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

export interface ApiError {
  error: string;
  status: number;
}

async function call<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export const introductionsApi = {
  /** GET /api/introductions/received — authenticated employer's inbox. */
  received(token: string): Promise<Introduction[]> {
    return call('/api/introductions/received', { token });
  },

  /** GET /api/introductions/watch/{id} — deliberately anonymous, no token. */
  watch(id: string): Promise<Introduction> {
    return call(`/api/introductions/watch/${id}`);
  },

  /** POST /api/introductions/{id}/respond — accept or decline, requires an employer account. */
  respond(token: string, id: string, status: 'accepted' | 'declined'): Promise<Introduction> {
    return call(`/api/introductions/${id}/respond`, { token, method: 'POST', body: JSON.stringify({ status }) });
  },
};
