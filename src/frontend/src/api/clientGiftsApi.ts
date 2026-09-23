// "Gift interview questions to your client" (Francis, 2026-09-23) — the public, anonymous read side
// only; sending is a recruiter-portal-authenticated action (see recruiter-portal's own clientGiftsApi.ts).
// Talks to Explain.Api's Features/ClientGifts. Same absolute-URL rule as every other backend call here.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface ClientGiftContent {
  jobRole: string;
  difficulty: string;
  questions: { question: string; answer: string }[];
  recruiterName: string;
  agencyName: string | null;
  employerCompany: string | null;
}

export async function getClientGift(id: string): Promise<ClientGiftContent | null> {
  try {
    const res = await fetch(`${API_BASE}/api/client-gifts/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json() as ClientGiftContent;
  } catch {
    return null;
  }
}
