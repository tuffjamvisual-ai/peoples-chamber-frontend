import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { noticeRows, uniqueNoticeRows, type NoticeRow } from '@/lib/contract-notices';

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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function kebab(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}
function isoMinusDays(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().replace(/\.\d{3}Z$/, '');
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

async function fetchPage(url: string): Promise<{ data?: any; error?: string }> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { data: await res.json() };
  } catch (e) {
    return { error: `fetch threw: ${(e as Error).message}` };
  }
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url0 = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url0 || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url0, key);

  const u = new URL(req.url);
  const windowDays = Math.max(1, Number(u.searchParams.get('days')) || WINDOW_DAYS);
  const maxPages = Math.max(1, Number(u.searchParams.get('maxPages')) || MAX_PAGES);
  const deadline = Date.now() + BUDGET_MS;

  const now = new Date().toISOString();
  let url = `${API}?${new URLSearchParams({ updatedFrom: isoMinusDays(windowDays), limit: String(LIMIT) })}`;
  let scanned = 0, upserted = 0, skippedBad = 0, noticesWritten = 0, noticesFailed = 0, pagesError: string | null = null;

  async function upsertRow(row: ContractRow): Promise<boolean> {
    const { error } = await supabase.from('government_contracts').upsert(row, { onConflict: 'ocid,award_id,contract_id' });
    if (error) { console.error(`[contracts] row upsert failed (${row.ocid}/${row.award_id}/${row.contract_id}): ${error.message}`); return false; }
    return true;
  }

  for (let page = 0; page < maxPages; page++) {
    if (Date.now() > deadline) {
      pagesError = `time budget ${BUDGET_MS}ms reached at page ${page}; returning cleanly with partial progress`;
      console.error(`[contracts] ${pagesError}`);
      break;
    }
    const { data, error } = await fetchPage(url);
    if (error) { pagesError = `page ${page}: ${error}`; console.error(`[contracts] ${pagesError}; stopping, keeping prior progress`); break; }
    const releases = Array.isArray(data.releases) ? data.releases : [];
    if (releases.length === 0) break;
    scanned += releases.length;

    const rows = releases.flatMap((r: any) => rowsFromRelease(r, now));
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

    const next = data?.links?.next;
    if (!next) break;
    url = next;
    await sleep(DELAY_MS);
  }

  // The contractor totals page reads a stored copy of contractor_donor_matches (migration 2026-10-21l); bring it up
  // to date with what was just written.
  const { error: refreshErr } = await supabase.rpc('refresh_contractor_donor_matches');
  if (refreshErr) console.error(`[contracts] refresh_contractor_donor_matches failed: ${refreshErr.message}`);

  return NextResponse.json({ ok: noticesFailed === 0 && !refreshErr, matches_refreshed: !refreshErr, scanned, rows_written: upserted, skippedBad, notices_written: noticesWritten, notices_failed: noticesFailed, pagesError, windowDays, maxPages, syncedAt: now },
    // A failed contract_notices write or refresh shows as a failed run in sync_heartbeat (the contracts are saved).
    { status: noticesFailed || refreshErr ? 500 : 200 });
}

export const GET = withHeartbeat('/api/sync-government-contracts', GET_impl);
