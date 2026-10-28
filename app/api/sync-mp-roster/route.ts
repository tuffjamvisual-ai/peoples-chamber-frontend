import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { flagBioReview, ukDate } from '@/lib/bio-review';
import { buildRepresentations, fetchHistory } from '@/lib/commons-representations';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { politeFetch, isPoliteStop } from '@/lib/sync-budget';
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
//
// It also FILLS PROFILE GAPS for current MPs (added Oct 2026, after the Holborn and
// St Pancras by-election showed new MPs never got roles or contact details):
//   - a current MP with no mp_biography row gets one, filled with their posts,
//     committees, seats and party history from the Members API Biography endpoint.
//     political_bio stays null (the handwritten narrative is never written by a
//     sync). From then on /api/sync-member-biography keeps the posts current; it
//     only updates EXISTING rows, which is why new MPs need this first row.
//   - a current MP with no mp_contact row gets one 'primary' row built the same
//     way as the existing rows (email + phone from the Parliamentary office entry,
//     website, X/Twitter). If Parliament hasn't published contact details yet
//     (normal for the first weeks after a by-election), nothing is written and
//     the next nightly run tries again.
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
    const res = await politeFetch(`${SEARCH}&skip=${skip}&take=20`, {
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
  const res = await politeFetch(`${MEMBER}/${memberId}`, {
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

// ---- Profile gap filling (mp_biography / mp_contact) ----

const GAP_FILL_MAX = 50; // safety cap per run; normally only a handful of MPs

type BioEntry = {
  id: number;
  name: string;
  house?: number;
  startDate: string | null;
  endDate: string | null;
  additionalInfo: string | null;
  additionalInfoLink: string | null;
};

// Same shape /api/sync-member-biography stores, so the two routes agree.
function normEntry(p: Record<string, unknown>): BioEntry {
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

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await politeFetch(url, { headers: { 'User-Agent': UA, accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429 or the time budget: stop cleanly (lib/sync-budget.ts)
    return null;
  }
}

async function buildBiographyRow(memberId: number) {
  const json = await fetchJson(`${MEMBER}/${memberId}/Biography`);
  if (!json) return null;
  const v = (json.value ?? {}) as Record<string, unknown>;
  const arr = (k: string) => ((v[k] as Record<string, unknown>[]) || []).map(normEntry).filter((p) => p.id != null);
  // Seats come from History, which keeps breaks the Biography endpoint merges (lib/commons-representations).
  const history = (await fetchHistory([memberId])).get(memberId);
  return {
    member_id: memberId,
    representations: history ? await buildRepresentations(history) : arr('representations'),
    government_posts: arr('governmentPosts'),
    opposition_posts: arr('oppositionPosts'),
    committee_memberships: arr('committeeMemberships'),
    party_history: arr('partyAffiliations'),
    bio_source: 'members-api',
  };
}

// Returns null when Parliament has published no usable contact details yet.
async function buildContactRow(memberId: number) {
  const json = await fetchJson(`${MEMBER}/${memberId}/Contact`);
  if (!json) return null;
  const entries = ((json.value as Record<string, unknown>[]) || []);
  const str = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
  const byType = (re: RegExp) => entries.find((e) => re.test(String(e.type ?? '')));
  const office = byType(/^parliamentary office$/i);
  const anyWithEmail = entries.find((e) => str(e.email));
  const anyWithPhone = entries.find((e) => str(e.phone));
  const row = {
    member_id: memberId,
    contact_type: 'primary',
    email: str(office?.email) ?? str(anyWithEmail?.email),
    phone: str(office?.phone) ?? str(anyWithPhone?.phone),
    website: str(byType(/^website$/i)?.line1),
    twitter: str(byType(/twitter/i)?.line1),
  };
  if (!row.email && !row.phone && !row.website && !row.twitter) return null;
  return row;
}

// All member_ids present in a table (paged past the 1000-row limit).
// Ordered by member_id (unique in both tables) so paging is stable, and a failed page fails the run instead of
// returning part of the list, which would make existing rows look missing (24 Oct 2026, report 36).
async function idsIn(supabase: SupabaseClient, table: string): Promise<Set<number>> {
  const out = new Set<number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('member_id').order('member_id').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} member ids: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) out.add(r.member_id as number);
    if (data.length < PAGE) break;
  }
  return out;
}

// dryRun: fetch and build the rows but write nothing (used for testing).
async function fillProfileGaps(supabase: SupabaseClient, dryRun = false) {
  const { data: cur, error: curErr } = await supabase.from('mps').select('member_id').eq('current_member', true);
  if (curErr) throw new Error(`current MPs: ${curErr.message}`);
  const currentIds = (cur || []).map((r) => r.member_id as number);
  const [bioIds, contactIds] = await Promise.all([idsIn(supabase, 'mp_biography'), idsIn(supabase, 'mp_contact')]);

  const biographyCreated: number[] = [];
  const contactCreated: number[] = [];
  const contactNotPublished: number[] = [];

  for (const id of currentIds.filter((i) => !bioIds.has(i)).slice(0, GAP_FILL_MAX)) {
    const row = await buildBiographyRow(id);
    if (!row) continue;
    if (dryRun) { biographyCreated.push(id); continue; }
    // ignoreDuplicates: never overwrite a row that appeared in the meantime.
    const { error } = await supabase.from('mp_biography').upsert(row, { onConflict: 'member_id', ignoreDuplicates: true });
    if (!error) {
      biographyCreated.push(id);
      revalidatePath(`/mps/${id}`);
      await flagBioReview(supabase, id, `New MP with no written biography yet (row created ${ukDate(null)})`);
    }
  }

  for (const id of currentIds.filter((i) => !contactIds.has(i)).slice(0, GAP_FILL_MAX)) {
    const row = await buildContactRow(id);
    if (!row) {
      contactNotPublished.push(id);
      continue;
    }
    if (dryRun) { contactCreated.push(id); continue; }
    const { error } = await supabase.from('mp_contact').insert(row);
    if (!error) {
      contactCreated.push(id);
      revalidatePath(`/mps/${id}`);
    }
  }

  return { biographyCreated, contactCreated, contactNotPublished };
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  // ?dryRun=1 previews the profile gap filling only and writes nothing. The
  // add/retire roster logic is skipped entirely in a dry run.
  if (new URL(req.url).searchParams.get('dryRun') === '1') {
    let preview: Awaited<ReturnType<typeof fillProfileGaps>>;
    try {
      preview = await fillProfileGaps(supabase, true);
    } catch (e) {
      return NextResponse.json({ ok: false, dryRun: true, error: (e as Error).message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      dryRun: true,
      wouldCreateBiographyRows: preview.biographyCreated,
      wouldCreateContactRows: preview.contactCreated,
      contactNotYetPublished: preview.contactNotPublished,
    });
  }

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
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
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
        await flagBioReview(supabase, id, `Left the Commons (${ukDate(today)})`);
      }
    }
  }

  // Fill missing biography / contact rows for current MPs (see header note).
  // A failed read fails the run (status 500, recorded by the heartbeat) rather than filling gaps from a partial list.
  let gaps: Awaited<ReturnType<typeof fillProfileGaps>>;
  try {
    gaps = await fillProfileGaps(supabase);
  } catch (e) {
    if (added.length || retired.length) {
      revalidatePath('/mps');
      revalidatePath('/');
    }
    return NextResponse.json(
      { ok: false, error: `profile gap filling: ${(e as Error).message}`, added: added.length, retired: retired.length },
      { status: 500 },
    );
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
    biographyRowsCreated: gaps.biographyCreated,
    contactRowsCreated: gaps.contactCreated,
    contactNotYetPublished: gaps.contactNotPublished,
  });
}

export const GET = withHeartbeat('/api/sync-mp-roster', GET_impl);
