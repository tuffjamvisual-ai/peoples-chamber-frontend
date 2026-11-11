// A reader's search words as one PostgREST ilike pattern (T1-QA9 A11, 12 Nov 2026): "Bournemouth, Christchurch and Poole
// Council" found nothing, because the commas were removed and the rest had to match the stored name exactly
// ("Bournemouth Christchurch and Poole" against "Bournemouth, Christchurch and Poole"). Characters with a meaning in
// ilike or in an .or() filter (% _ , ( ) and the rest) separate words; the words must appear in order, anything between.
// '' when there is nothing to search for.
export function ilikeWords(q: string): string {
  const words = q.normalize('NFKC').split(/[^\p{L}\p{N}'’&.-]+/u).map((w) => w.replace(/[.]/g, '')).filter(Boolean);
  return words.length ? `%${words.join('%')}%` : '';
}
