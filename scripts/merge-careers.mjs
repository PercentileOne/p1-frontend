/**
 * Merges EXTRA_CAREERS into seed-careers.mjs CAREERS array.
 * Run once: node scripts/merge-careers.mjs
 */
import fs from 'fs';
import { EXTRA_CAREERS } from './seed-careers-extra.mjs';

const file = fs.readFileSync('scripts/seed-careers.mjs', 'utf8');

// Build the extra entries as a string
const lines = EXTRA_CAREERS.map(c =>
  `  { title: ${JSON.stringify(c.title)}, category: ${JSON.stringify(c.category)}, subcategory: ${JSON.stringify(c.subcategory)} },`
).join('\n');

// Insert before the closing ]; of the CAREERS array
const marker = '\n];\n\n// ── Cosmos setup';
if (!file.includes(marker)) {
  console.error('Could not find insertion marker in seed-careers.mjs');
  process.exit(1);
}

const merged = file.replace(marker, `\n  // ── EXTRA (merged) ────────────────────────────────────────────────────────\n${lines}\n${marker.slice(1)}`);
fs.writeFileSync('scripts/seed-careers.mjs', merged);

const count = (merged.match(/{ title:/g) || []).length;
console.log(`✅ Merged. Total careers in seed script: ${count}`);
