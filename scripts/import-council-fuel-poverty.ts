// Load the latest DESNZ "Sub-regional fuel poverty data" release into
// council_fuel_poverty and council_fuel_poverty_lsoa. See
// scripts/migrations/2026-10-11l-council-fuel-poverty.sql. New annual
// releases are picked up weekly by app/api/sync-fuel-poverty/route.ts.
//
// Run with tsx:
//   npx tsx scripts/import-council-fuel-poverty.ts --dry-run   # download + check, no writes
//   npx tsx scripts/import-council-fuel-poverty.ts             # writes
//
// Stops without writing if a code doesn't match the councils table or the
// totals don't add up (see lib/fuel-poverty.ts).

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { findLatestRelease, downloadXlsx, parseRelease, writeRelease, loadCouncilCodes } from '../lib/fuel-poverty';

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
  console.log(`Council fuel poverty import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  const rel = await findLatestRelease();
  if (!rel) throw new Error('No release found on GOV.UK');
  console.log(`  release: ${rel.pubYear} (${rel.dataYear} data)\n  ${rel.pageUrl}\n  ${rel.xlsxUrl}`);
  const { codes, names } = await loadCouncilCodes(db);
  const r = parseRelease(await downloadXlsx(rel.xlsxUrl), rel, codes);
  for (const c of r.checks) console.log(`  ${c}`);
  console.log(`  England: ${r.england?.fuel_poor.toLocaleString()} of ${r.england?.households.toLocaleString()} households (${r.england?.percentage.toFixed(1)}%)`);
  const english = [...codes].filter((c) => c.startsWith('E'));
  const have = new Set(r.councils.map((c) => c.council_gss_code));
  const missing = english.filter((c) => !have.has(c));
  console.log(`  councils: ${r.councils.length}; English councils missing (${missing.length}): ${missing.map((c) => `${c} ${names.get(c)}`).join('; ') || 'none'}`);
  for (const code of ['E06000001', 'E10000017', 'E08000016', 'E09000033']) {
    const c = r.councils.find((x) => x.council_gss_code === code);
    const n = r.lsoas.filter((x) => x.council_gss_code === code).length;
    if (c) console.log(`  spot ${code} ${names.get(code)}: ${c.fuel_poor.toLocaleString()} of ${c.households.toLocaleString()} (${c.percentage.toFixed(1)}%); neighbourhoods ${n}`);
  }
  const problems: string[] = [];
  if (r.unmatchedCouncilCodes.length) problems.push(`council codes not in councils table: ${r.unmatchedCouncilCodes.join(' ')}`);
  if (r.unmatchedLsoaCouncilCodes.length) problems.push(`neighbourhood council codes not in councils table: ${r.unmatchedLsoaCouncilCodes.join(' ')}`);
  if (missing.length) problems.push(`${missing.length} English councils have no figure`);
  if (problems.length) {
    console.log(`\nPROBLEMS — nothing written:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  if (!DRY_RUN) await writeRelease(db, r);
  console.log(`\n${r.councils.length} council rows and ${r.lsoas.length.toLocaleString()} neighbourhood rows ${DRY_RUN ? 'computed' : 'written'} (${rel.dataYear} data)`);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
