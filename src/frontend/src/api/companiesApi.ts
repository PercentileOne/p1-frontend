// Company Specific interviews (Francis, 2026-09-19) — client side of the curated company catalog served by
// Explain.Api (Features/Companies). A profile is the company's "interview DNA": values, publicly described
// process and style per role family. It shapes how the mock interview is WRITTEN; it never contains real or
// leaked questions, and nothing here implies the company is involved.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface CompanySummary {
  id: string;
  name: string;
  aliases: string[];
  sector: string;
  region: string;
  rank: number;
  status: string;
}

export type RoleFamily = 'technical' | 'commercial' | 'corporate' | 'operations';

export interface CompanyStyle {
  focus?: string[];
  questionTypes?: string[];
  bar?: string;
  typicalQuestions?: number;
  notes?: string;
}

export interface CompanyProfile extends CompanySummary {
  about?: string;
  mission?: string;
  values?: { name: string; meaning?: string }[];
  facts?: string[];
  interview?: {
    overview?: string;
    stages?: { name: string; format?: string }[];
    tone?: string;
    styles?: Partial<Record<RoleFamily, CompanyStyle>>;
  };
}

// What travels with the interview session (route state) — kept small: the digest is what the prompts read.
export interface CompanyContext {
  id: string;
  name: string;
  sector: string;
  digest: string;
  // The brand the candidate actually picked when it differs from the parent company whose profile is
  // used — "Instagram" within Meta. The interviewers say the brand, and mention the parent at most once.
  brand?: string;
}

let listCache: CompanySummary[] | null = null;

export async function listCompanies(): Promise<CompanySummary[]> {
  if (listCache) return listCache;
  try {
    const res = await fetch(`${API_BASE}/api/companies`);
    if (!res.ok) return [];
    const rows = await res.json() as CompanySummary[];
    // Only companies with a usable profile or a curated stub (which drafts itself on first pick).
    listCache = rows;
    return rows;
  } catch { return []; }
}

// A curated stub is drafted server-side on first request (~20-40s), so callers should show a "researching" state.
export async function getCompanyProfile(id: string): Promise<CompanyProfile | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/companies/${encodeURIComponent(id)}`);
      if (res.ok) return await res.json() as CompanyProfile;
      if (res.status === 404) return null;
    } catch { /* transient — retry */ }
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}

// Maps a job title onto the profile's role families. Deliberately simple keyword rules — when nothing matches
// we return null and the digest offers every style so the interview generator picks the closest itself.
export function roleFamilyForTitle(title: string): RoleFamily | null {
  const t = title.toLowerCase();
  if (/engineer|developer|software|devops|\bsre\b|programmer|architect|data scien|machine learning|\bai\b|\bml\b|cyber|security analyst|\bqa\b|tester|it support|cloud|platform/.test(t)) return 'technical';
  if (/marketing|brand|sales|account (manager|executive|director)|product|growth|content|social media|\bpr\b|communications|buyer|merchandis|category|commercial|business development|customer insight|e-?commerce|creative|design/.test(t)) return 'commercial';
  if (/financ|account|audit|\btax\b|\bhr\b|human resources|people|talent|legal|counsel|risk|compliance|analyst|banker|investment|consultant|strategy|procurement|graduate|manager|director|partner/.test(t)) return 'corporate';
  if (/store|shop|retail|colleague|assistant|logistic|supply chain|warehouse|driver|customer service|operations|cashier|barista|cabin crew|crew|nurse|technician/.test(t)) return 'operations';
  return null;
}

const FAMILY_LABEL: Record<RoleFamily, string> = {
  technical: 'technical / engineering roles',
  commercial: 'commercial roles (marketing, sales, product, brand)',
  corporate: 'corporate / functional roles (finance, HR, legal, strategy)',
  operations: 'operations / frontline roles',
};

export function styleFor(profile: CompanyProfile, jobTitle: string): { family: RoleFamily; style: CompanyStyle } | null {
  const styles = profile.interview?.styles ?? {};
  const fam = roleFamilyForTitle(jobTitle);
  if (fam && styles[fam]) return { family: fam, style: styles[fam]! };
  const first = (Object.keys(styles) as RoleFamily[]).find(k => styles[k]);
  return first ? { family: first, style: styles[first]! } : null;
}

const COUNTS = [5, 10, 15, 20];

// Defaults the intake applies when a company is picked (the candidate can still change both).
export function defaultsFor(profile: CompanyProfile, jobTitle: string): { difficulty?: string; questionCount?: number } {
  const s = styleFor(profile, jobTitle)?.style;
  const difficulty = s?.bar && ['Beginner', 'Standard', 'Pro', 'Expert'].includes(s.bar) ? s.bar : undefined;
  const nearest = s?.typicalQuestions ? COUNTS.reduce((a, b) => Math.abs(b - s.typicalQuestions!) < Math.abs(a - s.typicalQuestions!) ? b : a) : undefined;
  return { difficulty, questionCount: nearest };
}

// The text block the interview prompts read. Written as guidance for the model, not for display.
export function buildCompanyDigest(profile: CompanyProfile, jobTitle: string): string {
  const lines: string[] = [];
  lines.push(`${profile.name} (${profile.sector}).${profile.about ? ` ${profile.about}` : ''}`);
  if (profile.mission) lines.push(`Stated mission: ${profile.mission}`);
  if (profile.values?.length) lines.push(`Values/principles they publicly hold: ${profile.values.map(v => `${v.name}${v.meaning ? ` (${v.meaning})` : ''}`).join('; ')}.`);
  if (profile.facts?.length) lines.push(`Facts a well-prepared candidate should know: ${profile.facts.join(' | ')}`);
  const iv = profile.interview;
  if (iv?.overview) lines.push(`How hiring typically works: ${iv.overview}`);
  if (iv?.stages?.length) lines.push(`Typical stages: ${iv.stages.map(s => `${s.name}${s.format ? ` — ${s.format}` : ''}`).join(' → ')}`);
  if (iv?.tone) lines.push(`Interview tone/feel: ${iv.tone}`);

  const fam = roleFamilyForTitle(jobTitle);
  const styles = iv?.styles ?? {};
  const describe = (k: RoleFamily) => {
    const s = styles[k]; if (!s) return '';
    return `${FAMILY_LABEL[k]}: probes ${(s.focus ?? []).join(', ')}; question types ${(s.questionTypes ?? []).join(', ')}; typical bar ${s.bar ?? 'Pro'}.${s.notes ? ` ${s.notes}` : ''}`;
  };
  if (fam && styles[fam]) {
    lines.push(`STYLE FOR THIS CANDIDATE'S ROLE (${describe(fam)})`);
  } else {
    const all = (Object.keys(styles) as RoleFamily[]).map(describe).filter(Boolean);
    if (all.length) lines.push(`Styles by role family — use whichever best matches this candidate's job title:\n- ${all.join('\n- ')}`);
  }
  return lines.join('\n').slice(0, 3200);
}

export function buildCompanyContext(profile: CompanyProfile, jobTitle: string, brand?: string): CompanyContext {
  return { id: profile.id, name: profile.name, sector: profile.sector, digest: buildCompanyDigest(profile, jobTitle), brand: brand || undefined };
}

// "Instagram (Meta)" — what the picker, the intake note and the interview call the employer.
export function displayCompanyName(name: string, brand?: string): string {
  return brand && brand !== name ? `${brand} (${name})` : name;
}

// ── Picker helpers ───────────────────────────────────────────────────────────────────────────────

// Broad, human groups for browsing the list — derived from the free-text sector so the catalog can grow
// without a schema change.
export function groupForSector(sector: string): string {
  const s = sector.toLowerCase();
  if (/bank|invest|asset|fintech|payment|insur|financial/.test(s)) return 'Banking & Finance';
  if (/consult|professional services/.test(s)) return 'Consulting & Professional Services';
  if (/pharma|health/.test(s)) return 'Healthcare & Pharma';
  if (/airline|hotel|travel/.test(s) && !/technology/.test(s)) return 'Travel & Hospitality';
  if (/automotive|aerospace|energy|engineering|infrastructure|defence/.test(s)) return 'Energy, Auto & Industry';
  if (/retail|consumer|luxury|fashion|food|hospitality/.test(s) && !/technology/.test(s)) return 'Retail, Consumer & Food';
  if (/media|broadcast|publishing|telecom/.test(s) && !/technology/.test(s)) return 'Media & Telecoms';
  if (/technology/.test(s)) return 'Technology';
  if (/public/.test(s)) return 'Public Service';
  return 'Other';
}

export interface CompanyMatch { company: CompanySummary; via?: string }

const norm = (t: string) => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

// Finds companies by name, well-known alias (Facebook/Instagram → Meta, Twitter → X), or sector.
// An alias hit carries `via` so the picker can show "Instagram → Meta".
export function searchCompanies(companies: CompanySummary[], query: string): CompanyMatch[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { m: CompanyMatch; score: number }[] = [];
  for (const c of companies) {
    const name = norm(c.name);
    let best: { score: number; via?: string } | null = null;
    if (name.startsWith(q)) best = { score: 0 };
    else if (name.includes(q)) best = { score: 2 };
    for (const a of c.aliases ?? []) {
      const alias = norm(a);
      const score = alias.startsWith(q) ? 1 : alias.includes(q) ? 3 : -1;
      if (score >= 0 && (!best || score < best.score)) best = { score, via: a };
    }
    if (!best && norm(c.sector).includes(q)) best = { score: 4 };
    // A nickname of the company's own name ("Goldman" for Goldman Sachs) is not a separate brand.
    if (best?.via && (name.startsWith(norm(best.via)) || norm(best.via).startsWith(name))) best = { score: best.score };
    if (best) scored.push({ m: { company: c, via: best.via }, score: best.score });
  }
  return scored.sort((a, b) => a.score - b.score || a.m.company.name.localeCompare(b.m.company.name)).map(x => x.m);
}
