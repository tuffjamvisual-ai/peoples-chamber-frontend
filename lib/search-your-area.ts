import 'server-only';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { displayMpName } from '@/lib/mp-name';
import { wordsOf, searchList } from '@/lib/search/words';
import { resolveArea, type Suggestion } from '@/lib/area-resolve';
import { LookupError, type Place } from '@/lib/area-lookup';
import { allConstituencies } from '@/lib/constituency-pages';
import { councilByCode } from '@/app/your-area/AreaView';

// 'Your area' at the top of /search (owner approved, Cowork ENTRY 555 items 2 and 3, ENTRY 556, ENTRY 580): with the four
// homepage boxes gone on phones, Search must find what the desktop 'Find your local council' and 'Find your MP' boxes find,
// with the same results. So this uses THEIR lookups, not new ones:
//   council: lib/area-resolve.ts resolveArea, as /your-area/find (postcode, council name, or a town through postcodes.io
//            /places, which ENTRY 580 approved for /search); one council goes to its page, /your-area/<GSS code>, as the
//            desktop box does; several places with the name list them, as /your-area/find does.
//   MP:      a postcode as /api/find-mp (postcodes.io constituency, then our MP for it); otherwise the /mps page's own filter
//            (the same current MPs read and lib/search/words.ts searchList over name, constituency and party).
// postcodes.io answers are cached a day by the existing lookup (fetch revalidate 86400); nothing here writes anything.

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const MPS_SHOWN = 10;
const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export type AreaMp = { memberId: number; name: string; constituency: string | null; constituencySlug: string | null };
export type YourArea = {
  postcode: boolean;
  postcodeNotFound: boolean;
  council: { code: string; name: string } | null;
  councilChoices: Place[];
  councilSuggestions: Suggestion[];
  mps: AreaMp[];
  mpsTotal: number;
};

type MpRow = { member_id: number; name: string | null; display_name: string | null; party: string | null; constituency: string | null };

// The /mps page's read (app/mps/page.tsx), the same query and cache key, so both read one cached copy.
async function currentMps(): Promise<MpRow[]> {
  const { data } = await cachedQuery(['q:app/mps/page.tsx:9281e4b54b'], tableTags('mps'), () => supabase
    .from('mps')
    .select('member_id, name, display_name, party, party_colour, constituency, photo_url')
    .eq('current_member', true)
    .order('name', { ascending: true }));
  return (data ?? []) as MpRow[];
}

async function seatSlug(constituency: string | null): Promise<string | null> {
  if (!constituency) return null;
  const seats = await allConstituencies();
  return seats.find((s) => norm(s.name) === norm(constituency))?.slug ?? null;
}

async function mpForPostcode(pc: string): Promise<{ mp: MpRow | null; found: boolean }> {
  const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
  if (r.status === 404) return { mp: null, found: false };
  if (!r.ok) throw new LookupError('unavailable', 'Lookup is unavailable right now. Please try again.');
  const j = await r.json();
  const constituency: string | null = j?.result?.parliamentary_constituency_2024 || j?.result?.parliamentary_constituency || null;
  if (!constituency) return { mp: null, found: true };
  const mps = await currentMps();
  return { mp: mps.find((m) => norm(String(m.constituency ?? '')) === norm(constituency)) ?? null, found: true };
}

export async function yourArea(q: string): Promise<YourArea> {
  const out: YourArea = { postcode: false, postcodeNotFound: false, council: null, councilChoices: [], councilSuggestions: [], mps: [], mpsTotal: 0 };
  const pc = q.toUpperCase().replace(/\s+/g, '');
  out.postcode = POSTCODE_RE.test(pc);

  // Council, as the desktop 'Find your local council' box.
  try {
    const r = await resolveArea(q);
    if (r.kind === 'area' && r.councilCode) {
      const c = await councilByCode(r.councilCode);
      if (c) out.council = { code: r.councilCode, name: (c as { name?: string }).name ?? r.councilCode };
    } else if (r.kind === 'choices') out.councilChoices = r.choices;
    else if (r.kind === 'suggest') out.councilSuggestions = r.suggestions;
    else if (r.kind === 'error' && r.error === 'notfound' && out.postcode) out.postcodeNotFound = true;
  } catch (e) {
    if (!(e instanceof LookupError)) throw e;
    if (out.postcode && e.kind === 'notfound') out.postcodeNotFound = true;
  }

  // MP, as the desktop 'Find your MP' box (/mps?q=).
  let rows: MpRow[] = [];
  if (out.postcode) {
    try {
      const { mp, found } = await mpForPostcode(pc);
      if (!found) out.postcodeNotFound = true;
      if (mp) rows = [mp];
    } catch (e) { if (!(e instanceof LookupError)) throw e; }
  } else {
    const mps = await currentMps();
    const fielded = mps.map((mp) => ({ item: mp, fields: [wordsOf(`${displayMpName(mp.display_name || mp.name || '')} ${mp.display_name || mp.name || ''}`), wordsOf(mp.constituency || ''), wordsOf(mp.party || '')] }));
    // Every match /mps?q= shows (a party name matches all its MPs); the first MPS_SHOWN here, and a link to the rest.
    rows = searchList(fielded, q).matches;
  }
  out.mpsTotal = rows.length;
  out.mps = await Promise.all(rows.slice(0, MPS_SHOWN).map(async (m) => ({
    memberId: m.member_id,
    name: displayMpName(m.display_name || m.name || ''),
    constituency: m.constituency,
    constituencySlug: await seatSlug(m.constituency),
  })));
  return out;
}
