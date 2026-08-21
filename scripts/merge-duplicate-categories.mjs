/**
 * Merges near-duplicate category names that fragmented the "Browse by category" grid
 * (e.g. "Sport / Fitness" vs "Sport" showing as two separate tiles for what should be
 * one category) -- confirmed live 2026-08-21 after Francis noticed Sport showing only 5
 * when it should have been much larger.
 *
 * Run: COSMOS_CONNECTION_STRING="..." node scripts/merge-duplicate-categories.mjs
 */
import { CosmosClient } from '@azure/cosmos';

const COSMOS_CONNECTION = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION) { console.error('Set COSMOS_CONNECTION_STRING'); process.exit(1); }

const client = new CosmosClient(COSMOS_CONNECTION);
const container = client.database('interviewme').container('careers');

// from -> to (canonical, the larger/more-established of each pair)
const MERGES = {
  'Sport / Fitness': 'Sport',
  'Marketing': 'Sales & Marketing',
  'Business / Administration': 'Business',
  'Energy': 'Energy & Utilities',
  'Teaching': 'Education',
};

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN — no writes will happen ---\n');

  for (const [from, to] of Object.entries(MERGES)) {
    const { resources } = await container.items.query({
      query: 'SELECT c.id, c.title, c.category FROM c WHERE c.category = @from',
      parameters: [{ name: '@from', value: from }],
    }).fetchAll();

    console.log(`"${from}" -> "${to}": ${resources.length} careers`);
    for (const doc of resources) {
      console.log(`   ${DRY_RUN ? 'would move' : 'moving'} "${doc.title}"`);
      if (DRY_RUN) continue;

      // category is the partition key -- changing it means delete + re-insert under the
      // new partition, a simple Replace patch on /category isn't valid across partitions.
      const { resource: full } = await container.item(doc.id, doc.category).read();
      full.category = to;
      await container.item(doc.id, doc.category).delete();
      await container.items.create(full);
    }
  }
  console.log(DRY_RUN ? '\nDry run complete — no data changed.' : '\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
