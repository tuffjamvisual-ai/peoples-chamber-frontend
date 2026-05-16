import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes mp_registered_interests from Parliament's RegisteredInterests
// API for every current MP. Schema model: one row per top-level interest
// (keyed by member_id + interest_id), with each entry's childInterests
// packed into the child_interests jsonb column.
//
// Strategy per MP:
//   1. fetch /api/Members/{id}/RegisteredInterests
//   2. flatten value[].interests[] into rows
//   3. upsert by (member_id, interest_id)
//   4. delete any DB rows for this MP whose interest_id is no longer in
//      the API response (handles upstream deletions cleanly)
//
// 650 MPs × ~150ms throttle ≈ 97s, well under the 300s budget. No
// per-run cap needed.

const PARLIAMENT_API = 'https://members-api.parliament.uk/api/Members';
const THROTTLE_MS = 130;
const UA = 'PeoplesChamber-RegisterSync/1.0';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiInterest = {
  id: number;
  interest: string;
  createdWhen?: string | null;
  lastAmendedWhen?: string | null;
  deletedWhen?: string | null;
  isCorrection?: boolean;
  childInterests?: ApiInterest[];
};

type ApiCategory = {
  id: number;
  name: string;
  sortOrder?: number;
  interests?: ApiInterest[];
};

async function fetchInterests(memberId: number): Promise<ApiCategory[]> {
  const res = await fetch(`${PARLIAMENT_API}/${memberId}/RegisteredInterests`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Members API ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.value) ? json.value : [];
}

function flattenRows(memberId: number, categories: ApiCategory[]) {
  const rows: Array<Record<string, unknown>> = [];
  for (const cat of categories) {
    for (const it of cat.interests || []) {
      // Skip soft-deleted entries -- they're tombstones, not interests.
      if (it.deletedWhen) continue;
      rows.push({
        member_id: memberId,
        category_id: cat.id,
        category_name: cat.name,
        category_sort_order: cat.sortOrder ?? null,
        interest_id: it.id,
        interest_text: it.interest ?? '',
        created_when: it.createdWhen ?? null,
        last_amended_when: it.lastAmendedWhen ?? null,
        is_correction: Boolean(it.isCorrection),
        // Strip non-essential fields from children before storing
        child_interests: (it.childInterests || []).map((c) => ({
          id: c.id,
          interest: c.interest,
          createdWhen: c.createdWhen ?? null,
          lastAmendedWhen: c.lastAmendedWhen ?? null,
          deletedWhen: c.deletedWhen ?? null,
          isCorrection: Boolean(c.isCorrection),
          childInterests: c.childInterests || [],
        })),
      });
    }
  }
  return rows;
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

  const { data: mps, error: selErr } = await supabase
    .from('mps')
    .select('member_id')
    .order('member_id', { ascending: true });
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = mps || [];
  let ok = 0, fail = 0, totalUpserted = 0, totalDeleted = 0;
  const failures: Array<{ memberId: number; detail: string }> = [];

  for (const row of targets) {
    const memberId = row.member_id as number;
    try {
      const categories = await fetchInterests(memberId);
      const rows = flattenRows(memberId, categories);
      const liveIds = rows.map((r) => r.interest_id as number);

      if (rows.length > 0) {
        const { error: upErr } = await supabase
          .from('mp_registered_interests')
          .upsert(rows, { onConflict: 'member_id,interest_id' });
        if (upErr) throw upErr;
        totalUpserted += rows.length;
      }

      // Tombstone removal: drop any DB row for this MP whose interest_id
      // is no longer in the API response.
      const delQuery = supabase
        .from('mp_registered_interests')
        .delete({ count: 'exact' })
        .eq('member_id', memberId);
      const { error: delErr, count } =
        liveIds.length > 0
          ? await delQuery.not('interest_id', 'in', `(${liveIds.join(',')})`)
          : await delQuery;
      if (delErr) throw delErr;
      totalDeleted += count ?? 0;

      ok++;
    } catch (err) {
      fail++;
      if (failures.length < 20) {
        failures.push({ memberId, detail: (err as Error).message });
      }
    }
    await sleep(THROTTLE_MS);
  }

  return NextResponse.json({
    targeted: targets.length,
    ok,
    fail,
    totalUpserted,
    totalDeleted,
    failures,
    syncedAt: new Date().toISOString(),
  });
}
