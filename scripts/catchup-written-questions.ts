// Weekly catch-up of written questions from the owner's Mac (owner approved 17 Nov 2026, COWORK-TO-T1 ENTRY 216).
//
//   npx tsx --tsconfig tsconfig.json scripts/catchup-written-questions.ts [--dry-run] [--tabled-days N] [--max-minutes N]
//
// The daily Vercel run (/api/sync-parliament-archive, 03:08 UTC) has about 260 requests for written questions, and a
// sitting day needs 540 to 1,000 (audit/t1-answers/README.md). This runs the route's own passes (lib/parliament-archive.ts:
// the same Parliament API, the same 0.5 s gap, the same cursors and upserts) with no time cap:
//   1. tabled: every question tabled in the last N days (default 14) that we do not hold, from the list pages where the
//      list has it whole, else read on its own;
//   2. answered: from the answered cursor, every newly answered or corrected question;
//   3. the Sunday 90 day re-check, only if one is part done;
//   4. unanswered: holding answers and withdrawals.
// Then it refreshes the pages of members whose answers changed and each changed question's tag through the live site's
// /api/revalidate (scripts/revalidate.js, as the route does with revalidatePath and revalidateTag), and records a heartbeat
// under /scripts/catchup-written-questions.
//
// Lock: while it runs it holds parliament_archive_sync_state row 'questions-catchup' (cursor.lock_until, 6 hours ahead,
// cleared at the end), and the route leaves the questions alone while that is in the future. It will not start within 6
// minutes of the route's last questions run, nor between 03:00 and 03:20 UTC.
// --dry-run writes nothing (no rows, no cursors, no lock, no refresh, no heartbeat) and reads the real cursors.
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (never printed).

import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  Run, StopRun, runQuestions, runAnswered, runWeekly, runUnanswered, addDays, day, CATCHUP_SOURCE, catchupLockedUntil,
  type State,
} from '@/lib/parliament-archive';
import { answerPaths } from '@/lib/written-answers-refresh';

config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const num = (k: string, d: number) => { const i = args.indexOf(k); const v = i >= 0 ? Number(args[i + 1]) : d; if (!Number.isFinite(v) || v <= 0) throw new Error(`${k} must be a positive number`); return v; };
const TABLED_DAYS = num('--tabled-days', 14);
const MAX_MINUTES = num('--max-minutes', 360);
const LOCK_HOURS = 6;
const ROUTE = '/scripts/catchup-written-questions';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing from .env.local'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

async function readState(source: string): Promise<State | null> {
  const { data, error } = await db.from('parliament_archive_sync_state').select('*').eq('source', source).maybeSingle();
  if (error) throw new Error(`state read: ${error.message}`);
  return data as State | null;
}

async function setLock(cursor: Record<string, unknown>) {
  const { error } = await db.from('parliament_archive_sync_state').upsert({ source: CATCHUP_SOURCE, cursor, last_run_at: new Date().toISOString() }, { onConflict: 'source' });
  if (error) throw new Error(`catch-up lock write: ${error.message}`);
}

function refresh(paths: string[], tags: string[]) {
  if (!paths.length && !tags.length) return 'nothing to refresh';
  const file = join(tmpdir(), `catchup-paths-${process.pid}.json`);
  try {
    const out: string[] = [];
    // Tags in groups of 200 per call, paths through a file.
    for (let i = 0; i < tags.length; i += 200) {
      const r = spawnSync('node', ['scripts/revalidate.js', ...tags.slice(i, i + 200).flatMap((t) => ['--tag', t])], { encoding: 'utf8' });
      out.push(`tags ${i + 1}-${Math.min(i + 200, tags.length)}: exit ${r.status}`);
    }
    // The site's /api/revalidate takes at most 300 paths and tags a request: paths in groups of 200 too (the first run, 17
    // Nov 2026, sent 853 at once and was refused).
    for (let i = 0; i < paths.length; i += 200) {
      writeFileSync(file, JSON.stringify({ paths: paths.slice(i, i + 200) }));
      const r = spawnSync('node', ['scripts/revalidate.js', '--paths-file', file], { encoding: 'utf8' });
      out.push(`paths ${i + 1}-${Math.min(i + 200, paths.length)}: exit ${r.status}`);
    }
    return out.join('; ');
  } finally { try { unlinkSync(file); } catch { /* no paths written */ } }
}

async function heartbeat(status: number, rows: number | null) {
  if (dry) return;
  const { error } = await db.rpc('record_sync_run', { p_route: ROUTE, p_status: status, p_rows: rows });
  if (error) console.error(`heartbeat failed (non-fatal): ${error.message}`);
}

(async () => {
  const now = new Date();
  const today = day(now);
  console.log(`catch-up written questions${dry ? ' (DRY RUN: nothing written)' : ''}: tabled from ${addDays(today, -TABLED_DAYS)}, up to ${MAX_MINUTES} minutes`);
  // Never alongside the route.
  if (now.getUTCHours() === 3 && now.getUTCMinutes() < 20) throw new Error('03:00 to 03:20 UTC is the daily run; start after 03:20');
  const q0 = await readState('questions');
  if (!q0?.finished_at) throw new Error('the questions backfill has not finished; the route does that');
  if (q0.last_run_at && Date.now() - new Date(q0.last_run_at).getTime() < 6 * 60_000) throw new Error(`the route ran the questions at ${q0.last_run_at}; wait 6 minutes`);
  const held = await catchupLockedUntil(db);
  if (held) throw new Error(`another catch-up holds the lock until ${held}`);
  const started = new Date().toISOString();
  if (!dry) await setLock({ lock_until: new Date(Date.now() + LOCK_HOURS * 3600_000).toISOString(), started_at: started, by: 'owner Mac' });

  const run = new Run(db, MAX_MINUTES * 60_000, true, dry);
  const results: Record<string, string> = {};
  const timing: Record<string, number> = {};
  const step = async (name: string, fn: () => Promise<string>) => {
    const t = Date.now(); const r0 = run.requests; const w0 = run.rows;
    try { results[name] = await fn(); } catch (e) { results[name] = e instanceof StopRun ? 'partial (time cap)' : `failed: ${(e as Error).message}`; }
    timing[name] = Math.round((Date.now() - t) / 1000);
    console.log(`  ${name}: ${results[name]}; ${run.requests - r0} requests, ${run.rows - w0} rows, ${timing[name]} s`);
  };
  let status = 200;
  try {
    // The real cursors, read directly (a dry Run's own state reads are blank).
    await step('tabled', async () => runQuestions(run, (await readState('questions'))!, addDays(today, -TABLED_DAYS), today, true, true, false));
    await step('answered', async () => runAnswered(run, (await readState('questions'))!, null));
    const w = await readState('questions');
    if (w?.cursor?.weekly) await step('weekly (carry on)', async () => runWeekly(run, w, null, today));
    await step('unanswered', async () => runUnanswered(run, (await readState('questions'))!, today));
  } catch (e) {
    status = 500; console.error(`FAILED: ${(e as Error).message}`);
  } finally {
    const { members, paths } = answerPaths(run.answerChanges);
    const tags = [...new Set(run.answerChanges.map((r) => `question:${r.id}`))];
    const refreshed = dry ? `dry run: would refresh ${paths.length} paths (${members} members) and ${tags.length} question tags` : refresh(paths, tags);
    const minutes = ((Date.now() - run.started) / 60_000).toFixed(1);
    const summary = { started, finished: new Date().toISOString(), minutes: Number(minutes), requests: run.requests, rows: run.rows, tabled_from_list: run.fromList, tabled_read_singly: run.readSingly, answers_changed: run.answerChanges.length, results, timing };
    if (!dry) await setLock({ lock_until: null, last: summary });
    if (Object.values(results).some((r) => r.startsWith('failed'))) status = 500;
    await heartbeat(status, run.rows);
    console.log(`done: ${run.requests} requests, ${run.rows} rows written${dry ? ' (would be)' : ''}, ${run.fromList} tabled from the list, ${run.readSingly} read singly, ${run.answerChanges.length} answers new or changed, ${minutes} minutes`);
    console.log(`refresh: ${refreshed}`);
    process.exit(status === 200 ? 0 : 1);
  }
})().catch(async (e) => { console.error(`FAILED: ${(e as Error).message}`); process.exit(1); });
