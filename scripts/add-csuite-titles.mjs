/**
 * Fixes the C-suite job title gap Francis hit live: typing "CTO", "CEO", "Chairman" into
 * the interview Job Title field returned nothing.
 *
 * Root cause was two-layered:
 * 1. CosmosCareerService.SearchAsync never actually queried the `aliases` field (fixed
 *    separately in the same session, see commit 942b841) — most of these abbreviations
 *    already existed as aliases on real entries but were structurally unreachable by search.
 * 2. A genuine handful of titles were still missing outright: "CEO"/"CTO" abbreviations on
 *    two of the eight existing manually-curated Chief-X-Officer entries, "Chairman" on the
 *    generic O*NET "Chief Executives" bucket, and five whole roles with no entry anywhere —
 *    Chief HR Officer, Chief Product Officer, Chief Strategy Officer, Chief Legal Officer /
 *    General Counsel, and Chief Security Officer (CISO).
 *
 * ALIAS_ADDITIONS patches existing docs (read, union aliases, upsert — category is the
 * partition key and doesn't change, so no delete+reinsert needed here, unlike the earlier
 * category-merge script).
 * NEW_ENTRIES follows the same full-document shape as add-football-manager.mjs. Two of the
 * five (Chief Product Officer, Chief Strategy Officer) have no dedicated SOC/O*NET code in
 * either taxonomy — left null rather than guessing a wrong one, with confidence lowered to
 * reflect that.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/add-csuite-titles.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database('interviewme').container('careers');
const today = new Date().toISOString().slice(0, 10);

const ALIAS_ADDITIONS = [
  { id: 'chief-executive-officer', category: 'Business', add: ['CEO'] },
  { id: 'chief-technology-officer', category: 'Technology', add: ['CTO'] },
  { id: 'onet-us-11-1011.00', category: 'Business', add: ['Chairman', 'Vice Chairman', 'Company Chairman', 'Executive Chairman'] },
];

const NEW_ENTRIES = [
  {
    id: 'chief-human-resources-officer',
    title: 'Chief Human Resources Officer',
    category: 'Business',
    subcategory: 'HR & People Leadership',
    aliases: ['CHRO', 'Chief People Officer', 'Head of People', 'VP of Human Resources', 'Director of Human Resources'],
    tags: ['Human Resources', 'People Strategy', 'Talent', 'Culture', 'Leadership'],
    socUk: '1136', onetUs: '11-3121.00',
    salary: {
      uk: { starting: 55000, mid: 95000, senior: 150000, expert: 280000, currency: 'GBP' },
      us: { starting: 90000, mid: 150000, senior: 230000, expert: 400000, currency: 'USD' },
    },
    workforce: {
      uk: { employed: 28000, studying: 3000, growthPct5yr: 6, growthTrend: 'growing', vacancies: 900 },
      us: { employed: 55000, studying: 6000, growthPct5yr: 8, growthTrend: 'growing', vacancies: 2000 },
    },
    demand: { uk: 55, us: 60, automationRisk: 12, futureScore: 78, trend: 'growing' },
    lifestyle: {
      environment: 'Office/Remote/Hybrid', stress: 65, energy: 70, collaboration: 95, remoteScore: 55,
      typicalHours: 'Standard hours, with periodic evening/weekend availability during restructures or crises',
    },
    identity: {
      summary: 'Leads the people strategy for the whole organisation — hiring, culture, compensation, retention, and increasingly employer brand and AI-era workforce planning. A seat at the executive table representing the workforce\'s interests.',
      traits: ['Empathetic', 'Strategic', 'Discreet', 'Strong communicator', 'Resilient under pressure'],
      strengths: ['Talent strategy', 'Conflict resolution', 'Compensation design', 'Change management'],
      weaknesses: ['Frequently the bearer of difficult news — layoffs, restructures, terminations', 'Constant balancing act between employee advocacy and business needs'],
    },
    pathway: {
      entryRequirements: [
        'Typically 15-20 years progressing through HR generalist or specialist roles before reaching Chief level',
        'Usually preceded by several years as VP or Director of HR',
        'Track record of leading through major organisational change (M&A, restructures, rapid scaling)',
      ],
      qualifications: ['CIPD Level 7 (UK) or SHRM-SCP (US)', 'MBA increasingly common at this level'],
      skills: ['Talent acquisition strategy', 'Organisational design', 'Compensation & benefits', 'Employment law', 'Change management'],
      timeToJunior: '0-2 years (HR Assistant/Advisor)',
      timeToMid: '5-8 years (HR Manager/Business Partner)',
      timeToSenior: '12-15 years (HR Director/VP People)',
      timeToExpert: '18+ years (Chief HR Officer, typically only at larger organisations)',
      learningPath: ['HR Assistant', 'HR Business Partner', 'HR Director', 'VP People', 'Chief HR Officer'],
    },
    confidence: 0.8,
  },
  {
    id: 'chief-product-officer',
    title: 'Chief Product Officer',
    category: 'Technology',
    subcategory: 'Product Leadership',
    aliases: ['CPO', 'Head of Product', 'VP of Product', 'Chief Product & Technology Officer'],
    tags: ['Product Strategy', 'Roadmap', 'UX', 'Technology Leadership'],
    socUk: null, onetUs: null,
    salary: {
      uk: { starting: 70000, mid: 130000, senior: 200000, expert: 350000, currency: 'GBP' },
      us: { starting: 130000, mid: 210000, senior: 320000, expert: 550000, currency: 'USD' },
    },
    workforce: {
      uk: { employed: 12000, studying: 1500, growthPct5yr: 18, growthTrend: 'growing', vacancies: 600 },
      us: { employed: 35000, studying: 4000, growthPct5yr: 22, growthTrend: 'growing', vacancies: 1800 },
    },
    demand: { uk: 70, us: 78, automationRisk: 15, futureScore: 85, trend: 'growing' },
    lifestyle: {
      environment: 'Office/Remote/Hybrid', stress: 75, energy: 80, collaboration: 90, remoteScore: 60,
      typicalHours: 'Standard hours with regular cross-timezone calls if the company is global',
    },
    identity: {
      summary: 'Owns the product vision, roadmap, and strategy across the whole company — the bridge between engineering, design, sales, and the board. Ultimately accountable for what gets built and why.',
      traits: ['Visionary', 'Data-driven', 'Decisive', 'Strong communicator', 'Customer-obsessed'],
      strengths: ['Product strategy', 'Roadmap prioritisation', 'Cross-functional leadership', 'User research synthesis'],
      weaknesses: ['Constant tension between short-term revenue asks and long-term product vision', 'Highly exposed when a major launch underperforms'],
    },
    pathway: {
      entryRequirements: [
        'Typically 10-15 years progressing from Product Manager through Senior/Group PM, then VP Product',
        'Track record of shipped, commercially successful products matters far more than any credential',
      ],
      qualifications: ['No formal requirement', 'MBA or technical degree common but not required'],
      skills: ['Product strategy', 'Roadmapping', 'Stakeholder management', 'Data analysis', 'UX judgement'],
      timeToJunior: '0-2 years (Associate/Junior Product Manager)',
      timeToMid: '4-6 years (Senior Product Manager)',
      timeToSenior: '8-12 years (VP Product/Group Product Manager)',
      timeToExpert: '12+ years (Chief Product Officer)',
      learningPath: ['Associate PM', 'Product Manager', 'Senior/Group PM', 'VP Product', 'Chief Product Officer'],
    },
    confidence: 0.6,
  },
  {
    id: 'chief-strategy-officer',
    title: 'Chief Strategy Officer',
    category: 'Business',
    subcategory: 'Corporate Strategy',
    aliases: ['CSO', 'Head of Corporate Strategy', 'VP of Strategy', 'Chief Strategy & Transformation Officer'],
    tags: ['Corporate Strategy', 'M&A', 'Business Development', 'Growth Planning'],
    socUk: null, onetUs: null,
    salary: {
      uk: { starting: 75000, mid: 140000, senior: 220000, expert: 380000, currency: 'GBP' },
      us: { starting: 140000, mid: 220000, senior: 340000, expert: 580000, currency: 'USD' },
    },
    workforce: {
      uk: { employed: 8000, studying: 1000, growthPct5yr: 10, growthTrend: 'growing', vacancies: 350 },
      us: { employed: 22000, studying: 2500, growthPct5yr: 12, growthTrend: 'growing', vacancies: 900 },
    },
    demand: { uk: 55, us: 62, automationRisk: 20, futureScore: 74, trend: 'growing' },
    lifestyle: {
      environment: 'Office/Hybrid', stress: 78, energy: 75, collaboration: 85, remoteScore: 40,
      typicalHours: 'Long hours around board cycles, M&A processes, and annual planning',
    },
    identity: {
      summary: 'Sets and drives the company\'s long-term strategic direction — market entry, M&A, competitive positioning, and major bets. Works closely with the CEO and board to translate vision into an executable plan.',
      traits: ['Analytical', 'Big-picture thinker', 'Persuasive', 'Comfortable with ambiguity', 'Politically astute'],
      strengths: ['Market analysis', 'Long-range planning', 'M&A evaluation', 'Executive communication'],
      weaknesses: ['Can be seen as disconnected from day-to-day operations', 'Strategy work often has a long lag before results are visible'],
    },
    pathway: {
      entryRequirements: [
        'Frequently ex-management consultants (McKinsey/BCG/Bain-type firms) or long-tenured internal operators moving into strategy',
        'MBA very common at this level',
      ],
      qualifications: ['MBA common but not universal', 'Strategy consulting background highly valued'],
      skills: ['Strategic planning', 'Competitive analysis', 'Financial modelling', 'M&A due diligence', 'Board-level communication'],
      timeToJunior: '0-3 years (Strategy Analyst/Associate, often via consulting)',
      timeToMid: '5-8 years (Strategy Manager/Director)',
      timeToSenior: '10-14 years (VP Strategy)',
      timeToExpert: '15+ years (Chief Strategy Officer)',
      learningPath: ['Strategy Analyst', 'Strategy Manager', 'Director of Strategy', 'VP Strategy', 'Chief Strategy Officer'],
    },
    confidence: 0.6,
  },
  {
    id: 'chief-legal-officer',
    title: 'Chief Legal Officer',
    category: 'Legal',
    subcategory: 'Corporate Law & Compliance',
    aliases: ['General Counsel', 'CLO', 'Chief Counsel', 'Head of Legal', 'VP of Legal', 'Corporate Counsel'],
    tags: ['Corporate Law', 'Compliance', 'Risk Management', 'Governance'],
    socUk: '2419', onetUs: '23-1011.00',
    salary: {
      uk: { starting: 85000, mid: 150000, senior: 230000, expert: 400000, currency: 'GBP' },
      us: { starting: 150000, mid: 230000, senior: 350000, expert: 600000, currency: 'USD' },
    },
    workforce: {
      uk: { employed: 15000, studying: 2000, growthPct5yr: 8, growthTrend: 'growing', vacancies: 500 },
      us: { employed: 40000, studying: 5000, growthPct5yr: 9, growthTrend: 'growing', vacancies: 1400 },
    },
    demand: { uk: 50, us: 58, automationRisk: 18, futureScore: 72, trend: 'growing' },
    lifestyle: {
      environment: 'Office/Hybrid', stress: 80, energy: 70, collaboration: 75, remoteScore: 45,
      typicalHours: 'Long, unpredictable — driven by deals, litigation, and regulatory deadlines',
    },
    identity: {
      summary: 'Heads the entire legal function — contracts, litigation, regulatory compliance, IP, and corporate governance. The company\'s chief risk gatekeeper and the board\'s most senior legal adviser.',
      traits: ['Meticulous', 'Discreet', 'Calm under pressure', 'Strong ethical compass', 'Persuasive negotiator'],
      strengths: ['Contract negotiation', 'Regulatory compliance', 'Risk assessment', 'Corporate governance'],
      weaknesses: ['Often the one saying no to commercially attractive but risky deals', 'High-stakes decisions carrying real personal liability exposure'],
    },
    pathway: {
      entryRequirements: [
        'Qualified lawyer — solicitor/barrister in the UK, JD-qualified attorney in the US',
        'Typically 15+ years post-qualification experience before reaching General Counsel/Chief Legal Officer',
      ],
      qualifications: ['Law degree + professional qualification (LPC/Bar in UK, JD + Bar exam in US)', 'Often several years in private practice before moving in-house'],
      skills: ['Contract law', 'Corporate governance', 'Regulatory compliance', 'Risk management', 'Negotiation'],
      timeToJunior: '0-2 years (Trainee Solicitor/Junior Associate)',
      timeToMid: '6-9 years (Senior Associate/In-house Counsel)',
      timeToSenior: '12-15 years (Deputy General Counsel/Legal Director)',
      timeToExpert: '18+ years (General Counsel/Chief Legal Officer)',
      learningPath: ['Trainee Solicitor/Associate', 'Senior Associate', 'In-house Counsel', 'Deputy General Counsel', 'General Counsel/Chief Legal Officer'],
    },
    confidence: 0.8,
  },
  {
    id: 'chief-security-officer',
    title: 'Chief Security Officer',
    category: 'Technology',
    subcategory: 'Cybersecurity Leadership',
    aliases: ['CISO', 'Chief Information Security Officer', 'Head of Information Security', 'VP of Security'],
    tags: ['Cybersecurity', 'Risk Management', 'Compliance', 'Information Security'],
    socUk: '2134', onetUs: '11-3013.01',
    salary: {
      uk: { starting: 75000, mid: 140000, senior: 210000, expert: 350000, currency: 'GBP' },
      us: { starting: 140000, mid: 210000, senior: 310000, expert: 500000, currency: 'USD' },
    },
    workforce: {
      uk: { employed: 9000, studying: 2500, growthPct5yr: 25, growthTrend: 'growing', vacancies: 700 },
      us: { employed: 28000, studying: 6000, growthPct5yr: 28, growthTrend: 'growing', vacancies: 2200 },
    },
    demand: { uk: 75, us: 82, automationRisk: 15, futureScore: 88, trend: 'growing' },
    lifestyle: {
      environment: 'Office/Remote/Hybrid', stress: 85, energy: 75, collaboration: 70, remoteScore: 55,
      typicalHours: 'On-call around the clock for incident response, otherwise standard hours',
    },
    identity: {
      summary: 'Owns the organisation\'s entire cybersecurity posture — threat prevention, incident response, compliance, and increasingly board-level risk reporting as breaches carry ever bigger financial and reputational stakes.',
      traits: ['Vigilant', 'Calm in a crisis', 'Detail-oriented', 'Strong communicator', 'Risk-aware'],
      strengths: ['Threat detection strategy', 'Incident response leadership', 'Regulatory compliance (GDPR, SOC 2, ISO 27001)', 'Board-level risk communication'],
      weaknesses: ['One of the highest-stress C-suite roles — a single breach can end a tenure overnight', 'Constant balancing act between security and usability/speed demands'],
    },
    pathway: {
      entryRequirements: [
        'Typically 12-18 years progressing through security analyst/engineer roles before reaching CISO',
        'Often holds CISSP or an equivalent security certification',
      ],
      qualifications: ['CISSP, CISM, or equivalent security certification', 'Computer science or cybersecurity degree common but not mandatory with enough experience'],
      skills: ['Threat modelling', 'Incident response', 'Regulatory compliance', 'Security architecture', 'Risk communication'],
      timeToJunior: '0-2 years (Security Analyst)',
      timeToMid: '5-8 years (Security Engineer/Manager)',
      timeToSenior: '10-14 years (Head of Security/Director of InfoSec)',
      timeToExpert: '15+ years (Chief Information Security Officer)',
      learningPath: ['Security Analyst', 'Security Engineer', 'Security Manager', 'Director of Information Security', 'Chief Information Security Officer'],
    },
    confidence: 0.75,
  },
];

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN — no writes will happen ---\n');

  console.log('=== Alias additions ===');
  for (const { id, category, add } of ALIAS_ADDITIONS) {
    const { resource: doc } = await container.item(id, category).read();
    const current = new Set(doc.aliases || []);
    const missing = add.filter(a => !current.has(a));
    if (!missing.length) { console.log(`${id}: already has all of [${add.join(', ')}]`); continue; }
    console.log(`${id}: ${DRY_RUN ? 'would add' : 'adding'} [${missing.join(', ')}]`);
    if (DRY_RUN) continue;
    doc.aliases = [...current, ...missing];
    await container.item(id, category).replace(doc);
  }

  console.log('\n=== New entries ===');
  for (const entry of NEW_ENTRIES) {
    const doc = { ...entry, salaryLastUpdated: today, lastUpdated: today, source: 'manual-curated' };
    console.log(`${DRY_RUN ? 'would upsert' : 'upserting'}: ${doc.title} (${doc.id})`);
    if (DRY_RUN) continue;
    const { resource } = await container.items.upsert(doc);
    console.log(`  -> done, category: ${resource.category}`);
  }

  console.log(DRY_RUN ? '\nDry run complete — no data changed.' : '\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
