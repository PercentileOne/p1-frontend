// Interview pass certificates (Francis, 2026-09-19). Issued by the backend for PASSES ONLY — the server re-checks the
// saved score and difficulty, so nothing here can mint one for a non-pass. Public view is by an unguessable token.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface PublicCertificate {
  candidateName?: string | null;
  role?: string | null;
  company?: string | null;
  companyMock: boolean;
  overallScore: number;
  difficulty: string;
  passMark: number;
  createdAt: string;
}

// Owner only. Returns the certificate token, or a reason (e.g. the interview hasn't finished saving yet).
export async function issueCertificate(authToken: string, candidateId: string, interviewId: string):
  Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/interviews/${encodeURIComponent(candidateId)}/${encodeURIComponent(interviewId)}/certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) return { ok: true, token: (await res.json() as { certificateToken: string }).certificateToken };
    if (res.status === 404) return { ok: false, reason: "Your interview is still being saved — try again in a few seconds." };
    if (res.status === 403) return { ok: false, reason: 'Certificates are only issued for a pass.' };
    return { ok: false, reason: "We couldn't create your certificate just now — please try again." };
  } catch {
    return { ok: false, reason: "We couldn't reach the server — please try again." };
  }
}

export async function getCertificate(token: string): Promise<PublicCertificate | null> {
  try {
    const res = await fetch(`${API_BASE}/api/certificates/${encodeURIComponent(token)}`);
    return res.ok ? await res.json() as PublicCertificate : null;
  } catch { return null; }
}
