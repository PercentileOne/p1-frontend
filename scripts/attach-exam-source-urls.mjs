/**
 * Attaches OFFICIAL source URLs to exam catalog entries (2026-09-19) so the weekly refresh job
 * (Explain.Api Features/ExamCatalog/Refresh) has a real page to read and fingerprint each week.
 *
 * A URL is only attached after it is VERIFIED: it must load (HTTP 200) and its text must mention the
 * exam (its code for Microsoft, a keyword of the subject for AP). Anything that doesn't verify is
 * printed and skipped — never guessed into the catalog. Idempotent; entries that already have a
 * sourceUrl are left alone.
 *
 * Sources so far: Microsoft Learn study guides (real "skills measured" + percentages) and College
 * Board AP course pages. More (AWS, gov.uk subject content for GCSE/A-level, ...) come in milestone 4.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/attach-exam-source-urls.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';

const CS = process.env.COSMOS_CONNECTION_STRING;
if (!CS) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');
const container = new CosmosClient(CS).database('interviewme').container('examCatalog');

const UA = 'P1ExamCatalogBot/1.0 (+https://www.theinterviewchair.com)';
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[:,]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function pageText(url) {
  try {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
      if (res.status !== 429 && res.status !== 503) break;   // the site is throttling us — wait and retry
      await new Promise(r => setTimeout(r, 8000 * (attempt + 1)));
    }
    if (!res.ok) return { ok: false, status: res.status };
    // PDFs (AWS exam guides, some Google Cloud guides): no text check here — the weekly job extracts the
    // text server-side and refuses to use a source that never mentions the exam's code.
    if ((res.headers.get('content-type') || '').includes('pdf')) return { ok: true, status: res.status, pdf: true, finalUrl: res.url };
    const html = await res.text();
    const text = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { ok: true, status: res.status, text, finalUrl: res.url };
  } catch (e) { return { ok: false, status: 'error: ' + e.message }; }
}

// Official exam guides. AWS publishes PDFs on awsstatic.com; Google Cloud has a guide page per exam.
const AWS_GUIDES = {
  'CLF-C02': 'docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf',
  'SAA-C03': 'docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf',
  'DVA-C02': 'docs-dev-associate/AWS-Certified-Developer-Associate_Exam-Guide.pdf',
  'SOA-C02': 'docs-sysops-associate/AWS-Certified-SysOps-Administrator-Associate_Exam-Guide.pdf',
  'SAP-C02': 'docs-sa-pro/AWS-Certified-Solutions-Architect-Professional_Exam-Guide.pdf',
  'DOP-C02': 'docs-devops-pro/AWS-Certified-DevOps-Engineer-Professional_Exam-Guide.pdf',
  'SCS-C02': 'docs-security-spec/AWS-Certified-Security-Specialty_Exam-Guide.pdf',
  'MLA-C01': 'docs-machine-learning-engineer-associate/AWS-Certified-Machine-Learning-Engineer-Associate_Exam-Guide.pdf',
  'AIF-C01': 'docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf',
  'DEA-C01': 'docs-data-engineer-associate/AWS-Certified-Data-Engineer-Associate_Exam-Guide.pdf',
};
const GCP_GUIDES = {
  'Google Cloud Digital Leader': ['cloud-digital-leader', 'Digital Leader'],
  'Google Cloud Associate Cloud Engineer': ['cloud-engineer', 'Associate Cloud Engineer'],
  'Google Cloud Professional Cloud Architect': ['professional-cloud-architect', 'Cloud Architect'],
  'Google Cloud Professional Data Engineer': ['data-engineer', 'Data Engineer'],
};

function candidateFor(entry) {
  if (entry.vendor === 'Amazon Web Services' && AWS_GUIDES[entry.examCode]) {
    return { url: 'https://d1.awsstatic.com/training-and-certification/' + AWS_GUIDES[entry.examCode], mustMention: [] };
  }
  if (GCP_GUIDES[entry.name]) {
    return { url: 'https://cloud.google.com/learn/certification/guides/' + GCP_GUIDES[entry.name][0], mustMention: [GCP_GUIDES[entry.name][1]] };
  }
  if (entry.category === 'certification' && entry.vendor === 'Microsoft' && /^[A-Z]{2}-\d{3}$/.test(entry.examCode || '')) {
    const code = entry.examCode.toLowerCase();
    return { url: `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/${code}`, mustMention: [entry.examCode] };
  }
  if (entry.category === 'ap' && entry.subject) {
    const words = entry.subject.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !['language', 'culture', 'united', 'states', 'modern'].includes(w));
    return { url: `https://apstudents.collegeboard.org/courses/ap-${slug(entry.subject)}`, mustMention: words.length ? [words[0]] : [] };
  }
  return null;
}

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN — no writes ---\n' : '--- LIVE RUN ---\n');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
  let attached = 0, skipped = 0, already = 0, na = 0;
  for (const e of resources) {
    if (e.sourceUrl) { already++; continue; }
    const cand = candidateFor(e);
    if (!cand) { na++; continue; }
    const r = await pageText(cand.url);
    await new Promise(r => setTimeout(r, 1500)); // pace every request — College Board answers 429 if hit quickly
    const mentions = r.ok && (r.pdf || cand.mustMention.every(m => r.text.toLowerCase().includes(m.toLowerCase())));
    if (!r.ok || !mentions) {
      console.log(`  SKIP   ${e.name}  ->  ${cand.url}  (${r.ok ? 'page does not mention ' + cand.mustMention.join(',') : 'HTTP ' + r.status})`);
      skipped++; continue;
    }
    console.log(`  ${DRY_RUN ? 'would attach' : 'attaching'}  ${e.name}  ->  ${cand.url}`);
    if (!DRY_RUN) await container.items.upsert({ ...e, sourceUrl: cand.url, sourceStatus: '' });
    attached++;
  }
  console.log(`\n${DRY_RUN ? 'Would attach' : 'Attached'} ${attached}; skipped (unverified) ${skipped}; already had one ${already}; no known source pattern ${na}.`);
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
