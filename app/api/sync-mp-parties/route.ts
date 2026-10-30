import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from '@/lib/refresh-count';
import { flagBioReview, ukDate } from '@/lib/bio-review';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { politeFetch, isPoliteStop } from '@/lib/sync-budget';
import { refreshMps, isDryRun } from '@/lib/mp-refresh';
import { normaliseParty } from '@/lib/party-helpers';
import { noteChanged } from '@/lib/refresh-count';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Keeps mps.party in step with the official UK Parliament Members API so that
// defections / party changes are caught automatically. Compares each current
// MP's stored party against the API's latestParty, NORMALISED for naming style
// (so "Labour (Co-op)" vs "Labour", "&" vs "and" etc. are not treated as
// changes), and updates + revalidates only the MPs whose party has genuinely
// changed. Runs nightly via vercel.json crons.

const SEARCH = 'https://members-api.parliament.uk/api/Members/Search?House=1&IsCurrentMember=true';
const MEMBER = 'https://members-api.parliament.uk/api/Members';
const UA = 'PeoplesChamber-PartySync/1.0';

const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\(co-?op\)|co-?operative/g, '')
    .replace(/\bparty\b/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchAllParties(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
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
      if (v?.id != null) map.set(v.id, v.latestParty?.name || '');
    }
    skip += 20;
  }
  return map;
}

async function fetchOneParty(id: number): Promise<string | null> {
  try {
    const res = await politeFetch(`${MEMBER}/${id}`, { headers: { 'User-Agent': UA, accept: 'application/json' } });
    if (!res.ok) return null;
    const v = (await res.json())?.value;
    return v?.latestParty?.name ?? null;
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429 or the time budget: stop cleanly (lib/sync-budget.ts)
    return null;
  }
}

// Each MP page lists the first PEER_LIST other current members of its party, by name (app/mps/[id]/page.tsx).
const PEER_LIST = 5;

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

  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, display_name, party')
    .eq('current_member', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let apiParties: Map<number, string>;
  try {
    apiParties = await fetchAllParties();
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'API fetch failed' }, { status: 502 });
  }

  // MP pages keep for a week (owner, 30 Oct 2026, cache Stage 2a part 3): the changed MP's page, and, when the MP is
  // among the first PEER_LIST + 1 names of the party they left or joined, the page of every current member of that
  // party (each MP page lists the first PEER_LIST other members of its party by name). ?dry=1 (local tests only)
  // compares but writes nothing.
  const dry = isDryRun(req);
  const changes: Array<{ member_id: number; name: string; from: string; to: string }> = [];
  let checked = 0;

  for (const m of mps || []) {
    const id = m.member_id as number;
    let apiParty = apiParties.get(id);
    if (apiParty === undefined) {
      // Not returned by the bulk search (a known API quirk for a few) — confirm individually.
      const one = await fetchOneParty(id);
      if (one == null) continue;
      apiParty = one;
    }
    checked++;

    const dbParty = ((m.party as string) || '').trim();
    if (apiParty && norm(dbParty) !== norm(apiParty)) {
      if (dry) { changes.push({ member_id: id, name: (m.display_name as string) || '', from: dbParty, to: apiParty }); continue; }
      const { error: upErr } = await supabase.from('mps').update({ party: apiParty }).eq('member_id', id);
      if (!upErr) {
        changes.push({ member_id: id, name: (m.display_name as string) || '', from: dbParty, to: apiParty });
        // The written biography may now describe the wrong party.
        await flagBioReview(supabase, id, `Party changed from ${dbParty || 'unknown'} to ${apiParty} (${ukDate(null)})`);
      }
    }
  }

  // The changed MPs, and every member of a party whose first names changed.
  const toRefresh = new Set<number>(changes.map((c) => c.member_id));
  const after = (mps || []).map((m) => {
    const c = changes.find((x) => x.member_id === m.member_id);
    return { id: m.member_id as number, name: ((m.display_name as string) || '').trim(), party: normaliseParty(c ? c.to : (m.party as string)) };
  });
  const before = (mps || []).map((m) => ({ id: m.member_id as number, name: ((m.display_name as string) || '').trim(), party: normaliseParty(m.party as string) }));
  const firstNames = (list: typeof after, party: string) =>
    list.filter((x) => x.party === party).sort((a, b) => a.name.localeCompare(b.name)).slice(0, PEER_LIST + 1).map((x) => x.id);
  for (const party of new Set(changes.flatMap((c) => [normaliseParty(c.from), normaliseParty(c.to)]).filter(Boolean))) {
    const a = firstNames(before, party), b = firstNames(after, party);
    if (a.join(',') !== b.join(',')) for (const x of after) if (x.party === party) toRefresh.add(x.id);
  }
  noteChanged(dry ? 0 : changes.length);
  const mpRefresh = !dry && toRefresh.size ? refreshMps(toRefresh) : null;
  if (!dry && changes.length > 0) revalidatePath('/mps');

  return NextResponse.json({ ok: true, checked, changed: changes.length, changes, mps_to_refresh: toRefresh.size, mp_refresh: mpRefresh, ...(dry ? { dry_run: true } : {}) });
}

export const GET = withHeartbeat('/api/sync-mp-parties', GET_impl);
