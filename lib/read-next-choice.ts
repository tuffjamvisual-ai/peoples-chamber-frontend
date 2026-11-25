// The pure choice behind "Read next" at the end of a report (lib/read-next-reports.ts), with no server code, so it can be tested.
import type { EditorialListEntry } from '@/lib/editorials-source';

export const READ_NEXT_MAX = 3;

/** Reports on the same topic first, newest first, then the newest of the rest; never the report itself, a briefing, or one in
 *  `shown`. `topicSlugs` maps a topic to the slugs of its pieces. The same day is in slug order, so a page made twice is the same. */
export function chooseReadNext(slug: string, list: EditorialListEntry[], topicSlugs: Record<string, string[]>, shown: Set<string>): EditorialListEntry[] {
  const mine = Object.values(topicSlugs).filter((slugs) => slugs.includes(slug));
  const sameTopic = (s: string) => mine.some((slugs) => slugs.includes(s));
  const newest = (a: EditorialListEntry, b: EditorialListEntry) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.slug.localeCompare(b.slug);
  const rest = list.filter((e) => e.slug !== slug && e.kind !== 'briefing' && !shown.has(`/editorials/${e.slug}`));
  return [...rest.filter((e) => sameTopic(e.slug)).sort(newest), ...rest.filter((e) => !sameTopic(e.slug)).sort(newest)].slice(0, READ_NEXT_MAX);
}
