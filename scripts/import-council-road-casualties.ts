// Load the newest DfT RAS0403 edition (reported road casualties by local
// authority) into council_road_casualties and council_road_casualties_users.
// See scripts/migrations/2026-10-11m-council-road-casualties.sql. New annual
// editions are picked up weekly by app/api/sync-road-casualties/route.ts.
//
// Run with tsx:
//   npx tsx scripts/import-council-road-casualties.ts --dry-run   # download + check, no writes
//   npx tsx scripts/import-council-road-casualties.ts             # writes
//
// Stops without writing if a council code doesn't match the councils table
// or the checks in lib/road-casualties.ts fail.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { findLatestEdition, parseEdition, writeEdition, loadCouncilCodes } from '../lib/road-casualties';

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`Council road casualties import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  const ed = await findLatestEdition();
  console.log(`  edition: ${ed.label}\n  ${ed.url}`);
  const { codes, councils } = await loadCouncilCodes(db);
  const names = new Map(councils.map((c) => [c.gss_code, c.name]));
  const r = parseEdition(ed, codes);
  for (const c of r.checks) console.log(`  ${c}`);

  const have = new Set(r.casualties.map((c) => c.council_gss_code));
  const highway = councils.filter((c) => /^[EWS]/.test(c.gss_code) && c.type !== 'district');
  const missing = highway.filter((c) => !have.has(c.gss_code));
  console.log(`  highway authorities expected ${highway.length}; with figures ${have.size}; missing (${missing.length}): ${missing.map((c) => `${c.gss_code} ${c.name}`).join('; ') || 'none'}`);
  const latest = r.years[r.years.length - 1];
  for (const code of ['E06000001', 'E10000017', 'E08000016', 'E09000033', 'S12000036', 'W06000015']) {
    const get = (m: string) => r.casualties.find((x) => x.council_gss_code === code && x.year === latest && x.measure === m);
    const k = get('killed'); const ksi = get('ksi_adjusted'); const all = get('all');
    if (k) console.log(`  spot ${code} ${names.get(code)} ${latest}: killed ${k.casualties}, KSI adjusted ${ksi?.casualties}, all ${all?.casualties}; KSI rate ${ksi?.rate_per_bn_miles ?? '—'} per bn miles`);
  }
  const problems: string[] = [];
  if (r.unmatched.length) problems.push(`council codes not in councils table: ${r.unmatched.join(' ')}`);
  if (missing.length) problems.push(`${missing.length} highway authorities have no figures`);
  if (problems.length) {
    console.log(`\nPROBLEMS — nothing written:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  if (!DRY_RUN) await writeEdition(db, r);
  console.log(`\n${r.casualties.length.toLocaleString()} casualty rows and ${r.users.length.toLocaleString()} road-user rows ${DRY_RUN ? 'computed' : 'written'}`);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
