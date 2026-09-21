// Recruiter/employer "Request access" queue (Francis, 2026-09-21) — Explain.Api's Features/AccessRequests admin endpoints.
const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5000'

export type RequestStatus = 'new' | 'contacted' | 'approved' | 'paid' | 'declined'

export interface AccessRequest {
  id: string
  name: string
  company: string
  email: string
  phone: string
  type: 'recruiter' | 'employer'
  seats: number
  message: string | null
  status: RequestStatus
  notes: string | null
  quotedMonthlyGbp: number | null
  organisationId: number | null
  paymentLinkSentAt: string | null
  paidAt: string | null
  handledBy: string | null
  createdAt: string
  updatedAt: string
  defaultSeatFeeGbp: number
}

export interface PaymentLinkResult { url: string; perSeat: number; seats: number; emailed: boolean; validForHours: number }

async function call<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = res.statusText
    try { const j = await res.json() as { error?: string }; message = j.error ?? message } catch { /* not JSON */ }
    throw new Error(message)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : {}) as T
}

export const accessRequestsApi = {
  list: (token: string) => call<AccessRequest[]>('/api/admin/access-requests', token),
  update: (token: string, id: string, patch: { status?: RequestStatus; notes?: string; quotedMonthlyGbp?: number; seats?: number }) =>
    call<unknown>(`/api/admin/access-requests/${id}`, token, 'PUT', patch),
  createAccount: (token: string, id: string) =>
    call<{ organisationId: number; invited: boolean; email: string }>(`/api/admin/access-requests/${id}/create-account`, token, 'POST', {}),
  paymentLink: (token: string, id: string, monthlyGbp: number) =>
    call<PaymentLinkResult>(`/api/admin/access-requests/${id}/payment-link`, token, 'POST', { monthlyGbp }),
}
