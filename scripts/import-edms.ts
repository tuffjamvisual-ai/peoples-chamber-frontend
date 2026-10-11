// One-off backfill: every Early Day Motion tabled since the 4 July 2024
// general election, with every MP signature. Ongoing updates are handled
// daily by app/api/sync-edms/route.ts. Safe to re-run: every write is an
// upsert keyed on the API's own ids.
//
// Run with tsx:
//   npx tsx scripts/import-edms.ts --dry-run   # fetch + build only, no writes
//   npx tsx scripts/import-edms.ts             # full backfill, writes to DB
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local (no anon-key fallback: both tables are read-only to anon).

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { EDM_API, EDM_PARLIAMENT_START, fetchEdmJson, listEdms, buildEdmRows, writeEdm } from '../lib/edms';

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = 3;
const DELAY_MS = 250;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`EDM backfill from ${EDM_PARLIAMENT_START}${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);

  // Current MP ids, used only to REPORT signers who aren't in the mps table
  // (rows are still stored).
  const knownMembers = new Set<number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('mps').select('member_id').order('member_id').range(from, from + 999);
    if (error) throw new Error(`mps read: ${error.message}`);
    for (const r of data ?? []) knownMembers.add(r.member_id as number);
    if (!data || data.length < 1000) break;
  }
  console.log(`MPs in mps table: ${knownMembers.size}`);

  const list = await listEdms(EDM_PARLIAMENT_START, DELAY_MS);
  console.log(`Motions found: ${list.length}`);

  let done = 0;
  let sigRows = 0;
  let liveSigs = 0;
  let withdrawnSigs = 0;
  let withdrawnMotions = 0;
  let prayers = 0;
  let amendments = 0;
  let maxSigs = { id: 0, title: '', count: 0 };
  const unknownSigners = new Map<number, string>();
  const failures: { id: number; error: string }[] = [];

  const queue = [...list];
  async function worker() {
    while (queue.length > 0) {
      const entry = queue.shift()!;
      try {
        const json = await fetchEdmJson(`${EDM_API}/EarlyDayMotion/${entry.id}`);
        const built = buildEdmRows(json, entry.sponsorsCount);
        sigRows += built.signatures.length;
        for (const s of built.signatures) {
          if (s.is_withdrawn) withdrawnSigs++;
          else liveSigs++;
          if (!knownMembers.has(s.member_id)) unknownSigners.set(s.member_id, s.member_name);
        }
        if (built.edm.status === 'withdrawn') withdrawnMotions++;
        if (built.edm.is_prayer) prayers++;
        if (built.edm.amendment_to_motion_id != null) amendments++;
        const c = built.edm.signature_count as number;
        if (c > maxSigs.count) maxSigs = { id: entry.id, title: built.edm.title as string, count: c };
        if (!DRY_RUN) await writeEdm(db, built);
      } catch (e) {
        failures.push({ id: entry.id, error: (e as Error).message });
      }
      done++;
      if (done % 100 === 0 || done === list.length) console.log(`  ${done}/${list.length} processed`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('');
  console.log(`Motions processed: ${list.length - failures.length}/${list.length}`);
  console.log(`  withdrawn motions: ${withdrawnMotions} · prayers against regulations: ${prayers} · amendments: ${amendments}`);
  console.log(`Signature rows ${DRY_RUN ? 'computed' : 'written'}: ${sigRows.toLocaleString()} (live ${liveSigs.toLocaleString()}, withdrawn ${withdrawnSigs.toLocaleString()})`);
  console.log(`Most signed: EDM ${maxSigs.id} "${maxSigs.title}" with ${maxSigs.count}`);
  if (unknownSigners.size > 0) {
    console.log(`Signers not in the mps table (${unknownSigners.size}):`);
    for (const [id, name] of [...unknownSigners.entries()].sort((a, b) => a[1].localeCompare(b[1]))) console.log(`  ${id}  ${name}`);
  } else {
    console.log('All signers are in the mps table.');
  }
  if (failures.length > 0) {
    console.log(`FAILURES (${failures.length}):`);
    for (const f of failures.slice(0, 50)) console.log(`  ${f.id}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
