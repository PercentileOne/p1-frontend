// ─────────────────────────────────────────────────────────────────────────────
// Client Gifts API client — typed wrapper for /api/client-gifts in Explain.Api.
// Recruiter gifting a free batch of interview questions to their CLIENT (the
// hiring-side interviewer) — same shape as introductionsApi.ts, different payload.
// See backend Features/ClientGifts/Endpoint.cs for the caching-by-client behaviour.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface ClientGiftSummary {
  id: string;
  employerEmail: string;
  employerCompany: string | null;
  jobRole: string;
  difficulty: string;
  count: number;
  lastSentAt: string;
  sendCount: number;
}

export interface SendClientGiftRequest {
  employerEmail: string;
  employerCompany?: string;
  jobRole: string;
  difficulty?: string;
  count?: number;
  message?: string;
  regenerate?: boolean;
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
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw { error: json.error || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export const clientGiftsApi = {
  send(token: string, body: SendClientGiftRequest): Promise<{ id: string; reused: boolean; count: number }> {
    return call('/api/client-gifts', token, { method: 'POST', body: JSON.stringify(body) });
  },

  remove(token: string, ids: string[]): Promise<{ deleted: number }> {
    return call('/api/client-gifts/delete', token, { method: 'POST', body: JSON.stringify({ ids }) });
  },

  list(token: string): Promise<ClientGiftSummary[]> {
    return call('/api/client-gifts', token);
  },
};
