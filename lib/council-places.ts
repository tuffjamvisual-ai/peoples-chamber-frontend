// Towns and villages for the councils search (owner, 18 Nov 2026, Cowork ENTRY 308: "grimsby" found nothing). The same
// place search as the "Find your local council" box (lib/area-lookup.ts findPlaceMatches: postcodes.io places, OS Open
// Names, settlements only, larger first), then each place's council from the nearest postcode (codesForPoint, as that
// box does for a town). Each answer is cached a day by the fetch cache. No new data source.
//   "Grimsby"  -> Grimsby: North East Lincolnshire
//   "Newport"  -> several places of that name, each with its own council, to pick from
// A lookup that fails gives no places; the council name results are never held up by it.
import { findPlaceMatches, codesForPoint } from '@/lib/area-lookup';
import { supabase } from '@/lib/supabase';

export type PlaceCouncil = { label: string; slug: string; councilName: string };

const MOST = 6;

export async function councilsForPlaces(q: string, most = MOST): Promise<PlaceCouncil[]> {
  const query = q.trim();
  if (query.length < 3 || query.length > 60 || /\d/.test(query)) return [];
  try {
    const { exact, near } = await findPlaceMatches(query);
    const places = [...exact, ...near].slice(0, most);
    if (!places.length) return [];
    const codes = await Promise.all(places.map((p) => codesForPoint(p.lat, p.lon).then((c) => c.councilCode).catch(() => null)));
    const wanted = [...new Set(codes.filter((c): c is string => !!c))];
    if (!wanted.length) return [];
    // A plain read, as /api/councils/search makes (both routes are dynamic).
    const { data, error } = await supabase.from('councils').select('gss_code, slug, name, short_name').in('gss_code', wanted);
    if (error) return [];
    const byCode = new Map(((data ?? []) as { gss_code: string; slug: string; name: string; short_name: string | null }[]).map((c) => [c.gss_code, c]));
    // A name that appears once is shown plainly ("Grimsby"); a name shared by several places keeps its area ("Newport, Isle of Wight").
    const counts = new Map<string, number>();
    for (const p of places) counts.set(p.name.toLowerCase(), (counts.get(p.name.toLowerCase()) ?? 0) + 1);
    const out: PlaceCouncil[] = [];
    const seen = new Set<string>();
    places.forEach((p, i) => {
      const c = codes[i] ? byCode.get(codes[i]!) : undefined;
      if (!c) return;
      const where = (counts.get(p.name.toLowerCase()) ?? 0) > 1 ? p.label : p.name;
      const key = `${where}|${c.slug}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ label: where, slug: c.slug, councilName: c.short_name || c.name });
    });
    return out;
  } catch {
    return [];
  }
}
