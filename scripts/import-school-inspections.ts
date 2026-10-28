// Load the latest Ofsted "State-funded schools inspections and outcomes as
// at <date>" snapshot into school_inspections. See
// scripts/migrations/2026-10-11k-school-inspections.sql. New snapshots
// (twice a year) are picked up weekly by app/api/sync-school-inspections/route.ts.
//
// Run with tsx:
//   npx tsx scripts/import-school-inspections.ts --dry-run   # download + check, no writes
//   npx tsx scripts/import-school-inspections.ts             # writes, then removes closed schools
//
// Stops without writing if the column headings changed or any local
// authority name doesn't match the councils table.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { findLatestSnapshot, downloadCsvText, parseSnapshot, writeSnapshot, loadCouncils } from '../lib/school-inspections';

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const count = <T,>(xs: T[], f: (x: T) => unknown) => {
  const m = new Map<string, number>();
  for (const x of xs) { const k = String(f(x) ?? '(none)'); m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', ');
};

async function main() {
  console.log(`School inspections import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  const snap = await findLatestSnapshot();
  if (!snap) throw new Error('No snapshot found on GOV.UK');
  console.log(`  snapshot: as at ${snap.label}\n  ${snap.pageUrl}\n  ${snap.csvUrl}`);
  const councils = await loadCouncils(db);
  const text = await downloadCsvText(snap.csvUrl);
  const r = parseSnapshot(text, snap, councils);
  const names = new Map(councils.map((c) => [c.gss_code, c.name]));

  console.log(`  schools: ${r.rows.length.toLocaleString()}; local authorities: ${r.laCount}; councils with schools: ${new Set(r.rows.map((x) => x.la_gss_code)).size}`);
  console.log(`  with report card: ${r.rows.filter((x) => x.rc_inspection_date).length}; with previous-framework graded inspection: ${r.rows.filter((x) => x.oeif_inspection_date).length}; with ungraded inspection: ${r.rows.filter((x) => x.ungraded_date).length}; with none: ${r.rows.filter((x) => !x.rc_inspection_date && !x.oeif_inspection_date && !x.ungraded_date).length}`);
  console.log(`  previous-framework overall: ${count(r.rows.filter((x) => x.oeif_inspection_date), (x) => x.oeif_overall)}`);
  console.log(`  report card safeguarding: ${count(r.rows.filter((x) => x.rc_inspection_date), (x) => x.rc_safeguarding)}`);
  console.log(`  categories of concern now: ${count(r.rows.filter((x) => x.most_recent_category), (x) => x.most_recent_category)}`);
  const accented = r.rows.filter((x) => /[^\x00-\x7F]/.test(String(x.school_name))).slice(0, 5).map((x) => x.school_name);
  console.log(`  names with accents (encoding check): ${accented.join(' | ') || 'none'}`);
  for (const code of ['E10000017', 'E06000001', 'E09000001', 'E06000010', 'E08000021', 'E06000053']) {
    const s = r.rows.filter((x) => x.la_gss_code === code);
    console.log(`  spot ${code} ${names.get(code)}: ${s.length} schools, ${s.reduce((t, x) => t + (Number(x.pupils) || 0), 0).toLocaleString()} pupils`);
  }

  const problems: string[] = [];
  if (r.unmatchedLAs.length) problems.push(`local authority names not matched: ${r.unmatchedLAs.join(' | ')}`);
  if (r.ambiguousLAs.length) problems.push(`local authority names matching more than one council: ${r.ambiguousLAs.join(' | ')}`);
  const dup = r.rows.length - new Set(r.rows.map((x) => x.urn)).size;
  if (dup) problems.push(`${dup} duplicate URNs`);
  if (problems.length) {
    console.log(`\nPROBLEMS — nothing written:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  if (!DRY_RUN) {
    const w = await writeSnapshot(db, r.rows, snap.date);
    console.log(`\n${w.written.toLocaleString()} schools written; ${w.removed} schools from older snapshots removed`);
  } else {
    console.log(`\n${r.rows.length.toLocaleString()} schools computed`);
  }
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
