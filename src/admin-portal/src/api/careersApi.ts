// Careers admin API client. Two distinct backends, deliberately not proxied the same way:
//
// - Browse/search/categories are read-only and already Anonymous on the careers-agent
//   Function App (src/agents/P1.CareersAgent) — every portal (candidate/recruiter/employer)
//   already calls it directly from the browser, so admin-portal does the same rather than
//   adding a pointless proxy hop.
// - Missing-report list/status-update are admin actions gated by a Functions key on the
//   agent side. That key must never reach a browser bundle, so those two calls go through
//   Explain.Api's JWT-gated /api/admin/careers/* proxy instead (see
//   Features/Careers/Admin/Endpoint.cs), which holds the key server-side.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export const CAREERS_AGENT_BASE = 'https://p1-careers-agent-gbgyheascwc2fpfr.uksouth-01.azurewebsites.net/api/careers';

export interface RegionBand { starting: number; mid: number; senior: number; expert: number; currency: string }
export interface ContractRegionBand { junior: number; mid: number; senior: number; expert: number; currency: string }
export interface WorkforceRegion { employed: number; studying: number; growthPct5yr: number; growthTrend: string; vacancies: number }

export interface AdminCareer {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  aliases: string[];
  tags: string[];
  soc_uk: string | null;
  onet_us: string | null;
  salary: { uk: RegionBand; us: RegionBand } | null;
  contractRate: { uk: ContractRegionBand; us: ContractRegionBand } | null;
  workforce: { uk: WorkforceRegion; us: WorkforceRegion } | null;
  demand: { uk: number; us: number; automationRisk: number; futureScore: number; trend: string } | null;
  lifestyle: { environment: string; stress: number; energy: number; collaboration: number; remoteScore: number; typicalHours: string } | null;
  identity: { summary: string; traits: string[]; strengths: string[]; weaknesses: string[] } | null;
  pathway: {
    entryRequirements: string[]; qualifications: string[]; skills: string[];
    timeToJunior: string; timeToMid: string; timeToSenior: string; timeToExpert: string;
    learningPath: string[];
  } | null;
  salaryLastUpdated: string;
  lastUpdated: string;
  source: string;
  confidence: number;
}

export interface CategoryCount { category: string; count: number }

export const careersAgentApi = {
  async getCategories(): Promise<CategoryCount[]> {
    const res = await fetch(`${CAREERS_AGENT_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to load categories.');
    return res.json();
  },

  async getByCategory(category: string, top = 100): Promise<AdminCareer[]> {
    const res = await fetch(`${CAREERS_AGENT_BASE}/by-category?category=${encodeURIComponent(category)}&top=${top}`);
    if (!res.ok) throw new Error('Failed to load careers for category.');
    return res.json();
  },

  async search(q: string, top = 40): Promise<AdminCareer[]> {
    const res = await fetch(`${CAREERS_AGENT_BASE}/search?q=${encodeURIComponent(q)}&top=${top}`);
    if (!res.ok) throw new Error('Search failed.');
    return res.json();
  },
};

export interface MissingCareerReport {
  id: string;
  normalizedTitle: string;
  title: string;
  source: string;
  reportCount: number;
  firstReportedAt: string;
  lastReportedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedCareerId: string | null;
}

export interface ApiError { error: string; status: number }

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const missingCareersApi = {
  list(token: string, status?: string): Promise<MissingCareerReport[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return call(`/api/admin/careers/missing-reports${qs}`, token);
  },

  updateStatus(token: string, id: string, status: 'pending' | 'resolved' | 'dismissed'): Promise<void> {
    return call(`/api/admin/careers/missing-reports/${encodeURIComponent(id)}/status`, token, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};
