// One-off backfill: every House of Lords division since the 4 July 2024
// general election, with each peer's vote, linked to bills where the
// title confidently matches. Ongoing updates are handled daily by
// app/api/sync-lords-votes/route.ts. Safe to re-run: every write is an
// upsert keyed on the API's own ids.
//
// Run with tsx (same as scripts/sync-editorials-to-db.ts):
//   npx tsx scripts/import-lords-votes.ts --dry-run   # fetch + match only, no writes
//   npx tsx scripts/import-lords-votes.ts             # full backfill, writes to DB
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local (no anon-key fallback: both tables are read-only to anon).

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  LORDS_VOTES_API,
  LORDS_PARLIAMENT_START,
  fetchLordsJson,
  listLordsDivisionIds,
  loadBillMatcher,
  buildLordsDivisionRows,
  writeLordsDivision,
} from '../lib/lords-votes';

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
  console.log(`Lords divisions backfill from ${LORDS_PARLIAMENT_START}${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);

  const matcher = await loadBillMatcher(db);
  console.log(`Bills loaded for matching: ${matcher.billCount}`);

  const ids = await listLordsDivisionIds(LORDS_PARLIAMENT_START, DELAY_MS);
  console.log(`Divisions found: ${ids.length}`);

  let done = 0;
  let voteRows = 0;
  const failures: { id: number; error: string }[] = [];
  // key: "title" + outcome detail -> count
  const linked = new Map<string, number>();
  const ambiguous = new Map<string, number>();
  const dateMismatch = new Map<string, number>();
  const unmatched = new Map<string, number>();
  const billTitle = (cands: { id: number; title: string }[], id: number | null) => cands.find((c) => c.id === id)?.title ?? '?';
  const candList = (cands: { id: number; title: string }[]) => cands.map((c) => `${c.id} "${c.title}"`).join('; ');
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const queue = [...ids];
  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift() as number;
      try {
        const json = await fetchLordsJson(`${LORDS_VOTES_API}/${id}`);
        const built = await buildLordsDivisionRows(json, matcher);
        const title = built.division.title as string;
        const m = built.match;
        if (m.status === 'linked') bump(linked, `${title}  ->  bill ${m.billId} "${billTitle(m.candidates, m.billId)}"`);
        else if (m.status === 'ambiguous') bump(ambiguous, `${title}  [candidates: ${candList(m.candidates)}]`);
        else if (m.status === 'date_mismatch') bump(dateMismatch, `${title}  [name matches but dates don't: ${candList(m.candidates)}]`);
        else bump(unmatched, title);
        if (!DRY_RUN) await writeLordsDivision(db, built);
        voteRows += built.votes.length;
      } catch (e) {
        failures.push({ id, error: (e as Error).message });
      }
      done++;
      if (done % 25 === 0 || done === ids.length) console.log(`  ${done}/${ids.length} processed`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  const sortDesc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const print = (label: string, m: Map<string, number>) => {
    console.log(`\n${label} — ${total(m)} divisions, ${m.size} entries:`);
    for (const [t, n] of sortDesc(m)) console.log(`  [${n}] ${t}`);
  };

  console.log('');
  console.log(`Divisions processed: ${ids.length - failures.length}/${ids.length}`);
  console.log(`Peer vote rows ${DRY_RUN ? 'computed' : 'written'}: ${voteRows.toLocaleString()}`);
  print('LINKED (title -> bill id and bill title)', linked);
  print('AMBIGUOUS (several bills sitting on that date share the name, left unlinked)', ambiguous);
  print('DATE MISMATCH (name matches a bill but not one sitting on that date, left unlinked)', dateMismatch);
  print('NOT MATCHED to any bill name', unmatched);
  if (failures.length > 0) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures) console.log(`  ${f.id}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
