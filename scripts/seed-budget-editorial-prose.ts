// One-shot seed: migrate the hand-curated DEPARTMENT_BUDGETS prose
// from lib/department-budgets.ts into department_budgets.editorial_prose.
//
// Prose is timeless commentary about each department's remit, so we
// write it to EVERY (slug, FY) row that exists for that slug. The sync
// route never includes editorial_prose in its upsert payload, so
// re-running the sync will not overwrite this column.
//
// Run with:  npx tsx scripts/seed-budget-editorial-prose.ts

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { DEPARTMENT_BUDGETS } from '../lib/department-budgets';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  let updated = 0;
  let missing = 0;
  for (const [slug, budget] of Object.entries(DEPARTMENT_BUDGETS)) {
    const { data, error } = await supabase
      .from('department_budgets')
      .update({ editorial_prose: budget.prose })
      .eq('department_slug', slug)
      .select('id, financial_year');
    if (error) {
      console.error(slug, '· ERROR ·', error.message);
      continue;
    }
    if (!data || data.length === 0) {
      console.log(slug, '· no rows to update (sync may not have run yet)');
      missing++;
    } else {
      console.log(slug, '· updated', data.length, 'row(s) ·', data.map((r) => r.financial_year).join(', '));
      updated += data.length;
    }
  }
  console.log();
  console.log('Total rows updated:', updated);
  console.log('Slugs with no row yet:', missing);
}

main().catch((e) => { console.error(e); process.exit(1); });
