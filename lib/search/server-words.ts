// Word matching in the database, the same rule as lib/search/words.ts in the browser (SEARCH-ALL, Cowork ENTRY 318 and
// 326; replaces lib/ilike-words.ts box by box): every typed word must be found, in any order, at the start of a column or
// at the start of a word in it ('minist' finds 'Ministers'; 'water bill' and 'bill water' find the same rows). Each word is
// its own .or() across the columns, and PostgREST joins the .or() calls with AND.
// A typed word keeps letters and digits only, so nothing in it can change the filter (PostgREST's , ( ) % _ * and quotes
// all go). Words of one letter are left out unless they are all there is.
// The one letter typo second try is not done here: a server list gives its names to the browser or to an in memory
// index (lib/search/words.ts searchList) for that.
export function serverWords(q: string, most = 6): string[] {
  const words = (q || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const long = words.filter((w) => w.length > 1);
  return (long.length ? long : words).slice(0, most);
}

// The .or() filter strings for these words over these columns: one string per word. A word counts at the start of the
// column, after a space or after a hyphen (no bracket: a bracket would end PostgREST's or() group).
export function wordFilters(words: readonly string[], columns: readonly string[]): string[] {
  return words.map((w) => columns.flatMap((c) => [`${c}.ilike.${w}*`, `${c}.ilike.* ${w}*`, `${c}.ilike.*-${w}*`]).join(','));
}

// Apply them to a PostgREST query builder: q = matchWords(supabase.from('debates').select(...), 'water bill', ['title']).
export function matchWords<Q extends { or: (filter: string) => Q }>(query: Q, q: string, columns: readonly string[]): Q {
  let out = query;
  for (const f of wordFilters(serverWords(q), columns)) out = out.or(f);
  return out;
}
