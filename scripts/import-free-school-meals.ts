// Free school meals by area, 2015/16 to 2025/26 (owner approved 18 Nov 2026, Cowork ENTRY 303, FSM-YJ step 2): reads the
// DfE statistics API with lib/free-school-meals-source.ts, checks it (England 2025/26 exactly as published: 8,359,972
// pupils, 2,214,994 eligible, 1,764,622 took a meal; councils add up to England every year; every council code ours or a
// known old code) and writes the guarded load SQL. It never writes to the database itself.
//   npx tsx scripts/import-free-school-meals.ts --councils <councils.csv> --sql <out.sql> [--json <rows.json>]
// Later years are loaded by the yearly sync (step 4).
import { readFileSync, writeFileSync } from 'node:fs';
import { readMeta, readAll, checkRows, OLD_COUNCIL_CODES, type FsmRow } from '../lib/free-school-meals-source';
import { lit, councilSets } from './lib/sql-literal';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const COLS: (keyof FsmRow)[] = ['area_code', 'area_name', 'area_level', 'academic_year', 'school_type', 'pupils', 'fsm_eligible', 'fsm_eligible_pct', 'fsm_taking_meal', 'symbols', 'source_url'];
const ENGLAND_2526 = { pupils: 8359972, fsm_eligible: 2214994, fsm_taking_meal: 1764622 };

async function main() {
  const councilsCsv = arg('--councils'), out = arg('--sql'), json = arg('--json');
  if (!councilsCsv || !out) throw new Error('usage: --councils <csv> --sql <out.sql> [--json <rows.json>]');
  const { ours } = councilSets(readFileSync(councilsCsv, 'utf8'));
  const rows = await readAll(await readMeta());
  const c = checkRows(rows, ours, OLD_COUNCIL_CODES);
  for (const y of c.years) console.log(`${y}: England eligible ${c.sums[y].england}, councils add up to ${c.sums[y].councils}`);
  const e = rows.find((r) => r.area_level === 'england' && r.academic_year === '2025/26' && r.school_type === 'total');
  if (!e || e.pupils !== ENGLAND_2526.pupils || e.fsm_eligible !== ENGLAND_2526.fsm_eligible || e.fsm_taking_meal !== ENGLAND_2526.fsm_taking_meal) {
    throw new Error(`England 2025/26 is ${JSON.stringify(e && { pupils: e.pupils, fsm_eligible: e.fsm_eligible, fsm_taking_meal: e.fsm_taking_meal })}; expected ${JSON.stringify(ENGLAND_2526)}`);
  }
  if (!c.ok) throw new Error(`checks failed: ${c.problems.slice(0, 20).join(' | ')}`);
  const byLevel = Object.fromEntries(['england', 'region', 'council', 'constituency'].map((l) => [l, new Set(rows.filter((r) => r.area_level === l).map((r) => r.area_code)).size]));
  console.log(`${rows.length} rows; areas: ${JSON.stringify(byLevel)}`);
  if (json) writeFileSync(json, JSON.stringify(rows));
  const BATCH = 2000;
  const inserts: string[] = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    inserts.push(`INSERT INTO public.area_free_school_meals (${COLS.join(', ')}) VALUES\n` + rows.slice(i, i + BATCH).map((r) => `  (${COLS.map((k) => lit(r[k])).join(', ')})`).join(',\n') + ';');
  }
  const sql = [
    `-- Free school meals by area, ${c.years[0]} to ${c.years[c.years.length - 1]}: ${rows.length} rows, written by scripts/import-free-school-meals.ts`,
    '\\set ON_ERROR_STOP on', 'BEGIN;', "SET LOCAL statement_timeout = '60s';", "SET LOCAL lock_timeout = '5s';",
    'DO $$ BEGIN',
    "  IF to_regclass('public.area_free_school_meals') IS NULL THEN RAISE EXCEPTION 'area_free_school_meals missing (run 2026-11-18a first)'; END IF;",
    "  IF EXISTS (SELECT 1 FROM public.area_free_school_meals) THEN RAISE EXCEPTION 'area_free_school_meals is not empty'; END IF;",
    'END $$;',
    ...inserts,
    'DO $$ DECLARE n integer; e integer; m integer; BEGIN',
    '  SELECT count(*) INTO n FROM public.area_free_school_meals;',
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    "  SELECT fsm_eligible, fsm_taking_meal INTO e, m FROM public.area_free_school_meals WHERE area_code = 'E92000001' AND academic_year = '2025/26' AND school_type = 'total';",
    `  IF e IS DISTINCT FROM ${ENGLAND_2526.fsm_eligible} OR m IS DISTINCT FROM ${ENGLAND_2526.fsm_taking_meal} THEN RAISE EXCEPTION 'England 2025/26 is %, %', e, m; END IF;`,
    'END $$;',
    `UPDATE public.hand_loaded_datasets SET held_period = '${c.years[0]} to ${c.years[c.years.length - 1]} (January census)', loaded_on = current_date WHERE key = 'free_school_meals';`,
    'COMMIT;', '',
  ].join('\n');
  writeFileSync(out, sql);
  console.log(`wrote ${out}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
