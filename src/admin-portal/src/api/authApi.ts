// ─────────────────────────────────────────────────────────────────────────────
// Auth API client — typed wrappers for the shared .NET backend auth endpoints.
// Copied from src/frontend/src/api/authApi.ts (the candidate portal's real auth
// client) rather than the recruiter portal's old auth-magic-link/auth-demo/
// auth-verify Azure Functions, which issued unsigned-against-nothing JWTs for
// any email with no persistence at all. Base URL resolves from
// VITE_EXPLAIN_API_URL (prod) or localhost:5130 (dev), matching explainApi.ts.
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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  register(body: {
    email:     string;
    password:  string;
    firstName: string;
    lastName:  string;
    role?:     string; // "recruiter" — omit/anything else defaults to Candidate server-side
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
