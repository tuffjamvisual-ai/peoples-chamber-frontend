import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes bill.sponsors from Parliament's Bills API. Each daily run
// refreshes bills whose sponsors_synced_at is null (new bills) or older than
// 30 days (the printed Bill sponsor/supporter list rarely changes after first
// reading), stalest first, inside a time budget.
//
// Output shape stored on bill.sponsors:
//   { items: [ { name, party, memberId, memberFrom, sortOrder, isMember, organisation } ] }
// Empty items array == fetched but Parliament returned no sponsors.
// Also stores bill_type_id (the API's billTypeId) and sponsor_departments (the distinct sponsors[].organisation.name,
// the sponsoring department of a government bill), which the topic pages match on (migration 2026-10-21m).

const RUN_CAP = 1500; // bills read from the queue per run; the time budget usually stops it first
// Time-budgeted (21 Oct 2026): 1,500 bills one at a time at about 1.5 s each could never finish in 300 s, so both
// weekly runs timed out. No new bill starts after TIME_BUDGET_MS; each is saved as it is read, and the stalest go
// first, so the next run carries on. About 160 bills a run, daily: the whole list well inside 30 days.
const TIME_BUDGET_MS = 240_000;
const PARLIAMENT_API = 'https://bills-api.parliament.uk/api/v1/Bills';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiMember = { name?: string; party?: string; id?: number; memberFrom?: string };
type ApiSponsor = {
  sortOrder?: number;
  member?: ApiMember | null;
  organisation?: { name?: string } | null;
};
type ApiBill = { sponsors?: ApiSponsor[]; billTypeId?: number };

type StoredSponsor = {
  name: string;
  party: string | null;
  memberId: number | null;
  memberFrom: string | null;
  sortOrder: number;
  isMember: boolean;
  organisation: string | null;
};

type Fetched = { items: StoredSponsor[]; billTypeId: number | null; departments: string[] };

async function fetchSponsors(parliamentId: number): Promise<Fetched> {
  const res = await fetch(`${PARLIAMENT_API}/${parliamentId}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Bills API ${res.status}`);
  const j = (await res.json()) as ApiBill;
  const items = (j.sponsors || [])
    .map((s, i) => {
      const m: ApiMember | null = s.member ?? null;
      const o = s.organisation ?? null;
      const name = m?.name || o?.name || '';
      return {
        name,
        party: m?.party ?? null,
        memberId: m?.id ?? null,
        memberFrom: m?.memberFrom ?? null,
        sortOrder: s.sortOrder ?? i + 1,
        isMember: !!m,
        organisation: o?.name?.trim() || null,
      };
    })
    .filter((s) => s.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const departments = [...new Set(items.map((s) => s.organisation).filter((d): d is string => !!d))];
  return { items, billTypeId: typeof j.billTypeId === 'number' ? j.billTypeId : null, departments };
}

async function GET_impl(req: Request) {
  const started = Date.now();
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: selErr } = await supabase
    .from('bill')
    .select('id, parliament_id, sponsors_synced_at')
    .not('parliament_id', 'is', null)
    .or(`sponsors_synced_at.is.null,sponsors_synced_at.lt.${cutoff}`)
    .order('sponsors_synced_at', { ascending: true, nullsFirst: true })
    .limit(RUN_CAP);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = rows || [];
  let ok = 0,
    fail = 0;
  const failures: Array<{ id: number; detail: string }> = [];
  let skippedForTime = 0;

  for (const [i, row] of targets.entries()) {
    if (Date.now() - started > TIME_BUDGET_MS) { skippedForTime = targets.length - i; break; }
    try {
      const { items, billTypeId, departments } = await fetchSponsors(row.parliament_id);
      const { error } = await supabase
        .from('bill')
        .update({
          sponsors: { items },
          bill_type_id: billTypeId,
          sponsor_departments: departments,
          sponsors_synced_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      ok++;
    } catch (err) {
      fail++;
      if (failures.length < 20) failures.push({ id: row.id, detail: (err as Error).message });
    }
    await sleep(120);
  }

  // The topic bill lists read a stored copy of the bills' sponsoring departments (lib/refresh-stores.ts).
  const storesRefresh = ok > 0 ? await refreshStore(supabase, 'refresh_bill_stores') : null;

  return NextResponse.json({
    targeted: targets.length,
    rows_written: ok,
    fail,
    failures,
    skipped_for_time: skippedForTime,
    stores_refresh: storesRefresh,
    duration_ms: Date.now() - started,
    syncedAt: new Date().toISOString(),
  }, { status: targets.length > 0 && ok === 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-bill-sponsors', GET_impl);
