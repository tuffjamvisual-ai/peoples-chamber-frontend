// Full-history load of MHCLG statutory homelessness detailed local authority
// tables (every quarter from April to June 2019) into council_homelessness.
// See scripts/migrations/2026-10-11i-council-homelessness.sql. New quarters
// and revised files are picked up weekly by app/api/sync-homelessness/route.ts.
//
// Run with tsx:
//   npx tsx scripts/import-council-homelessness.ts --dry-run   # download + check every file, no writes
//   npx tsx scripts/import-council-homelessness.ts             # writes every quarter
//
// All-or-nothing: every file is downloaded and checked first; if any file
// fails a check, nothing is written. Council codes not in the councils
// table are listed: before April 2023 they're districts since abolished
// (Buckinghamshire 2020, Northamptonshire 2021, Cumbria/North Yorkshire/
// Somerset 2023; skipped); from April 2023 any unmatched code stops the import.
// Every write is an upsert, so re-running is safe.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  listQuarterlyFiles,
  downloadFile,
  readWorkbookSheets,
  parseQuarterlyFile,
  writeHomelessnessRows,
  loadCouncilCodes,
  type HomelessnessRow,
  type SheetRows,
} from '../lib/homelessness';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { streamOdsRows } = require('./lib/ods-stream');

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const REORGANISATION = '2023-04-01';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// SheetJS can't open one file (April to June 2021: "Unsupported value type");
// the streaming ODS reader keeps cell positions, so it's used as a fallback.
async function readSheets(buf: Buffer, url: string): Promise<{ sheets: Record<string, SheetRows>; reader: string }> {
  try {
    return { sheets: readWorkbookSheets(buf), reader: 'sheetjs' };
  } catch (e) {
    if (!/\.ods$/i.test(url)) throw e;
    const sheets: Record<string, SheetRows> = {};
    await streamOdsRows(buf, (sheet: string, cells: (string | number)[]) => {
      const base = sheet.trim().replace(/_+$/, '').toUpperCase();
      if (base === 'A1' || base === 'TA1') (sheets[sheet] = sheets[sheet] || []).push(cells);
    });
    return { sheets, reader: `streaming ODS reader (SheetJS: ${(e as Error).message})` };
  }
}

async function main() {
  console.log(`Council homelessness import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  const { codes, names } = await loadCouncilCodes(db);
  const files = await listQuarterlyFiles();
  const hra = files.filter((f) => f.periodStart >= '2019-04-01');
  console.log(`  quarterly files listed: ${files.length}; from April 2019: ${hra.length} (${hra[0]?.periodLabel} to ${hra[hra.length - 1]?.periodLabel})`);

  const all: HomelessnessRow[] = [];
  const failures: string[] = [];
  const abolished = new Set<string>();
  let newestRows: HomelessnessRow[] = [];

  for (const f of hra) {
    console.log(`\n### ${f.periodLabel} [${f.status}]\n    ${f.url}`);
    try {
      const buf = await downloadFile(f.url);
      const { sheets, reader } = await readSheets(buf, f.url);
      console.log(`    read with ${reader}; sheets found: ${Object.keys(sheets).join(', ') || 'none'}`);
      const r = parseQuarterlyFile(f, sheets, codes);
      for (const c of r.checks) console.log(`    ${c}`);
      console.log(`    England: assessed ${r.england.assessments_total}, owed ${r.england.owed_duty_total} (prevention ${r.england.owed_prevention}, relief ${r.england.owed_relief}), TA ${r.england.ta_total ?? '—'}, TA with children ${r.england.ta_with_children ?? '—'}, children ${r.england.ta_children ?? '—'}`);
      const withTA = r.rows.filter((x) => x.ta_total != null).length;
      const withA1 = r.rows.filter((x) => x.owed_duty_total != null).length;
      console.log(`    councils: ${r.rows.length} rows; owed-duty figure for ${withA1}; TA figure for ${withTA}`);
      if (r.unmatchedCodes.length) {
        if (f.periodStart >= REORGANISATION) throw new Error(`codes not in councils table: ${r.unmatchedCodes.join(' ')}`);
        console.log(`    skipped (districts abolished April 2023 or earlier): ${r.unmatchedCodes.join(' ')}`);
        r.unmatchedCodes.forEach((c) => abolished.add(c));
      }
      all.push(...r.rows);
      newestRows = r.rows;
    } catch (e) {
      console.log(`    FAILED: ${(e as Error).message}`);
      failures.push(`${f.periodLabel}: ${(e as Error).message}`);
    }
  }

  console.log(`\nAll abolished district codes skipped (${abolished.size}): ${[...abolished].sort().join(' ') || 'none'}`);
  const newestCodes = new Set(newestRows.map((r) => r.council_gss_code));
  const missing = [...codes].filter((c) => /^E0[6-9]/.test(c) && !newestCodes.has(c));
  console.log(`English district/unitary councils with no row in the newest quarter (${missing.length}): ${missing.map((c) => `${c} ${names.get(c)}`).join('; ') || 'none'}`);
  const notSubmitted = newestRows.filter((r) => r.owed_duty_total == null).map((r) => names.get(r.council_gss_code));
  console.log(`Newest quarter, councils with no owed-duty figure (not submitted or not published) (${notSubmitted.length})`);
  for (const code of ['E06000022', 'E07000223', 'E09000033', 'E08000025', 'E08000016']) {
    const r = newestRows.find((x) => x.council_gss_code === code);
    if (r) console.log(`  spot ${code} ${names.get(code)}: owed ${r.owed_duty_total} (prev ${r.owed_prevention}, relief ${r.owed_relief}), TA ${r.ta_total}, TA children ${r.ta_children}, households ${r.households_thousands}k`);
  }

  const dup = all.length - new Set(all.map((r) => `${r.council_gss_code}|${r.period_start}`)).size;
  if (dup) failures.push(`${dup} duplicate council/quarter rows`);
  if (failures.length) {
    console.log(`\n${failures.length} FILE(S) FAILED — nothing written:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  if (!DRY_RUN) await writeHomelessnessRows(db, all);
  console.log(`\n${all.length.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'} across ${hra.length} quarters`);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
