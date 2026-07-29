/**
 * Mock authentication layer.
 *
 * This module mirrors the exact contract the real .NET 10 auth API will expose:
 *   POST /api/auth/login   → LoginResponse
 *   POST /api/auth/register → LoginResponse
 *   GET  /api/auth/me      → UserProfile
 *   POST /api/auth/logout  → void
 *
 * When the real backend is ready, replace the functions below with fetch() calls
 * to the same endpoints. The callers (Login.tsx, Register.tsx) change zero lines.
 */

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

// ─── Mock user store ──────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  email: string;
  password: string; // plain text only in mock — real backend uses bcrypt
  role: UserRole;
  displayName: string;
  tenantId: string | null;
  tenantName: string | null;
}

const MOCK_USERS: MockUser[] = [
  {
    id: 'u-001',
    email: 'candidate@explain.global',
    password: 'demo1234',
    role: 'Candidate',
    displayName: 'Alex Morgan',
    tenantId: null,
    tenantName: null,
  },
  {
    id: 'u-002',
    email: 'recruiter@explain.global',
    password: 'demo1234',
    role: 'Recruiter',
    displayName: 'Mike Petrie',
    tenantId: 'tenant-vallum',
    tenantName: 'Vallum Talent',
  },
  {
    id: 'u-003',
    email: 'client@explain.global',
    password: 'demo1234',
    role: 'Client',
    displayName: 'Sarah Chen',
    tenantId: 'tenant-barclays',
    tenantName: 'Barclays',
  },
];

// In-session registrations (cleared on page refresh — real backend persists to Azure SQL)
const SESSION_USERS: MockUser[] = [];

// ─── Portal redirect map ──────────────────────────────────────────────────────

const PORTAL_URLS: Record<UserRole, string> = {
  Candidate: 'https://candidate.explain.global',
  Recruiter: 'https://recruiter.explain.global/dashboard',
  Client:    'https://client.explain.global',
};

function redirectFor(role: UserRole): string {
  return PORTAL_URLS[role];
}

// ─── Simulated network delay ──────────────────────────────────────────────────

function delay(ms = 900): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Auth functions ───────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  role: UserRole,
): Promise<LoginResponse> {
  await delay();

  const all = [...MOCK_USERS, ...SESSION_USERS];
  const user = all.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.password !== password) {
    const err: AuthError = { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' };
    throw err;
  }

  if (user.role !== role) {
    const err: AuthError = {
      code: 'ROLE_MISMATCH',
      message: `This account is registered as a ${user.role}, not a ${role}. Please select the correct account type.`,
    };
    throw err;
  }

  // Real backend issues a signed JWT here. Mock issues a fake token.
  const accessToken = btoa(JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + 28800000 }));

  // Store in sessionStorage so /me works within the same tab session
  sessionStorage.setItem('explain_mock_token', accessToken);
  sessionStorage.setItem('explain_mock_user', JSON.stringify(user));

  return {
    accessToken,
    role: user.role,
    displayName: user.displayName,
    tenantName: user.tenantName,
    redirectTo: redirectFor(user.role),
  };
}

export async function register(
  email: string,
  password: string,
  role: UserRole,
  displayName: string,
  companyName: string | null,
): Promise<LoginResponse> {
  await delay(1100);

  const all = [...MOCK_USERS, ...SESSION_USERS];
  const existing = all.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    const err: AuthError = { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' };
    throw err;
  }

  const newUser: MockUser = {
    id: `u-${Date.now()}`,
    email,
    password,
    role,
    displayName,
    tenantId: companyName ? `tenant-${Date.now()}` : null,
    tenantName: companyName || null,
  };

  SESSION_USERS.push(newUser);

  const accessToken = btoa(JSON.stringify({ sub: newUser.id, role: newUser.role, exp: Date.now() + 28800000 }));
  sessionStorage.setItem('explain_mock_token', accessToken);
  sessionStorage.setItem('explain_mock_user', JSON.stringify(newUser));

  return {
    accessToken,
    role: newUser.role,
    displayName: newUser.displayName,
    tenantName: newUser.tenantName,
    redirectTo: redirectFor(newUser.role),
  };
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem('explain_mock_user');
    if (!raw) return null;
    const u: MockUser = JSON.parse(raw);
    return { id: u.id, email: u.email, role: u.role, displayName: u.displayName, tenantId: u.tenantId, tenantName: u.tenantName };
  } catch {
    return null;
  }
}

export function logout(): void {
  sessionStorage.removeItem('explain_mock_token');
  sessionStorage.removeItem('explain_mock_user');
}
