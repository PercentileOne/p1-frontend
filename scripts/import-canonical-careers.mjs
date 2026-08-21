/**
 * Canonical Career Import — SOC2020 (UK) + O*NET-SOC (US)
 *
 * Grounds the careers database in real government occupation data instead of
 * open-ended GPT invention. Reads the pre-built canonical list (412 UK SOC2020
 * unit groups + 1,016 US O*NET-SOC occupations, each with its real alternate
 * job titles attached as aliases — see scripts/build-canonical-source.md for
 * where that list came from: ONS SOC2020 Volume 2 coding index + O*NET 30.3
 * job_titles.csv, both under permissive licences (OGL v3.0 / CC BY 4.0)).
 *
 * For each of the 1,428 canonical entries:
 *   - If an existing career document's title matches it (or appears in its
 *     alias list), PATCH that document — adds real aliases + the SOC/O*NET
 *     code onto the career you already have, without touching its enriched
 *     salary/workforce/pathway data.
 *   - Otherwise, INSERT a new placeholder document (real title, real code,
 *     real aliases, confidence 0.3, empty enrichment fields) — searchable
 *     immediately via its aliases, and picked up by the twice-daily
 *     discovery function for full GPT enrichment on a future run.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/import-canonical-careers.mjs
 * Dry run (no writes): add --dry-run
 */

import { CosmosClient } from '@azure/cosmos';
import fs from 'fs';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) {
  console.error('Set COSMOS_CONNECTION_STRING before running.');
  process.exit(1);
}

const DB_NAME = 'interviewme';
const CONTAINER_NAME = 'careers';
const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL_PATH = process.env.CANONICAL_JSON_PATH
  || new URL('./data/canonical-careers-soc-onet.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf-8'));
console.log(`Loaded ${canonical.length} canonical entries from ${CANONICAL_PATH}`);

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database(DB_NAME).container(CONTAINER_NAME);

function slugify(title) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-').replace(/'/g, '');
}

function emptyProfile() {
  return {
    tags: [],
    salary: {
      uk: { starting: 0, mid: 0, senior: 0, expert: 0, currency: 'GBP' },
      us: { starting: 0, mid: 0, senior: 0, expert: 0, currency: 'USD' },
    },
    workforce: {
      uk: { employed: 0, studying: 0, growthPct5yr: 0, growthTrend: 'unknown', vacancies: 0 },
      us: { employed: 0, studying: 0, growthPct5yr: 0, growthTrend: 'unknown', vacancies: 0 },
    },
    demand: { uk: 0, us: 0, automationRisk: 0, futureScore: 0, trend: 'unknown' },
    lifestyle: { environment: '', stress: 0, energy: 0, collaboration: 0, remoteScore: 0, typicalHours: '' },
    identity: { summary: '', traits: [], strengths: [], weaknesses: [] },
    pathway: { entryRequirements: [], qualifications: [], skills: [], timeToJunior: '', timeToMid: '', timeToSenior: '', timeToExpert: '', learningPath: [] },
  };
}

async function main() {
  console.log('Fetching existing career documents...');
  const { resources: existing } = await container.items
    .query({ query: 'SELECT c.id, c.title, c.category, c.aliases, c.soc_uk, c.onet_us FROM c' })
    .fetchAll();
  console.log(`Existing careers in Cosmos: ${existing.length}`);

  // lowercase title -> doc, for matching
  const byTitle = new Map();
  for (const doc of existing) {
    if (doc.title) byTitle.set(doc.title.trim().toLowerCase(), doc);
  }

  let matched = 0, inserted = 0, skipped = 0, errors = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < canonical.length; i++) {
    const entry = canonical[i];
    const entryTitleLower = entry.title.trim().toLowerCase();

    // Find an existing doc: exact title match, or existing title appears among this
    // canonical entry's real aliases (i.e. what you already have IS one of the real
    // alternate titles for this SOC/O*NET occupation).
    let existingDoc = byTitle.get(entryTitleLower);
    if (!existingDoc) {
      const aliasSet = new Set(entry.aliases.map(a => a.toLowerCase()));
      for (const doc of existing) {
        if (doc.title && aliasSet.has(doc.title.trim().toLowerCase())) { existingDoc = doc; break; }
      }
    }

    try {
      if (existingDoc) {
        // Patch: merge real aliases + SOC/O*NET code onto the career you already have.
        const mergedAliases = Array.from(new Set([...(existingDoc.aliases || []), ...entry.aliases]));
        const patches = [
          { op: 'replace', path: '/aliases', value: mergedAliases },
        ];
        if (entry.socUk && !existingDoc.soc_uk) patches.push({ op: existingDoc.soc_uk === undefined ? 'add' : 'replace', path: '/soc_uk', value: entry.socUk });
        if (entry.onetUs && !existingDoc.onet_us) patches.push({ op: existingDoc.onet_us === undefined ? 'add' : 'replace', path: '/onet_us', value: entry.onetUs });

        if (!DRY_RUN) {
          await container.item(existingDoc.id, existingDoc.category).patch(patches);
        }
        matched++;
      } else {
        // Insert: new canonical placeholder, low confidence, ready for the discovery
        // function to fully enrich on a future sweep.
        const codePart = entry.socUk ? `soc-uk-${entry.socUk}` : `onet-us-${entry.onetUs}`;
        const doc = {
          id: codePart,
          title: entry.title,
          category: entry.category,
          subcategory: entry.subcategory,
          aliases: entry.aliases,
          soc_uk: entry.socUk,
          onet_us: entry.onetUs,
          ...emptyProfile(),
          salaryLastUpdated: today,
          lastUpdated: today,
          source: 'soc-onet-import',
          confidence: 0.3,
        };
        if (!DRY_RUN) {
          await container.items.upsert(doc);
        }
        inserted++;
      }
    } catch (err) {
      console.error(`  ERROR on "${entry.title}":`, err.message);
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  ...${i + 1}/${canonical.length} processed (matched: ${matched}, inserted: ${inserted}, errors: ${errors})`);
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Matched & patched existing careers: ${matched}`);
  console.log(`Inserted new placeholder careers:   ${inserted}`);
  console.log(`Errors:                              ${errors}`);
  console.log(DRY_RUN ? '\n(DRY RUN — nothing was actually written to Cosmos)' : '\nWritten to Cosmos DB: interviewme/careers');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
