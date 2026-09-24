// ─────────────────────────────────────────────────────────────────────────────
// Billing summary API client — typed wrapper for GET /api/admin/billing/summary
// in Explain.Api (Features/Billing/Endpoint.cs). Read-only; backs the admin
// portal's Billing page. Needs a bearer token from a user holding CAN_VIEW_ADMIN_PORTAL.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface BillingTransaction {
  type: 'Subscription' | 'Interview Gift' | 'Interview Pass' | 'Question Pack';
  label: string;
  amountGbp: number;
  at: string;
}

export interface BillingSummary {
  candidateMrrGbp: number;
  seatMrrGbp: number;
  totalMrrGbp: number;
  activeSubscriberCount: number;
  activeOrganisationCount: number;
  oneOffLast30DaysGbp: number;
  oneOffAllTimeGbp: number;
  recentTransactions: BillingTransaction[];
}

export interface ApiError {
  error: string;
  status: number;
}

export const billingApi = {
  async summary(token: string): Promise<BillingSummary> {
    const res = await fetch(`${BASE}/api/admin/billing/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<BillingSummary>;
  },
};
