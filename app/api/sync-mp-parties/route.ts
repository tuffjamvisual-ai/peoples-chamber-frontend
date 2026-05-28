import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

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
    const res = await fetch(`${SEARCH}&skip=${skip}&take=20`, {
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
    const res = await fetch(`${MEMBER}/${id}`, { headers: { 'User-Agent': UA, accept: 'application/json' } });
    if (!res.ok) return null;
    const v = (await res.json())?.value;
    return v?.latestParty?.name ?? null;
  } catch {
    return null;
  }
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

  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, display_name, party')
    .eq('current_member', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let apiParties: Map<number, string>;
  try {
    apiParties = await fetchAllParties();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'API fetch failed' }, { status: 502 });
  }

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
      const { error: upErr } = await supabase.from('mps').update({ party: apiParty }).eq('member_id', id);
      if (!upErr) {
        changes.push({ member_id: id, name: (m.display_name as string) || '', from: dbParty, to: apiParty });
        revalidatePath(`/mps/${id}`);
      }
    }
  }

  if (changes.length > 0) revalidatePath('/mps');

  return NextResponse.json({ ok: true, checked, changed: changes.length, changes });
}
