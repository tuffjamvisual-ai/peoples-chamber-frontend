import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
const TIME_BUDGET_MS = 260_000;
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
): Promise<{ entries: CmteEntry[]; status: number }> {
  try {
    const res = await fetch(`${MEMBERS_API}/${memberId}/Biography`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (!res.ok) return { entries: [], status: res.status };
    const v = (await res.json())?.value ?? {};
    const entries = (v.committeeMemberships as CmteEntry[]) || [];
    return { entries, status: 200 };
  } catch {
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
  const memberIds: number[] = ((candidates as { member_id: number }[]) || []).map(
    (r) => r.member_id,
  );

  let processed = 0;
  let upserted = 0;
  let partial = false;
  const errors: { member_id: number; status?: number; message: string }[] = [];
  const dryRunWould: DryMember[] = [];

  for (const memberId of memberIds) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      partial = true;
      break;
    }

    if (processed > 0) await sleep(CALL_DELAY_MS);

    const result = await fetchBiographyCommittees(memberId);
    processed++;

    if (result.status !== 200) {
      errors.push({
        member_id: memberId,
        status: result.status,
        message: result.status ? `Biography API ${result.status}` : 'fetch error',
      });
      // Do not mark as synced on API failure — leave them at the head of the
      // queue so they are retried on the next run rather than skipped for a week.
      continue;
    }

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

  const base = {
    ok: errors.length === 0,
    dryRun,
    members_in_batch: memberIds.length,
    processed,
    partial,
    elapsed_ms,
    syncedAt: new Date().toISOString(),
    ...(errors.length ? { errors } : {}),
  };

  if (dryRun) {
    return NextResponse.json({
      ...base,
      would: {
        total_rows: dryRunWould.reduce((s, m) => s + m.total_entries, 0),
        current_memberships: dryRunWould.reduce((s, m) => s + m.current_memberships, 0),
        members: dryRunWould,
      },
    });
  }

  return NextResponse.json({ ...base, upserted }, { status: errors.length ? 500 : 200 });
}

export const GET = withHeartbeat('/api/sync-committee-memberships', GET_impl);
