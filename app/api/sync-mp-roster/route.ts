import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Keeps the mps roster in step with the official UK Parliament Members API:
//   - ADDS members who are current in the API but missing/retired in the DB
//     (newly-elected MPs, e.g. via by-election), and
//   - RETIRES members who are current in the DB but no longer current in the API
//     (defeated / departed MPs) by setting current_member=false + end_date.
// This closes the two gaps that /api/sync-mp-parties does not cover: that route
// only updates the party of MPs ALREADY flagged current, so it never inserts a
// new MP and never retires a departed one. Runs nightly via vercel.json crons.
// Photos are intentionally left null for new rows (the parliament thumbnail host
// is not whitelisted in next.config.ts); the photo re-hosting pipeline handles
// those separately, and the page shows a letter-avatar until then.

const SEARCH = 'https://members-api.parliament.uk/api/Members/Search?House=1&IsCurrentMember=true';
const MEMBER = 'https://members-api.parliament.uk/api/Members';
const UA = 'PeoplesChamber-RosterSync/1.0';

const PARTY_COLOURS: Record<string, string> = {
  'Labour': '#E4003B',
  'Labour (Co-op)': '#E4003B',
  'Conservative': '#0087DC',
  'Liberal Democrat': '#FAA61A',
  'Scottish National Party': '#FDF38E',
  'Green Party': '#6AB023',
  'Plaid Cymru': '#005B54',
  'Democratic Unionist Party': '#D46A4C',
  'Sinn Féin': '#326760',
  'Social Democratic and Labour Party': '#2AA82C',
  'Alliance': '#F6CB2F',
  'Reform UK': '#12B6CF',
  'Independent': '#808080',
};

type ApiMember = { id: number; value: Record<string, unknown> };

// Fetch every current MP (paginated). Returns id -> raw search "value" object.
async function fetchAllCurrent(): Promise<Map<number, Record<string, unknown>>> {
  const map = new Map<number, Record<string, unknown>>();
  let skip = 0;
  let total = Infinity;
  while (skip < total) {
    const res = await fetch(`${SEARCH}&skip=${skip}&take=20`, {
      headers: { 'User-Agent': UA, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Members Search API ${res.status}`);
    const json = await res.json();
    total = json.totalResults || 0;
    for (const it of json.items || []) {
      const v = it.value;
      if (v?.id != null) map.set(v.id as number, v);
    }
    skip += 20;
  }
  return map;
}

// Build a full mps row from a member's detail record (mirrors fetch-all-mps.js).
async function buildRecord(memberId: number) {
  const res = await fetch(`${MEMBER}/${memberId}`, {
    headers: { 'User-Agent': UA, accept: 'application/json' },
  });
  if (!res.ok) return null;
  const v = (await res.json())?.value;
  if (!v) return null;
  const lp = v.latestParty || {};
  const hm = v.latestHouseMembership || {};
  return {
    member_id: memberId,
    name: v.nameFullTitle || v.nameDisplayAs,
    display_name: v.nameDisplayAs,
    list_as: v.nameListAs,
    party: lp.name || null,
    party_colour: PARTY_COLOURS[lp.name as string] || '#808080',
    party_abbreviation: lp.abbreviation || null,
    constituency: hm.membershipFrom || null,
    constituency_id: hm.membershipFromId ?? null,
    current_member: true,
    gender: v.gender || null,
    start_date: hm.membershipStartDate || null,
    end_date: null as string | null,
    updated_at: new Date().toISOString(),
  };
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

  // Current DB roster.
  const { data: dbRows, error } = await supabase.from('mps').select('member_id, current_member, retirement_pending_since');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const dbCurrent = new Set<number>();
  const dbAll = new Set<number>();
  const pendingSince = new Map<number, string>();
  for (const r of dbRows || []) {
    dbAll.add(r.member_id as number);
    if (r.current_member) dbCurrent.add(r.member_id as number);
    if (r.retirement_pending_since) pendingSince.set(r.member_id as number, r.retirement_pending_since as string);
  }

  // Current API roster.
  let apiCurrent: Map<number, Record<string, unknown>>;
  try {
    apiCurrent = await fetchAllCurrent();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'API fetch failed' }, { status: 502 });
  }
  // Guard against a partial/empty API response retiring the whole house.
  if (apiCurrent.size < 500) {
    return NextResponse.json(
      { error: `API returned only ${apiCurrent.size} current members; refusing to sync` },
      { status: 502 },
    );
  }

  const added: Array<{ member_id: number; name: string }> = [];
  const retired: number[] = [];
  const pending: number[] = [];
  const cleared: number[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // ADD / REACTIVATE: current in API but not currently flagged in DB.
  for (const id of apiCurrent.keys()) {
    if (dbCurrent.has(id)) continue;
    const record = await buildRecord(id);
    if (!record) continue;
    const { error: upErr } = await supabase.from('mps').upsert(record, { onConflict: 'member_id' });
    if (!upErr) {
      added.push({ member_id: id, name: record.display_name as string });
      revalidatePath(`/mps/${id}`);
    }
  }

  // RETIRE (two-strikes): currently flagged in DB, checked against API.
  for (const id of dbCurrent) {
    if (apiCurrent.has(id)) {
      // MP is back in the API — clear any pending strike.
      if (pendingSince.has(id)) {
        const { error: cErr } = await supabase
          .from('mps')
          .update({ retirement_pending_since: null, updated_at: now })
          .eq('member_id', id);
        if (!cErr) cleared.push(id);
      }
      continue;
    }
    // Not in API this run — apply two-strikes logic.
    if (!pendingSince.has(id)) {
      // First miss: set the pending timestamp, leave current_member untouched.
      const { error: pErr } = await supabase
        .from('mps')
        .update({ retirement_pending_since: now, updated_at: now })
        .eq('member_id', id);
      if (!pErr) pending.push(id);
    } else {
      // Second consecutive miss: actually retire.
      const { error: rErr } = await supabase
        .from('mps')
        .update({ current_member: false, end_date: today, retirement_pending_since: null, updated_at: now })
        .eq('member_id', id);
      if (!rErr) {
        retired.push(id);
        revalidatePath(`/mps/${id}`);
      }
    }
  }

  if (added.length || retired.length) {
    revalidatePath('/mps');
    revalidatePath('/');
  }

  return NextResponse.json({
    ok: true,
    db_current: dbCurrent.size,
    api_current: apiCurrent.size,
    added: added.length,
    retired: retired.length,
    pending: pending.length,
    cleared: cleared.length,
    addedMembers: added,
    retiredMemberIds: retired,
    pendingMemberIds: pending,
    clearedMemberIds: cleared,
  });
}
