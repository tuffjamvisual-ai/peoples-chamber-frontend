// Written questions 2014 to July 2024, details only (owner, 8 Nov 2026, WQ1): answered Commons written questions tabled from
// 1 January 2014 to 3 July 2024, from Parliament's Questions API, upserted by id into parliament_written_questions_details
// (migration 2026-11-08d). No question or answer text. Run by hand by Terminal 1, in resumable chunks.
//
//   npx tsx --tsconfig tsconfig.json scripts/backfill-written-questions-details.ts [--dry-run] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
//     [--member <id> [--role asking|answering|both] [--answered-from YYYY-MM-DD] [--answered-to YYYY-MM-DD]] [--out <file.json>]
//
// --from, --to   the tabled dates to cover (default 2014-01-01 to 2024-07-03), one calendar month at a time; a window
//                with more than 2,000 questions is cut in half by date, again and again, so no page is deeper than skip
//                1,900 (the API answered HTTP 500 at skip 4,000 on 8 Nov 2026). take=100, one request a second.
// --member       only this member's questions (a check): asked, answered or both (--role, default both), in one window
//                over the whole range; --answered-from and --answered-to narrow the answered ones to a period.
// --dry-run      fetches and validates, writes nothing and reads nothing from the database; --out keeps the rows.
// Each record passes lib/written-questions-details.ts validate() (id, uin and date_tabled required, the url built as the
// archive builds it). Failures are logged and left out; if more than 1 in 1,000 records so far have failed, the run stops
// before writing. Rows are written in batches of 500, window by window, never a row whose id is already in
// parliament_written_questions. A window whose ids come up short of the API's total is read again (twice at most).
// HTTP 5xx or no answer: the same page is tried again after 2, 4 and 8 seconds; then the run stops. HTTP 429 or 403 stops
// it at once. On a stop only complete windows have been written: resume with --from <the window's first day>, which the
// run prints. Reads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (never printed) only when writing.
import fs from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validate, monthWindows, halves, DETAILS_FROM, DETAILS_TO, type ApiQuestion, type DetailsRow } from '../lib/written-questions-details';

const API = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
const TAKE = 100;
const SPLIT_OVER = 2000;
const UA = { 'User-Agent': 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)', Accept: 'application/json' };

const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const day = (k: string, d?: string) => { const v = opt(k) ?? d; if (v !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`${k} must be YYYY-MM-DD`); return v; };
const DRY = argv.includes('--dry-run');
const FROM = day('--from', DETAILS_FROM)!, TO = day('--to', DETAILS_TO)!;
const MEMBER = opt('--member');
const ROLE = opt('--role') ?? 'both';
const ANS_FROM = day('--answered-from'), ANS_TO = day('--answered-to');
const OUT = opt('--out');
if (MEMBER && !/^\d+$/.test(MEMBER)) throw new Error('--member must be a member id');
if (!['asking', 'answering', 'both'].includes(ROLE)) throw new Error('--role must be asking, answering or both');
if (FROM < DETAILS_FROM || TO > DETAILS_TO || FROM > TO) throw new Error(`--from and --to must lie within ${DETAILS_FROM} to ${DETAILS_TO}`);

class Stop extends Error {}
let last = 0, requests = 0;
async function get(params: Record<string, string>): Promise<{ totalResults: number; results: Array<{ value: ApiQuestion }> }> {
  const q = new URLSearchParams({ house: 'Commons', answered: 'Answered', take: String(TAKE), ...params });
  for (let attempt = 0; ; attempt++) {
    const wait = 1000 - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now(); requests++;
    let status = 0;
    try {
      const res = await fetch(`${API}?${q}`, { headers: UA, signal: AbortSignal.timeout(60000) });
      status = res.status;
      if (res.ok) return (await res.json()) as { totalResults: number; results: Array<{ value: ApiQuestion }> };
      if (status === 429 || status === 403) throw new Stop(`HTTP ${status}: stopping at once`);
      if (status < 500) throw new Stop(`HTTP ${status}`);
    } catch (e) {
      if (e instanceof Stop) throw e;
    }
    if (attempt >= 3) throw new Stop(`${status ? `HTTP ${status}` : 'no answer'} after 3 retries (skip ${q.get('skip')})`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

// Every record in one window, page by page; read again (twice at most) while the ids come up short of the total.
async function readWindow(params: Record<string, string>): Promise<{ total: number; records: ApiQuestion[] }> {
  const byId = new Map<number, ApiQuestion>();
  let total = 0;
  for (let pass = 0; pass < 3; pass++) {
    for (let skip = 0; ; skip += TAKE) {
      const p = await get({ ...params, skip: String(skip) });
      total = p.totalResults;
      for (const r of p.results ?? []) { const v = r?.value ?? {}; byId.set(typeof v.id === 'number' ? v.id : -byId.size - 1, v); }
      if (!p.results?.length || skip + TAKE >= total) break;
    }
    if (byId.size >= total) break;
    console.warn(`  ${params.tabledWhenFrom} to ${params.tabledWhenTo}: ${byId.size} of ${total} ids after pass ${pass + 1}; reading again`);
  }
  return { total, records: [...byId.values()] };
}

// The window, or its halves (and theirs), so that none holds more than SPLIT_OVER questions.
async function sized(w: { from: string; to: string }): Promise<Array<{ from: string; to: string }>> {
  const probe = await get({ tabledWhenFrom: w.from, tabledWhenTo: w.to, take: '1', skip: '0' });
  const parts = halves(w);
  if (probe.totalResults <= SPLIT_OVER || parts.length < 2) return [w];
  return [...(await sized(parts[0])), ...(await sized(parts[1]))];
}

// Ids already in the full text archive are never written here.
async function inArchive(db: SupabaseClient, ids: number[]): Promise<Set<number>> {
  const found = new Set<number>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await db.from('parliament_written_questions').select('id').in('id', ids.slice(i, i + 500));
    if (error) throw new Error(`parliament_written_questions: ${error.message}`);
    for (const r of data ?? []) found.add(Number(r.id));
  }
  return found;
}

async function main() {
  const started = Date.now();
  let db: SupabaseClient | null = null;
  if (!DRY) {
    process.loadEnvFile(`${__dirname}/../.env.local`);
    db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  }
  // Windows: months (or, for a member, the whole range once per role).
  type Job = { label: string; params: Record<string, string> };
  const jobs: Job[] = [];
  if (MEMBER) {
    const roles = ROLE === 'both' ? ['asking', 'answering'] : [ROLE];
    for (const r of roles) {
      const params: Record<string, string> = { tabledWhenFrom: FROM, tabledWhenTo: TO, [r === 'asking' ? 'askingMemberId' : 'answeringMemberId']: MEMBER };
      if (r === 'answering' && ANS_FROM) params.answeredWhenFrom = ANS_FROM;
      if (r === 'answering' && ANS_TO) params.answeredWhenTo = ANS_TO;
      jobs.push({ label: `member ${MEMBER} ${r}${r === 'answering' && (ANS_FROM || ANS_TO) ? ` (answered ${ANS_FROM ?? 'any'} to ${ANS_TO ?? 'any'})` : ''}`, params });
    }
  } else for (const w of monthWindows(FROM, TO)) jobs.push({ label: w.from.slice(0, 7), params: { tabledWhenFrom: w.from, tabledWhenTo: w.to } });

  const kept: DetailsRow[] = [];
  const failures: string[] = [];
  let fetched = 0, written = 0, skippedArchive = 0;
  const counts: Record<string, { total: number; valid: number; left: number }> = {};
  for (const job of jobs) {
    let windows = [job.params];
    try {
      // A window over 2,000 questions is cut in half by date until no part is: one small request each to learn its size.
      if (!MEMBER) windows = (await sized({ from: job.params.tabledWhenFrom, to: job.params.tabledWhenTo })).map((h) => ({ tabledWhenFrom: h.from, tabledWhenTo: h.to }));
      const rows: DetailsRow[] = [];
      let total = 0, left = 0;
      for (const params of windows) {
        const w = await readWindow(params);
        total += w.total; fetched += w.records.length;
        for (const r of w.records) {
          const { row, problems } = validate(r);
          if (row) rows.push(row);
          else { left++; failures.push(`id ${String(r?.id ?? '?')}: ${problems.join('; ')}`); console.warn(`  left out id ${String(r?.id ?? '?')}: ${problems.join('; ')}`); }
        }
      }
      counts[job.label] = { total, valid: rows.length, left };
      if (failures.length > Math.floor(fetched / 1000)) {
        console.error(`stopped before writing ${job.label}: ${failures.length} of ${fetched} records failed validate() (more than 1 in 1,000). Resume with --from ${job.params.tabledWhenFrom}`);
        process.exit(1);
      }
      if (db) {
        const archived = await inArchive(db, rows.map((r) => r.id));
        const toWrite = rows.filter((r) => !archived.has(r.id));
        skippedArchive += rows.length - toWrite.length;
        const fetchedAt = new Date().toISOString();
        for (let i = 0; i < toWrite.length; i += 500) {
          const { error } = await db.from('parliament_written_questions_details').upsert(toWrite.slice(i, i + 500).map((r) => ({ ...r, fetched_at: fetchedAt })), { onConflict: 'id' });
          if (error) { console.error(`write failed in ${job.label}: ${error.message}. Resume with --from ${job.params.tabledWhenFrom}`); process.exit(1); }
        }
        written += toWrite.length;
      } else kept.push(...rows);
      console.log(`${job.label}: ${total} answered, ${rows.length} valid, ${left} left out${db ? `, ${written} written so far` : ''} (${requests} requests, ${Math.round((Date.now() - started) / 60000)} min)`);
    } catch (e) {
      if (e instanceof Stop) {
        console.error(`stopped in ${job.label}: ${e.message}. Complete windows before it are written. Resume with --from ${job.params.tabledWhenFrom}`);
        process.exit(1);
      }
      throw e;
    }
  }
  const valid = Object.values(counts).reduce((a, c) => a + c.valid, 0), left = Object.values(counts).reduce((a, c) => a + c.left, 0);
  console.log(`done: ${fetched} fetched, ${valid} valid, ${left} left out; ${DRY ? 'dry run, nothing written' : `${written} written, ${skippedArchive} already in parliament_written_questions`}; ${requests} requests in ${Math.round((Date.now() - started) / 1000)} s`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), from: FROM, to: TO, member: MEMBER ?? null, role: MEMBER ? ROLE : null, counts, failures, rows: kept }, null, 1));
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
