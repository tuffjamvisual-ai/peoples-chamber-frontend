import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEPT_SLUGS, findPublications, fetchAttachments, meetingsCsvs, parseMeetingsCsv, type Fetched, type MeetingRow } from '@/lib/ministers-meetings-source';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly sync of ministers' meetings from GOV.UK transparency returns into ministers_meetings. The reading rules
// (departments, text encoding, dates, source of each row) are in lib/ministers-meetings-source.ts, shared with the
// full reload (scripts/reload-ministers-meetings.ts). Owner's approval, 20 Oct 2026 (lobbying phase 1).
//
// Slug correctness (verified against gov.uk/api/organisations): DWP is 'department-for-work-pensions' (no 'and');
// MHCLG is 'ministry-of-housing-communities-local-government' (no 'and'); the Scotland and Wales Offices are
// 'scotland-office' and 'wales-office' (their 'office-of-the-secretary-of-state-for-...' slugs closed in July 2024).
//
// Safety: nothing is deleted until every publication has been read, and the table is not replaced when the new rows
// are fewer than 80% of those saved (a GOV.UK search that returned too little).
//
// 27 Oct 2026 (job 79): it ran to 205 s of 300 s, its requests had no timeout, and it deleted the whole table before
// inserting the new rows, so a run stopped or failed part way left the table part empty while reporting success. Now:
//  - every request has a timeout cut to the time left (lib/sync-budget.ts); collecting stops starting requests at 70
//    per cent of maxDuration, and a 429 stops the run cleanly; a run that stops while collecting changes nothing;
//  - the table is written only if there is clearly time to finish (WRITE_MS_PER_BATCH a batch, plus a margin);
//  - the new rows are inserted first, marked with this run's start time in updated_at, then the older rows are
//    deleted; if any insert fails, the rows this run inserted are deleted again and the old ones kept, and the run
//    fails (500). For the seconds between the last insert and the delete, both sets are in the table.
// The whole set is read each week, so a partial run (partial: true) leaves the table as it was and the next run reads
// everything again.
const WRITE_BATCH = 500;
const WRITE_MS_PER_BATCH = 1_500;

const DELAY_MS = 250;
const UA = 'opengovt.uk-ministers-meetings/1.0 (https://opengovt.uk; weekly sync)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function govFetcher(budget: SyncBudget) {
  return async (url: string): Promise<Fetched> => {
    if (budget.stopStarting()) throw new Error('collect stopped: time budget');
    const r = await politeFetch(url, { headers: { 'User-Agent': UA } }, { budget, timeoutMs: 30_000 });
    await sleep(DELAY_MS);
    return { ok: r.ok, status: r.status, bytes: new Uint8Array(await r.arrayBuffer()) };
  };
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);
  const today = new Date().toISOString().slice(0, 10);
  const budget = new SyncBudget(maxDuration);
  const runMark = new Date(budget.started).toISOString();
  const govFetch = govFetcher(budget);
  let stoppedBy: string | null = null;

  try {
    const allRows: (MeetingRow & { govuk_org_slug: string })[] = [];
    const perDept: Record<string, number> = {};
    const seenCsv = new Set<string>();
    for (const dept of DEPT_SLUGS) {
      if (budget.stopStarting()) { stoppedBy = 'time budget'; break; }
      const { kept } = await findPublications(govFetch, dept);
      let deptCount = 0;
      for (const pub of kept) {
        let atts;
        try { atts = await fetchAttachments(govFetch, pub.link); } catch (e) { if (isPoliteStop(e) || budget.stopStarting()) throw e; continue; }
        for (const att of meetingsCsvs(atts)) {
          if (seenCsv.has(att.url)) continue; // a publication listed under two organisations
          seenCsv.add(att.url);
          const res = await govFetch(att.url);
          if (!res.ok) continue;
          const { rows } = parseMeetingsCsv(res.bytes, att, pub, today);
          for (const r of rows) allRows.push({ ...r, govuk_org_slug: dept });
          deptCount += rows.length;
        }
      }
      perDept[dept] = deptCount;
    }

    if (stoppedBy) {
      return NextResponse.json({ ok: true, partial: true, stopped_by: stoppedBy, parsed: allRows.length, inserted: 0, note: 'stopped while collecting; table untouched', perDept });
    }
    if (allRows.length === 0) {
      return NextResponse.json({ ok: true, parsed: 0, inserted: 0, note: 'no rows collected, table untouched', perDept });
    }
    const { count: saved } = await supabase.from('ministers_meetings').select('id', { count: 'exact', head: true });
    if (saved && allRows.length < saved * 0.8) {
      return NextResponse.json({ ok: false, parsed: allRows.length, saved, note: 'fewer than 80% of the saved rows; table untouched', perDept }, { status: 500 });
    }

    // Write only if there is clearly time to finish.
    const writeMs = Math.ceil(allRows.length / WRITE_BATCH) * WRITE_MS_PER_BATCH + 10_000;
    if (budget.msLeft() < writeMs) {
      return NextResponse.json({ ok: true, partial: true, stopped_by: 'not enough time left to write', parsed: allRows.length, inserted: 0, note: 'table untouched', perDept });
    }

    // Re-runs replace the table (there's no natural unique key on a published meeting): new rows first, then the old.
    let inserted = 0;
    let insertError: string | null = null;
    for (let i = 0; i < allRows.length; i += WRITE_BATCH) {
      const batch = allRows.slice(i, i + WRITE_BATCH).map((r) => ({ ...r, updated_at: runMark }));
      const { error } = await supabase.from('ministers_meetings').insert(batch);
      if (error) { insertError = error.message; break; }
      inserted += batch.length;
      await sleep(100);
    }
    if (insertError) {
      const { error: undoErr } = await supabase.from('ministers_meetings').delete().eq('updated_at', runMark);
      return NextResponse.json({ ok: false, error: `insert failed after ${inserted} rows: ${insertError}`, undone: !undoErr, ...(undoErr ? { undo_error: undoErr.message } : {}), perDept }, { status: 500 });
    }
    const { error: delErr } = await supabase.from('ministers_meetings').delete().or(`updated_at.is.null,updated_at.lt."${runMark}"`);
    if (delErr) return NextResponse.json({ ok: false, error: `old rows not deleted: ${delErr.message}`, inserted, perDept }, { status: 500 });

    return NextResponse.json({ ok: true, partial: false, parsed: allRows.length, inserted, perDept, syncedAt: new Date().toISOString() });
  } catch (err) {
    if (isPoliteStop(err) || (err as Error).message === 'collect stopped: time budget') {
      return NextResponse.json({ ok: true, partial: true, stopped_by: (err as Error).message, inserted: 0, note: 'stopped while collecting; table untouched' });
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-ministers-meetings', GET_impl);
