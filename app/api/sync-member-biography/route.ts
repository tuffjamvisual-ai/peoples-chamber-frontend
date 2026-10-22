import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { flagBioReview, ukDate } from '@/lib/bio-review';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { buildRepresentations, fetchHistory, sameRepresentations } from '@/lib/commons-representations';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Live replacement for sync-parlparse-posts (whose mySociety source froze in
// mid-January 2026). Pulls each current member's government_posts /
// opposition_posts / committee_memberships from the UK Parliament Members API
// Biography endpoint, which is live and matches mp_biography's stored shape
// exactly (id, name, house, startDate, endDate, additionalInfo,
// additionalInfoLink).
//
// SAFETY / defence-in-depth (approved 20 Jul 2026):
//  1. Monotonic close  — the sync may FILL a null endDate from the source, but
//     never nulls-out or overwrites an endDate that is already set. So a
//     manually-closed tenure (e.g. Reed's Housing role, 20 Jul 2026) survives
//     even while a lagging source still shows the post open.
//  2. Override marker  — any (member_id, post_id) in bio_post_overrides is left
//     completely untouched, regardless of what the source says.
//  3. political_bio is NEVER written here. This route only ever updates the
//     three structured post arrays. The handwritten narrative (political_bio /
//     description / biography) is permanently excluded from all automated writes;
//     do not add those columns to the update() below.
//  4. Seats (representations, added 22 Oct 2026 with the owner's approval) come from
//     the History endpoint, which keeps breaks in membership that Biography merges
//     (lib/commons-representations). They are overwritten only when Parliament's data
//     differs, never with an empty list, and never for a member whose override list
//     names one of their constituency ids.

const MEMBERS_API = 'https://members-api.parliament.uk/api/Members';
const CONCURRENCY = 6;
const TIME_BUDGET_MS = 270_000;

interface Post {
  id: number;
  name: string;
  house?: number;
  startDate?: string | null;
  endDate?: string | null;
  additionalInfo?: string | null;
  additionalInfoLink?: string | null;
}

function normPost(p: Record<string, unknown>): Post {
  return {
    id: p.id as number,
    name: (p.name as string) ?? '',
    house: p.house as number | undefined,
    startDate: (p.startDate as string) ?? null,
    endDate: (p.endDate as string) ?? null,
    additionalInfo: (p.additionalInfo as string) ?? null,
    additionalInfoLink: (p.additionalInfoLink as string) ?? null,
  };
}

async function fetchBiography(memberId: number): Promise<{ gov: Post[]; opp: Post[]; cmte: Post[] } | null> {
  try {
    const res = await fetch(`${MEMBERS_API}/${memberId}/Biography`, {
      headers: { 'User-Agent': 'PeoplesChamber/1.0 (bio-sync)', Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const v = ((await res.json())?.value ?? {}) as Record<string, unknown>;
    const arr = (k: string) => ((v[k] as Record<string, unknown>[]) || []).map(normPost).filter((p) => p.id != null);
    return { gov: arr('governmentPosts'), opp: arr('oppositionPosts'), cmte: arr('committeeMemberships') };
  } catch {
    return null;
  }
}

// Reconcile a stored array with the live source under the monotonic-close +
// override rules. Returns the merged array and whether anything actually changed.
function reconcile(existing: Post[] | null, source: Post[], overridden: Set<number>): { merged: Post[]; changed: boolean } {
  const ex = existing || [];
  const byId = new Map<number, Post>(ex.map((p) => [p.id, p]));
  let changed = false;

  for (const src of source) {
    if (overridden.has(src.id)) continue; // never touch an overridden post
    const cur = byId.get(src.id);
    if (!cur) {
      byId.set(src.id, src); // genuinely new post
      changed = true;
      continue;
    }
    const hasEnd = cur.endDate != null && cur.endDate !== '';
    if (!hasEnd && src.endDate) {
      byId.set(src.id, { ...cur, endDate: src.endDate }); // fill a null end date only
      changed = true;
    }
    // If cur already has an endDate, leave it (monotonic close, never reopen).
  }
  // Existing posts absent from the source are kept as-is (never deleted).
  return { merged: Array.from(byId.values()), changed };
}

// Plain-English list of posts that started or ended between the stored array and
// the live source (same override rules as reconcile), for the biography review flag.
function postChanges(existing: Post[] | null, source: Post[], overridden: Set<number>): string[] {
  const byId = new Map<number, Post>((existing || []).map((p) => [p.id, p]));
  const out: string[] = [];
  for (const src of source) {
    if (overridden.has(src.id)) continue;
    const cur = byId.get(src.id);
    if (!cur) {
      if (!src.endDate) out.push(`Started: ${src.name}${src.startDate ? ` (${ukDate(src.startDate)})` : ''}`);
    } else if (!(cur.endDate != null && cur.endDate !== '') && src.endDate) {
      out.push(`Ended: ${src.name} (${ukDate(src.endDate)})`);
    }
  }
  return out;
}

async function pool<T>(items: T[], size: number, worker: (t: T) => Promise<void>) {
  let i = 0;
  const runners = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase: SupabaseClient = createClient(url, key);

  const startedAt = Date.now();

  // Overrides: member_id -> set of protected post ids.
  const overrideMap = new Map<number, Set<number>>();
  {
    const { data } = await supabase.from('bio_post_overrides').select('member_id, post_id');
    for (const r of (data || []) as { member_id: number; post_id: number }[]) {
      if (!overrideMap.has(r.member_id)) overrideMap.set(r.member_id, new Set());
      overrideMap.get(r.member_id)!.add(r.post_id);
    }
  }

  // Members that have an mp_biography row (only these can be updated).
  const memberIds: number[] = [];
  {
    const PAGE = 1000;
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from('mp_biography')
        .select('member_id')
        .order('member_id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data || data.length === 0) break;
      memberIds.push(...data.map((r) => r.member_id as number));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  // Commons History for every member, 20 per request, fetched once before the per-member work.
  const history = await fetchHistory(memberIds);

  let processed = 0;
  let updated = 0;
  let seatsUpdated = 0;
  let apiMisses = 0;
  let timedOut = false;

  await pool(memberIds, CONCURRENCY, async (memberId) => {
    if (Date.now() - startedAt > TIME_BUDGET_MS) { timedOut = true; return; }
    const bio = await fetchBiography(memberId);
    processed++;
    if (!bio) { apiMisses++; return; }

    const { data: rowArr } = await supabase
      .from('mp_biography')
      .select('government_posts, opposition_posts, committee_memberships, representations')
      .eq('member_id', memberId)
      .limit(1);
    const row = rowArr?.[0];
    if (!row) return;

    const ov = overrideMap.get(memberId) || new Set<number>();
    const g = reconcile(row.government_posts as Post[] | null, bio.gov, ov);
    const o = reconcile(row.opposition_posts as Post[] | null, bio.opp, ov);
    const m = reconcile(row.committee_memberships as Post[] | null, bio.cmte, ov);

    const h = history.get(memberId);
    const seats = h ? await buildRepresentations(h) : [];
    const seatsChanged = seats.length > 0
      && !seats.some((s) => ov.has(s.id))
      && !((row.representations as { id: number }[] | null) || []).some((s) => ov.has(s.id))
      && !sameRepresentations(row.representations, seats);
    if (!g.changed && !o.changed && !m.changed && !seatsChanged) return;

    // NOTE: political_bio / description / biography are intentionally NOT in this
    // update — the handwritten narrative is permanently excluded from sync writes.
    const { error: upErr } = await supabase
      .from('mp_biography')
      .update({
        government_posts: g.merged,
        opposition_posts: o.merged,
        committee_memberships: m.merged,
        ...(seatsChanged ? { representations: seats } : {}),
      })
      .eq('member_id', memberId);
    if (!upErr) {
      updated++;
      if (seatsChanged) seatsUpdated++;
      // Government or opposition posts starting or ending can make the written
      // biography out of date. Committee changes are too frequent to flag.
      const changes = [
        ...postChanges(row.government_posts as Post[] | null, bio.gov, ov),
        ...postChanges(row.opposition_posts as Post[] | null, bio.opp, ov),
      ];
      if (changes.length) await flagBioReview(supabase, memberId, changes.join('; '));
    }
  });

  return NextResponse.json({
    ok: true,
    source: 'members-api Biography and History',
    members_with_bio: memberIds.length,
    processed,
    updated,
    seats_updated: seatsUpdated,
    history_members: history.size,
    api_misses: apiMisses,
    timed_out: timedOut,
    elapsed_ms: Date.now() - startedAt,
  });
}

export const GET = withHeartbeat('/api/sync-member-biography', GET_impl);
