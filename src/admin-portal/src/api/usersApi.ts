// ─────────────────────────────────────────────────────────────────────────────
// Users directory API client — typed wrapper for the admin-gated GET /api/admin/users
// endpoint in Explain.Api (Features/Users/List/). Read-only; backs the
// Candidates/Employers screens. Needs a bearer token from a user holding
// CAN_VIEW_ADMIN_PORTAL.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface UserSubscriptionSummary {
  plan: string;
  status: string;          // active | cancelled | past_due | paused
  priceGbp: number;
  renewsAt: string | null;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  roles: string[];
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  emailVerified: boolean;
  subscription: UserSubscriptionSummary | null;
}

export interface UserListResponse {
  total: number;
  page: number;
  size: number;
  rows: UserSummary[];
}

export interface ApiError {
  error: string;
  status: number;
}

export interface CreateUserResult { id: string; email: string; name: string; role: string }

export const usersApi = {
  async list(token: string, params: { role?: string; search?: string; page?: number; size?: number }): Promise<UserListResponse> {
    const qs = new URLSearchParams();
    if (params.role) qs.set('role', params.role);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.size) qs.set('size', String(params.size));

    const res = await fetch(`${BASE}/api/admin/users?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<UserListResponse>;
  },

  // Creates a standalone account (not tied to an Organisation) and emails a set-password
  // invite — backs the "New Recruiter"/"New Candidate"/"New Employer" buttons.
  async create(token: string, body: { email: string; name: string; role: 'candidate' | 'recruiter' | 'employer' }): Promise<CreateUserResult> {
    const res = await fetch(`${BASE}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<CreateUserResult>;
  },

  // Permanent (until explicitly unlocked) — distinct from the auto-expiring brute-force
  // lockout LoginCommandHandler already applies on its own. Backend also enforces this live on
  // every authenticated request (not just at login), so a locked account's existing 30-day
  // session token stops working immediately too, not just future login attempts.
  async lock(token: string, userId: string, reason?: string): Promise<void> {
    const res = await fetch(`${BASE}/api/admin/users/${userId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
  },

  async unlock(token: string, userId: string): Promise<void> {
    const res = await fetch(`${BASE}/api/admin/users/${userId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
  },
};
