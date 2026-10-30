import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { refreshMps, sameValue } from '@/lib/mp-refresh';
import { noteChanged } from '@/lib/refresh-count';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Populates mp_committee_memberships from the Members API Biography endpoint.
//
// Source: members-api.parliament.uk/api/Members/{id}/Biography → committeeMemberships[]
//
// Why not read from mp_biography.committee_memberships (JSONB)?
// sync-member-biography uses committee_id as its reconcile key, storing at most
// ONE entry per (member_id, committee_id). An MP with three separate stints on a
// committee (e.g. Jim Shannon on Northern Ireland Affairs: 2016, 2017, 2023) has
// all three collapsed to one row in the JSONB. This route fetches the Biography
// directly to preserve the full history under the (member_id, committee_id,
// start_date) natural key.
//
// Progress tracking: every member processed — whether or not their Biography
// carries any committee memberships — is recorded in committee_sync_state.
// This avoids the starvation problem where MPs on no committees produce no rows
// in mp_committee_memberships and therefore sort first in the queue forever.
// committee_sync_state has RLS enabled with no public-read policy; the service-
// role client (supabaseAdmin) bypasses RLS. The anon client would be blocked.
//
// dryRun=true fetches Biography and reports what WOULD be written, without
// writing to either table.

const MEMBERS_API = 'https://members-api.parliament.uk/api/Members';
const UA = 'PeoplesChamber-CommitteeSync/1.0';
const BATCH = 100;
// 27 Oct 2026 (job 79): it ran to 262 s of 300 s, its budget was 260 s and its requests had no timeout. Now
// (lib/sync-budget.ts) no member starts after 70 per cent of maxDuration, each request's timeout is cut to the time
// left so the run ends by 80 per cent, and a 429 stops it cleanly (members not reached keep their old synced_at, so they
// come first next run).
// 28 Oct 2026 (owner): a member whose Biography fails FLAG_AFTER_RUNS runs in a row (lib/sync-item-failures.ts) is
// marked as checked (the back of the queue); the run carries on, does not fail because of them, returns 200 with
// partial: true, and the freshness email names the member and the error.
const CALL_DELAY_MS = 300;

interface CmteEntry {
  id?: number;
  name?: string;
  startDate?: string | null;
  endDate?: string | null;
  additionalInfo?: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchBiographyCommittees(
  memberId: number,
  budget: SyncBudget,
): Promise<{ entries: CmteEntry[]; status: number }> {
  try {
    const res = await politeFetch(`${MEMBERS_API}/${memberId}/Biography`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    }, { budget });
    if (!res.ok) return { entries: [], status: res.status };
    const v = (await res.json())?.value ?? {};
    const entries = (v.committeeMemberships as CmteEntry[]) || [];
    return { entries, status: 200 };
  } catch (e) {
    if (isPoliteStop(e)) throw e;
    return { entries: [], status: 0 };
  }
}

type DryMember = {
  member_id: number;
  total_entries: number;
  current_memberships: number;
  entries: {
    committee_id: number;
    committee_name: string;
    role: string | null;
    start_date: string;
    end_date: string | null;
  }[];
};

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const dryRun = sp.get('dryRun') === 'true';
  const startedAt = Date.now();
  const budget = new SyncBudget(maxDuration, { started: startedAt });

  // Select the BATCH current MPs with the oldest last-sync (NULLs first).
  // next_committee_sync_batch() LEFT JOINs mps against committee_sync_state so
  // that members never checked appear first, and members on no committees are
  // marked as checked after their Biography is fetched (preventing starvation).
  const { data: candidates, error: batchErr } = await supabaseAdmin.rpc(
    'next_committee_sync_batch',
    { batch_size: BATCH },
  );
  if (batchErr) {
    return NextResponse.json(
      { ok: false, error: `batch selection failed: ${batchErr.message}` },
      { status: 500 },
    );
  }
  const batchIds: number[] = ((candidates as { member_id: number }[]) || []).map(
    (r) => r.member_id,
  );
  const failing = await ItemFailures.load(supabaseAdmin, '/api/sync-committee-memberships');
  // Flagged members go after the others.
  const memberIds = [...batchIds.filter((id) => !failing.isFlagged(id)), ...batchIds.filter((id) => failing.isFlagged(id))];
  // Members whose Biography failed FLAG_AFTER_RUNS runs in a row: reported, not counted against the run.
  const flaggedFailures: { member_id: number; status: number; message: string }[] = [];

  let processed = 0;
  let upserted = 0;
  let partial = false;
  let stoppedBy: string | null = null;
  // errors: database writes that failed (the run fails, 500). apiFailures: members whose Biography could not be read
  // (a timeout or an error answer from the Members API); they are not marked as checked, so they come first next run,
  // and on their own they do not fail the run (27 Oct 2026: a few slow answers turned the 13:03 run into a 500).
  const errors: { member_id: number; status?: number; message: string }[] = [];
  const apiFailures: { member_id: number; status: number; message: string }[] = [];
  const dryRunWould: DryMember[] = [];
  // MP pages keep for a week (owner, 30 Oct 2026, cache Stage 2a part 3): a member whose memberships are new or changed
  // against the stored rows has their page refreshed.
  const changedMps = new Set<number>();

  for (const memberId of memberIds) {
    if (budget.stopStarting()) {
      partial = true;
      stoppedBy = 'time budget';
      break;
    }

    if (processed > 0) await sleep(CALL_DELAY_MS);

    let result: { entries: CmteEntry[]; status: number };
    try {
      result = await fetchBiographyCommittees(memberId, budget);
    } catch (e) {
      partial = true;
      stoppedBy = (e as Error).message;
      break;
    }
    processed++;

    if (result.status !== 200) {
      const failure = {
        member_id: memberId,
        status: result.status,
        message: result.status ? `Biography API ${result.status}` : 'no answer (timeout or network error)',
      };
      if (!dryRun && failing.failed(memberId, `member ${memberId}`, failure.message)) {
        // Failed FLAG_AFTER_RUNS runs in a row: marked as checked, so it goes to the back of the queue.
        const { error: stateErr } = await supabaseAdmin
          .from('committee_sync_state')
          .upsert({ member_id: memberId, synced_at: new Date().toISOString() }, { onConflict: 'member_id' });
        if (!stateErr) { flaggedFailures.push(failure); continue; }
      }
      apiFailures.push(failure);
      // Do not mark as synced on API failure — leave them at the head of the
      // queue so they are retried on the next run rather than skipped for a week.
      continue;
    }
    if (!dryRun) failing.succeeded(memberId);

    const now = new Date().toISOString();

    // Build the rows to upsert. Skip entries missing an id or startDate.
    const rows: {
      member_id: number;
      committee_id: number;
      committee_name: string;
      role: string | null;
      start_date: string;
      end_date: string | null;
      synced_at: string;
    }[] = [];

    for (const e of result.entries) {
      if (!e.id || !e.startDate) continue;
      rows.push({
        member_id: memberId,
        committee_id: e.id,
        committee_name: e.name || '',
        role: e.additionalInfo || null,
        start_date: e.startDate.slice(0, 10),
        end_date: e.endDate ? e.endDate.slice(0, 10) : null,
        synced_at: now,
      });
    }

    if (rows.length) {
      const { data: old } = await supabaseAdmin.from('mp_committee_memberships').select('committee_id, committee_name, role, start_date, end_date').eq('member_id', memberId);
      const oldBy = new Map(((old ?? []) as Record<string, unknown>[]).map((r) => [`${r.committee_id}|${String(r.start_date).slice(0, 10)}`, r]));
      const changed = rows.some((r) => {
        const o = oldBy.get(`${r.committee_id}|${r.start_date}`);
        return !o || !sameValue({ n: o.committee_name, r: o.role, e: o.end_date ? String(o.end_date).slice(0, 10) : null }, { n: r.committee_name, r: r.role, e: r.end_date });
      });
      if (changed) changedMps.add(memberId);
    }

    if (dryRun) {
      dryRunWould.push({
        member_id: memberId,
        total_entries: rows.length,
        current_memberships: rows.filter((r) => r.end_date === null).length,
        entries: rows.map((r) => ({
          committee_id: r.committee_id,
          committee_name: r.committee_name,
          role: r.role,
          start_date: r.start_date,
          end_date: r.end_date,
        })),
      });
      // In dry-run mode, skip all writes including committee_sync_state.
      continue;
    }

    // Write membership rows (may be empty for MPs on no committees).
    if (rows.length > 0) {
      const { error: upErr } = await supabaseAdmin
        .from('mp_committee_memberships')
        .upsert(rows, { onConflict: 'member_id,committee_id,start_date' });
      if (upErr) {
        errors.push({ member_id: memberId, message: upErr.message });
        // Still record as synced below — the member was checked, the data
        // just didn't write. Next run will retry the upsert.
      } else {
        upserted += rows.length;
      }
    }

    // Always record that this member was checked, even if they have no
    // committee memberships. This is what prevents queue starvation.
    const { error: stateErr } = await supabaseAdmin
      .from('committee_sync_state')
      .upsert({ member_id: memberId, synced_at: now }, { onConflict: 'member_id' });
    if (stateErr) {
      errors.push({ member_id: memberId, message: `sync_state write: ${stateErr.message}` });
    }
  }

  const elapsed_ms = Date.now() - startedAt;
  noteChanged(dryRun ? 0 : changedMps.size);
  const mpRefresh = !dryRun && changedMps.size ? refreshMps(changedMps) : null;
  const failuresSaved = dryRun ? null : await failing.save();
  if (apiFailures.length) console.warn(`[sync-committee-memberships] Members API failed for ${apiFailures.length} of ${processed} members: ${apiFailures.map((f) => `${f.member_id} (${f.message})`).join(', ')}`);
  if (errors.length) console.error(`[sync-committee-memberships] ${errors.length} database write errors: ${errors.map((e) => `${e.member_id}: ${e.message}`).join('; ')}`);
  // Every member tried failed at the source: the Members API is down or refusing, which is a failed run (502).
  const sourceDown = processed > flaggedFailures.length && apiFailures.length === processed - flaggedFailures.length;
  if (apiFailures.length || flaggedFailures.length) partial = true;

  const base = {
    ok: errors.length === 0 && !sourceDown,
    dryRun,
    members_in_batch: memberIds.length,
    processed,
    partial,
    stopped_by: stoppedBy,
    elapsed_ms,
    syncedAt: new Date().toISOString(),
    ...(errors.length ? { errors } : {}),
    ...(apiFailures.length ? { api_failures: apiFailures } : {}),
    flagged_failed: flaggedFailures.length,
    ...(flaggedFailures.length ? { flagged_failures: flaggedFailures } : {}),
    flagged_after_runs: FLAG_AFTER_RUNS,
    failing_items: failing.summary(),
    failures_saved: failuresSaved,
    mps_changed: changedMps.size,
    mp_refresh: mpRefresh,
  };

  if (dryRun) {
    return NextResponse.json({
      ...base,
      would: {
        mp_pages_refreshed: changedMps.size,
        total_rows: dryRunWould.reduce((s, m) => s + m.total_entries, 0),
        current_memberships: dryRunWould.reduce((s, m) => s + m.current_memberships, 0),
        members: dryRunWould,
      },
    });
  }

  return NextResponse.json({ ...base, upserted }, { status: errors.length ? 500 : sourceDown ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-committee-memberships', GET_impl);
