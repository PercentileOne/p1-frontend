// Certifications & Exams catalog — search/categories/report-missing, mirrors careersApi.ts's
// exact shape (a sibling Azure Function App, src/agents/P1.ExamCatalogAgent, anonymous
// read/report endpoints called straight from the browser — no JWT needed for these, same as
// Careers). Admin add/edit go through Explain.Api's JWT-gated proxy instead (never called from
// here) — see Features/ExamCatalog/Admin/Endpoint.cs.

// TODO(Francis): placeholder hostname — update once the Function App is actually provisioned
// (az functionapp create names it with a random suffix, e.g. p1-examcatalog-agent-xxxxxxxx,
// same shape as PROXY_BASE in careersApi.ts). Provisioning is a deliberate, separate checkpoint
// (new recurring Azure cost), not done as part of writing this code.
export const PROXY_BASE = 'https://p1-examcatalog-agent.azurewebsites.net/api/examcatalog';

export interface DomainWeight {
  name: string;
  weightPct: number;
}

export interface ExamCatalogSummary {
  id: string;
  category: string;
  name: string;
  vendor: string;
  examCode: string;
}

export interface ExamCatalogEntry extends ExamCatalogSummary {
  aliases: string[];
  domains: DomainWeight[];
  passScore: number;
  maxScore: number;
  source: string;
  createdAt: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export async function searchExamCatalog(q: string, category?: string, limit = 12): Promise<ExamCatalogEntry[]> {
  try {
    const params = new URLSearchParams({ q, top: String(limit) });
    if (category) params.set('category', category);
    const res = await fetch(`${PROXY_BASE}/search?${params.toString()}`);
    if (!res.ok) throw new Error('api');
    return await res.json() as ExamCatalogEntry[];
  } catch { return []; }
}

export async function getExamCategories(): Promise<CategoryCount[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/categories`);
    if (!res.ok) throw new Error('api');
    return await res.json() as CategoryCount[];
  } catch {
    // Fail-open to a small known set rather than an empty dropdown — same "network hiccup
    // shouldn't break the page" spirit as fetchAvatarConfig's own fail-open default.
    return [
      { category: 'certification', count: 0 },
      { category: 'gcse', count: 0 },
      { category: 'a-level', count: 0 },
    ];
  }
}

export async function getExamCatalogEntry(id: string): Promise<ExamCatalogEntry | null> {
  try {
    const res = await fetch(`${PROXY_BASE}/entry/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json() as ExamCatalogEntry;
  } catch { return null; }
}

export async function reportMissingExam(name: string, category: string): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/report-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category }),
    });
  } catch { /* best-effort only, same as reportMissingCareerTitle */ }
}

// Display-friendly labels for the known default categories — "certification"/"gcse"/"a-level"
// are the seeded starting set; any future category from getExamCategories() falls back to a
// simple capitalized rendering rather than needing a code change to add a label.
const CATEGORY_LABELS: Record<string, string> = {
  certification: 'Professional Certifications',
  gcse: 'GCSE',
  'a-level': 'A-Level',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
