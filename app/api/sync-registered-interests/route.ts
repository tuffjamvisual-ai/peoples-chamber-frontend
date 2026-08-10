import { NextResponse, after } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
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
//   2. flatten value[].interests[] into rows (tagged is_current=true)
//   3. upsert by (member_id, interest_id), refreshing last_seen_date
//   4. flip is_current=false on any DB row for this MP whose interest_id is
//      no longer in the API response — entries are RETAINED as historical,
//      never deleted, so the cumulative-this-Parliament backfill survives.
//
// NB: first_seen_date is populated by the Phase 3 edition backfill (min edition
// publishedDate per interest); this endpoint deliberately omits it from the
// upsert payload so it is never clobbered on refresh.
//
// A full pass over ~650 MPs exceeds the 300s budget at real API latency, so
// the endpoint is CHUNKED: each call handles ?start&?limit (default 150) and
// self-chains to the next window via after() (disable with ?chain=0 when an
// external driver is stepping through). The daily cron hits it once at
// start=0 and the chain completes the pass.

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
  // Guard: a well-formed response always carries a `value` array (possibly
  // empty). If it is missing/malformed, treat it as an error so this MP is
  // skipped rather than silently read as "no interests" (which would otherwise
  // drive the empty-response path).
  if (!Array.isArray(json?.value)) throw new Error('Members API malformed: no value array');
  return json.value;
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

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const reqUrl = new URL(req.url);
  const start = Math.max(0, parseInt(reqUrl.searchParams.get('start') || '0', 10) || 0);
  const limit = Math.min(600, Math.max(1, parseInt(reqUrl.searchParams.get('limit') || '150', 10) || 150));
  const chain = reqUrl.searchParams.get('chain') !== '0'; // self-chain to next window unless disabled

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

  // Chunked window: a single invocation can't refresh all ~650 MPs within the
  // 300s budget, so we process [start, start+limit) and self-chain to the rest.
  const allTargets = mps || [];
  const targets = allTargets.slice(start, start + limit);
  const nextStart = start + targets.length;
  const done = nextStart >= allTargets.length;

  let ok = 0, fail = 0, totalUpserted = 0, totalFlipped = 0, skippedEmpty = 0;
  const failures: Array<{ memberId: number; detail: string }> = [];

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD refresh date

  for (const row of targets) {
    const memberId = row.member_id as number;
    try {
      const categories = await fetchInterests(memberId);
      const baseRows = flattenRows(memberId, categories);
      const liveIds = baseRows.map((r) => r.interest_id as number);
      // Tag every live row as current and stamp last_seen_date. source stays
      // 'members-api': this endpoint is the current-register source of truth;
      // historical editions are ingested separately by the Phase 3 backfill.
      const rows = baseRows.map((r) => ({
        ...r,
        is_current: true,
        last_seen_date: today,
        source: 'members-api',
      }));

      if (rows.length > 0) {
        const { error: upErr } = await supabase
          .from('mp_registered_interests')
          .upsert(rows, { onConflict: 'member_id,interest_id' });
        if (upErr) throw upErr;
        totalUpserted += rows.length;
      }

      // Retention, not removal: any currently-live DB row for this MP whose
      // interest_id is no longer in the API response is flipped to
      // is_current=false and KEPT (never deleted).
      //
      // Empty-response guard: if the API returns ZERO interests, skip the flip
      // rather than wholesale-flipping this MP's rows. fetchInterests already
      // throws on a malformed body, so an empty liveIds is a genuine 200
      // value:[] — but a transient empty could still wrongly hide a real MP's
      // current interests, so we do not act on it. A genuinely-emptied MP keeps
      // stale is_current rows until their next non-empty refresh: rare and
      // low-harm, far safer than hiding live interests.
      if (liveIds.length === 0) {
        skippedEmpty++;
      } else {
        const { error: flipErr, count } = await supabase
          .from('mp_registered_interests')
          .update({ is_current: false }, { count: 'exact' })
          .eq('member_id', memberId)
          .eq('is_current', true)
          .not('interest_id', 'in', `(${liveIds.join(',')})`);
        if (flipErr) throw flipErr;
        totalFlipped += count ?? 0;
      }

      ok++;
    } catch (err) {
      fail++;
      if (failures.length < 20) {
        failures.push({ memberId, detail: (err as Error).message });
      }
    }
    await sleep(THROTTLE_MS);
  }

  // Self-chain to the next window unless this was the last one or chain=0.
  // Each chained call is a fresh invocation with its own 300s budget.
  if (!done && chain) {
    const nextUrl = `${reqUrl.origin}/api/sync-registered-interests?start=${nextStart}&limit=${limit}&chain=1`;
    after(async () => {
      try {
        await fetch(nextUrl, { headers: expected ? { authorization: `Bearer ${expected}` } : {} });
      } catch {
        /* if a link breaks, the next daily cron resumes a full pass from start=0 */
      }
    });
  }

  return NextResponse.json({
    totalMps: allTargets.length,
    windowStart: start,
    windowLimit: limit,
    processedThisChunk: targets.length,
    nextStart,
    done,
    chained: !done && chain,
    ok,
    fail,
    skippedEmpty,
    totalUpserted,
    totalFlipped,
    failures,
    syncedAt: new Date().toISOString(),
  });
}

export const GET = withHeartbeat('/api/sync-registered-interests', GET_impl);
