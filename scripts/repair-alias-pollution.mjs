/**
 * Repair for import-canonical-careers.mjs's alias-merge bug: a single UK/US occupation
 * code often covers many genuinely distinct job titles (e.g. UK code 2136 covers Software
 * Engineer, Full Stack Developer, Firmware Engineer, Cloud Architect all at once), so
 * merging a matched canonical entry's FULL alias list onto one specific existing career
 * cross-contaminated it with dozens of unrelated titles.
 *
 * Fix: the matching decision only ever depended on TITLE TEXT (which this script never
 * changes), against the static canonical JSON (still on disk, unchanged) -- so for any
 * existing document, we can exactly recompute which canonical entries would have matched
 * it, and therefore exactly which aliases got unioned in. Subtracting those back out
 * restores the original alias list precisely, with no separate backup needed.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/repair-alias-pollution.mjs
 * Dry run (no writes): add --dry-run
 */

import { CosmosClient } from '@azure/cosmos';
import fs from 'fs';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }

const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL_PATH = process.env.CANONICAL_JSON_PATH
  || new URL('./data/canonical-careers-soc-onet.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf-8'));
console.log(`Loaded ${canonical.length} canonical entries (same file used by the original import)`);

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database('interviewme').container('careers');

async function main() {
  const { resources: existing } = await container.items
    .query({ query: "SELECT c.id, c.title, c.category, c.aliases FROM c WHERE c.source != 'soc-onet-import'" })
    .fetchAll();
  console.log(`Pre-existing (non-placeholder) docs: ${existing.length}`);

  // Recompute, PURELY from title text, which canonical entries matched each doc --
  // identical logic to the original import script.
  const byTitleLower = new Map(existing.map(d => [d.title.trim().toLowerCase(), d]));
  const addedAliasesByDocId = new Map(); // docId -> Set of aliases that were unioned in

  for (const entry of canonical) {
    const entryTitleLower = entry.title.trim().toLowerCase();
    let matchedDoc = byTitleLower.get(entryTitleLower);
    if (!matchedDoc) {
      const aliasSet = new Set(entry.aliases.map(a => a.toLowerCase()));
      for (const doc of existing) {
        if (doc.title && aliasSet.has(doc.title.trim().toLowerCase())) { matchedDoc = doc; break; }
      }
    }
    if (matchedDoc) {
      if (!addedAliasesByDocId.has(matchedDoc.id)) addedAliasesByDocId.set(matchedDoc.id, new Set());
      for (const a of entry.aliases) addedAliasesByDocId.get(matchedDoc.id).add(a);
    }
  }

  console.log(`Docs that received alias additions: ${addedAliasesByDocId.size}`);

  let repaired = 0, unchanged = 0, errors = 0;
  for (const doc of existing) {
    const added = addedAliasesByDocId.get(doc.id);
    if (!added || added.size === 0) { unchanged++; continue; }

    const addedLower = new Set(Array.from(added).map(a => a.toLowerCase()));
    const restoredAliases = (doc.aliases || []).filter(a => !addedLower.has(a.toLowerCase()));

    if (restoredAliases.length === (doc.aliases || []).length) { unchanged++; continue; } // nothing to remove

    console.log(`  "${doc.title}": ${doc.aliases.length} -> ${restoredAliases.length} aliases (removed ${doc.aliases.length - restoredAliases.length})`);

    if (!DRY_RUN) {
      try {
        await container.item(doc.id, doc.category).patch([
          { op: 'replace', path: '/aliases', value: restoredAliases },
        ]);
      } catch (err) {
        console.error(`    ERROR patching "${doc.title}":`, err.message);
        errors++;
        continue;
      }
    }
    repaired++;
  }

  console.log('\n=== REPAIR DONE ===');
  console.log(`Repaired (aliases restored): ${repaired}`);
  console.log(`Unchanged (no pollution found): ${unchanged}`);
  console.log(`Errors: ${errors}`);
  console.log(DRY_RUN ? '\n(DRY RUN — nothing written)' : '\nWritten to Cosmos.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
