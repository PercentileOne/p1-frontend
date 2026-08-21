/**
 * Adds "Football Manager" as its own proper career entry — a genuine gap confirmed
 * missing from the database (not covered by the SOC/O*NET import, which only carried
 * "Football Coach" as an alias, not the distinct senior Manager role UK football
 * culture actually uses — see Pep Guardiola, Jürgen Klopp etc., titled "Manager" not
 * "Head Coach" even though the role is equivalent to what most other sports/countries
 * call Head Coach).
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/add-football-manager.mjs
 */
import { CosmosClient } from '@azure/cosmos';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database('interviewme').container('careers');

const today = new Date().toISOString().slice(0, 10);

const doc = {
  id: 'football-manager',
  title: 'Football Manager',
  category: 'Sport',
  subcategory: 'Coaching & Management',
  aliases: [
    'Head Coach', 'First Team Manager', 'Team Manager', 'Gaffer',
    'Head Football Coach', 'Club Manager', 'Soccer Head Coach', 'Soccer Manager',
  ],
  tags: ['Football', 'Coaching', 'Elite Sport', 'Team Management', 'Tactics'],
  soc_uk: '3432',
  onet_us: '27-2022.00',
  salary: {
    uk: { starting: 30000, mid: 120000, senior: 750000, expert: 5000000, currency: 'GBP' },
    us: { starting: 40000, mid: 90000, senior: 350000, expert: 2000000, currency: 'USD' },
  },
  workforce: {
    uk: { employed: 4500, studying: 800, growthPct5yr: 2, growthTrend: 'stable', vacancies: 90 },
    us: { employed: 3200, studying: 600, growthPct5yr: 4, growthTrend: 'growing', vacancies: 70 },
  },
  demand: { uk: 35, us: 40, automationRisk: 3, futureScore: 62, trend: 'stable' },
  lifestyle: {
    environment: 'Training ground and matchday touchline, high public/media exposure',
    stress: 90, energy: 85, collaboration: 80, remoteScore: 2,
    typicalHours: 'Long, irregular — early starts, evening/weekend matches, constant',
  },
  identity: {
    summary: 'Leads a football club\'s playing side end to end — team selection, tactics, player development, and the public face of results. Distinct from a Coach in UK football culture: one Manager per club, versus many Coaches beneath them. Career security is famously short — results-driven and highly public.',
    traits: ['Decisive', 'Resilient under public pressure', 'Tactically astute', 'Strong communicator', 'Thick-skinned'],
    strengths: ['Man-management', 'In-game tactical adjustment', 'Media handling', 'Squad building'],
    weaknesses: ['Job security is among the lowest of any profession — average Premier League tenure is well under 2 years', 'Intense public scrutiny and criticism', 'Family/personal life disruption from irregular hours and relocation'],
  },
  pathway: {
    entryRequirements: [
      'Playing career at a reasonable level is common but not mandatory (e.g. Guardiola, Klopp, Mourinho all played professionally to varying degrees)',
      'UEFA coaching badges (C, B, A Licence) building toward the UEFA Pro Licence, required to manage in England\'s top two divisions',
      'Typically years as an assistant coach, youth team manager, or academy coach first',
    ],
    qualifications: ['UEFA Pro Licence (required for Premier League/Championship)', 'FA Level 4/5 coaching badges', 'Sports science or management degree (increasingly common but not required)'],
    skills: ['Tactical analysis', 'Squad and match-day management', 'Player development', 'Media and press handling', 'Recruitment judgement'],
    timeToJunior: '2-4 years (youth/academy coaching)',
    timeToMid: '5-8 years (lower-league or assistant manager roles)',
    timeToSenior: '10-15 years (Championship or established EFL management)',
    timeToExpert: '15+ years, and largely reputation/results-dependent rather than time-based (top-flight, European competition)',
    learningPath: ['Playing career or grassroots coaching', 'FA/UEFA badge progression (C to Pro Licence)', 'Assistant or youth-team management', 'First senior managerial role, usually lower league', 'Progression tied almost entirely to results, not tenure'],
  },
  salaryLastUpdated: today,
  lastUpdated: today,
  source: 'manual-curated',
  confidence: 0.9,
};

const { resource } = await container.items.upsert(doc);
console.log('Upserted:', resource.title, '| id:', resource.id, '| soc_uk:', resource.soc_uk, '| onet_us:', resource.onet_us);
