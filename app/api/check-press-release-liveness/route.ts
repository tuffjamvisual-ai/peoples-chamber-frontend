import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
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

const BATCH = 500;
const DELAY_MS = 250;
const HEAD_TIMEOUT_MS = 15_000;
const UA = 'PeoplesChamber/1.0 (+https://www.opengovt.uk)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { id: number; gov_url: string | null };

async function GET_impl(req: Request) {
  const budget = new SyncBudget(maxDuration);
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('press_releases')
    .select('id, gov_url')
    .ilike('gov_url', '%gov.uk%')
    .order('liveness_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  const rows = (data || []) as Row[];
  // Which of these have no stored body (to fill below), without reading the bodies themselves.
  const noBody = new Set<number>();
  if (rows.length) {
    const { data: nb, error: nbErr } = await supabase.from('press_releases').select('id').in('id', rows.map((r) => r.id)).is('body', null);
    if (nbErr) return NextResponse.json({ error: nbErr.message }, { status: 502 });
    for (const r of nb || []) noBody.add(r.id as number);
  }

  let checked = 0, removed = 0, restored = 0, filled = 0, transient = 0, dbErrors = 0, notReached = 0;
  let stoppedBy: string | null = null;
  let lastDbError: string | null = null;
  const nowIso = () => new Date().toISOString();
  const write = async (id: number, patch: Record<string, unknown>) => {
    const { error: e } = await supabase.from('press_releases').update(patch).eq('id', id);
    if (e) { dbErrors++; lastDbError = e.message; }
  };

  for (const [i, r] of rows.entries()) {
    if (budget.stopStarting()) { stoppedBy = 'time budget'; notReached = rows.length - i; break; }
    if (!r.gov_url) continue;
    const path = r.gov_url.replace(/^https?:\/\/[^/]+/, '');
    try {
      const head = await politeFetch(r.gov_url, { method: 'HEAD', headers: { 'User-Agent': UA } }, { budget, timeoutMs: HEAD_TIMEOUT_MS });
      if (head.status === 404 || head.status === 410) {
        await write(r.id, { removed_upstream: true, liveness_checked_at: nowIso() });
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
        restored++;
      } else {
        transient++;
        continue; // don't stamp checked — retry next run
      }
      checked++;
    } catch (e) {
      if (isPoliteStop(e)) { stoppedBy = (e as Error).message; notReached = rows.length - i; break; }
      transient++;
    }
    await sleep(DELAY_MS);
  }

  if (dbErrors > 0) {
    return NextResponse.json({ ok: false, error: `press_releases update failed ${dbErrors} times: ${lastDbError}`, count: checked }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    // The budget or a rate limit stopped the run before the end of its batch; those releases come first next run.
    partial: stoppedBy !== null,
    stopped_by: stoppedBy,
    not_reached: notReached,
    // Pages checked (live or removed); the heartbeat records this as the run's row count.
    count: checked,
    batch: rows.length,
    checked,
    stillLive: restored,
    newlyRemoved: removed,
    bodiesFilled: filled,
    transient,
    syncedAt: nowIso(),
  });
}

export const GET = withHeartbeat('/api/check-press-release-liveness', GET_impl);
