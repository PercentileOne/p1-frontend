/**
 * "Chairman" was only reachable as an alias buried under the generic "Chief Executives"
 * bucket (added earlier tonight), so searching it correctly matched but displayed the
 * wrong title — confusing UX Francis flagged directly ("a person should be able to search
 * for actual chairman"). Chairman/Chair of the Board is also a genuinely distinct role
 * from CEO — board governance and oversight rather than day-to-day operations, often a
 * part-time/portfolio position — so it earns its own entry rather than staying folded in,
 * consistent with how the other C-suite titles are each modelled separately.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/add-chairman.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database('interviewme').container('careers');
const today = new Date().toISOString().slice(0, 10);

const doc = {
  id: 'chairman',
  title: 'Chairman',
  category: 'Business',
  subcategory: 'Board Leadership & Governance',
  aliases: ['Chair of the Board', 'Non-Executive Chairman', 'Executive Chairman', 'Board Chair', 'Company Chairman', 'Chairwoman', 'Chairperson'],
  tags: ['Corporate Governance', 'Board Leadership', 'Non-Executive', 'Strategy'],
  socUk: '1111', onetUs: '11-1011.00',
  salary: {
    uk: { starting: 40000, mid: 120000, senior: 250000, expert: 500000, currency: 'GBP' },
    us: { starting: 60000, mid: 180000, senior: 350000, expert: 700000, currency: 'USD' },
  },
  workforce: {
    uk: { employed: 3000, studying: 200, growthPct5yr: 5, growthTrend: 'stable', vacancies: 150 },
    us: { employed: 8000, studying: 500, growthPct5yr: 6, growthTrend: 'stable', vacancies: 400 },
  },
  demand: { uk: 40, us: 45, automationRisk: 5, futureScore: 70, trend: 'stable' },
  lifestyle: {
    environment: 'Boardroom/Office/Hybrid', stress: 60, energy: 55, collaboration: 90, remoteScore: 30,
    typicalHours: 'Part-time for most roles — a few days per month for non-executive chairs; full-time only for executive chairman positions',
  },
  identity: {
    summary: 'Chairs the board of directors — sets the board agenda, ensures good governance, holds the CEO and executive team accountable, and represents the company to major shareholders. Distinct from the CEO: focused on oversight and governance rather than day-to-day operations. Often a portfolio role held alongside other board positions.',
    traits: ['Highly experienced', 'Diplomatic', 'Strong governance instincts', 'Respected industry figure', 'Independent-minded'],
    strengths: ['Board leadership', 'Stakeholder management', 'Governance & compliance oversight', 'CEO accountability'],
    weaknesses: ['Ultimate legal responsibility for board decisions without day-to-day operational control', 'Reputational risk is shared even when not directly involved in a decision'],
  },
  pathway: {
    entryRequirements: [
      'Typically follows a full career as a CEO, senior executive, or highly experienced non-executive director',
      'Usually taken up later in a career, often after stepping back from full-time executive roles',
    ],
    qualifications: ['No formal qualification required', 'Institute of Directors (IoD) Chartered Director qualification valued in the UK'],
    skills: ['Corporate governance', 'Board facilitation', 'Stakeholder relations', 'Strategic oversight', 'Succession planning'],
    timeToJunior: 'N/A — not an entry-level role',
    timeToMid: '15-20 years (Non-Executive Director)',
    timeToSenior: '20-25 years (Deputy Chairman/smaller company Chairman)',
    timeToExpert: '25+ years (Chairman of a large/listed company)',
    learningPath: ['Senior executive or CEO career', 'Non-Executive Director appointments', 'Deputy Chairman', 'Chairman'],
  },
  salaryLastUpdated: today,
  lastUpdated: today,
  source: 'manual-curated',
  confidence: 0.8,
};

if (DRY_RUN) {
  console.log('--- DRY RUN ---\nwould upsert:', doc.title, '(' + doc.id + ')');
  process.exit(0);
}

const { resource } = await container.items.upsert(doc);
console.log('Upserted:', resource.title, '| id:', resource.id, '| category:', resource.category);
