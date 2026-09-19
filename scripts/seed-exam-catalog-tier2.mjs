/**
 * Tier-2 exam catalog seed (2026-09-19, milestone 4 "breadth") — ~95 more US/UK exams as NAME-ONLY
 * stubs on top of tier 1: UK theory tests and accountancy/medical exams, US equivalency and licensing
 * exams, more Microsoft / Google / security / project certifications.
 *
 * Insert-only and idempotent: an entry whose category + name already exists is left completely alone.
 * As with tier 1, names/codes come from general knowledge — the weekly refresh job verifies the ones
 * that have an official source URL (run scripts/attach-exam-source-urls.mjs afterwards for new
 * Microsoft entries) and flags retired exams; the rest get AI-drafted blueprints on first open.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/seed-exam-catalog-tier2.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';

const CS = process.env.COSMOS_CONNECTION_STRING;
if (!CS) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');
const container = new CosmosClient(CS).database('interviewme').container('examCatalog');

const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => (s || '').trim().toLowerCase();
const entries = [];
const add = e => entries.push({ vendor: '', examCode: '', aliases: [], board: '', level: '', subject: '', minScore: 0, passScore: 0, maxScore: 0, scoringModel: 'scaled', ...e });
const cert = (name, vendor, region = 'global', extra = {}) => add({ category: 'certification', region, vendor, name, ...extra });
const other = (name, vendor, region, extra = {}) => add({ category: 'other', region, vendor, name, ...extra });

// ── UK official theory tests (DVSA) ──────────────────────────────────────────────────────────
add({ category: 'official-tests', region: 'uk', vendor: 'DVSA', name: 'UK Motorcycle Theory Test', maxScore: 50, passScore: 43, aliases: ['Motorbike Theory Test'] });
add({ category: 'official-tests', region: 'uk', vendor: 'DVSA', name: 'UK Lorry (LGV) Theory Test', maxScore: 100, passScore: 85, aliases: ['LGV Theory Test', 'HGV Theory Test'] });
add({ category: 'official-tests', region: 'uk', vendor: 'DVSA', name: 'UK Bus and Coach (PCV) Theory Test', maxScore: 100, passScore: 85, aliases: ['PCV Theory Test'] });

// ── UK admissions, accountancy, medical, safety, IT ──────────────────────────────────────────
add({ category: 'admissions', region: 'uk', vendor: 'LNAT Consortium', name: 'LNAT', maxScore: 42, aliases: ['National Admissions Test for Law', 'Law National Aptitude Test'] });
for (const [n, code] of [['Financial Accounting (FA)', 'FA'], ['Management Accounting (MA)', 'MA'], ['Business and Technology (BT)', 'BT']])
  cert(`ACCA Applied Skills: ${n}`, 'ACCA', 'uk', { maxScore: 100, passScore: 50, aliases: [`ACCA ${code}`] });
for (const n of ['Accounting', 'Assurance', 'Business, Technology and Finance', 'Law', 'Management Information', 'Principles of Taxation'])
  cert(`ICAEW ACA Certificate Level: ${n}`, 'ICAEW', 'uk', { maxScore: 100, passScore: 55 });
cert('IOSH Managing Safely', 'IOSH', 'uk');
cert('ISTQB Certified Tester Foundation Level (CTFL)', 'ISTQB', 'global', { maxScore: 40, passScore: 26, aliases: ['ISTQB Foundation', 'CTFL'] });
cert('BCS Foundation Certificate in Business Analysis', 'BCS', 'uk');
cert('UK Medical Licensing Assessment (UKMLA) Applied Knowledge Test', 'GMC', 'uk', { aliases: ['UKMLA', 'UKMLA AKT'] });
cert('MRCP(UK) Part 1', 'Royal Colleges of Physicians', 'uk', { aliases: ['MRCP Part 1'] });
cert('NMC Test of Competence (Computer Based Test)', 'Nursing and Midwifery Council', 'uk', { aliases: ['NMC CBT', 'NMC Part 1'] });

// ── US equivalency, teaching, allied-health and school admissions ────────────────────────────
for (const s of ['Mathematical Reasoning', 'Reasoning Through Language Arts', 'Science', 'Social Studies'])
  other(`GED ${s}`, 'GED Testing Service', 'us', { minScore: 100, maxScore: 200, passScore: 145, aliases: [`GED ${s.split(' ')[0]}`] });
other('HiSET', 'ETS', 'us', { aliases: ['High School Equivalency Test'] });
other('ASVAB', 'US Department of Defense', 'us', { aliases: ['Armed Services Vocational Aptitude Battery'] });
other('Praxis Core Academic Skills for Educators', 'ETS', 'us', { aliases: ['Praxis Core'] });
other('TEAS (Test of Essential Academic Skills)', 'ATI', 'us', { aliases: ['ATI TEAS', 'TEAS 7'] });
other('HESI A2 Admission Assessment', 'Elsevier', 'us', { aliases: ['HESI A2'] });
other('SHSAT', 'NYC Department of Education', 'us', { aliases: ['Specialized High Schools Admissions Test'] });
other('ISEE', 'ERB', 'us', { aliases: ['Independent School Entrance Exam'] });
add({ category: 'admissions', region: 'us', vendor: 'ADA', name: 'DAT (Dental Admission Test)', minScore: 1, maxScore: 30, aliases: ['DAT'] });
add({ category: 'admissions', region: 'us', vendor: 'ASCO', name: 'OAT (Optometry Admission Test)', minScore: 200, maxScore: 400, aliases: ['OAT'] });

// ── US licensing & professional exams ────────────────────────────────────────────────────────
cert('NCLEX-PN', 'NCSBN', 'us'); cert('USMLE Step 2 CK', 'NBME / FSMB', 'us'); cert('USMLE Step 3', 'NBME / FSMB', 'us');
cert('COMLEX-USA Level 1', 'NBOME', 'us'); cert('PE Exam (Principles and Practice of Engineering)', 'NCEES', 'us', { aliases: ['PE Exam'] });
cert('CFP Exam', 'CFP Board', 'us', { aliases: ['Certified Financial Planner Exam'] });
cert('Enrolled Agent Special Enrollment Examination (SEE)', 'IRS', 'us', { aliases: ['EA Exam'] });
cert('Certified Management Accountant (CMA)', 'IMA', 'us', { aliases: ['CMA'] });
cert('Securities Industry Essentials (SIE) Exam', 'FINRA', 'us', { aliases: ['SIE'] });
for (const n of ['Series 3', 'Series 6', 'Series 63', 'Series 65', 'Series 66']) cert(`${n} Exam`, 'FINRA / NASAA', 'us');
cert('NREMT EMT Cognitive Exam', 'NREMT', 'us', { aliases: ['EMT Exam'] });
cert('ARRT Radiography Certification Exam', 'ARRT', 'us');
cert('Pharmacy Technician Certification Exam (PTCE)', 'PTCB', 'us', { aliases: ['PTCE'] });
cert('National Counselor Examination (NCE)', 'NBCC', 'us', { aliases: ['NCE'] });
cert('Certified Professional Coder (CPC)', 'AAPC', 'us', { aliases: ['CPC'] });
cert('ServSafe Food Protection Manager', 'National Restaurant Association', 'us');
cert('NASM Certified Personal Trainer', 'NASM', 'us', { aliases: ['NASM CPT'] });
cert('PHR (Professional in Human Resources)', 'HRCI', 'us', { aliases: ['PHR'] }); cert('SPHR (Senior Professional in Human Resources)', 'HRCI', 'us', { aliases: ['SPHR'] });
cert('SHRM Senior Certified Professional (SHRM-SCP)', 'SHRM', 'us', { aliases: ['SHRM-SCP'] });
cert('LEED Green Associate', 'USGBC / GBCI', 'us');

// ── Project / business / architecture ────────────────────────────────────────────────────────
cert('PMI Agile Certified Practitioner (PMI-ACP)', 'PMI', 'global', { aliases: ['PMI-ACP'] });
cert('Professional Scrum Product Owner I (PSPO I)', 'Scrum.org', 'global', { aliases: ['PSPO I'] });
cert('Certified Scrum Product Owner (CSPO)', 'Scrum Alliance', 'global', { aliases: ['CSPO'] });
cert('SAFe Agilist', 'Scaled Agile', 'global', { aliases: ['SAFe 6 Agilist'] });
cert('PRINCE2 Practitioner', 'PeopleCert', 'uk'); cert('AgilePM Foundation', 'APMG', 'uk');
cert('TOGAF Enterprise Architecture Foundation', 'The Open Group', 'global', { aliases: ['TOGAF Foundation'] });
cert('COBIT 2019 Foundation', 'ISACA', 'global');
cert('Lean Six Sigma Green Belt', 'ASQ', 'global', { aliases: ['CSSGB'] });
cert('ASQ Certified Quality Engineer (CQE)', 'ASQ', 'global', { aliases: ['CQE'] });
cert('Certification of Capability in Business Analysis (CCBA)', 'IIBA', 'global', { aliases: ['CCBA'] });
cert('Certified Business Analysis Professional (CBAP)', 'IIBA', 'global', { aliases: ['CBAP'] });
cert('Entry Certificate in Business Analysis (ECBA)', 'IIBA', 'global', { aliases: ['ECBA'] });

// ── IT & security ────────────────────────────────────────────────────────────────────────────
for (const n of ['CompTIA CySA+', 'CompTIA PenTest+', 'CompTIA Linux+', 'CompTIA Cloud+', 'CompTIA Server+', 'CompTIA Data+', 'CompTIA Project+'])
  cert(n, 'CompTIA', 'global', { aliases: [n.replace('CompTIA ', '')] });
cert('Cisco Certified Network Professional Enterprise (CCNP ENCOR)', 'Cisco', 'global', { examCode: 'ENCOR 350-401', aliases: ['CCNP Enterprise', 'ENCOR'] });
cert('Certified Cloud Security Professional (CCSP)', 'ISC2', 'global', { aliases: ['CCSP'] });
cert('Systems Security Certified Practitioner (SSCP)', 'ISC2', 'global', { aliases: ['SSCP'] });
cert('GIAC Security Essentials (GSEC)', 'GIAC', 'global', { aliases: ['GSEC'] });
cert('Certified in Risk and Information Systems Control (CRISC)', 'ISACA', 'global', { aliases: ['CRISC'] });
cert('Palo Alto Networks Certified Network Security Administrator (PCNSA)', 'Palo Alto Networks', 'global', { aliases: ['PCNSA'] });
cert('Google Cloud Professional Machine Learning Engineer', 'Google Cloud'); cert('Google Cloud Professional Cloud Security Engineer', 'Google Cloud');
cert('Google Cloud Professional Cloud Developer', 'Google Cloud');
cert('Oracle Cloud Infrastructure Foundations Associate', 'Oracle', 'global', { aliases: ['OCI Foundations'] });
cert('Salesforce Certified Platform Developer I', 'Salesforce', 'global', { aliases: ['Platform Developer I'] });
cert('Tableau Certified Data Analyst', 'Tableau / Salesforce', 'global');

// ── More Microsoft (official study guides are attached by attach-exam-source-urls.mjs) ────────
const MS = (n, code) => cert(n, 'Microsoft', 'global', { examCode: code, minScore: 0, maxScore: 1000, passScore: 700 });
MS('Microsoft Certified: Azure Data Scientist Associate', 'DP-100'); MS('Microsoft Certified: Azure Cosmos DB Developer Specialty', 'DP-420');
MS('Microsoft Certified: Fabric Analytics Engineer Associate', 'DP-600'); MS('Microsoft Certified: Cybersecurity Architect Expert', 'SC-100');
MS('Microsoft Certified: Identity and Access Administrator Associate', 'SC-300'); MS('Microsoft 365 Certified: Endpoint Administrator Associate', 'MD-102');
MS('Microsoft 365 Certified: Teams Administrator Associate', 'MS-700'); MS('Microsoft Certified: Power Platform Functional Consultant Associate', 'PL-200');
MS('Microsoft Certified: Power Platform Developer Associate', 'PL-400'); MS('Microsoft Certified: Windows Server Hybrid Administrator Associate', 'AZ-800');

// ─────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '--- DRY RUN — no writes ---' : '--- LIVE RUN ---');
  const { resources: existing } = await container.items.query('SELECT c.id, c.category, c.name FROM c').fetchAll();
  const have = new Set(existing.map(d => `${d.category}|${norm(d.name)}`));
  console.log(`Existing entries: ${existing.length}; tier-2 seed entries: ${entries.length}\n`);
  let inserted = 0, skipped = 0;
  for (const e of entries) {
    if (have.has(`${e.category}|${norm(e.name)}`)) { skipped++; continue; }
    const doc = {
      id: `${e.category}-${slug(e.name)}`, ...e,
      domains: [], source: 'seed-tier2', blueprintStatus: 'stub', status: 'active',
      lastVerifiedAt: '', blueprintGeneratedAt: '', createdAt: new Date().toISOString(),
    };
    if (!DRY_RUN) await container.items.upsert(doc);
    have.add(`${e.category}|${norm(e.name)}`);
    inserted++;
  }
  console.log(`${DRY_RUN ? 'Would insert' : 'Inserted'} ${inserted}; already present ${skipped}.`);
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
