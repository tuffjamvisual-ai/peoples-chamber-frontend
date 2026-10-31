// Which Open Govt pieces examine a given government press release (audit reassessment,
// 16 Oct 2026: a reader landing on a GOV.UK release we republish should see straight away
// that we investigated it). Exact matches only, read from each piece's "How this piece was
// checked" list: a record that links to the release's GOV.UK page, or that names GOV.UK and
// quotes the release's title word for word. No guessing from subject or department.
// The keys are worked out when the editorials index is built (lib/editorial-release-keys.ts, 31 Oct 2026), so this
// reads only the index, never a piece's evidence or body.

import { editorialSet, type EditorialSet, type EditorialListEntry } from '@/lib/editorials-source';
import { govPath, normTitle } from '@/lib/editorial-release-keys';

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
  for (const e of set.list) {
    for (const p of e.releasePaths ?? []) put(byPath, p, e.slug);
    for (const t of e.releaseTitles ?? []) put(byTitle, t, e.slug);
  }
  return { byPath, byTitle };
}

/** Investigations and briefings whose checked records cite this exact release, newest first. */
export async function piecesExaminingRelease(title: string | null, govUrl: string | null): Promise<EditorialListEntry[]> {
  const set = await editorialSet();
  let index = cache.get(set);
  if (!index) { index = build(set); cache.set(set, index); }
  const slugs = new Set<string>();
  const p = govUrl ? govPath(govUrl) : null;
  if (p) for (const s of index.byPath.get(p) || []) slugs.add(s);
  if (title) for (const s of index.byTitle.get(normTitle(title)) || []) slugs.add(s);
  return [...slugs]
    .map((s) => set.bySlug[s])
    .filter((e): e is EditorialListEntry => !!e)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

/** Every release key the index knows, for checks (titles normalised, paths lower-case). */
export async function releaseIndexForChecks() {
  const set = await editorialSet();
  let index = cache.get(set);
  if (!index) { index = build(set); cache.set(set, index); }
  return { paths: [...index.byPath.keys()], titles: [...index.byTitle.keys()] };
}
