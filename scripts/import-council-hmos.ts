// Houses in multiple occupation by council (owner approved 19 Nov 2026, Cowork ENTRY 362). Reads the official files in
// data/hmos/ with lib/hmo-source.ts, checks them (Stage A's figures, every council ours, no duplicates) and writes the
// guarded load SQL. It never writes to the database.
//   npx tsx scripts/import-council-hmos.ts --councils <councils.csv> --sql <out.sql> [--dir data/hmos]
// The files, saved by hand (sources and dates in lib/hmo-source.ts and Claude outputs/audit/hmo-358/SOURCES.md):
//   data/hmos/lahs/<yyyy>-to-<yyyy>__<file>  MHCLG LAHS data returns, one per year, 2011-12 to 2024-25
//   data/hmos/LiveTable100.ods                MHCLG Live Table 100
//   data/hmos/wales-hmos.csv, wales-licences.csv, wales-dwelling-stock.csv   StatsWales downloads (full dataset, CSV)
//   data/hmos/scotland-hmo.xlsx, scotland-stock-by-tenure.xlsx               gov.scot housing statistics tables
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRows, checkRows, type HmoRow } from '../lib/hmo-source';
import { lit, councilSets } from './lib/sql-literal';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const COLS: (keyof HmoRow)[] = ['ons_code', 'area_name', 'nation', 'area_level', 'region', 'year', 'estimated', 'known', 'licensable', 'licensed', 'mandatory_licences', 'additional_licences', 'homes', 'homes_year', 'symbols', 'predecessors', 'notes', 'source_url'];

function main() {
  const councilsCsv = arg('--councils'), out = arg('--sql'), dir = arg('--dir') ?? 'data/hmos';
  if (!councilsCsv || !out) throw new Error('usage: --councils <csv> --sql <out.sql> [--dir data/hmos]');
  const { ours } = councilSets(readFileSync(councilsCsv, 'utf8'));
  const rows = buildRows(dir);
  const c = checkRows(rows, ours);
  console.log(JSON.stringify(c.summary));
  if (!c.ok) throw new Error(`checks failed: ${c.problems.slice(0, 20).join(' | ')}`);
  const e = rows.find((r) => r.ons_code === 'E92000001' && r.year === '2025-03-31')!;
  const sql = [
    `-- Houses in multiple occupation by council: ${rows.length} rows, written by scripts/import-council-hmos.ts (ENTRY 362)`,
    '\\set ON_ERROR_STOP on', 'BEGIN;', "SET LOCAL statement_timeout = '60s';", "SET LOCAL lock_timeout = '5s';",
    'DO $$ BEGIN',
    "  IF to_regclass('public.council_hmos') IS NULL THEN RAISE EXCEPTION 'council_hmos missing (run 2026-11-19a first)'; END IF;",
    "  IF EXISTS (SELECT 1 FROM public.council_hmos) THEN RAISE EXCEPTION 'council_hmos is not empty'; END IF;",
    'END $$;',
    `INSERT INTO public.council_hmos (${COLS.join(', ')}) VALUES`,
    rows.map((r) => `  (${COLS.map((k) => lit(r[k])).join(', ')})`).join(',\n') + ';',
    'DO $$ DECLARE n integer; a integer; BEGIN',
    '  SELECT count(*) INTO n FROM public.council_hmos;',
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    "  SELECT estimated INTO a FROM public.council_hmos WHERE ons_code = 'E92000001' AND year = '2025-03-31';",
    `  IF a IS DISTINCT FROM ${e.estimated} THEN RAISE EXCEPTION 'England 2024-25 estimate is %', a; END IF;`,
    'END $$;', 'COMMIT;', '',
  ].join('\n');
  writeFileSync(out, sql);
  console.log(`wrote ${out}: ${rows.length} rows`);
}
try { main(); } catch (e) { console.error((e as Error).message); process.exit(1); }
