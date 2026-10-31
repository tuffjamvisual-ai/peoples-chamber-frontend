// The government press releases a piece examines, as match keys (owner, 31 Oct 2026, editorials cache fix): worked
// out from the piece's "How this piece was checked" list when the editorials index is built (lib/editorials-source.ts),
// so the release links (lib/editorials/release-links.ts) need neither the evidence nor the body of any piece.
// Exact matches only: a record that links to the release's GOV.UK page, or that names GOV.UK and quotes the release's
// title word for word.
import type { EditorialEntry } from '@/lib/editorials/types';

export const normTitle = (s: string) =>
  s.toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// GOV.UK path without host, query or trailing slash, e.g. /government/news/some-release.
export const govPath = (url: string) => {
  const m = url.match(/gov\.uk(\/government\/[^?#\s'"]+)/i);
  return m ? m[1].replace(/\/+$/, '').toLowerCase() : null;
};

// The piece's GOV.UK paths and normalised quoted titles, each once, in the order first met.
export function releaseKeysOf(e: Pick<EditorialEntry, 'evidence'>): { paths: string[]; titles: string[] } {
  const paths = new Set<string>();
  const titles = new Set<string>();
  for (const r of e.evidence?.recordsReviewed || []) {
    const text = typeof r === 'string' ? r : r.text;
    const url = typeof r === 'string' ? undefined : r.url;
    for (const u of [url, ...(text.match(/https?:\/\/[^\s'"]+/g) || [])]) {
      const p = u ? govPath(u) : null;
      if (p) paths.add(p);
    }
    if (/gov\.uk/i.test(text)) {
      for (const q of text.matchAll(/["“]([^"”]{12,200})["”]/g)) titles.add(normTitle(q[1]));
    }
  }
  return { paths: [...paths], titles: [...titles] };
}
