// ─────────────────────────────────────────────────────────────────────────────
// Organisations API client — typed wrappers for the admin-gated
// /api/admin/organisations endpoints in Explain.Api (Features/Organisations/).
// Every call needs a bearer token from a user holding CAN_MANAGE_ORGANISATIONS.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface OrganisationSummary {
  id: number;
  name: string;
  type: string;
  contactEmail: string;
  contactName: string;
  phone: string | null;
  website: string | null;
  domain: string | null;
  seatCount: number;
  seatMonthlyFeeGbp: number;
  prepUnitPriceGbp: number;
  promoSeatFeeGbp: number | null;
  promoExpiresAt: string | null;
  effectiveSeatMonthlyFeeGbp: number;
  status: string;
  createdAt: string;
  memberCount: number;
}

export interface OrganisationMember {
  id: number;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface OrganisationDetail {
  id: number;
  name: string;
  type: string;
  contactEmail: string;
  contactName: string;
  phone: string | null;
  website: string | null;
  domain: string | null;
  seatCount: number;
  seatMonthlyFeeGbp: number;
  prepUnitPriceGbp: number;
  promoSeatFeeGbp: number | null;
  promoExpiresAt: string | null;
  effectiveSeatMonthlyFeeGbp: number;
  status: string;
  createdAt: string;
  members: OrganisationMember[];
}

export interface OrganisationListResponse {
  total: number;
  page: number;
  size: number;
  rows: OrganisationSummary[];
}

export interface CreateOrganisationRequest {
  name: string;
  contactEmail: string;
  contactName: string;
  phone: string;
  type?: string;
  website?: string;
  domain?: string;
  seatCount?: number;
  seatMonthlyFeeGbp?: number;
  prepUnitPriceGbp?: number;
  promoSeatFeeGbp?: number;
  promoExpiresAt?: string;
  status?: string;
}

export interface UpdateOrganisationRequest {
  name?: string;
  type?: string;
  contactEmail?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  domain?: string;
  seatCount?: number;
  seatMonthlyFeeGbp?: number;
  prepUnitPriceGbp?: number;
  status?: string;
  promoSeatFeeGbp?: number;
  promoExpiresAt?: string;
  clearPromo?: boolean;
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

export const organisationsApi = {
  list(token: string, params?: { search?: string; page?: number; size?: number }): Promise<OrganisationListResponse> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.size) qs.set('size', String(params.size));
    const suffix = qs.toString() ? `?${qs}` : '';
    return call(`/api/admin/organisations${suffix}`, token);
  },

  get(token: string, id: number): Promise<OrganisationDetail> {
    return call(`/api/admin/organisations/${id}`, token);
  },

  create(token: string, body: CreateOrganisationRequest): Promise<{ id: number }> {
    return call('/api/admin/organisations', token, { method: 'POST', body: JSON.stringify(body) });
  },

  update(token: string, id: number, body: UpdateOrganisationRequest): Promise<{ id: number }> {
    return call(`/api/admin/organisations/${id}`, token, { method: 'PUT', body: JSON.stringify(body) });
  },

  addMember(token: string, orgId: number, body: { email: string; role?: string; name?: string }): Promise<OrganisationMember & { invited: boolean }> {
    return call(`/api/admin/organisations/${orgId}/members`, token, { method: 'POST', body: JSON.stringify(body) });
  },

  removeMember(token: string, orgId: number, memberId: number): Promise<void> {
    return call(`/api/admin/organisations/${orgId}/members/${memberId}`, token, { method: 'DELETE' });
  },
};
