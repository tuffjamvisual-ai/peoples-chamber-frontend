// Which Open Govt pieces examine a given government press release (audit reassessment,
// 16 Oct 2026: a reader landing on a GOV.UK release we republish should see straight away
// that we investigated it). Exact matches only, read from each piece's "How this piece was
// checked" list: a record that links to the release's GOV.UK page, or that names GOV.UK and
// quotes the release's title word for word. No guessing from subject or department.

import { editorialSet, type EditorialSet } from '@/lib/editorials-source';
import type { EditorialEntry } from './types';

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// GOV.UK path without host, query or trailing slash, e.g. /government/news/some-release.
const govPath = (url: string) => {
  const m = url.match(/gov\.uk(\/government\/[^?#\s'"]+)/i);
  return m ? m[1].replace(/\/+$/, '').toLowerCase() : null;
};

type Index = { byPath: Map<string, Set<string>>; byTitle: Map<string, Set<string>> };
// One index per editorial set (lib/editorials-source.ts), so a switch to the database copy builds its own.
const cache = new WeakMap<EditorialSet, Index>();

function build(set: EditorialSet): Index {
  const byPath = new Map<string, Set<string>>();
  const byTitle = new Map<string, Set<string>>();
  const put = (m: Map<string, Set<string>>, k: string, slug: string) => {
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(slug);
  };
  for (const e of set.list as EditorialEntry[]) {
    for (const r of e.evidence?.recordsReviewed || []) {
      const text = typeof r === 'string' ? r : r.text;
      const url = typeof r === 'string' ? undefined : r.url;
      for (const u of [url, ...(text.match(/https?:\/\/[^\s'"]+/g) || [])]) {
        const p = u ? govPath(u) : null;
        if (p) put(byPath, p, e.slug);
      }
      if (/gov\.uk/i.test(text)) {
        for (const q of text.matchAll(/["“]([^"”]{12,200})["”]/g)) {
          put(byTitle, norm(q[1]), e.slug);
        }
      }
    }
  }
  return { byPath, byTitle };
}

/** Investigations and briefings whose checked records cite this exact release, newest first. */
export async function piecesExaminingRelease(title: string | null, govUrl: string | null): Promise<EditorialEntry[]> {
  const set = await editorialSet();
  let index = cache.get(set);
  if (!index) { index = build(set); cache.set(set, index); }
  const slugs = new Set<string>();
  const p = govUrl ? govPath(govUrl) : null;
  if (p) for (const s of index.byPath.get(p) || []) slugs.add(s);
  if (title) for (const s of index.byTitle.get(norm(title)) || []) slugs.add(s);
  return [...slugs]
    .map((s) => set.bySlug[s])
    .filter((e): e is EditorialEntry => !!e)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

/** Every release key the index knows, for checks (titles normalised, paths lower-case). */
export async function releaseIndexForChecks() {
  const set = await editorialSet();
  let index = cache.get(set);
  if (!index) { index = build(set); cache.set(set, index); }
  return { paths: [...index.byPath.keys()], titles: [...index.byTitle.keys()] };
}
