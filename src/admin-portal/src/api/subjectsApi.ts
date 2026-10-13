// Subjects people interview for (admin page) — talks to Explain.Api's Features/SubjectsAdmin/Endpoint.cs. Same call shape as cvAnalyzerApi.ts.

const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5000';

export interface ApiError { error: string; status: number }

export interface SubjectLine {
  subject: string; category: string; demos: number; avgDemoScore: number | null; lastDemoAt: string | null
  fullInterviews: number; lastFullAt: string | null; total: number
}
export interface CategoryLine { category: string; demos: number; fullInterviews: number; total: number; subjects: number }
export interface SubjectsReply {
  days: number
  totals: { demosCompleted: number; fullInterviews: number; distinctSubjects: number }
  categories: CategoryLine[]
  subjects: SubjectLine[]
}

export const subjectsApi = {
  async get(token: string, days: number): Promise<SubjectsReply> {
    const res = await fetch(`${EXPLAIN_API_BASE}/api/admin/subjects?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<SubjectsReply>;
  },
};
