// Shared Careers Explorer API client — extracted from CareersPanel.tsx so the same
// search endpoint can also power type-ahead on the interview intake screen
// (InterviewPackStart.tsx) without duplicating the fetch/type logic.

export interface SalaryRegion { starting: number; mid: number; senior: number; expert: number; currency: string }
export interface WorkforceRegion { employed: number; studying: number; growthPct5yr: number; growthTrend: string; vacancies: number }
export interface Career {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  tags: string[];
  salary: { uk: SalaryRegion; us: SalaryRegion };
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

// Fires and forgets a note that a candidate typed a job title with no database match —
// feeds the population function's backlog rather than being silently lost. The endpoint
// doesn't exist yet server-side; safe no-op (catches its own failure) until it does.
export async function reportMissingCareerTitle(title: string): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/report-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, source: 'interview-job-title', reportedAt: new Date().toISOString() }),
    });
  } catch { /* best-effort only */ }
}
