// Load the newest Ofcom Connected Nations release (fixed broadband coverage,
// full-fibre take-up, mobile coverage) into council_broadband and
// council_mobile_coverage. See scripts/migrations/2026-10-11n-council-connectivity.sql.
// New releases are picked up weekly by app/api/sync-connectivity/route.ts.
//
// Run with tsx:
//   npx tsx scripts/import-council-connectivity.ts --dry-run   # download + check, no writes
//   npx tsx scripts/import-council-connectivity.ts             # writes
//
// Stops without writing if a code doesn't match the councils table or the
// checks in lib/connectivity.ts fail.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { findLatestRelease, download, parseRelease, writeRelease, loadCouncilCodes } from '../lib/connectivity';

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`Council connectivity import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  const rel = await findLatestRelease();
  console.log(`  release month: ${rel.month}\n  pages read: ${rel.pages.join(' | ')}\n  fixed: ${rel.fixedUrl}\n  mobile: ${rel.mobileUrl ?? '(none)'}`);
  const { codes, councils } = await loadCouncilCodes(db);
  const names = new Map(councils.map((c) => [c.gss_code, c.name]));
  const fixedZip = await download(rel.fixedUrl);
  const mobileZip = rel.mobileUrl ? await download(rel.mobileUrl) : null;
  const r = parseRelease(rel, fixedZip, mobileZip, codes);
  for (const c of r.checks) console.log(`  ${c}`);

  const expected = councils.filter((c) => c.type !== 'county');
  const haveB = new Set(r.broadband.map((b) => b.council_gss_code));
  const haveM = new Set(r.mobile.map((m) => m.council_gss_code));
  const missB = expected.filter((c) => !haveB.has(c.gss_code));
  const missM = expected.filter((c) => !haveM.has(c.gss_code));
  console.log(`  non-county councils ${expected.length}; broadband ${haveB.size} (missing ${missB.length}: ${missB.map((c) => c.gss_code).join(' ') || 'none'}); mobile ${haveM.size} (missing ${missM.length}: ${missM.map((c) => c.gss_code).join(' ') || 'none'})`);
  for (const code of ['E06000001', 'E08000016', 'S12000034', 'N09000003', 'E07000223']) {
    const b = r.broadband.find((x) => x.council_gss_code === code);
    const m = r.mobile.find((x) => x.council_gss_code === code);
    if (b) console.log(`  spot ${code} ${names.get(code)}: premises ${b.all_premises}; gigabit ${b.gigabit_n} (${((b.gigabit_n ?? 0) / b.all_premises * 100).toFixed(1)}%); full fibre ${b.full_fibre_n}; take-up ${b.ff_takeup_of_all_pct}% of all; no decent ${b.unable_decent_n}; 4G indoor none ${m?.g4_in_none_pct}% / all four ${m?.g4_in_all_pct}%; 5G outdoor none ${m?.g5_out_none_pct}%`);
  }
  const problems: string[] = [];
  if (r.unmatched.length) problems.push(`codes not in councils table: ${r.unmatched.join(' ')}`);
  if (missB.length) problems.push(`${missB.length} councils have no broadband figures`);
  if (problems.length) {
    console.log(`\nPROBLEMS — nothing written:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  if (!DRY_RUN) await writeRelease(db, r);
  console.log(`\n${r.broadband.length} broadband rows and ${r.mobile.length} mobile rows ${DRY_RUN ? 'computed' : 'written'} (${rel.month})`);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
