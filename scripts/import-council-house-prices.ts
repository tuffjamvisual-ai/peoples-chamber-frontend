// Full-history load of the UK House Price Index (HM Land Registry) into
// council_house_prices. See scripts/migrations/2026-10-11h-council-house-prices.sql.
// Ongoing monthly updates are handled by app/api/sync-house-prices/route.ts.
//
// Run with tsx:
//   npx tsx scripts/import-council-house-prices.ts --dry-run   # download + check, no writes
//   npx tsx scripts/import-council-house-prices.ts             # writes every month for every council
// Optional: --tag=2026-07 to load a specific monthly full file.
//
// Stops without writing if any area code in the file is neither a council
// nor a known aggregate (region/nation), so a boundary change is never
// silently dropped. Every write is an upsert, so re-running is safe.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  findLatestFullFile,
  fullFileUrl,
  downloadFullFile,
  buildHousePriceRows,
  writeHousePriceRows,
  loadCouncilCodes,
} from '../lib/house-prices';

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const TAG_ARG = process.argv.find((a) => a.startsWith('--tag='))?.slice('--tag='.length);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  if (TAG_ARG && !/^\d{4}-\d{2}$/.test(TAG_ARG)) throw new Error('--tag must be YYYY-MM');
  const file = TAG_ARG ? { tag: TAG_ARG, url: fullFileUrl(TAG_ARG) } : await findLatestFullFile();
  if (!file) throw new Error('No UK HPI full file found in the last 6 months');
  console.log(`UK HPI council import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}\n  ${file.url}`);

  const { codes, names } = await loadCouncilCodes(db);
  const text = await downloadFullFile(file.url);
  console.log(`  downloaded ${(text.length / 1e6).toFixed(1)} MB`);

  const built = buildHousePriceRows(text, codes, file.tag, null);
  const councils = new Set(built.rows.map((r) => r.council_gss_code));
  const months = [...new Set(built.rows.map((r) => r.month))].sort();
  console.log(`  rows: ${built.rows.length.toLocaleString()} for ${councils.size} councils`);
  console.log(`  months: ${months[0]} to ${months[months.length - 1]} (${months.length})`);
  console.log(`  councils with an average price in ${built.latestMonth}: ${built.councilsWithLatest.size}`);

  const noSeries = [...codes].filter((c) => !councils.has(c));
  console.log(`  councils with no HPI series (${noSeries.length}): ${noSeries.map((c) => `${c} ${names.get(c)}`).join('; ') || 'none'}`);
  const noLatest = [...councils].filter((c) => !built.councilsWithLatest.has(c));
  console.log(`  councils with a series but no ${built.latestMonth} price (${noLatest.length}): ${noLatest.map((c) => `${c} ${names.get(c)}`).join('; ') || 'none'}`);
  const aliased = [...new Set(built.rows.filter((r) => r.hpi_area_code !== r.council_gss_code).map((r) => `${r.hpi_area_code} -> ${r.council_gss_code} ${names.get(r.council_gss_code)}`))];
  console.log(`  stored under the councils table's code: ${aliased.join('; ') || 'none'}`);

  const dup = built.rows.length - new Set(built.rows.map((r) => `${r.council_gss_code}|${r.month}`)).size;
  if (dup) throw new Error(`${dup} duplicate council/month rows — not writing`);
  if (built.unknownCodes.length) {
    console.log(`  AREA CODES THAT ARE NEITHER A COUNCIL NOR A KNOWN AGGREGATE (${built.unknownCodes.length}): ${built.unknownCodes.join(', ')}`);
    throw new Error('Unmatched area codes — not writing');
  }

  for (const code of ['E06000001', 'E10000002', 'E08000016', 'S12000036', 'N09000003']) {
    const r = built.rows.filter((x) => x.council_gss_code === code).sort((a, b) => b.month.localeCompare(a.month))[0];
    if (r) console.log(`  spot ${code} ${names.get(code)}: ${r.month} average £${r.average_price?.toLocaleString()} (12m ${r.change_12m_pct}%), first-time buyers £${r.ftb_price?.toLocaleString() ?? '—'}`);
  }

  if (!DRY_RUN) {
    await writeHousePriceRows(db, built.rows, (done, total) => {
      if (done % 20000 === 0 || done === total) console.log(`    written ${done.toLocaleString()}/${total.toLocaleString()}`);
    });
  }
  console.log(`\n${built.rows.length.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'} (release ${file.tag})`);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
