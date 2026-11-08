// Written ministerial statements, Commons, metadata only (owner, 8 Nov 2026, WS1): pages through Parliament's Written
// Statements API at take=100, one request a second, and upserts each statement by id into parliament_written_statements
// (migration 2026-11-08c). No statement text is stored.
//
//   npx tsx --tsconfig tsconfig.json scripts/sync-written-statements.ts [--dry-run] [--since YYYY-MM-DD] [--member <id>] [--out <file.json>]
//
// --since     only statements made on or after this day (madeWhenFrom); without it, every Commons statement (the first
//             backfill, about 9,200, run by hand). The nightly run passes 30 days ago.
// --member    only this member's statements (a check; the nightly and backfill runs take every member)
// --dry-run   fetches and validates, writes nothing; with --out, the rows it would write go to that file
// Every record passes lib/written-statements.ts validate() (id, member_id and date_made required; the url built from the
// date and the uin). A failure is logged and left out; more than 10 failures in a run stop it before anything is written.
// HTTP 429, 403 or 5xx, or no answer, stops the fetching at once: only complete pages fetched before it are kept, and the
// run exits 1 after writing them (or, with more than 10 failures, without writing). Rows are written in batches of 500.
// Reads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (never printed).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { validate, type ApiStatement, type StatementRow } from '../lib/written-statements';

const API = 'https://questions-statements-api.parliament.uk/api/writtenstatements/statements';
const TAKE = 100;
const MAX_FAILURES = 10;
const UA = { 'User-Agent': 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)', Accept: 'application/json' };

const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = argv.includes('--dry-run');
const SINCE = opt('--since');
const MEMBER = opt('--member');
const OUT = opt('--out');
if (SINCE && !/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) throw new Error('--since must be YYYY-MM-DD');
if (MEMBER && !/^\d+$/.test(MEMBER)) throw new Error('--member must be a member id');

class Stop extends Error {}
let last = 0;
async function page(skip: number): Promise<{ totalResults: number; results: Array<{ value: ApiStatement }> }> {
  const wait = 1000 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const q = new URLSearchParams({ house: 'Commons', take: String(TAKE), skip: String(skip) });
  if (SINCE) q.set('madeWhenFrom', SINCE);
  if (MEMBER) q.set('members', MEMBER);
  let res: Response;
  try {
    res = await fetch(`${API}?${q}`, { headers: UA, signal: AbortSignal.timeout(60000) });
  } catch (e) {
    throw new Stop(`no answer at skip ${skip}: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (res.status === 429 || res.status === 403 || res.status >= 500) throw new Stop(`HTTP ${res.status} at skip ${skip}`);
  if (!res.ok) throw new Stop(`HTTP ${res.status} at skip ${skip}`);
  return (await res.json()) as { totalResults: number; results: Array<{ value: ApiStatement }> };
}

async function main() {
  const rows = new Map<number, StatementRow>();
  const failures: string[] = [];
  let total = 0, fetched = 0, stopped: string | null = null;
  // Complete pages only: a page is added once it has been read in full.
  for (let skip = 0; ; skip += TAKE) {
    let p;
    try { p = await page(skip); } catch (e) { if (e instanceof Stop) { stopped = e.message; break; } throw e; }
    total = p.totalResults;
    for (const r of p.results ?? []) {
      fetched++;
      const { row, problems } = validate(r?.value ?? {});
      if (row) rows.set(row.id, row);
      else failures.push(`id ${String((r?.value as ApiStatement | undefined)?.id ?? '?')}: ${problems.join('; ')}`);
    }
    if (!p.results?.length || skip + TAKE >= total) break;
  }
  for (const f of failures) console.warn(`left out: ${f}`);
  const list = [...rows.values()].sort((a, b) => (a.date_made < b.date_made ? -1 : a.date_made > b.date_made ? 1 : a.id - b.id));
  console.log(`${fetched} of ${total} statements fetched${SINCE ? ` since ${SINCE}` : ''}${MEMBER ? ` for member ${MEMBER}` : ''}; ${list.length} valid, ${failures.length} left out${stopped ? `; stopped early: ${stopped}` : ''}`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), since: SINCE ?? null, member: MEMBER ?? null, total, rows: list, failures }, null, 1));

  if (failures.length > MAX_FAILURES) { console.error(`more than ${MAX_FAILURES} records failed validate(): nothing written`); process.exit(1); }
  if (DRY) {
    for (const r of list.slice(-20)) console.log(`  ${r.date_made} ${r.uin ?? '(no uin)'} member ${r.member_id} ${r.answering_body_name ?? ''}: ${r.title ?? ''} ${r.url ?? ''}`);
    console.log('dry run: nothing written');
    if (stopped) process.exit(1);
    return;
  }

  process.loadEnvFile(`${__dirname}/../.env.local`);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const syncedAt = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500).map((r) => ({ ...r, synced_at: syncedAt }));
    const { error } = await db.from('parliament_written_statements').upsert(batch, { onConflict: 'id' });
    if (error) { console.error(`write failed after ${written} rows: ${error.message}`); process.exit(1); }
    written += batch.length;
  }
  console.log(`${written} rows written to parliament_written_statements`);
  if (stopped) process.exit(1);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
