// The "Find your local council" box: one lookup for the homepage script (/api/area/lookup) and for /your-area?q= with no
// script, so the two always agree. Councils only (owner, 11 Nov 2026, T1-MP: "second box local councils only"; MPs are
// found through Search opengovt). In order, as before:
//   1. a postcode (and a postcode-like entry that is not a whole postcode);
//   2. a council's name;
//   3. towns and villages: one goes to its area, several are listed to pick from;
// then, new: with no match, up to five suggestions of councils (the closest names in the council list; did_you_mean
// returns its best five across MPs, constituencies, councils and donors, so councils could miss out) and places whose names start with what was
// typed; with none, the "No council or place matches" message. No MP routing.
import { POSTCODE_RE, cleanPostcode, codesForPostcode, codesForPoint, findPlaceMatches, findCouncilByName, LookupError, type AreaCodes, type Place } from '@/lib/area-lookup';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { suggestCouncils, type CouncilName } from '@/lib/council-suggest';

// tag: shown plainly after the name; none for a council, whose name already says so (T1-MPb, 11 Nov 2026).
export type Suggestion = { kind: 'council' | 'place'; name: string; href: string; tag: string | null };
export type Resolved =
  | ({ kind: 'area'; place: string | null } & AreaCodes)
  | { kind: 'choices'; choices: Place[] }
  | { kind: 'suggest'; message: string; suggestions: Suggestion[] }
  | { kind: 'error'; error: 'invalid' | 'notfound' | 'unavailable'; message: string };

export const noMatchMessage = (q: string) => `No council or place matches "${q}". Try a postcode, town or council name (Northern Ireland needs a postcode).`;
export const suggestMessage = (q: string) => `No exact match for "${q}". Did you mean:`;

const councilNames = unstable_cache(async (): Promise<CouncilName[]> => {
  const { data, error } = await supabase.from('councils').select('slug, name, short_name').not('gss_code', 'is', null).limit(1000);
  if (error) throw new LookupError('unavailable', 'Lookup is unavailable right now. Please try again.');
  return (data ?? []) as CouncilName[];
}, ['area-search-council-names'], { revalidate: 86400 });

export async function resolveArea(raw: string): Promise<Resolved> {
  const q = raw.trim().slice(0, 60);
  try {
    if (POSTCODE_RE.test(cleanPostcode(q))) return { kind: 'area', place: null, ...(await codesForPostcode(q)) };
    if (/^[A-Za-z]{1,2}\d/.test(q) && /\d/.test(q)) return { kind: 'error', error: 'invalid', message: 'Enter a full postcode, for example TR27 6LA.' };
    const council = await findCouncilByName(q);
    if (council) return { kind: 'area', place: null, councilCode: council.gss_code, councilName: council.name, constituencyCode: null, constituencyName: null };
    const places = await findPlaceMatches(q);
    if (places.exact.length === 1) return { kind: 'area', place: places.exact[0].name, ...(await codesForPoint(places.exact[0].lat, places.exact[0].lon)) };
    if (places.exact.length > 1) return { kind: 'choices', choices: places.exact };
    const councils = suggestCouncils(q, await councilNames()).map((c) => ({ kind: 'council' as const, name: c.name, href: `/councils/${c.slug}`, tag: null }));
    const near = places.near.map((p) => ({ kind: 'place' as const, tag: p.town ? 'town' : 'place', name: p.label, href: `/your-area?lat=${p.lat}&lon=${p.lon}&place=${encodeURIComponent(p.name)}` }));
    const suggestions = [...councils, ...near].slice(0, 5);
    return { kind: 'suggest', message: suggestions.length ? suggestMessage(q) : noMatchMessage(q), suggestions };
  } catch (e) {
    if (e instanceof LookupError) return { kind: 'error', error: e.kind, message: e.message };
    return { kind: 'error', error: 'unavailable', message: 'Lookup is unavailable right now. Please try again.' };
  }
}
