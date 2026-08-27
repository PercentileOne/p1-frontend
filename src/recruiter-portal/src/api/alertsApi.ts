// ─────────────────────────────────────────────────────────────────────────────
// Alerts API client — typed wrapper for /api/alerts in Explain.Api (Features/Alerts/).
// Set a role + minimum-score threshold once, get notified whenever a candidate's
// completed interview clears the bar — the push counterpart to Introductions' pull.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface Alert {
  id: string;
  ownerId: string;
  ownerType: 'recruiter' | 'employer';
  ownerName: string;
  ownerEmail: string;
  role: string;
  minScore: number;
  location: string | null;
  radiusMiles: number | null;
  notifyEmail: boolean;
  notifyInApp: boolean;
  status: 'active' | 'paused';
  createdAt: string;
  matchCount: number;
  lastMatchAt: string | null;
}

export interface AlertMatch {
  id: string;
  ownerId: string;
  alertId: string;
  candidateId: string;
  candidateName: string;
  role: string;
  overallScore: number;
  interviewId: string | null;
  matchedAt: string;
  viewed: boolean;
}

export interface CreateAlertRequest {
  role: string;
  minScore: number;
  location?: string;
  radiusMiles?: number;
  notifyEmail: boolean;
  notifyInApp: boolean;
}

export interface UpdateAlertRequest {
  role?: string;
  minScore?: number;
  location?: string;
  radiusMiles?: number;
  notifyEmail?: boolean;
  notifyInApp?: boolean;
  status?: 'active' | 'paused';
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

export const alertsApi = {
  create(token: string, body: CreateAlertRequest): Promise<Alert> {
    return call('/api/alerts', token, { method: 'POST', body: JSON.stringify(body) });
  },
  list(token: string): Promise<Alert[]> {
    return call('/api/alerts', token);
  },
  update(token: string, id: string, body: UpdateAlertRequest): Promise<Alert> {
    return call(`/api/alerts/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) });
  },
  remove(token: string, id: string): Promise<void> {
    return call(`/api/alerts/${id}`, token, { method: 'DELETE' });
  },
  matches(token: string): Promise<AlertMatch[]> {
    return call('/api/alerts/matches', token);
  },
  markMatchViewed(token: string, id: string): Promise<AlertMatch> {
    return call(`/api/alerts/matches/${id}/view`, token, { method: 'POST' });
  },
};
