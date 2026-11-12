import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { noticeRows, uniqueNoticeRows, lotRows, newerLotRows, type NoticeRow } from '@/lib/contract-notices';
import { walkFeed, readState, type WalkState, type PageResult } from './feed-walk';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily sync of UK public contracts from the Find a Tender OCDS API into
// government_contracts. Ported from scripts/sync-government-contracts.js, with
// the dedup fixed at the root: every row carries its OCDS identifiers
// (ocid, award_id, contract_id) and is UPSERTed on that unique key, so
// re-running the rolling window updates rows instead of duplicating them.
//
// Resilience: a release with no ocid is logged and skipped; a batch upsert that
// fails falls back to per-row upserts so one malformed record is logged and
// skipped rather than killing the whole run (which would leave a partial update
// AND miss the heartbeat write). Pagination stops cleanly on a fetch error,
// keeping prior progress.
//
// 22 Oct 2026 (owner's approval), after the freshness alerts:
//  - Rows are deduplicated by (ocid, award_id, contract_id) before they are written, keeping the newest release's
//    row. A page can hold two releases of one contract, and one upsert cannot write the same row twice ("ON
//    CONFLICT DO UPDATE command cannot affect row a second time"), which sent whole batches row by row.
//  - A 429 is honoured: a Retry-After of up to RETRY_AFTER_MAX_S seconds is waited out (twice at most), otherwise
//    the run stops and saves the next page's address in sync_cursor; a later run carries on from there, after first
//    reading the newest releases (T1-CS, 12 Nov 2026: app/api/sync-government-contracts/feed-walk.ts).
//  - refresh_contractor_donor_matches is no longer called here (it hit the 8 s API limit and failed a run that had
//    saved its contracts); /api/refresh-contractor-matches runs it 30 minutes later with its own heartbeat.
//  - The run reports success (200) when it saved contracts. A failed contract_notices write is reported in the
//    response and logged; it no longer fails a run whose contracts are saved.
//
// Every release is also written to contract_notices (migration 2026-10-21k): one row per notice, contract and value
// type, for contract histories (/contracts/[ocid]). A published release never changes, so re-running the window
// rewrites identical rows.

const API = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages';
const LIMIT = 100;
// The 30-day window outgrew the function: by Aug 2026 it spanned 45+ pages and could
// not be processed within the 300s platform limit, so the run was killed mid-page and
// never reached the heartbeat write — indistinguishable from "the cron never fired".
// Fixes: (1) a 10-day default window (a daily cron catches every award within 10 days
// across runs, and it fits comfortably in budget); (2) a wall-clock BUDGET_MS guard so
// a busy day returns cleanly with partial data AND a heartbeat, instead of a silent
// timeout; (3) ?days= / ?maxPages= overrides for manual deeper sweeps.
const MAX_PAGES = 40;        // headroom; BUDGET_MS is the real cap
const WINDOW_DAYS = 10;
const DELAY_MS = 300;
const BUDGET_MS = 240_000;   // return before the ~300s ceiling so the heartbeat always writes
const RETRY_AFTER_MAX_S = 150; // Find a Tender asked for 120 s on 22 Oct 2026; a wait that would pass BUDGET_MS is not taken
const CURSOR_ROUTE = '/api/sync-government-contracts';
const CURSOR_MAX_AGE_MS = 3 * 86_400_000; // an older saved position is dropped and the normal window read instead
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function kebab(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buyerOf(release: any): string | null {
  if (release?.buyer?.name) return release.buyer.name;
  const parties = Array.isArray(release?.parties) ? release.parties : [];
  const b = parties.find((p: any) => Array.isArray(p.roles) && p.roles.includes('buyer'));
  return b?.name || null;
}

type ContractRow = {
  dept_slug: string; title: string | null; supplier: string | null;
  value: number | null; awarded_date: string | null; status: string | null;
  description: string | null; ocid: string; award_id: string; contract_id: string;
  updated_at: string;
};

// One row per contract (or award, when no contracts[] present). OCDS ids are
// always populated — synthesised from the loop index when the feed omits one —
// so the unique (ocid, award_id, contract_id) key never collides on NULLs.
function rowsFromRelease(r: any, now: string): ContractRow[] {
  const ocid = r?.ocid ? String(r.ocid) : null;
  if (!ocid) { console.error('[contracts] release with no ocid, skipped'); return []; }
  const buyer = buyerOf(r);
  const tender = r.tender || {};
  const awards = Array.isArray(r.awards) ? r.awards : [];
  const contracts = Array.isArray(r.contracts) ? r.contracts : [];
  const releaseDate = r.date ? String(r.date).slice(0, 10) : null;
  const out: ContractRow[] = [];

  if (contracts.length > 0) {
    contracts.forEach((c: any, i: number) => {
      const award = awards.find((a: any) => a.id != null && String(a.id) === String(c.awardID));
      const supplier = award?.suppliers?.[0]?.name || null;
      const amount = (c.value && typeof c.value.amount === 'number') ? c.value.amount
        : (tender.value && typeof tender.value.amount === 'number' ? tender.value.amount : null);
      out.push({
        dept_slug: kebab(buyer), title: tender.title || null, supplier, value: amount,
        awarded_date: c.dateSigned ? String(c.dateSigned).slice(0, 10) : releaseDate,
        status: c.status || award?.status || tender.status || null,
        description: tender.description || null,
        ocid,
        award_id: String(c.awardID ?? award?.id ?? `a${i}`),
        contract_id: String(c.id ?? `c${i}`),
        updated_at: now,
      });
    });
  } else if (awards.length > 0) {
    awards.forEach((aw: any, i: number) => {
      const supplier = aw?.suppliers?.[0]?.name || null;
      const amount = (aw.value && typeof aw.value.amount === 'number') ? aw.value.amount
        : (tender.value && typeof tender.value.amount === 'number' ? tender.value.amount : null);
      out.push({
        dept_slug: kebab(buyer), title: tender.title || aw.title || null, supplier, value: amount,
        awarded_date: aw.date ? String(aw.date).slice(0, 10) : releaseDate,
        status: aw.status || tender.status || null,
        description: tender.description || aw.description || null,
        ocid,
        award_id: String(aw.id ?? `a${i}`),
        contract_id: `award:${aw.id ?? i}`,
        updated_at: now,
      });
    });
  }
  return out;
}

// A page's timeout is cut to the time left in the run (job 79, 27 Oct 2026: it had none).
async function fetchPage(url: string, deadline: number): Promise<{ data?: any; error?: string; status?: number; retryAfterS?: number | null }> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(Math.max(1_000, Math.min(30_000, deadline - Date.now()))) });
    if (!res.ok) {
      // Retry-After is seconds or an HTTP date.
      const ra = res.headers.get('retry-after');
      let retryAfterS: number | null = null;
      if (ra) retryAfterS = /^\d+$/.test(ra.trim()) ? Number(ra) : Math.max(0, Math.ceil((Date.parse(ra) - Date.now()) / 1000)) || null;
      return { error: `HTTP ${res.status}`, status: res.status, retryAfterS };
    }
    return { data: await res.json() };
  } catch (e) {
    return { error: `fetch threw: ${(e as Error).message}` };
  }
}

// One row per (ocid, award_id, contract_id), from the newest release that has it.
function dedupeRows(releases: any[], now: string): ContractRow[] {
  const byKey = new Map<string, { row: ContractRow; date: string }>();
  for (const r of releases) {
    const date = String(r?.date || '');
    for (const row of rowsFromRelease(r, now)) {
      const key = `${row.ocid}\u0000${row.award_id}\u0000${row.contract_id}`;
      const cur = byKey.get(key);
      if (!cur || date >= cur.date) byKey.set(key, { row, date });
    }
  }
  return [...byKey.values()].map((v) => v.row);
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url0 = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url0 || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url0, key);

  const u = new URL(req.url);
  const windowDays = Math.max(1, Number(u.searchParams.get('days')) || WINDOW_DAYS);
  const maxPages = Math.max(1, Number(u.searchParams.get('maxPages')) || MAX_PAGES);
  const deadline = Date.now() + BUDGET_MS;

  const now = new Date().toISOString();
  // Newest first down to what was already read, then older pages from saved positions (app/api/sync-government-contracts/feed-walk.ts,
  // T1-CS). A hand run with ?days= reads that window only and leaves the saved state alone.
  const manual = !!u.searchParams.get('days');
  let start: WalkState = { newestRead: null, pending: [] };
  if (!manual) {
    const { data: cur } = await supabase.from('sync_cursor').select('cursor, updated_at').eq('route', CURSOR_ROUTE).maybeSingle();
    start = readState(cur?.cursor, (cur?.updated_at as string | undefined) ?? null);
  }
  let upserted = 0, skippedBad = 0, noticesWritten = 0, noticesFailed = 0, scanned = 0;
  let rateLimitWaits = 0, duplicatesDropped = 0, lotsWritten = 0, lotsFailed = 0;

  async function upsertRow(row: ContractRow): Promise<boolean> {
    const { error } = await supabase.from('government_contracts').upsert(row, { onConflict: 'ocid,award_id,contract_id' });
    if (error) { console.error(`[contracts] row upsert failed (${row.ocid}/${row.award_id}/${row.contract_id}): ${error.message}`); return false; }
    return true;
  }

  // 429: wait out a short Retry-After (twice at most in a run, within the budget), otherwise the page fails and the
  // walk keeps its address to resume from.
  async function fetchWithRetryAfter(url: string): Promise<PageResult> {
    let r = await fetchPage(url, deadline);
    while (r.status === 429 && rateLimitWaits < 2) {
      const waitS = r.retryAfterS ?? 10;
      if (waitS > RETRY_AFTER_MAX_S || Date.now() + waitS * 1000 > deadline) break;
      rateLimitWaits++;
      console.error(`[contracts] HTTP 429, waiting ${waitS}s as Retry-After asks`);
      await sleep(waitS * 1000);
      r = await fetchPage(url, deadline);
    }
    return r.error && r.status === 429 ? { ...r, error: `${r.error} (Retry-After ${r.retryAfterS ?? 'not given'}s)` } : r;
  }

  async function handlePage(releases: any[]) {
    scanned += releases.length;
    const allRows = releases.reduce((n: number, r: any) => n + rowsFromRelease(r, now).length, 0);
    const rows = dedupeRows(releases, now);
    duplicatesDropped += allRows - rows.length;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error: bErr } = await supabase.from('government_contracts').upsert(batch, { onConflict: 'ocid,award_id,contract_id' });
      if (bErr) {
        // Isolate the malformed record: retry the batch row-by-row so one bad
        // OCID is logged and skipped instead of dropping the whole batch.
        console.error(`[contracts] batch upsert failed (${bErr.message}); retrying row-by-row`);
        for (const row of batch) { (await upsertRow(row)) ? upserted++ : skippedBad++; }
      } else {
        upserted += batch.length;
      }
    }
    const notices: NoticeRow[] = uniqueNoticeRows(releases.flatMap((r: any) => noticeRows(r)));
    for (let i = 0; i < notices.length; i += 200) {
      const batch = notices.slice(i, i + 200);
      const { error: nErr } = await supabase.from('contract_notices').upsert(batch, { onConflict: 'ocid,release_id,contract_key,value_type' });
      if (nErr) { noticesFailed += batch.length; console.error(`[contracts] contract_notices batch failed: ${nErr.message}`); }
      else noticesWritten += batch.length;
    }
    // The procurement's lots as published (T1-LOT, migration 2026-11-12a); a lot already stored from a newer release is kept.
    const lots = releases.flatMap((r: any) => lotRows(r));
    if (lots.length) {
      const ocids = [...new Set(lots.map((l) => l.ocid))];
      const { data: stored, error: sErr } = await supabase.from('contract_lots').select('ocid, lot_id, released_at, title, description, value, currency, status, release_id').in('ocid', ocids);
      if (sErr) { lotsFailed += lots.length; console.error(`[contracts] contract_lots read failed: ${sErr.message}`); }
      else {
        const write = newerLotRows(lots, (stored ?? []) as Parameters<typeof newerLotRows>[1]);
        for (let i = 0; i < write.length; i += 200) {
          const batch = write.slice(i, i + 200);
          const { error: lErr } = await supabase.from('contract_lots').upsert(batch, { onConflict: 'ocid,lot_id' });
          if (lErr) { lotsFailed += batch.length; console.error(`[contracts] contract_lots batch failed: ${lErr.message}`); }
          else lotsWritten += batch.length;
        }
      }
    }
  }

  const walk = await walkFeed(start, {
    api: API, limit: LIMIT, windowDays, maxPages, pendingMaxAgeMs: CURSOR_MAX_AGE_MS,
    now: () => Date.now(), outOfTime: () => Date.now() > deadline,
    fetchPage: fetchWithRetryAfter, handlePage, pause: () => sleep(DELAY_MS),
    log: (m) => console.error(`[contracts] ${m}`),
  });
  const pagesError = walk.error;

  let cursorSaved: boolean | null = null;
  if (!manual) {
    const { error: cErr } = await supabase.from('sync_cursor').upsert({ route: CURSOR_ROUTE, cursor: walk.state, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    cursorSaved = !cErr;
    if (cErr) console.error(`[contracts] could not save the walk state: ${cErr.message}`);
  }
  if (noticesFailed) console.error(`[contracts] ${noticesFailed} contract_notices rows not written (contracts saved)`);
  if (lotsFailed) console.error(`[contracts] ${lotsFailed} contract_lots rows not written (contracts saved)`);

  // Success when contracts were saved, or when there was nothing new and nothing failed. The contractor totals are
  // refreshed by /api/refresh-contractor-matches.
  // A run stopped by Find a Tender's rate limit (or the time budget) has saved its position: a clean partial run (job 79).
  // A walk stopped by the time budget, a 429 or a failed page is partial (the monitor counts partial runs); it is a
  // clean 200 when contracts were saved or nothing was written badly.
  const politeStop = !!pagesError && /HTTP 429|time budget|page limit/.test(pagesError);
  const status = upserted > 0 || (skippedBad === 0 && (!pagesError || politeStop)) ? 200 : 502;
  return NextResponse.json({ ok: status === 200 && noticesFailed === 0 && lotsFailed === 0 && !walk.partial, partial: walk.partial, scanned, rows_written: upserted, skippedBad, duplicates_dropped: duplicatesDropped,
    notices_written: noticesWritten, notices_failed: noticesFailed, lots_written: lotsWritten, lots_failed: lotsFailed, pagesError, rate_limit_waits: rateLimitWaits,
    pages: walk.pages, caught_up_to_newest: walk.caughtUp, newest_read: walk.state.newestRead, saved_positions: walk.state.pending.length,
    resumed_positions: walk.resumedGaps, dropped_positions: walk.droppedGaps, cursor_saved: cursorSaved,
    windowDays, maxPages, syncedAt: now }, { status });
}

export const GET = withHeartbeat('/api/sync-government-contracts', GET_impl);
