// "Did you mean" councils for the "Find your local council" box (T1-MP, owner, 11 Nov 2026: councils only): the councils
// whose names are closest to what was typed, by trigram similarity (as pg_trgm and did_you_mean measure it: shared
// three-letter pieces of the padded words), 0.2 or more, best first. Pure, so it has unit tests
// (scripts/checks/council-suggest.test.ts).

function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  const words = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  for (const w of words) {
    const p = `  ${w} `;
    for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  }
  return out;
}

export function similarity(a: string, b: string): number {
  const x = trigrams(a), y = trigrams(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

export type CouncilName = { slug: string; name: string; short_name: string | null };

export function suggestCouncils(q: string, councils: CouncilName[], most = 5, threshold = 0.2): CouncilName[] {
  if (q.trim().length < 3) return [];
  return councils
    .map((c) => ({ c, score: Math.max(similarity(q, c.name), c.short_name ? similarity(q, c.short_name) : 0) }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
    .slice(0, most)
    .map((r) => r.c);
}
