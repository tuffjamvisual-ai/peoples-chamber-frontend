// "Did you mean" for a search that found nothing (UX4j, owner approved, 10 Nov 2026): the closest MP, constituency,
// council or donor names to what was typed, from public.did_you_mean(q) (pg_trgm, a 0.2 similarity threshold set inside
// the function; current MPs only; up to 5 rows, best first). Server key only (lib/supabase). A failed call gives no
// suggestion rather than an error: the search page still shows "No results".
import { supabase } from '@/lib/supabase';

export type NameSuggestion = { kind: 'mp' | 'constituency' | 'council' | 'donor'; name: string; href: string };

const BASE: Record<NameSuggestion['kind'], string> = { mp: '/mps/', constituency: '/constituencies/', council: '/councils/', donor: '/donors/' };
export const KIND_LABEL: Record<NameSuggestion['kind'], string> = { mp: 'MP', constituency: 'constituency', council: 'council', donor: 'donor' };

export async function didYouMean(q: string): Promise<NameSuggestion[]> {
  const term = q.trim().slice(0, 100);
  if (term.length < 3) return [];
  try {
    const { data, error } = await supabase.rpc('did_you_mean', { q: term });
    if (error || !Array.isArray(data)) return [];
    const seen = new Set<string>();
    return (data as { kind: string; name: string; slug: string | number }[])
      .filter((r) => r && r.kind in BASE && r.name && r.slug != null)
      .map((r) => ({ kind: r.kind as NameSuggestion['kind'], name: String(r.name).trim(), href: `${BASE[r.kind as NameSuggestion['kind']]}${encodeURIComponent(String(r.slug))}` }))
      .filter((r) => (seen.has(r.href) ? false : (seen.add(r.href), true)));
  } catch {
    return [];
  }
}
