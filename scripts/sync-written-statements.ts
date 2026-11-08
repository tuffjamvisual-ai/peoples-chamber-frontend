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
// HTTP 5xx or no answer: the same page is tried again after 2, 4 and 8 seconds, each retry logged with its skip and status
// (WS1a, 8 Nov 2026, as the career sync does); only when the third retry fails does the fetching stop. HTTP 429 or 403 (or
// any other refusal) stops it at once, with no retry. When it stops, only complete pages fetched before it are kept (nothing
// from the failed page), and the run exits 1 after writing them (or, with more than 10 failures, without writing). Rows are
// written in batches of 500.
// Reads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (never printed).
// After writing (owner, 8 Nov 2026, PR1): the members with new or changed statement rows in this run (a stable hash of each
// stored row against the fetched one) whose mp_biography.delivery_record is not null, the only MPs whose page shows the
// figure, have /mps/<id> refreshed and sent to IndexNow (scripts/refresh-pages.ts). --dry-run lists them (reading the
// database, read only, when .env.local or the environment gives it).
import fs from 'node:fs';
import { refreshPages, stableHash, reportToRun } from './refresh-pages';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validate, type ApiStatement, type StatementRow } from '../lib/written-statements';

const API = 'https://questions-statements-api.parliament.uk/api/writtenstatements/statements';
const TAKE = 100;
const MAX_FAILURES = 10;
const UA = { 'User-Agent': 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)', Accept: 'application/json' };

// The member_ids with a fetched row that is new or differs from the stored one (synced_at aside).
export function changedMembers(fetched: StatementRow[], stored: Array<Partial<StatementRow> & { id: number }>): Set<number> {
  const before = new Map(stored.map((r) => [Number(r.id), stableHash(rowFields(r))]));
  return new Set(fetched.filter((r) => before.get(r.id) !== stableHash(rowFields(r))).map((r) => r.member_id));
}
const FIELDS = ['id', 'uin', 'house', 'member_id', 'member_role', 'date_made', 'title', 'answering_body_id', 'answering_body_name', 'url'] as const;
const rowFields = (r: Partial<StatementRow>) => Object.fromEntries(FIELDS.map((k) => [k, k === 'id' || k === 'member_id' || k === 'answering_body_id' ? (r[k] == null ? null : Number(r[k])) : (r[k] ?? null)]));

// The pages to refresh: members with new or changed rows whose delivery_record is not null (read only).
async function pagesToRefresh(db: SupabaseClient, list: StatementRow[]): Promise<string[]> {
  const stored: Array<Partial<StatementRow> & { id: number }> = [];
  for (let i = 0; i < list.length; i += 500) {
    const { data, error } = await db.from('parliament_written_statements').select(FIELDS.join(', ')).in('id', list.slice(i, i + 500).map((r) => r.id));
    if (error) throw new Error(`parliament_written_statements (stored rows): ${error.message}`);
    stored.push(...((data ?? []) as unknown as Array<Partial<StatementRow> & { id: number }>));
  }
  const members = [...changedMembers(list, stored)];
  if (!members.length) return [];
  const { data, error } = await db.from('mp_biography').select('member_id').in('member_id', members).not('delivery_record', 'is', null);
  if (error) { console.warn(`mp_biography delivery_record: ${error.message}; no pages to refresh`); return []; }
  console.log(`${members.length} member(s) with new or changed statements; ${((data ?? []) as unknown[]).length} with a delivery record`);
  return ((data ?? []) as Array<{ member_id: number }>).map((r) => `/mps/${r.member_id}`).sort();
}

const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = argv.includes('--dry-run');
const SINCE = opt('--since');
const MEMBER = opt('--member');
const OUT = opt('--out');
if (SINCE && !/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) throw new Error('--since must be YYYY-MM-DD');
if (MEMBER && !/^\d+$/.test(MEMBER)) throw new Error('--member must be a member id');

export class Stop extends Error {}
export type Page = { totalResults: number; results: Array<{ value: ApiStatement }> };
// Waits before the first, second and third retry of a page that got HTTP 5xx or no answer.
export const RETRY_WAITS = [2000, 4000, 8000];
type Deps = { fetch: (url: string) => Promise<Response>; sleep: (ms: number) => Promise<void>; log: (line: string) => void };
const realDeps: Deps = {
  fetch: (url) => fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) }),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  log: (line) => console.warn(line),
};

// One page, tried up to four times: retried after 2, 4 and 8 seconds on HTTP 5xx or no answer; HTTP 429, 403 or any other
// refusal stops at once.
export async function fetchPage(url: string, skip: number, deps: Deps = realDeps): Promise<Page> {
  for (let attempt = 0; ; attempt++) {
    let problem: string;
    try {
      const res = await deps.fetch(url);
      if (res.ok) return (await res.json()) as Page;
      if (res.status < 500) throw new Stop(`HTTP ${res.status} at skip ${skip}`);
      problem = `HTTP ${res.status}`;
    } catch (e) {
      if (e instanceof Stop) throw e;
      problem = `no answer (${e instanceof Error ? e.message : String(e)})`;
    }
    if (attempt >= RETRY_WAITS.length) throw new Stop(`${problem} at skip ${skip} after ${RETRY_WAITS.length} retries`);
    deps.log(`retry ${attempt + 1} of ${RETRY_WAITS.length}: skip ${skip}, ${problem}; trying again in ${RETRY_WAITS[attempt] / 1000} s`);
    await deps.sleep(RETRY_WAITS[attempt]);
  }
}

let last = 0;
async function page(skip: number): Promise<Page> {
  const wait = 1000 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const q = new URLSearchParams({ house: 'Commons', take: String(TAKE), skip: String(skip) });
  if (SINCE) q.set('madeWhenFrom', SINCE);
  if (MEMBER) q.set('members', MEMBER);
  return fetchPage(`${API}?${q}`, skip);
}

// Every page in turn. Complete pages only: a page is added once it has been read in full, so a page that stops the run
// adds nothing.
export async function collect(getPage: (skip: number) => Promise<Page>) {
  const rows = new Map<number, StatementRow>();
  const failures: string[] = [];
  let total = 0, fetched = 0, stopped: string | null = null;
  for (let skip = 0; ; skip += TAKE) {
    let p;
    try { p = await getPage(skip); } catch (e) { if (e instanceof Stop) { stopped = e.message; break; } throw e; }
    total = p.totalResults;
    for (const r of p.results ?? []) {
      fetched++;
      const { row, problems } = validate(r?.value ?? {});
      if (row) rows.set(row.id, row);
      else failures.push(`id ${String((r?.value as ApiStatement | undefined)?.id ?? '?')}: ${problems.join('; ')}`);
    }
    if (!p.results?.length || skip + TAKE >= total) break;
  }
  return { rows, failures, total, fetched, stopped };
}

async function main() {
  const { rows, failures, total, fetched, stopped } = await collect(page);
  for (const f of failures) console.warn(`left out: ${f}`);
  const list = [...rows.values()].sort((a, b) => (a.date_made < b.date_made ? -1 : a.date_made > b.date_made ? 1 : a.id - b.id));
  console.log(`${fetched} of ${total} statements fetched${SINCE ? ` since ${SINCE}` : ''}${MEMBER ? ` for member ${MEMBER}` : ''}; ${list.length} valid, ${failures.length} left out${stopped ? `; stopped early: ${stopped}` : ''}`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), since: SINCE ?? null, member: MEMBER ?? null, total, rows: list, failures }, null, 1));

  if (failures.length > MAX_FAILURES) { console.error(`more than ${MAX_FAILURES} records failed validate(): nothing written`); process.exit(1); }
  if (DRY) {
    for (const r of list.slice(-20)) console.log(`  ${r.date_made} ${r.uin ?? '(no uin)'} member ${r.member_id} ${r.answering_body_name ?? ''}: ${r.title ?? ''} ${r.url ?? ''}`);
    console.log('dry run: nothing written');
    // The pages a real run would refresh (PR1), read only, when the database is reachable.
    try { process.loadEnvFile(`${__dirname}/../.env.local`); } catch { /* the environment may give it */ }
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
      await refreshPages(await pagesToRefresh(db, list), { dryRun: true });
    } else console.log('[refresh] dry run: no database settings, pages to refresh not worked out');
    if (stopped) process.exit(1);
    return;
  }

  process.loadEnvFile(`${__dirname}/../.env.local`);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  // Worked out before writing, so the stored rows are the ones from before this run (PR1).
  const refreshList = await pagesToRefresh(db, list);
  const syncedAt = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500).map((r) => ({ ...r, synced_at: syncedAt }));
    const { error } = await db.from('parliament_written_statements').upsert(batch, { onConflict: 'id' });
    if (error) { console.error(`write failed after ${written} rows: ${error.message}`); process.exit(1); }
    written += batch.length;
  }
  console.log(`${written} rows written to parliament_written_statements`);
  // The pages of MPs whose statements figure changed; a refresh problem is reported but never undoes the write (PR1).
  reportToRun('Written statements sync', await refreshPages(refreshList, { reason: 'written-statements-sync' }));
  if (stopped) process.exit(1);
}

// Runs only when started as a script, so the tests can import fetchPage() and collect() without fetching or writing.
if (/sync-written-statements\.ts$/.test(process.argv[1] ?? '')) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
