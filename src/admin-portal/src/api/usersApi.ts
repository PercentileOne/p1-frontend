// ─────────────────────────────────────────────────────────────────────────────
// Users directory API client — typed wrapper for the admin-gated GET /api/admin/users
// endpoint in Explain.Api (Features/Users/List/). Read-only; backs the
// Candidates/Employers screens. Needs a bearer token from a user holding
// CAN_VIEW_ADMIN_PORTAL.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  roles: string[];
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
};
