import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { COMMITTEE_IDS } from '@/lib/committees';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const COMMITTEES_API = 'https://committees-api.parliament.uk/api/Committees';
const UA = 'PeoplesChamber-CommitteeMetaSync/1.0';
const CALL_DELAY_MS = 200;

// COMMITTEE_IDS imported from lib/committees.ts — shared with the profile
// page (generateStaticParams) and app/sitemap.ts. Edit there, not here.
//
// 27 Oct 2026 (job 79): it ran to 57 s of its 60 s, with no timeout on its requests. Now (lib/sync-budget.ts) the
// committees go stalest first (committees.synced_at, never synced first), every request has a timeout cut to the time
// left, no committee starts after 70 per cent of maxDuration, the run ends by 80 per cent, and a 429 stops it cleanly.
// Committees not reached keep their old synced_at, so they come first next run; the response says partial: true.

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const budget = new SyncBudget(maxDuration);
  let upserted = 0;
  const errors: { id: number; message: string }[] = [];
  let stoppedBy: string | null = null;
  let notReached = 0;

  // Stalest first: committees never synced, then the oldest synced_at.
  const { data: seen, error: seenErr } = await supabaseAdmin.from('committees').select('id, synced_at').in('id', COMMITTEE_IDS);
  if (seenErr) return NextResponse.json({ ok: false, error: seenErr.message }, { status: 500 });
  const syncedAt = new Map((seen ?? []).map((r) => [r.id as number, (r.synced_at as string | null) ?? '']));
  const order = [...COMMITTEE_IDS].sort((a, b) => (syncedAt.get(a) ?? '').localeCompare(syncedAt.get(b) ?? '') || a - b);

  for (let i = 0; i < order.length; i++) {
    const cid = order[i];
    if (budget.stopStarting()) { stoppedBy = 'time budget'; notReached = order.length - i; break; }
    if (i > 0) await sleep(CALL_DELAY_MS);

    let d: Record<string, unknown>;
    try {
      const res = await politeFetch(`${COMMITTEES_API}/${cid}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      }, { budget });
      if (!res.ok) {
        errors.push({ id: cid, message: `API ${res.status}` });
        continue;
      }
      d = (await res.json()) as Record<string, unknown>;
    } catch (e) {
      if (isPoliteStop(e)) { stoppedBy = (e as Error).message; notReached = order.length - i; break; }
      errors.push({ id: cid, message: (e as Error).message });
      continue;
    }

    const cat = d.category as { name?: string } | null;
    const ctypes = (d.committeeTypes as { id?: number; name?: string }[] | null) ?? [];
    const startRaw = d.startDate as string | null;
    const endRaw = d.endDate as string | null;

    const row = {
      id: cid,
      name: (d.name as string) ?? '',
      category: cat?.name ?? '',
      committee_type_id: ctypes[0]?.id ?? null,
      committee_type: ctypes[0]?.name ?? null,
      purpose: (d.purpose as string | null) ?? null,
      start_date: startRaw ? startRaw.slice(0, 10) : null,
      end_date: endRaw ? endRaw.slice(0, 10) : null,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('committees')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      errors.push({ id: cid, message: error.message });
    } else {
      upserted++;
    }
  }

  return NextResponse.json(
    {
      ok: errors.length === 0,
      total: COMMITTEE_IDS.length,
      upserted,
      partial: stoppedBy !== null,
      stopped_by: stoppedBy,
      not_reached: notReached,
      syncedAt: new Date().toISOString(),
      ...(errors.length ? { errors } : {}),
    },
    { status: errors.length ? 500 : 200 },
  );
}

export const GET = withHeartbeat('/api/sync-committees', GET_impl);
