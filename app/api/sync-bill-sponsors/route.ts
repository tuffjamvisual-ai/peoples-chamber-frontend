import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes bill.sponsors from Parliament's Bills API. Per cron tick this
// refreshes bills whose sponsors_synced_at is older than 7d OR null (the
// printed Bill sponsor/supporter list rarely changes after first
// reading, so a weekly TTL is plenty), up to a per-run cap so a single
// 300s function invocation stays within budget.
//
// Output shape stored on bill.sponsors:
//   { items: [ { name, party, memberId, memberFrom, sortOrder, isMember } ] }
// Empty items array == fetched but Parliament returned no sponsors.

const RUN_CAP = 1500; // bills per invocation (~120ms each ≈ 180s)
const PARLIAMENT_API = 'https://bills-api.parliament.uk/api/v1/Bills';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiMember = { name?: string; party?: string; id?: number; memberFrom?: string };
type ApiSponsor = {
  sortOrder?: number;
  member?: ApiMember | null;
  organisation?: { name?: string } | null;
};
type ApiBill = { sponsors?: ApiSponsor[] };

type StoredSponsor = {
  name: string;
  party: string | null;
  memberId: number | null;
  memberFrom: string | null;
  sortOrder: number;
  isMember: boolean;
};

async function fetchSponsors(parliamentId: number): Promise<StoredSponsor[]> {
  const res = await fetch(`${PARLIAMENT_API}/${parliamentId}`);
  if (!res.ok) throw new Error(`Bills API ${res.status}`);
  const j = (await res.json()) as ApiBill;
  return (j.sponsors || [])
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
      };
    })
    .filter((s) => s.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function GET(req: Request) {
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

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
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

  for (const row of targets) {
    try {
      const items = await fetchSponsors(row.parliament_id);
      const { error } = await supabase
        .from('bill')
        .update({
          sponsors: { items },
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

  return NextResponse.json({
    targeted: targets.length,
    ok,
    fail,
    failures,
    note: targets.length === RUN_CAP ? `Hit per-run cap of ${RUN_CAP}. Re-run to continue.` : 'complete',
    syncedAt: new Date().toISOString(),
  });
}
