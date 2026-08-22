/**
 * "Software Architect" was a genuine gap in the careers database — one of the most
 * common senior tech job titles worldwide, missing entirely (not even as an alias),
 * unlike its siblings "Solutions Architect", "Enterprise Architect", "Cloud Architect",
 * and "Data Architect" which already exist as their own dedicated entries. Found live
 * when Francis typed it into the interview Job Title field and got nothing.
 *
 * Real SOC/O*NET codes confirmed via the canonical import source: UK SOC 2134
 * "Programmers and software development professionals" and US O*NET 15-1252.00
 * "Software Developers" both carry "Software Architect" as a real alias — but neither
 * of those got imported as its own document, and it's distinct enough in seniority/
 * scope from "Software Engineer" to deserve its own entry, matching how the other
 * Architect roles are each modelled separately rather than folded into Engineer/Developer.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/add-software-architect.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database('interviewme').container('careers');
const today = new Date().toISOString().slice(0, 10);

const doc = {
  id: 'software-architect',
  title: 'Software Architect',
  category: 'Technology',
  subcategory: 'Software Architecture',
  aliases: ['Technical Architect', 'Application Architect', 'Principal Software Architect', 'Lead Architect'],
  tags: ['System Design', 'Architecture', 'Technical Leadership', 'Software Engineering'],
  socUk: '2134', onetUs: '15-1252.00',
  salary: {
    uk: { starting: 55000, mid: 85000, senior: 120000, expert: 170000, currency: 'GBP' },
    us: { starting: 100000, mid: 145000, senior: 190000, expert: 260000, currency: 'USD' },
  },
  workforce: {
    uk: { employed: 22000, studying: 2500, growthPct5yr: 15, growthTrend: 'growing', vacancies: 1400 },
    us: { employed: 65000, studying: 6000, growthPct5yr: 18, growthTrend: 'growing', vacancies: 3800 },
  },
  demand: { uk: 68, us: 75, automationRisk: 10, futureScore: 84, trend: 'growing' },
  lifestyle: {
    environment: 'Office/Remote/Hybrid', stress: 55, energy: 70, collaboration: 80, remoteScore: 70,
    typicalHours: 'Standard hours, with occasional crunch around major architecture reviews or migrations',
  },
  identity: {
    summary: 'Designs the high-level structure of software systems — how components fit together, what technologies to use, and how the system scales, stays secure, and stays maintainable. Less hands-on-keyboard than an Engineer, more focused on the decisions that are expensive to reverse later.',
    traits: ['Systems thinker', 'Pragmatic', 'Strong communicator', 'Detail-oriented at the right altitude', 'Comfortable owning trade-offs'],
    strengths: ['System design', 'Technology evaluation', 'Cross-team technical alignment', 'Scalability planning'],
    weaknesses: ['Can drift too far from hands-on coding over time', 'Decisions carry outsized long-term consequences if wrong'],
  },
  pathway: {
    entryRequirements: [
      'Typically 8-12 years as a software engineer/developer before moving into architecture',
      'Track record of leading the technical design of non-trivial systems',
    ],
    qualifications: ['Computer science degree common but not required', 'Cloud/architecture certifications (AWS/Azure/GCP Solutions Architect) increasingly valued'],
    skills: ['System design', 'Cloud architecture', 'API design', 'Scalability & reliability engineering', 'Technical documentation'],
    timeToJunior: '0-2 years (Software Engineer)',
    timeToMid: '4-6 years (Senior Software Engineer)',
    timeToSenior: '8-12 years (Software Architect)',
    timeToExpert: '13+ years (Principal/Chief Architect)',
    learningPath: ['Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Software Architect', 'Principal/Chief Architect'],
  },
  salaryLastUpdated: today,
  lastUpdated: today,
  source: 'manual-curated',
  confidence: 0.85,
};

if (DRY_RUN) {
  console.log('--- DRY RUN ---\nwould upsert:', doc.title, '(' + doc.id + ')');
  process.exit(0);
}

const { resource } = await container.items.upsert(doc);
console.log('Upserted:', resource.title, '| id:', resource.id, '| category:', resource.category);
