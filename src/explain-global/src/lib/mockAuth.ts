const API = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

export type UserRole = 'Candidate' | 'Recruiter' | 'Client';

export interface LoginResponse {
  accessToken: string;
  role: UserRole;
  displayName: string;
  tenantName: string | null;
  redirectTo: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  tenantId: string | null;
  tenantName: string | null;
}

export interface AuthError {
  code: 'INVALID_CREDENTIALS' | 'ROLE_MISMATCH' | 'EMAIL_TAKEN' | 'EMAIL_NOT_VERIFIED' | 'UNKNOWN';
  message: string;
}

const PORTAL_URLS: Record<UserRole, string> = {
  Candidate: 'https://candidate.explain.global',
  Recruiter: 'https://recruiter.explain.global/dashboard',
  Client:    'https://client.explain.global',
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.error ?? json?.message ?? 'Something went wrong.';
    const code: AuthError['code'] =
      res.status === 409 ? 'EMAIL_TAKEN' :
      res.status === 401 ? 'INVALID_CREDENTIALS' : 'UNKNOWN';
    const err: AuthError = { code, message };
    throw err;
  }

  return json as T;
}

interface ApiAuthResponse {
  token: string;
  user: { id: string; email: string; name: string; firstName: string; username: string; role: string };
}

function toLoginResponse(api: ApiAuthResponse): LoginResponse {
  const role = (api.user.role === 'Recruiter' ? 'Recruiter' : api.user.role === 'Client' ? 'Client' : 'Candidate') as UserRole;
  sessionStorage.setItem('explain_token', api.token);
  sessionStorage.setItem('explain_user', JSON.stringify({ ...api.user, role }));
  return {
    accessToken: api.token,
    role,
    displayName: api.user.name,
    tenantName: null,
    redirectTo: PORTAL_URLS[role],
  };
}

export async function login(
  email: string,
  password: string,
  _role: UserRole,
): Promise<LoginResponse> {
  const api = await post<ApiAuthResponse>('/auth/login', { email, password });
  return toLoginResponse(api);
}

export async function register(
  email: string,
  password: string,
  _role: UserRole,
  displayName: string,
  _companyName: string | null,
): Promise<LoginResponse> {
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] ?? displayName;
  const lastName  = parts.slice(1).join(' ') || firstName;

  const api = await post<ApiAuthResponse>('/auth/register', { email, password, firstName, lastName });
  return toLoginResponse(api);
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem('explain_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return { id: u.id, email: u.email, role: u.role as UserRole, displayName: u.name, tenantId: null, tenantName: null };
  } catch {
    return null;
  }
}

export function logout(): void {
  sessionStorage.removeItem('explain_token');
  sessionStorage.removeItem('explain_user');
}
