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
  candidateName: string | null;
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

// Saved-record shapes — Features/CvAnalysis/Endpoint.cs's SavedRoleMatch/CvAnalysisHistoryRecord.
export interface SavedRoleMatch {
  title: string;
  careerId: string;
  careerTitle: string;
  salaryUkStarting: number;
  salaryUkExpert: number;
}

export interface CvAnalysisHistoryRecord {
  id: string;
  ownerId: string;
  candidateName: string | null;
  createdAt: string;
  analysis: CvAnalysisResult;
  roleMatches: SavedRoleMatch[];
  isShared: boolean;
  shareToken: string | null;
}

export interface CvAnalysisCappedError {
  capped: true;
  message: string;
}

function isCapped(x: unknown): x is CvAnalysisCappedError {
  return typeof x === 'object' && x !== null && (x as { capped?: unknown }).capped === true;
}

// Known near-synonym mismatches against the Careers Agent catalog's own alias lists — e.g. the
// AI suggested "Solutions Architect" (plural), but the canonical "Software Architect" record's
// aliases only list "Solution Architect" (singular), so the search missed the alias and fell
// through to a separate, less-complete "Solutions Architect" catalog entry instead — a real
// duplicate row, found live 2026-09-18. This is a data-completeness gap in the shared catalog,
// not something fixable here in general, so it's a growable list of known cases rather than a
// fuzzy-matching attempt (which risks hiding genuinely distinct roles from other CVs).
const TITLE_SEARCH_SYNONYMS: Record<string, string> = {
  'solutions architect': 'Software Architect',
};

function normalizeSearchTitle(title: string): string {
  return TITLE_SEARCH_SYNONYMS[title.trim().toLowerCase()] ?? title;
}

const STRIP_PREFIXES = [
  /^global\s+/i,
  /^senior\s+vice\s+president,?\s*/i,
  /^vice\s+president,?\s*/i,
  /^chief\s+/i,
  /^head\s+of\s+/i,
  /^director\s+of\s+/i,
  /^senior\s+/i,
  /^lead\s+/i,
  /^principal\s+/i,
];

// Zero-cost fallback (no extra AI call — Francis's own ask was "search until it finds a match"
// but without adding spend while the daily cap is disabled) for when a CV is so senior/niche
// every AI-suggested title misses the catalog entirely. Strips common seniority/scope qualifiers
// one at a time and retries, so "Global Head of Markets Technology" also tries "Head of Markets
// Technology", then "Markets Technology". Only runs when the normal pass comes up completely
// empty, so it never affects a CV that already has real matches.
function broadenedTitleVariants(title: string): string[] {
  const variants: string[] = [];
  let current = title.trim();
  for (const prefix of STRIP_PREFIXES) {
    const stripped = current.replace(prefix, '').trim();
    if (stripped && stripped.toLowerCase() !== current.toLowerCase()) {
      variants.push(stripped);
      current = stripped;
    }
  }
  return variants;
}

async function searchBroadened(title: string): Promise<Career | null> {
  for (const variant of broadenedTitleVariants(title)) {
    const results = await searchCareers(variant, 1);
    const hit = results[0];
    if (hit && (hit.salary?.uk?.starting ?? 0) > 0) return hit;
  }
  return null;
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
    const results = await searchCareers(normalizeSearchTitle(title), 1);
    return { title, career: results[0] ?? null };
  }));
  let real = matches
    // A career whose Careers Agent record has no real UK salary data (starting <= 0) is a
    // low-relevance/incomplete match, not a genuine role fit — showing "£0 – £0" undermines the
    // "every number here is real" promise this feature is built on. Found live 2026-09-18: a
    // software-engineering CV matched "Skilled metal, electrical and electronic trades
    // supervisors" with £0–£0 bands.
    .filter((m): m is CvRoleMatch & { career: Career } => m.career !== null && (m.career.salary?.uk?.starting ?? 0) > 0)
    // The AI can suggest two similarly-worded titles (e.g. "Senior Software Engineer" and
    // "Senior .NET Developer") that both resolve to the SAME real career record — seen live
    // 2026-09-18 as a duplicate row in the roles table. Dedupe by the career's own id, keeping
    // whichever AI-suggested title matched it first.
    .filter((m, i, arr) => arr.findIndex(x => x.career.id === m.career.id) === i);

  // Every suggested title was too senior/niche to match anything — broaden and retry rather
  // than showing an empty roles table. Found live 2026-09-18: a 27-year MD-level finance-tech
  // CV's AI-suggested titles ("Global Head of Markets Technology" etc.) missed the catalog
  // entirely on some runs (the AI's own suggestions vary run to run via Model Router).
  if (real.length === 0) {
    const fallback = await Promise.all(suggestedRoles.map(async title => ({ title, career: await searchBroadened(title) })));
    real = fallback
      .filter((m): m is CvRoleMatch & { career: Career } => m.career !== null)
      .filter((m, i, arr) => arr.findIndex(x => x.career.id === m.career.id) === i);
  }

  return real.sort((a, b) => (b.career.salary?.uk?.starting ?? 0) - (a.career.salary?.uk?.starting ?? 0));
}

// Converts the live-view CvRoleMatch[] (full Career objects) into the small snapshot
// Endpoint.cs's SavedRoleMatch expects — only what's needed to redraw the roles table from
// history without hitting the Careers Agent again.
function toSavedRoleMatches(roleMatches: CvRoleMatch[]): SavedRoleMatch[] {
  return roleMatches
    .filter((m): m is CvRoleMatch & { career: Career } => m.career !== null)
    .map(m => ({
      title: m.title,
      careerId: m.career.id,
      careerTitle: m.career.title,
      salaryUkStarting: m.career.salary.uk.starting,
      salaryUkExpert: m.career.salary.uk.expert,
    }));
}

// Explicit "Save to List" — Francis's own steer: nothing is saved automatically, only when a
// recruiter reviews an analysis and decides it's worth keeping.
export async function saveCvAnalysisHistory(
  result: CvAnalysisResult, roleMatches: CvRoleMatch[], authToken: string,
): Promise<CvAnalysisHistoryRecord> {
  const res = await fetch(`${API_BASE}/api/cv-analysis/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      candidateName: result.candidateName,
      analysis: result,
      roleMatches: toSavedRoleMatches(roleMatches),
      portal: 'recruiter',
    }),
  });
  if (!res.ok) throw new Error(`Failed to save (${res.status})`);
  return res.json();
}

export async function fetchCvAnalysisHistory(authToken: string): Promise<CvAnalysisHistoryRecord[]> {
  const res = await fetch(`${API_BASE}/api/cv-analysis/history`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
  return res.json();
}

export async function deleteCvAnalysisHistoryRecord(id: string, authToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cv-analysis/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
}

// "Send this to a colleague in another department" (Francis, 2026-09-18) — mints a public,
// no-login link. Anonymous viewers can see AND listen to the saved analysis: the shared-view
// page never needs a token (GET .../history/shared/{token} is anonymous, and the voice
// walkthrough's own /interviews/speak call has never required auth — same as the public
// marketing page's CV Analyzer).
export async function shareCvAnalysisHistory(id: string, authToken: string): Promise<{ shareToken: string; shareUrl: string }> {
  const res = await fetch(`${API_BASE}/api/cv-analysis/history/${encodeURIComponent(id)}/share`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) throw new Error(`Failed to create share link (${res.status})`);
  return res.json();
}

export async function unshareCvAnalysisHistory(id: string, authToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cv-analysis/history/${encodeURIComponent(id)}/unshare`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) throw new Error(`Failed to revoke share link (${res.status})`);
}

// Public, anonymous — powers the shared-view page. No Authorization header at all.
export async function fetchSharedCvAnalysis(shareToken: string): Promise<CvAnalysisHistoryRecord> {
  const res = await fetch(`${API_BASE}/api/cv-analysis/history/shared/${encodeURIComponent(shareToken)}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'This shared analysis link is no longer available.' : `Failed to load (${res.status})`);
  return res.json();
}
