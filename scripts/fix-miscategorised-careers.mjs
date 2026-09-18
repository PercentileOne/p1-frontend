/**
 * One-off catalog cleanup, 2026-09-18 — Francis spotted "Farm Labor Contractors" filed under
 * "Music & Entertainment". Root cause: the bulk SOC/O*NET import (import-canonical-careers.mjs)
 * stamped a stray category on a handful of placeholder records, and separate seed waves left
 * near-duplicate category names (Music and Entertainment / Music & Entertainment, etc.).
 *
 *   1. Backs up EVERY full document to a JSON file before touching anything.
 *   2. FIXES: moves specific, clearly-wrong records (only if still in the category expected).
 *   3. MERGES: same-meaning duplicate category names into one canonical name.
 *
 * category is the partition key, so a move is create-in-new-partition THEN delete-old (unlike
 * merge-duplicate-categories.mjs, which deletes first and could lose a record if the create failed).
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/fix-miscategorised-careers.mjs [--dry-run]
 */
import { CosmosClient } from '@azure/cosmos';
import fs from 'fs';

const CS = process.env.COSMOS_CONNECTION_STRING;
if (!CS) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }
const DRY_RUN = process.argv.includes('--dry-run');
const BACKUP_PATH = process.env.BACKUP_PATH || './careers-backup-before-category-fix.json';

const container = new CosmosClient(CS).database('interviewme').container('careers');

// title -> [expected current category, correct category]
const FIXES = {
  'Farm Labor Contractors': ['Music & Entertainment', 'Agriculture'],
  'Title Examiners, Abstractors, and Searchers': ['Music & Entertainment', 'Legal'],
  'Refractory Materials Repairers, Except Brickmasons': ['Music & Entertainment', 'Trades'],
  'Nuclear Power Reactor Operators': ['Music & Entertainment', 'Energy & Utilities'],
  'Industrial Truck and Tractor Operators': ['Music & Entertainment', 'Transport'],
  'Production, factory and assembly supervisors': ['Music & Entertainment', 'Manufacturing'],
  'Transit and Railroad Police': ['Technology', 'Public Sector'],
  'Airline Pilots, Copilots, and Flight Engineers': ['Engineering', 'Transport'],
  'Pile Driver Operators': ['Transport', 'Construction'],
  'Service Unit Operators, Oil and Gas': ['Technology', 'Energy & Utilities'],
  'Computer Numerically Controlled Tool Operators': ['Technology', 'Manufacturing'],
  'Computer Numerically Controlled Tool Programmers': ['Technology', 'Manufacturing'],
  'Tire Builders': ['Construction', 'Manufacturing'],
  'Directors, Religious Activities and Education': ['Business', 'Religion'],
  'Range Managers': ['Business', 'Agriculture'],
  'Farm and Home Management Educators': ['Business', 'Education'],
  'Solar Energy Installation Managers': ['Business', 'Energy & Utilities'],
  'Airfield Operations Specialists': ['Business', 'Transport'],
  'Food Cooking Machine Operators and Tenders': ['Hospitality', 'Food Industry'],
  'Operating Engineers and Other Construction Equipment Operators': ['Engineering', 'Construction'],
  'Locomotive Engineers': ['Engineering', 'Transport'],
  'Rail Yard Engineers, Dinkey Operators, and Hostlers': ['Engineering', 'Transport'],
  'Railroad Brake, Signal, and Switch Operators and Locomotive Firers': ['Public Sector', 'Transport'],
  'Ship Engineers': ['Engineering', 'Transport'],
  'Driver/Sales Workers': ['Sales & Marketing', 'Transport'],
};

// Same-meaning duplicates only. Deliberately NOT merged (judgment calls, left for a human):
// Service / Personal Services / Everyday Services, Agriculture vs Agriculture & Environment vs
// Environment, Miscellaneous / General / Niche Specialist.
const MERGES = {
  'Music and Entertainment': 'Music & Entertainment',
  'Agriculture and Environment': 'Agriculture & Environment',
  'Emerging Tech': 'Emerging Technology',
  'Everyday Service': 'Everyday Services',
  'Creative Industries': 'Creative',
  'Skilled Trades': 'Trades',
};

async function move(doc, to) {
  const full = { ...doc, category: to };
  // Cosmos system fields must not be carried into the new document.
  for (const k of ['_rid', '_self', '_etag', '_attachments', '_ts']) delete full[k];
  const res = await container.items.create(full);
  if (res.statusCode !== 201) throw new Error(`create failed for ${doc.id}: ${res.statusCode}`);
  await container.item(doc.id, doc.category).delete();
}

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN — no writes ---\n' : '--- LIVE RUN ---\n');
  const { resources: all } = await container.items.query('SELECT * FROM c').fetchAll();
  console.log(`Read ${all.length} careers.`);
  if (!DRY_RUN) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(all));
    console.log(`Backup written: ${BACKUP_PATH}\n`);
  }

  let moved = 0, skipped = 0;
  console.log('== FIXES ==');
  for (const [title, [from, to]] of Object.entries(FIXES)) {
    const matches = all.filter(c => c.title === title && c.category === from);
    if (matches.length !== 1) { console.log(`  SKIP "${title}" — ${matches.length} matches in "${from}"`); skipped++; continue; }
    console.log(`  ${DRY_RUN ? 'would move' : 'moving'} "${title}": ${from} -> ${to}`);
    if (!DRY_RUN) await move(matches[0], to);
    moved++;
  }

  console.log('\n== MERGES ==');
  for (const [from, to] of Object.entries(MERGES)) {
    const docs = all.filter(c => c.category === from);
    console.log(`  "${from}" -> "${to}": ${docs.length} careers`);
    for (const d of docs) {
      // A fix above may already have moved this doc; skip if its id no longer lives here.
      if (!DRY_RUN) {
        try { await container.item(d.id, d.category).read(); } catch { continue; }
        await move(d, to);
      }
      moved++;
    }
  }
  console.log(`\n${DRY_RUN ? 'Would move' : 'Moved'} ${moved} records; skipped ${skipped} fixes.`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
