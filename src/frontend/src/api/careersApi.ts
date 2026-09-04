// Shared Careers Explorer API client — extracted from CareersPanel.tsx so the same
// search endpoint can also power type-ahead on the interview intake screen
// (InterviewPackStart.tsx) without duplicating the fetch/type logic.

export interface SalaryRegion { starting: number; mid: number; senior: number; expert: number; currency: string }
// Day rates, not annual figures — how contract/freelance/interim work in this career is
// normally quoted. First tier is "junior" (not "starting", matching SalaryRegion) since
// that's the backend's own field name (CareerDocument.cs's ContractRateRegion).
export interface ContractRateRegion { junior: number; mid: number; senior: number; expert: number; currency: string }
export interface WorkforceRegion { employed: number; studying: number; growthPct5yr: number; growthTrend: string; vacancies: number }
export interface Career {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  tags: string[];
  salary: { uk: SalaryRegion; us: SalaryRegion };
  // Nullable — day-rate contracting isn't a meaningful concept for every career (e.g.
  // permanent-only professions), so the backend omits it rather than fabricating a number.
  contractRate?: { uk: ContractRateRegion; us: ContractRateRegion } | null;
  workforce: { uk: WorkforceRegion; us: WorkforceRegion };
  demand: { uk: number; us: number; automationRisk: number; futureScore: number; trend: string };
  lifestyle: { environment: string; stress: number; energy: number; remoteScore: number; typicalHours: string };
  identity: { summary: string; traits: string[]; strengths: string[] };
  pathway: { entryRequirements: string[]; qualifications: string[]; skills: string[]; timeToJunior: string; timeToMid: string; timeToSenior: string; timeToExpert: string; learningPath: string[] };
  confidence: number;
}

export const PROXY_BASE = 'https://p1-careers-agent-gbgyheascwc2fpfr.uksouth-01.azurewebsites.net/api/careers';

// Some fields come back from the API as space-separated strings rather than arrays
export function toArr(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(/\s{2,}|\|/).map(s => s.trim()).filter(Boolean);
}

export function normalise(c: Career): Career {
  return {
    ...c,
    identity: c.identity ? {
      ...c.identity,
      traits:    toArr(c.identity.traits as unknown as string),
      strengths: toArr(c.identity.strengths as unknown as string),
    } : c.identity,
    pathway: c.pathway ? {
      ...c.pathway,
      skills:             toArr(c.pathway.skills as unknown as string),
      entryRequirements:  toArr(c.pathway.entryRequirements as unknown as string),
      qualifications:     toArr(c.pathway.qualifications as unknown as string),
      learningPath:       toArr(c.pathway.learningPath as unknown as string),
    } : c.pathway,
  };
}

export async function searchCareers(q: string, limit = 12): Promise<Career[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (!res.ok) throw new Error('api');
    const data = await res.json() as Career[];
    return data.map(normalise);
  } catch { return []; }
}

export const FALLBACK_CATEGORIES = [
  { category: 'Technology',            count: 142 },
  { category: 'Healthcare',            count: 198 },
  { category: 'Finance',               count: 87  },
  { category: 'Engineering',           count: 134 },
  { category: 'Education',             count: 76  },
  { category: 'Creative',              count: 94  },
  { category: 'Music & Entertainment', count: 68  },
  { category: 'Art & Culture',         count: 52  },
  { category: 'Legal',                 count: 48  },
  { category: 'Science',               count: 112 },
  { category: 'Business',              count: 89  },
  { category: 'Construction',          count: 67  },
  { category: 'Hospitality',           count: 54  },
  { category: 'Transport',             count: 43  },
  { category: 'Retail',                count: 38  },
  { category: 'Social Care',           count: 61  },
  { category: 'Trades',                count: 72  },
  { category: 'Media',                 count: 45  },
  { category: 'Agriculture',           count: 29  },
  { category: 'Public Sector',         count: 56  },
  { category: 'Sport',                 count: 34  },
  { category: 'Property',              count: 41  },
  { category: 'General',               count: 32  },
];

export async function getCategories(): Promise<{ category: string; count: number }[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/categories`);
    if (!res.ok) throw new Error('api');
    return await res.json();
  } catch { return FALLBACK_CATEGORIES; }
}

export async function getCareersByCategory(category: string): Promise<Career[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/by-category?category=${encodeURIComponent(category)}&limit=20`);
    if (!res.ok) throw new Error('api');
    const data = await res.json() as Career[];
    return data.map(normalise);
  } catch { return []; }
}

// Some lifestyle fields (e.g. environment) come back as a raw pipe-delimited enum like
// "office|remote|hybrid" rather than prose — turn that into readable text instead of
// leaking the pipes verbatim. Leaves already-prose values (no pipe) untouched.
export function humanizeList(s: string): string {
  if (!s || !s.includes('|')) return s;
  const parts = s.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? s;
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

// Builds a short spoken walkthrough script from a CareerDocument's own fields — no AI
// call needed, so it works even when we don't yet have anything personal to say about
// the candidate (see CLAUDE.md: never call a third-party AI provider from the browser).
// candidateName is accepted for when profile data becomes available later; omit for now.
export function buildCareerScript(career: Career, candidateName?: string): string[] {
  const lines: string[] = [];
  const opener = candidateName ? `${candidateName}, let` : 'Let';
  lines.push(`${opener} me tell you about being a ${career.title}.`);

  if (career.identity?.summary) {
    lines.push(career.identity.summary);
  } else if (career.subcategory) {
    lines.push(`It's a role in ${career.subcategory}, within the wider ${career.category} field.`);
  }

  const uk = career.salary?.uk;
  if (uk && uk.starting > 0) {
    lines.push(
      `In the UK, you'd typically start around £${uk.starting.toLocaleString('en-GB')}, ` +
      `rising to about £${uk.senior.toLocaleString('en-GB')} at senior level` +
      (uk.expert > uk.senior ? `, and up to £${uk.expert.toLocaleString('en-GB')} once you're an expert.` : '.')
    );
  }

  const growth = career.workforce?.uk?.growthPct5yr;
  if (growth !== undefined && growth !== 0) {
    lines.push(`Demand is ${growth > 0 ? 'growing' : 'shrinking'} — about ${Math.abs(growth)}% over the next five years, with a future score of ${career.demand?.futureScore ?? '—'} out of 100.`);
  } else if (career.demand?.trend) {
    lines.push(`The overall trend for this role is ${career.demand.trend.toLowerCase()}.`);
  }

  if (career.lifestyle) {
    const bits: string[] = [];
    if (career.lifestyle.environment) bits.push(humanizeList(career.lifestyle.environment).toLowerCase());
    if (career.lifestyle.remoteScore > 60) bits.push('plenty of scope to work remotely');
    if (career.lifestyle.typicalHours) bits.push(`typical hours of ${humanizeList(career.lifestyle.typicalHours).toLowerCase()}`);
    if (bits.length) lines.push(`Day to day, it suits ${bits.join(', ')}.`);
  }

  const traits = career.identity?.traits ?? [];
  if (traits.length) {
    lines.push(`People who thrive here tend to be ${traits.slice(0, 3).join(', ').toLowerCase()}.`);
  }

  lines.push(`If this feels like a fit, why not put it to the test with a mock interview?`);

  return lines;
}

// Fires and forgets a note that a candidate typed a job title with no database match —
// feeds the admin portal's Missing Reports queue (see careers-agent's MissingCareerFunction
// and admin-portal's Careers page) rather than being silently lost. Still wrapped in a
// try/catch as a best-effort call — a failure here should never block the candidate's flow.
export async function reportMissingCareerTitle(title: string): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/report-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, source: 'interview-job-title', reportedAt: new Date().toISOString() }),
    });
  } catch { /* best-effort only */ }
}
