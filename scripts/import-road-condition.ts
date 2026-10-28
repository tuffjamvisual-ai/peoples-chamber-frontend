// Road condition by highway authority, FYE 2008 to FYE 2026 (owner's approval, 28 Oct 2026): the last year of DfT's
// red, amber and green series (PAS 2161 from April 2026). Reads RDC0120, RDC0122, RDC0130 and RDC0321 with
// lib/road-condition-source.ts, checks them (England's row each year, every code ours or an old code, every highway
// authority present in FYE 2026, percentages 0 to 100) and writes the guarded load SQL. It never writes to the database.
//   npx tsx scripts/import-road-condition.ts --councils <councils.csv> --sql <out.sql>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRows, checkRows, fetchWorkbook, oddCells, TABLE_URLS, PCT_FIELDS, TREAT_FIELDS, type RoadRow } from '../lib/road-condition-source';
import { lit, councilSets } from './lib/sql-literal';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const COLS: (keyof RoadRow)[] = ['ons_code', 'area_name', 'area_level', 'year', ...PCT_FIELDS, ...TREAT_FIELDS, 'symbols', 'not_comparable', 'source_url'];

async function main() {
  const councilsCsv = arg('--councils'), out = arg('--sql');
  if (!councilsCsv || !out) throw new Error('usage: --councils <csv> --sql <out.sql>');
  const { ours, upperTier } = councilSets(readFileSync(councilsCsv, 'utf8'));
  const wbs = {
    rdc0120: await fetchWorkbook(TABLE_URLS.rdc0120), rdc0122: await fetchWorkbook(TABLE_URLS.rdc0122),
    rdc0130: await fetchWorkbook(TABLE_URLS.rdc0130), rdc0321: await fetchWorkbook(TABLE_URLS.rdc0321),
  };
  const rows = buildRows(wbs);
  const c = checkRows(rows, ours, upperTier);
  console.log(`${rows.length} rows, ${c.years[0]} to ${c.years.at(-1)}; ${c.councilsLatest} councils in the latest year; England FYE 2026 ${JSON.stringify(c.england['2026-03-31'])}`);
  if (oddCells.length) console.log(`cells stored as unavailable: ${oddCells.join('; ')}`);
  if (!c.ok) throw new Error(`checks failed: ${c.problems.join(' | ')}`);
  const sql = [
    `-- Road condition by highway authority, FYE 2008 to FYE 2026: ${rows.length} rows, written by scripts/import-road-condition.ts`,
    '\\set ON_ERROR_STOP on', 'BEGIN;', "SET LOCAL statement_timeout = '60s';", "SET LOCAL lock_timeout = '5s';",
    'DO $$ BEGIN',
    "  IF to_regclass('public.council_road_condition') IS NULL THEN RAISE EXCEPTION 'council_road_condition missing (run 2026-10-28g first)'; END IF;",
    "  IF EXISTS (SELECT 1 FROM public.council_road_condition) THEN RAISE EXCEPTION 'council_road_condition is not empty'; END IF;",
    'END $$;',
    `INSERT INTO public.council_road_condition (${COLS.join(', ')}) VALUES`,
    rows.map((r) => `  (${COLS.map((k) => lit(r[k])).join(', ')})`).join(',\n') + ';',
    'DO $$ DECLARE n integer; a numeric; BEGIN',
    '  SELECT count(*) INTO n FROM public.council_road_condition;',
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    "  SELECT a_roads_red_pct INTO a FROM public.council_road_condition WHERE ons_code = 'E92000001' AND year = '2026-03-31';",
    `  IF a IS DISTINCT FROM ${c.england['2026-03-31'].a} THEN RAISE EXCEPTION 'England FYE 2026 A roads is %', a; END IF;`,
    'END $$;', 'COMMIT;', '',
  ].join('\n');
  writeFileSync(out, sql);
  console.log(`wrote ${out}: ${rows.length} rows`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
