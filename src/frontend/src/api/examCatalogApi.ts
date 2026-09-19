// Certifications & Exams catalog — search/categories/report-missing, mirrors careersApi.ts's
// exact shape (a sibling Azure Function App, src/agents/P1.ExamCatalogAgent, anonymous
// read/report endpoints called straight from the browser — no JWT needed for these, same as
// Careers). Admin add/edit go through Explain.Api's JWT-gated proxy instead (never called from
// here) — see Features/ExamCatalog/Admin/Endpoint.cs.

// TODO(Francis): placeholder hostname — update once the Function App is actually provisioned
// (az functionapp create names it with a random suffix, e.g. p1-examcatalog-agent-xxxxxxxx,
// same shape as PROXY_BASE in careersApi.ts). Provisioning is a deliberate, separate checkpoint
// (new recurring Azure cost), not done as part of writing this code.
// Absolute URL to the real backend — never a relative /api path (this SWA's own Functions runtime
// would silently 404 it; see CLAUDE.md).
const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

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

export type ScoringModel = 'scaled' | 'grade-9-1' | 'grade-a-star-e' | 'ap-1-5';

export interface ExamCatalogEntry extends ExamCatalogSummary {
  aliases: string[];
  domains: DomainWeight[];
  passScore: number;
  maxScore: number;
  source: string;
  createdAt: string;
  // "Any US/UK exam" fields (2026-09-19). All optional — records created before these existed
  // simply don't have them, and everything below treats a missing value as the old behaviour.
  region?: string;          // 'uk' | 'us' | 'global'
  board?: string;
  level?: string;
  subject?: string;
  scoringModel?: ScoringModel;
  minScore?: number;
  // '' / undefined with domains = curated; 'stub' = no blueprint yet; 'ai-draft' = AI-generated,
  // unreviewed (show a warning); 'reviewed' = an admin has checked it.
  // 'source-grounded' = extracted from the exam's official page by the weekly refresh job (unreviewed).
  blueprintStatus?: '' | 'stub' | 'ai-draft' | 'source-grounded' | 'reviewed';
}

export interface CategoryCount {
  category: string;
  count: number;
}

export async function searchExamCatalog(q: string, category?: string, limit = 12, region?: string): Promise<ExamCatalogEntry[]> {
  try {
    const params = new URLSearchParams({ q, top: String(limit) });
    if (category) params.set('category', category);
    if (region) params.set('region', region);
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

// Every active entry in one category — powers the picker's browse grid (GCSE/A-level/AP subjects
// etc.), since type-ahead search needs 2+ typed characters and is no use for "show me the subjects".
export async function browseExamCategory(category: string, region?: string): Promise<ExamCatalogEntry[]> {
  try {
    const params = new URLSearchParams({ category });
    if (region) params.set('region', region);
    const res = await fetch(`${PROXY_BASE}/browse?${params.toString()}`);
    if (!res.ok) throw new Error('api');
    return await res.json() as ExamCatalogEntry[];
  } catch { return []; }
}

// A stub entry (no blueprint yet) is made takeable on demand: the backend drafts the blueprint
// once, saves it into the catalog flagged 'ai-draft', and returns the full updated entry. Returns
// null on failure so the room can show a retry rather than a dead end.
export async function ensureExamBlueprint(id: string): Promise<ExamCatalogEntry | null> {
  try {
    const res = await fetch(`${EXPLAIN_API_BASE}/api/exam-catalog/${encodeURIComponent(id)}/blueprint`, { method: 'POST' });
    if (!res.ok) return null;
    return await res.json() as ExamCatalogEntry;
  } catch { return null; }
}

export type AddExamResult =
  | { status: 'ok'; entry: ExamCatalogEntry; existing: boolean }
  | { status: 'rejected'; reason: string }
  | { status: 'limited'; reason: string }
  | { status: 'error'; reason: string };

// "Search anything": add an exam that isn't in the catalog. The server checks it's a real US/UK exam
// (typed text is treated as untrusted), applies per-person and global daily caps, and creates a stub
// whose blueprint is built the first time it's opened. If it already exists it just returns it.
export async function addExamOnDemand(name: string): Promise<AddExamResult> {
  try {
    const res = await fetch(`${EXPLAIN_API_BASE}/api/exam-catalog/auto-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => null) as { accepted?: boolean; existing?: boolean; entry?: ExamCatalogEntry; reason?: string; limited?: boolean } | null;
    if (data?.accepted && data.entry) return { status: 'ok', entry: data.entry, existing: !!data.existing };
    if (res.status === 429 || data?.limited) return { status: 'limited', reason: data?.reason ?? 'Please try again tomorrow.' };
    if (data && data.accepted === false && res.ok) return { status: 'rejected', reason: data.reason ?? "We couldn't recognise that as a specific exam." };
    return { status: 'error', reason: data?.reason ?? "We couldn't add that just now — please try again." };
  } catch { return { status: 'error', reason: "We couldn't reach the server — please try again." }; }
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
  ap: 'AP (Advanced Placement)',
  admissions: 'College & Grad Admissions',
  'official-tests': 'Official Tests',
};

export const REGION_LABELS: Record<string, string> = { uk: 'UK', us: 'US', global: 'International' };

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
