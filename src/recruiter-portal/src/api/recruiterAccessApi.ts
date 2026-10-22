// What tier the signed-in recruiter is on, and how much of the free allowance they have used (Features/RecruiterAccess on the server).
// The server decides every limit; this only reads and shows them.
const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface RecruiterAccess {
  approved: boolean;
  tier: 'approved' | 'self-service';
  freeUntil: string | null;      // set while the free months last
  prepCap: number;
  prepsThisMonth: number;
  enforced: boolean;
}

export async function getRecruiterAccess(token: string): Promise<RecruiterAccess | null> {
  try {
    const res = await fetch(`${BASE}/api/recruiter/access`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? await res.json() as RecruiterAccess : null;
  } catch { return null; }
}
