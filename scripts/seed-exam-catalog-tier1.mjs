/**
 * Tier-1 exam catalog seed (2026-09-19) — the most-searched US/UK exams as NAME-ONLY stubs, per
 * ~/.claude/plans/any-exam-certifications-plan.md. No blueprints here on purpose: a stub gets its
 * blueprint generated on demand the first time a candidate picks it (Explain.Api
 * POST /api/exam-catalog/{id}/blueprint), flagged "ai-draft" until an admin reviews it. The weekly
 * refresh job (planned) is what verifies names/codes/retirements against real sources — this list
 * comes from general knowledge, so treat codes as "probably right, verify weekly".
 *
 *  - Existing records (matched by category + name) are PATCHED, only filling fields that are
 *    still empty, so their ids — which saved exam sessions reference — and any blueprint survive.
 *  - New records get a deterministic id (category-slug) so re-runs are idempotent.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/seed-exam-catalog-tier1.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';

const CS = process.env.COSMOS_CONNECTION_STRING;
if (!CS) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');
const container = new CosmosClient(CS).database('interviewme').container('examCatalog');

const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const entries = [];
const add = e => entries.push({ vendor: '', examCode: '', aliases: [], board: '', level: '', subject: '', minScore: 0, passScore: 0, maxScore: 0, scoringModel: 'scaled', ...e });

// ── UK GCSE ──────────────────────────────────────────────────────────────────────────────────
const GCSE = [
  ['Mathematics', ['GCSE Maths', 'Maths']], ['English Language', []], ['English Literature', []],
  ['Combined Science', ['Double Science', 'Trilogy']], ['Biology', []], ['Chemistry', []], ['Physics', []],
  ['Computer Science', []], ['History', []], ['Geography', []], ['Religious Studies', ['RE', 'Religious Education']],
  ['French', []], ['Spanish', []], ['German', []], ['Italian', []], ['Latin', []],
  ['Art and Design', ['Art']], ['Design and Technology', ['DT', 'D&T']], ['Drama', []], ['Music', []], ['Dance', []],
  ['Physical Education', ['PE']], ['Business', ['Business Studies']], ['Economics', []], ['Psychology', []],
  ['Sociology', []], ['Statistics', []], ['Food Preparation and Nutrition', ['Food Tech', 'Food Technology']],
  ['Citizenship Studies', []], ['Media Studies', []], ['Ancient History', []], ['Classical Civilisation', []],
];
for (const [subject, aliases] of GCSE)
  add({ category: 'gcse', region: 'uk', level: 'GCSE', subject, name: `GCSE ${subject}`, aliases, scoringModel: 'grade-9-1' });

// ── UK A-Level ───────────────────────────────────────────────────────────────────────────────
const ALEVEL = [
  ['Mathematics', ['A-Level Maths', 'Maths']], ['Further Mathematics', ['Further Maths']], ['English Literature', []],
  ['English Language', []], ['English Language and Literature', []], ['Biology', []], ['Chemistry', []], ['Physics', []],
  ['Computer Science', []], ['History', []], ['Geography', []], ['Psychology', []], ['Sociology', []], ['Economics', []],
  ['Business', ['Business Studies']], ['Politics', []], ['Law', []], ['Religious Studies', []], ['French', []],
  ['Spanish', []], ['German', []], ['Latin', []], ['Art and Design', ['Art']], ['Design and Technology', []],
  ['Drama and Theatre', ['Drama']], ['Music', []], ['Physical Education', ['PE']], ['Media Studies', []],
  ['Film Studies', []], ['Classical Civilisation', []], ['Ancient History', []], ['Accounting', []], ['Environmental Science', []],
];
for (const [subject, aliases] of ALEVEL)
  add({ category: 'a-level', region: 'uk', level: 'A-Level', subject, name: `A-Level ${subject}`, aliases, scoringModel: 'grade-a-star-e' });

// ── US Advanced Placement (portfolio/research courses omitted — not multiple-choice-able) ────
const AP = [
  'African American Studies', 'Art History', 'Biology', 'Calculus AB', 'Calculus BC', 'Chemistry',
  'Chinese Language and Culture', 'Comparative Government and Politics', 'Computer Science A', 'Computer Science Principles',
  'English Language and Composition', 'English Literature and Composition', 'Environmental Science', 'European History',
  'French Language and Culture', 'German Language and Culture', 'Human Geography', 'Italian Language and Culture',
  'Japanese Language and Culture', 'Latin', 'Macroeconomics', 'Microeconomics', 'Music Theory',
  'Physics 1: Algebra-Based', 'Physics 2: Algebra-Based', 'Physics C: Electricity and Magnetism', 'Physics C: Mechanics',
  'Precalculus', 'Psychology', 'Spanish Language and Culture', 'Spanish Literature and Culture', 'Statistics',
  'United States Government and Politics', 'United States History', 'World History: Modern',
];
for (const subject of AP)
  add({ category: 'ap', region: 'us', level: 'AP', board: 'College Board', subject, name: `AP ${subject}`, vendor: 'College Board',
        aliases: [`AP ${subject.replace(/ Language and Culture$/, '')}`], scoringModel: 'ap-1-5' });

// ── College & graduate admissions (scaled, real published score ranges; no fixed pass mark) ──
const ADMISSIONS = [
  ['SAT', 'College Board', 'us', 400, 1600, ['SAT Reasoning Test']],
  ['PSAT/NMSQT', 'College Board', 'us', 320, 1520, ['PSAT']],
  ['ACT', 'ACT, Inc.', 'us', 1, 36, ['ACT Test']],
  ['GRE General Test', 'ETS', 'global', 260, 340, ['GRE']],
  ['GMAT Focus Edition', 'GMAC', 'global', 205, 805, ['GMAT']],
  ['LSAT', 'LSAC', 'us', 120, 180, ['Law School Admission Test']],
  ['MCAT', 'AAMC', 'us', 472, 528, ['Medical College Admission Test']],
  ['TOEFL iBT', 'ETS', 'global', 0, 120, ['TOEFL']],
];
for (const [name, vendor, region, minScore, maxScore, aliases] of ADMISSIONS)
  add({ category: 'admissions', region, vendor, name, minScore, maxScore, aliases });

// ── Official knowledge tests (fixed published pass marks) ────────────────────────────────────
add({ category: 'official-tests', region: 'uk', vendor: 'DVSA', name: 'UK Driving Theory Test (Car)', maxScore: 50, passScore: 43, aliases: ['Driving Theory Test', 'DVSA Theory Test'] });
add({ category: 'official-tests', region: 'uk', vendor: 'Home Office', name: 'Life in the UK Test', maxScore: 24, passScore: 18, aliases: ['British Citizenship Test'] });
add({ category: 'official-tests', region: 'us', vendor: 'USCIS', name: 'US Citizenship Civics Test', maxScore: 10, passScore: 6, aliases: ['Naturalization Test', 'Civics Test'] });

// ── Professional certifications ──────────────────────────────────────────────────────────────
const MS = (n, code, extra = {}) => add({ category: 'certification', region: 'global', vendor: 'Microsoft', name: n, examCode: code, minScore: 0, maxScore: 1000, passScore: 700, ...extra });
MS('Microsoft Certified: Azure Administrator Associate', 'AZ-104'); MS('Microsoft Certified: Azure Fundamentals', 'AZ-900'); MS('Microsoft Certified: Azure Developer Associate', 'AZ-204');
MS('Microsoft Certified: Azure Solutions Architect Expert', 'AZ-305'); MS('Microsoft Certified: Azure Security Engineer Associate', 'AZ-500');
MS('Microsoft Certified: Azure Network Engineer Associate', 'AZ-700'); MS('Microsoft Certified: DevOps Engineer Expert', 'AZ-400');
MS('Microsoft Certified: Security, Compliance, and Identity Fundamentals', 'SC-900'); MS('Microsoft Certified: Security Operations Analyst Associate', 'SC-200');
MS('Microsoft Certified: Azure AI Fundamentals', 'AI-900'); MS('Microsoft Certified: Azure AI Engineer Associate', 'AI-102');
MS('Microsoft Certified: Azure Data Fundamentals', 'DP-900'); MS('Microsoft Certified: Azure Database Administrator Associate', 'DP-300');
MS('Microsoft Certified: Power BI Data Analyst Associate', 'PL-300'); MS('Microsoft Certified: Power Platform Fundamentals', 'PL-900');
MS('Microsoft 365 Certified: Fundamentals', 'MS-900');

const CERT = (name, vendor, examCode = '', aliases = [], region = 'global') => add({ category: 'certification', region, vendor, name, examCode, aliases });
CERT('AWS Certified Solutions Architect - Associate', 'Amazon Web Services', 'SAA-C03'); CERT('AWS Certified Cloud Practitioner', 'Amazon Web Services', 'CLF-C02'); CERT('AWS Certified Developer - Associate', 'Amazon Web Services', 'DVA-C02');
CERT('AWS Certified SysOps Administrator - Associate', 'Amazon Web Services', 'SOA-C02'); CERT('AWS Certified Solutions Architect - Professional', 'Amazon Web Services', 'SAP-C02');
CERT('AWS Certified DevOps Engineer - Professional', 'Amazon Web Services', 'DOP-C02'); CERT('AWS Certified Security - Specialty', 'Amazon Web Services', 'SCS-C02');
CERT('AWS Certified Machine Learning Engineer - Associate', 'Amazon Web Services', 'MLA-C01'); CERT('AWS Certified AI Practitioner', 'Amazon Web Services', 'AIF-C01');
CERT('AWS Certified Data Engineer - Associate', 'Amazon Web Services', 'DEA-C01');
CERT('Google Cloud Digital Leader', 'Google Cloud'); CERT('Google Cloud Associate Cloud Engineer', 'Google Cloud');
CERT('Google Cloud Professional Cloud Architect', 'Google Cloud'); CERT('Google Cloud Professional Data Engineer', 'Google Cloud');
CERT('CompTIA A+', 'CompTIA', '', ['A+']); CERT('CompTIA Network+', 'CompTIA', 'N10-009', ['Network+']); CERT('CompTIA Security+', 'CompTIA', 'SY0-701', ['Security+']);
CERT('Cisco Certified Network Associate', 'Cisco', 'CCNA 200-301', ['CCNA']);
CERT('CISSP', 'ISC2', '', ['Certified Information Systems Security Professional']); CERT('ISC2 Certified in Cybersecurity (CC)', 'ISC2', '', ['CC']);
CERT('CISM', 'ISACA', '', ['Certified Information Security Manager']); CERT('CISA', 'ISACA', '', ['Certified Information Systems Auditor']);
CERT('Certified Ethical Hacker (CEH)', 'EC-Council', '', ['CEH']);
CERT('Project Management Professional', 'PMI', 'PMP', ['PMP']); CERT('Certified Associate in Project Management (CAPM)', 'PMI', '', ['CAPM']);
CERT('Professional Scrum Master I (PSM I)', 'Scrum.org', '', ['PSM I']); CERT('Certified ScrumMaster (CSM)', 'Scrum Alliance', '', ['CSM']);
CERT('PRINCE2 Foundation', 'PeopleCert', '', ['PRINCE2']); CERT('ITIL 4 Foundation', 'PeopleCert', '', ['ITIL']);
CERT('Certified Kubernetes Administrator (CKA)', 'CNCF / Linux Foundation', '', ['CKA']); CERT('Certified Kubernetes Application Developer (CKAD)', 'CNCF / Linux Foundation', '', ['CKAD']);
CERT('HashiCorp Certified: Terraform Associate', 'HashiCorp', '', ['Terraform Associate']);
CERT('Databricks Certified Data Engineer Associate', 'Databricks'); CERT('SnowPro Core Certification', 'Snowflake', '', ['SnowPro Core']);
CERT('Salesforce Certified Administrator', 'Salesforce', '', ['Salesforce Admin']);
CERT('CFA Level I', 'CFA Institute', '', ['Chartered Financial Analyst Level 1']); CERT('CPA Exam', 'AICPA', '', ['Certified Public Accountant'], 'us');
CERT('Series 7 Exam', 'FINRA', '', ['General Securities Representative'], 'us');
CERT('NCLEX-RN', 'NCSBN', '', ['National Council Licensure Examination'], 'us'); CERT('USMLE Step 1', 'NBME / FSMB', '', ['USMLE'], 'us');
CERT('PLAB 1', 'General Medical Council', '', ['Professional and Linguistic Assessments Board'], 'uk');
CERT('SQE1', 'Solicitors Regulation Authority', '', ['Solicitors Qualifying Examination 1'], 'uk');
CERT('Multistate Bar Examination (MBE)', 'NCBE', '', ['MBE', 'Bar Exam'], 'us');
CERT('Fundamentals of Engineering (FE) Exam', 'NCEES', '', ['FE Exam'], 'us');
CERT('SHRM Certified Professional (SHRM-CP)', 'SHRM', '', ['SHRM-CP'], 'us');

// ─────────────────────────────────────────────────────────────────────────────────────────────
const norm = s => (s || '').trim().toLowerCase();

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN — no writes ---' : '--- LIVE RUN ---');
  const { resources: existing } = await container.items.query('SELECT * FROM c').fetchAll();
  console.log(`Existing catalog entries: ${existing.length}; seed entries: ${entries.length}\n`);
  const byKey = new Map(existing.map(d => [`${d.category}|${norm(d.name)}`, d]));

  let inserted = 0, patched = 0, unchanged = 0;
  for (const e of entries) {
    const found = byKey.get(`${e.category}|${norm(e.name)}`);
    if (found) {
      // Fill ONLY empty fields, never overwrite a blueprint or curated value.
      const next = { ...found };
      const fill = (k, v) => { if (v !== undefined && v !== '' && (next[k] === undefined || next[k] === '' || next[k] === null)) next[k] = v; };
      for (const k of ['region', 'board', 'level', 'subject']) fill(k, e[k]);
      if (!found.scoringModel) next.scoringModel = e.scoringModel;
      if (found.minScore === undefined) next.minScore = e.minScore;
      // Union in any aliases the seed knows (records created before the seed had none, e.g. 'GCSE Maths') so
      // typed variants match an existing exam directly instead of costing an AI lookup.
      const mergedAliases = [...new Set([...(found.aliases || []), ...(e.aliases || [])])];
      if (mergedAliases.length !== (found.aliases || []).length) next.aliases = mergedAliases;
      if (!found.status) next.status = 'active';
      if (found.blueprintStatus === undefined) next.blueprintStatus = (found.domains?.length ? '' : 'stub');
      if ((!found.maxScore) && e.maxScore) { next.maxScore = e.maxScore; next.passScore = e.passScore; next.minScore = e.minScore; }
      if (JSON.stringify(next) === JSON.stringify(found)) { unchanged++; continue; }
      console.log(`  ${DRY_RUN ? 'would patch' : 'patching'} "${found.name}" [${found.category}]`);
      if (!DRY_RUN) await container.items.upsert(next);
      patched++;
      continue;
    }
    const doc = {
      id: `${e.category}-${slug(e.name)}`, ...e,
      domains: [], source: 'seed-tier1', blueprintStatus: 'stub', status: 'active',
      lastVerifiedAt: '', blueprintGeneratedAt: '', createdAt: new Date().toISOString(),
    };
    if (!DRY_RUN) await container.items.upsert(doc);
    inserted++;
  }
  console.log(`\n${DRY_RUN ? 'Would insert' : 'Inserted'} ${inserted}, ${DRY_RUN ? 'would patch' : 'patched'} ${patched}, unchanged ${unchanged}.`);
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
