// CV/Salary Analyzer (Francis, 2026-09-18) — backend-orchestrated (see
// Features/CvAnalysis/Endpoint.cs's own top comment for why: a real, uncached AI call per
// submission, and the product-page version is anonymous, so the usual "frontend builds the
// prompt, calls /api/ai-proxy directly" pattern has no way to enforce a spend cap here).
//
// Salary numbers are deliberately NOT part of the backend response — the endpoint only suggests
// role TITLES, and this file matches each one against the real, already-live Careers Agent
// database (searchCareers, the same anonymous-from-the-browser call CandidateSearch.tsx-style
// callers already make) so every salary shown is real data, never an AI guess.

import { searchCareers, type Career } from './careersApi';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5130';

export interface CvSkill {
  name: string;
  level: number; // 1-10
  yearsNote?: string | null;
}

export interface CvAnalysisResult {
  skills: CvSkill[];
  suggestedRoles: string[];
  strengths: string[];
  weaknesses: string[];
  inconsistencies: string[];
  narrativeScript: string;
}

export interface CvRoleMatch {
  title: string;
  career: Career | null; // null if no real match was found — dropped from the UI, never shown with a guessed salary
}

export interface CvAnalysisCappedError {
  capped: true;
  message: string;
}

function isCapped(x: unknown): x is CvAnalysisCappedError {
  return typeof x === 'object' && x !== null && (x as { capped?: unknown }).capped === true;
}

// 'self' = second-person coaching framing. 'candidate' (default here — a recruiter analysing
// someone ELSE's CV) = third-person hiring-fit framing — see Endpoint.cs's own audienceFraming
// comment.
export async function analyzeCv(cvText: string, audience: 'self' | 'candidate' = 'candidate', authToken?: string | null): Promise<CvAnalysisResult> {
  const res = await fetch(`${API_BASE}/api/cv-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ cvText, audience }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (isCapped(data)) throw new Error(data.message);
    throw new Error((data as { error?: string } | null)?.error ?? `CV analysis failed (${res.status})`);
  }
  return data as CvAnalysisResult;
}

// Matches each AI-suggested title against the real careers database in parallel, keeping only
// genuine matches, then sorts by highest UK starting-band salary descending — Francis's own
// explicit ask ("ordered by highest salary"). UK chosen as the primary sort key since that's
// this platform's home market; both uk/us bands are still shown per row.
export async function matchRolesToCareers(suggestedRoles: string[]): Promise<CvRoleMatch[]> {
  const matches = await Promise.all(suggestedRoles.map(async title => {
    const results = await searchCareers(title, 1);
    return { title, career: results[0] ?? null };
  }));
  return matches
    // A career whose Careers Agent record has no real UK salary data (starting <= 0) is a
    // low-relevance/incomplete match, not a genuine role fit — showing "£0 – £0" undermines the
    // "every number here is real" promise this feature is built on. Found live 2026-09-18: a
    // software-engineering CV matched "Skilled metal, electrical and electronic trades
    // supervisors" with £0–£0 bands.
    .filter((m): m is CvRoleMatch & { career: Career } => m.career !== null && (m.career.salary?.uk?.starting ?? 0) > 0)
    .sort((a, b) => (b.career.salary?.uk?.starting ?? 0) - (a.career.salary?.uk?.starting ?? 0));
}
