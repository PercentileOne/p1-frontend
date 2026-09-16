// ─────────────────────────────────────────────────────────────────────────────
// Auth API client — typed wrappers for the .NET backend auth endpoints.
// Base URL resolves from VITE_EXPLAIN_API_URL (prod) or localhost:5130 (dev).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface AuthUser {
  id:        string;
  email:     string;
  name:      string;
  firstName: string;
  role:      string;
}

export interface AuthResponse {
  token: string;
  user:  AuthUser;
}

export interface SessionResponse {
  userId:      string;
  email:       string;
  name:        string;
  firstName:   string;
  role:        string;
  permissions: string[];
}

export interface ApiError {
  error:  string;
  status: number;
}

// Result<T>.ToHttpResult() (backend Common/Result.cs) returns a real `{"error":"..."}` JSON
// body for 400/404/409/500 (and now 403 — see RegisterCommandHandler's verification-required
// response), but nothing at all for 401 (Results.Unauthorized() has no body). Parse first,
// fall back to the raw text/statusText only when there's genuinely nothing else to show —
// added 2026-09-16 when the new "check your email to verify" registration message would
// otherwise have rendered as a literal `{"error":"..."}` string in the UI.
function extractErrorMessage(text: string, statusText: string): string {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (typeof parsed.error === 'string' && parsed.error) return parsed.error;
    } catch { /* not JSON — fall through to the raw text below */ }
  }
  return text || statusText;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: extractErrorMessage(text, res.statusText), status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw { error: extractErrorMessage(text, res.statusText), status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  register(body: {
    email:      string;
    password:   string;
    firstName:  string;
    lastName:   string;
    profession?: string;
    role?:      string; // "recruiter" — omit/anything else defaults to Candidate server-side
  }): Promise<AuthResponse> {
    return post('/auth/register', body);
  },

  login(body: {
    email:    string;
    password: string;
  }): Promise<AuthResponse> {
    return post('/auth/login', body);
  },

  /** Validates the stored token and returns the full session + permissions. */
  getSession(token: string): Promise<SessionResponse> {
    return get('/auth/me', token);
  },

  logout(token: string): Promise<void> {
    return post('/auth/logout', { token });
  },
};
