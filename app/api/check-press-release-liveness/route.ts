import { NextResponse } from 'next/server';
import { indexNowAfter } from '@/lib/indexnow';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { revalidatePath } from '@/lib/refresh-count';
import { newsPath } from '@/lib/news-path';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';
import { LISTING, LISTING_PAGE, listingComplete, livenessPlan, govPath, type Pending, type StoredRelease } from '@/lib/press-liveness';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly-ish liveness check for archived GOV.UK press releases (Option C).
//
// We serve press-release bodies DB-first from our own archive, so a page view
// never depends on GOV.UK. This cron is the mechanism that DETECTS when GOV.UK
// removes a release: it HEAD-requests each release's original URL (least
// recently checked first) and, on a 404/410, sets removed_upstream = true so
// the detail page shows the "removed from GOV.UK — archived copy" banner.
//
// It also self-heals: if a live (200) release somehow has no stored body yet
// (e.g. a transient failure during the initial backfill), it fetches and fills
// the body from the content API.
//
// Batched so it fits in maxDuration: each run checks the BATCH least-recently
// -checked rows; at ~500/run every 2 hours it cycles the whole ~45k archive
// roughly weekly. Added 2026-07-11.
//
// 27 Oct 2026 (job 79): 81 of its 169 runs in the 14 days to 26 Oct were killed at 300 s, mostly because a HEAD
// request had no timeout. Every request now has one, the run stops starting new checks at 70 per cent of maxDuration
// and ends by 80 per cent (lib/sync-budget.ts), and a 429 from GOV.UK stops it cleanly. A release not reached keeps its
// old liveness_checked_at, so it is first in the queue next run: each release is checked once per cycle. The rows'
// bodies are no longer read just to see which are empty (a second, small query finds those), and a failed database
// write fails the run.

// 28 Oct 2026 (owner): a release whose check fails FLAG_AFTER_RUNS runs in a row (lib/sync-item-failures.ts) is
// stamped as checked (the back of the queue, about a week); the run returns 200 with partial: true, and the freshness
// email names the release and its error.
// 9 Nov 2026 (JF1e, audit JA1): checked against GOV.UK's own list of current press releases instead of requesting each
// one (lib/press-liveness.ts). The first run of each day (UTC) reads the list (about 47 requests) and our archive, and
// queues in sync_cursor CURSOR_ROUTE only the releases missing from the list (not already marked removed), listed again
// after being marked removed, or listed with no stored body. This and the day's later runs request those alone, saving
// each as now; once the queue is empty a run makes no request. About 6,000 requests a day before, about 50 plus the
// queue after. A listing that comes back short is not used (every release missing from it would look removed); the
// next run tries again.
const CURSOR_ROUTE = 'press-release-liveness';
type DayCursor = { date: string; pending: Pending[]; listed: number; stored: number; missingAlreadyRemoved: number; overCap: number; listingRequests: number };
const DELAY_MS = 250;
const HEAD_TIMEOUT_MS = 15_000;
const UA = 'PeoplesChamber/1.0 (+https://www.opengovt.uk)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { id: number; gov_url: string | null; removed_upstream: boolean | null };

async function GET_impl(req: Request) {
  const budget = new SyncBudget(maxDuration);
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const today = new Date().toISOString().slice(0, 10);
  const { data: cur, error: curErr } = await supabase.from('sync_cursor').select('cursor').eq('route', CURSOR_ROUTE).maybeSingle();
  if (curErr) return NextResponse.json({ error: `sync_cursor: ${curErr.message}` }, { status: 502 });
  let day = (cur?.cursor as DayCursor | undefined) ?? null;
  let listingRequests = 0;
  const saveDay = async (d: DayCursor) => {
    const { error: e } = await supabase.from('sync_cursor').upsert({ route: CURSOR_ROUTE, cursor: d, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (e) throw new Error(`sync_cursor write: ${e.message}`);
  };

  // Once a day: GOV.UK's list of current press releases against our archive.
  if (!day || day.date !== today) {
    const listed = new Set<string>();
    let total = 0;
    try {
      for (let start = 0; ; start += LISTING_PAGE) {
        if (budget.stopStarting()) throw new Error('time budget reached while reading the listing');
        const res = await politeFetch(`${LISTING}&count=${LISTING_PAGE}&start=${start}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, { budget, timeoutMs: 30_000 });
        listingRequests++;
        if (!res.ok) throw new Error(`GOV.UK listing HTTP ${res.status} at ${start}`);
        const j = (await res.json()) as { total?: number; results?: Array<{ link?: string }> };
        total = j.total ?? total;
        for (const r of j.results ?? []) if (r.link) listed.add(govPath(r.link));
        if ((j.results ?? []).length < LISTING_PAGE || start + LISTING_PAGE >= total) break;
      }
    } catch (e) {
      return NextResponse.json({ ok: true, partial: true, stopped_by: `listing not read: ${(e as Error).message}; tried again next run`, listing_requests: listingRequests, count: 0 });
    }
    if (!listingComplete(listed.size, total)) {
      return NextResponse.json({ ok: true, partial: true, stopped_by: `listing short: ${listed.size} links of ${total}; not used, tried again next run`, listing_requests: listingRequests, count: 0 });
    }
    const stored: StoredRelease[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('press_releases').select('id, gov_url, removed_upstream').ilike('gov_url', '%gov.uk%').order('id').range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 502 });
      stored.push(...((data || []) as StoredRelease[]));
      if ((data || []).length < 1000) break;
    }
    const { data: nb, error: nbErr } = await supabase.from('press_releases').select('id').ilike('gov_url', '%gov.uk%').is('body', null).limit(5000);
    if (nbErr) return NextResponse.json({ error: nbErr.message }, { status: 502 });
    const plan = livenessPlan(stored, listed, new Set((nb || []).map((r) => r.id as number)));
    day = { date: today, pending: plan.pending, listed: plan.listed, stored: stored.length, missingAlreadyRemoved: plan.missingAlreadyRemoved, overCap: plan.overCap, listingRequests };
    await saveDay(day);
  }

  // The day's queue, oldest first: each release's own page.
  const queue = day.pending;
  const rows: Row[] = [];
  for (let i = 0; i < queue.length; i += 500) {
    const { data, error } = await supabase.from('press_releases').select('id, gov_url, removed_upstream').in('id', queue.slice(i, i + 500).map((p) => p.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    rows.push(...((data || []) as Row[]));
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  const noBody = new Set(queue.filter((p) => p.why === 'no stored body').map((p) => p.id));
  const done = new Set<number>();

  let checked = 0, removed = 0, restored = 0, filled = 0, transient = 0, dbErrors = 0, notReached = 0, flaggedFail = 0;
  const failing = await ItemFailures.load(supabase, '/api/check-press-release-liveness');
  // Not checked this run (an error answer or no answer): counted towards being flagged; once flagged, stamped as checked.
  const notChecked = async (r: Row, error: string) => {
    if (!failing.failed(r.id, r.gov_url ?? `release ${r.id}`, error)) return;
    await write(r.id, { liveness_checked_at: nowIso() });
    done.add(r.id); // flagged: off today's queue, named in the freshness email
    flaggedFail++;
  };
  const changedPaths = new Set<string | null>();
  let stoppedBy: string | null = null;
  let lastDbError: string | null = null;
  const nowIso = () => new Date().toISOString();
  const write = async (id: number, patch: Record<string, unknown>) => {
    const { error: e } = await supabase.from('press_releases').update(patch).eq('id', id);
    if (e) { dbErrors++; lastDbError = e.message; }
  };

  for (const [i, p] of queue.entries()) {
    if (budget.stopStarting()) { stoppedBy = 'time budget'; notReached = queue.length - i; break; }
    const r = byId.get(p.id);
    if (!r || !r.gov_url) { done.add(p.id); continue; }
    const path = r.gov_url.replace(/^https?:\/\/[^/]+/, '');
    try {
      const head = await politeFetch(r.gov_url, { method: 'HEAD', headers: { 'User-Agent': UA } }, { budget, timeoutMs: HEAD_TIMEOUT_MS });
      if (head.status === 404 || head.status === 410) {
        await write(r.id, { removed_upstream: true, liveness_checked_at: nowIso() });
        if (r.removed_upstream !== true) changedPaths.add(newsPath(r.gov_url));
        removed++;
      } else if (head.ok) {
        const patch: Record<string, unknown> = { removed_upstream: false, liveness_checked_at: nowIso() };
        // Self-heal a missing body (rare, post-backfill).
        if (noBody.has(r.id)) {
          try {
            const c = await politeFetch(`https://www.gov.uk/api/content${path}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, { budget });
            if (c.ok) {
              const j = (await c.json()) as { details?: { body?: string } };
              if (j.details?.body) { patch.body = j.details.body; filled++; }
            }
          } catch (e) { if (isPoliteStop(e)) throw e; /* leave body null; next cycle retries */ }
        }
        await write(r.id, patch);
        // The page changes only if the removed banner goes or a missing body is filled.
        if (r.removed_upstream === true || patch.body) changedPaths.add(newsPath(r.gov_url));
        restored++;
      } else {
        transient++;
        await notChecked(r, `HEAD ${head.status}`);
        continue; // don't stamp checked — retry next run
      }
      checked++;
      done.add(r.id);
      failing.succeeded(r.id);
    } catch (e) {
      if (isPoliteStop(e)) { stoppedBy = (e as Error).message; notReached = queue.length - i; break; }
      transient++;
      await notChecked(r, (e as Error).message || 'no answer');
    }
    await sleep(DELAY_MS);
  }

  // Refresh only the release pages this run changed (owner's approval, 29 Oct 2026, cache Stage 1).
  changedPaths.delete(null);
  for (const p of changedPaths) if (p) revalidatePath(p);
  // A release GOV.UK has withdrawn or moved: its page changed, which IndexNow asks to hear about too.
  indexNowAfter([...changedPaths].filter((p): p is string => !!p), 'press-release-liveness');
  const failuresSaved = await failing.save();
  // What is left of today's queue (not reached, or an error answer to try again) waits for the next run.
  day.pending = queue.filter((p) => !done.has(p.id));
  await saveDay(day);
  if (dbErrors > 0) {
    return NextResponse.json({ ok: false, error: `press_releases update failed ${dbErrors} times: ${lastDbError}`, count: checked }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    // The budget or a rate limit stopped the run before the end of its batch; those releases come first next run.
    partial: stoppedBy !== null || flaggedFail > 0,
    flagged_failed: flaggedFail,
    pages_refreshed: changedPaths.size,
    flagged_after_runs: FLAG_AFTER_RUNS,
    failing_items: failing.summary(),
    failures_saved: failuresSaved,
    stopped_by: stoppedBy,
    not_reached: notReached,
    // Pages checked (live or removed); the heartbeat records this as the run's row count.
    count: checked,
    batch: queue.length,
    pending_left: day.pending.length,
    listing_requests: listingRequests,
    listing: { date: day.date, listed: day.listed, stored: day.stored, missing_already_removed: day.missingAlreadyRemoved, over_cap: day.overCap },
    checked,
    stillLive: restored,
    newlyRemoved: removed,
    bodiesFilled: filled,
    transient,
    syncedAt: nowIso(),
  });
}

export const GET = withHeartbeat('/api/check-press-release-liveness', GET_impl);
