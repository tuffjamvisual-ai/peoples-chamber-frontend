// "Read next" at the end of a report (owner, 25 Nov 2026, Cowork ENTRY 667): three more reports, those on the same topic first,
// newest first, then the newest of the rest. Never the report itself, and never one its Related list already shows. Chosen when
// the page is made (the same stored list ExploreNext reads, lib/editorials-source.ts), so it works on a saved page with no script.
import type { EditorialEntry } from '@/lib/editorials/types';
import { editorialSet } from '@/lib/editorials-source';
import { chooseReadNext } from '@/lib/read-next-choice';
import type { ReadNextLink } from '@/lib/read-next';

export async function readNextReports(piece: EditorialEntry, shown: Set<string>): Promise<ReadNextLink[]> {
  const set = await editorialSet();
  return chooseReadNext(piece.slug, set.list, set.topicSlugs, shown).map((e) => ({ href: `/editorials/${e.slug}`, label: e.headline, note: e.summary || e.standfirst }));
}
