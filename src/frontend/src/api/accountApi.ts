// "Delete my account" client (Francis, 2026-09-21) — talks to Explain.Api's Features/Users/DeleteAccount. Permanent: the server removes the
// person's data everywhere and cancels any subscription; the caller then signs out and leaves.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export async function deleteMyAccount(token: string, confirmEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmEmail }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({})) as { error?: string };
    return { ok: false, error: body.error ?? "We couldn't delete your account just now — please try again." };
  } catch {
    return { ok: false, error: "We couldn't reach the server — please try again." };
  }
}
