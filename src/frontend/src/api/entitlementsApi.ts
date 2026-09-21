// Who may start an interview, and how many (Francis, 2026-09-21) — client side of Explain.Api's Features/Entitlements. The server
// decides; this only asks, shows the result, and starts Stripe checkout. While the server's enforcement switch is OFF it always
// answers "allowed", so nothing here changes what anyone can do until that switch is flipped.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface StartInterviewResult {
  allowed: boolean;
  enforced: boolean;
  source: string;      // staff | complimentary | subscription | pass | taster | none | enforcement-off
  code: string;        // daily-cap | monthly-cap | taster-used | verify-email | email-not-eligible | no-access | ...
  message: string;
  usageId: string | null;
  ticket?: string | null;   // signed proof the server allowed this interview — sent with the avatar-session request
}

export interface EntitlementStatus {
  enforced: boolean;
  plan: 'staff' | 'complimentary' | 'subscriber' | 'pass' | 'taster' | 'none';
  canStartInterview: boolean;
  code: string;
  message: string;
  dailyUsed: number; dailyCap: number; monthlyUsed: number; monthlyCap: number;
  passSessionsLeft: number;
  tasterAvailable: boolean;
}

// The ticket outlives page navigation and a room reload (sessionStorage), and is sent with every avatar-session request.
const TICKET_KEY = 'interviewTicket';
export function setInterviewTicket(ticket: string | null | undefined) {
  try { if (ticket) sessionStorage.setItem(TICKET_KEY, ticket); else sessionStorage.removeItem(TICKET_KEY); } catch { /* private mode */ }
}
export function getInterviewTicket(): string | null {
  try { return sessionStorage.getItem(TICKET_KEY); } catch { return null; }
}

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

// Fails OPEN: if the check itself can't be reached (network blip, the demo login's fake token), the interview is allowed rather
// than a paying customer being locked out by our outage. The server-side ticket on the avatar session is the hard backstop.
export async function startInterview(token: string): Promise<StartInterviewResult> {
  try {
    const res = await fetch(`${API_BASE}/api/entitlements/interview/start`, { method: 'POST', headers: headers(token) });
    if (res.ok) return await res.json() as StartInterviewResult;
  } catch { /* fall through to fail-open */ }
  return { allowed: true, enforced: false, source: 'unchecked', code: 'unchecked', message: '', usageId: null };
}

export async function voidInterviewStart(token: string, usageId: string): Promise<void> {
  try { await fetch(`${API_BASE}/api/entitlements/interview/${encodeURIComponent(usageId)}/void`, { method: 'POST', headers: headers(token) }); } catch { /* best effort */ }
}

export async function getMyEntitlements(token: string): Promise<EntitlementStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/entitlements/me`, { headers: headers(token) });
    return res.ok ? await res.json() as EntitlementStatus : null;
  } catch { return null; }
}

export async function subscriptionsAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/subscriptions/available`);
    return res.ok ? (await res.json() as { available: boolean }).available : false;
  } catch { return false; }
}

// Both return the Stripe-hosted checkout URL to send the browser to, or an error message to show.
export async function startSubscriptionCheckout(token: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/subscriptions/checkout`, { method: 'POST', headers: headers(token) });
    const body = await res.json().catch(() => ({})) as { checkoutUrl?: string; error?: string };
    if (res.ok && body.checkoutUrl) return { url: body.checkoutUrl };
    return { error: body.error ?? "We couldn't start checkout just now — please try again." };
  } catch { return { error: "We couldn't reach the server — please try again." }; }
}

export async function startPassCheckout(user: { email: string; name: string }): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/session-passes/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: user.email, recipientName: user.name, tierId: 'self', senderName: user.name, senderEmail: user.email }),
    });
    const body = await res.json().catch(() => ({})) as { checkoutUrl?: string; message?: string };
    if (res.ok && body.checkoutUrl) return { url: body.checkoutUrl };
    return { error: body.message ?? "We couldn't start checkout just now — please try again." };
  } catch { return { error: "We couldn't reach the server — please try again." }; }
}

export async function openSubscriptionPortal(token: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/subscriptions/portal`, { method: 'POST', headers: headers(token) });
    const body = await res.json().catch(() => ({})) as { url?: string; error?: string };
    return res.ok && body.url ? { url: body.url } : { error: body.error ?? "We couldn't open your subscription just now." };
  } catch { return { error: "We couldn't reach the server — please try again." }; }
}
