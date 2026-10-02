// CV Analyzer usage + opt-in list for the admin page — talks to Explain.Api's Features/CvAnalysis/Endpoint.cs.
// Same call shape as eventsApi.ts, copied rather than shared (this codebase's "copy then trim" convention).

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface ApiError { error: string; status: number }

export interface CvDayCount { day: string; analyses: number; visitors: number }
export interface CvPlaceCount { country: string; city: string | null; region: string | null; analyses: number; visitors: number }
export interface CvSourceCount { source: string; analyses: number }
export interface CvStatsSummary {
  days: number;
  analyses: number;
  visitors: number;
  signedInAnalyses: number;
  anonymousAnalyses: number;
  byDay: CvDayCount[];
  byCountry: CvPlaceCount[];
  byTown: CvPlaceCount[];
  bySource: CvSourceCount[];
}
export interface OptIn { id: string; email: string; name: string | null; consentedAt: string; consentText: string }
export interface CvAnalyzerReply { summary: CvStatsSummary; optIns: OptIn[] }

async function request(path: string, token: string, method: 'GET' | 'DELETE'): Promise<Response> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res;
}

export const cvAnalyzerApi = {
  get(token: string, days: number): Promise<CvAnalyzerReply> {
    return request(`/api/admin/cv-analyzer?days=${days}`, token, 'GET').then(r => r.json() as Promise<CvAnalyzerReply>);
  },
  // Remove someone who asked to be taken off the email list.
  removeOptIn(token: string, id: string): Promise<void> {
    return request(`/api/admin/marketing-opt-ins/${encodeURIComponent(id)}`, token, 'DELETE').then(() => undefined);
  },
};
