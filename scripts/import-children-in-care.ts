// Children in care by council, 31 March 2021 to 2025 (owner's approval, 28 Oct 2026): reads DfE's "Download all data"
// zip for reporting year 2025 with lib/children-in-care-source.ts, checks it (England's row each year, councils add
// up to England within its rounding, every code ours or an old county code, every children's services council
// present) and writes the guarded load SQL. It never writes to the database itself.
//   npx tsx scripts/import-children-in-care.ts --councils <councils.csv> --sql <out.sql> [--zip <local copy>]
// Later releases are loaded by /api/sync-children-in-care.
import { readFileSync, writeFileSync } from 'node:fs';
import { filesFromZip, DATA_FILES, buildRows, checkRows, latestReleaseZip, downloadZip, FIELDS, type CareRow } from '../lib/children-in-care-source';
import { lit, councilSets } from './lib/sql-literal';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const COLS: (keyof CareRow)[] = ['ons_code', 'area_name', 'area_level', 'year', ...FIELDS, 'symbols', 'rounded_to', 'source_url'];

async function main() {
  const councilsCsv = arg('--councils'), out = arg('--sql'), zipPath = arg('--zip');
  if (!councilsCsv || !out) throw new Error('usage: --councils <csv> --sql <out.sql> [--zip <file>]');
  const { ours, upperTier } = councilSets(readFileSync(councilsCsv, 'utf8'));
  const rel = await latestReleaseZip();
  if (rel.year !== 2025) throw new Error(`the latest release is now ${rel.year}; this script loads 2025`);
  const zip = zipPath ? readFileSync(zipPath) : await downloadZip(rel.zipUrl);
  const rows = buildRows(filesFromZip(zip, DATA_FILES), rel.pageUrl);
  const c = checkRows(rows, ours, upperTier);
  for (const y of c.years) console.log(`${y}: ${c.councils[y]} councils; England ${c.england[y]}, councils add up to ${c.councilSums[y]}`);
  if (!c.ok) throw new Error(`checks failed: ${c.problems.join(' | ')}`);
  const e25 = rows.find((r) => r.area_level === 'england' && r.year === '2025-03-31')!;
  if (e25.looked_after !== 81770 || e25.rate_per_10000 !== 67) throw new Error(`England 2025 is ${e25.looked_after}, ${e25.rate_per_10000} per 10,000; expected 81,770 and 67`);
  const sql = [
    `-- Children in care by council, 31 March 2021 to 2025: ${rows.length} rows, written by scripts/import-children-in-care.ts`,
    '\\set ON_ERROR_STOP on', 'BEGIN;', "SET LOCAL statement_timeout = '60s';", "SET LOCAL lock_timeout = '5s';",
    'DO $$ BEGIN',
    "  IF to_regclass('public.council_children_in_care') IS NULL THEN RAISE EXCEPTION 'council_children_in_care missing (run 2026-10-28g first)'; END IF;",
    "  IF EXISTS (SELECT 1 FROM public.council_children_in_care) THEN RAISE EXCEPTION 'council_children_in_care is not empty'; END IF;",
    'END $$;',
    `INSERT INTO public.council_children_in_care (${COLS.join(', ')}) VALUES`,
    rows.map((r) => `  (${COLS.map((k) => lit(r[k])).join(', ')})`).join(',\n') + ';',
    'DO $$ DECLARE n integer; v integer; BEGIN',
    '  SELECT count(*) INTO n FROM public.council_children_in_care;',
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    "  SELECT looked_after INTO v FROM public.council_children_in_care WHERE ons_code = 'E92000001' AND year = '2025-03-31';",
    "  IF v IS DISTINCT FROM 81770 THEN RAISE EXCEPTION 'England 2025 is %', v; END IF;",
    'END $$;', 'COMMIT;', '',
  ].join('\n');
  writeFileSync(out, sql);
  console.log(`wrote ${out}: ${rows.length} rows (${rel.pageUrl})`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
