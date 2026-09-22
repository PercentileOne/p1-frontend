/**
 * Sports coaching qualifications seed (2026-09-23) — Francis: two of his friends coach Premier League
 * footballers (UK and US) and one coaches professional boxers including Anthony Joshua; the catalog had
 * no "Sports" category at all. New category "sports", added as NAME-ONLY stubs, same treatment as every
 * other seed tier — the weekly refresh job / on-demand blueprint fills in the real domain structure.
 *
 * Football: The FA's own coaching pathway, confirmed against Francis's own AI Overview screenshot
 * (Playmaker -> Introduction to Coaching Football/FA Level 1 -> UEFA C/B/A -> UEFA Pro, the FA Level
 * numbers being the FA's internal name for the UEFA-licenced tiers). Boxing: England Boxing (the
 * national governing body for amateur boxing in England) runs a Level 1/2/3 coaching structure, the
 * same shape as most UK sport NGB coaching pathways. As with every other seed tier in this catalog,
 * names come from general/public knowledge and are NOT guaranteed word-for-word official titles —
 * that's what the weekly refresh job's source-grounding and admin review are for, not something unique
 * to sports.
 *
 * Insert-only and idempotent: an entry whose category + name already exists is left completely alone.
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/seed-exam-catalog-sports.mjs [--dry-run]
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
const sport = (name, vendor, subject, extra = {}) => add({ category: 'sports', region: 'uk', vendor, subject, name, ...extra });

// ── Football — The FA / UEFA coaching pathway ──────────────────────────────────────────────────
sport('FA Playmaker', 'The FA', 'Football Coaching', { aliases: ['FA Playmaker Award'] });
sport('Introduction to Coaching Football', 'The FA', 'Football Coaching', { level: 'FA Level 1', aliases: ['FA Level 1 Coaching Football'] });
sport('UEFA C Licence', 'The FA / UEFA', 'Football Coaching', { level: 'FA Level 2', aliases: ['FA Level 2 Coaching Football', 'UEFA C Coaching Licence'] });
sport('UEFA B Licence', 'The FA / UEFA', 'Football Coaching', { level: 'FA Level 3', aliases: ['FA Level 3 Coaching Football', 'UEFA B Coaching Licence'] });
sport('UEFA A Licence', 'The FA / UEFA', 'Football Coaching', { level: 'FA Level 4', aliases: ['FA Level 4 Coaching Football', 'UEFA A Coaching Licence'] });
sport('UEFA Pro Licence', 'The FA / UEFA', 'Football Coaching', { level: 'FA Level 5', aliases: ['FA Level 5 Coaching Football', 'UEFA Pro Coaching Licence'] });

// ── Boxing — England Boxing coaching pathway ───────────────────────────────────────────────────
sport('England Boxing Level 1 Coaching Award', 'England Boxing', 'Boxing Coaching', { level: 'Level 1', aliases: ['England Boxing Assistant Coach', 'Boxing Level 1 Coaching'] });
sport('England Boxing Level 2 Certificate in Coaching Boxing', 'England Boxing', 'Boxing Coaching', { level: 'Level 2', aliases: ['England Boxing Coach', 'Boxing Level 2 Coaching'] });
sport('England Boxing Level 3 Diploma in Coaching Boxing', 'England Boxing', 'Boxing Coaching', { level: 'Level 3', aliases: ['England Boxing Senior Coach', 'Boxing Level 3 Coaching'] });

// ─────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '--- DRY RUN — no writes ---' : '--- LIVE RUN ---');
  const { resources: existing } = await container.items.query('SELECT c.id, c.category, c.name FROM c').fetchAll();
  const have = new Set(existing.map(d => `${d.category}|${norm(d.name)}`));
  console.log(`Existing entries: ${existing.length}; sports seed entries: ${entries.length}\n`);
  let inserted = 0, skipped = 0;
  for (const e of entries) {
    if (have.has(`${e.category}|${norm(e.name)}`)) { skipped++; continue; }
    const doc = {
      id: `${e.category}-${slug(e.name)}`, ...e,
      domains: [], source: 'seed-sports', blueprintStatus: 'stub', status: 'active',
      lastVerifiedAt: '', blueprintGeneratedAt: '', createdAt: new Date().toISOString(),
    };
    if (!DRY_RUN) await container.items.upsert(doc);
    have.add(`${e.category}|${norm(e.name)}`);
    inserted++;
    console.log(`  + ${doc.id}`);
  }
  console.log(`\n${DRY_RUN ? 'Would insert' : 'Inserted'} ${inserted}; already present ${skipped}.`);
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
