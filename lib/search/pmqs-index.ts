// The suggestions under the homepage's "Search Prime Minister's Questions" box (SEARCH-ALL batch 1, Cowork ENTRY 320 and
// 326): the Prime Ministers, and every session by its date with who answered and who led for the Opposition, so '12
// november 2025', 'november 2025', 'blair' or 'thatcher 1987' each suggest sessions. Built from the lists /pmqs already
// reads (the sessions since 2024, the 1961 to 2024 archive and the 1945 to 1961 days), held in one shared cache (a day, and
// refreshed by the pmqs tag), searched in memory with lib/search/words.ts. The words of the questions themselves stay with
// the full search (/pmqs?q=), which the box's form still sends.
import { unstable_cache } from 'next/cache';
import { pmqsSet, PMQS_TAG } from '@/lib/pmqs';
import { archiveSessions, answeredBy, groupByPrimeMinister, longDateArchive } from '@/lib/pmqs-archive';
import { preFixedSummary } from '@/lib/pm-questions-1945-1961';
import { pmSlug } from '@/lib/pmqs-search';
import { wordsOf, searchList, type Fielded } from '@/lib/search/words';

type Entry = { label: string; kind: string; href: string; extra: string };
const PREFIXED_PM: Record<string, string> = { Macmillan: 'Harold Macmillan', Eden: 'Anthony Eden', Churchill: 'Winston Churchill', Attlee: 'Clement Attlee' };
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (iso: string) => WEEKDAY[new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay()];

async function build(): Promise<Entry[]> {
  const [set, archive, pre] = await Promise.all([pmqsSet(), archiveSessions(), preFixedSummary()]);
  const seen = new Set<string>();
  const sessions: { date: string; pm: string | null; opp: string | null }[] = [];
  for (const s of set.sessions) if (!seen.has(s.date)) { seen.add(s.date); sessions.push({ date: s.date, pm: s.answeredBy.name, opp: s.opposition?.name ?? null }); }
  for (const s of archive) if (!seen.has(s.date)) { seen.add(s.date); sessions.push({ date: s.date, pm: answeredBy(s.date), opp: null }); }
  sessions.sort((a, b) => b.date.localeCompare(a.date));
  const out: Entry[] = [];
  const groups = groupByPrimeMinister(sessions.map((s) => ({ date: s.date, answeredBy: s.pm })));
  for (const g of groups) out.push({ label: g.pm, kind: 'Prime Minister', href: `/pmqs?pm=${pmSlug(g.pm)}`, extra: `${g.count} sessions` });
  for (const s of sessions) out.push({ label: `${weekday(s.date)} ${longDateArchive(s.date)}`, kind: 'PMQs', href: `/pmqs/${s.date}`, extra: [s.pm, s.opp].filter(Boolean).join(' ') });
  for (const g of pre.groups) {
    const pm = PREFIXED_PM[g.key] ?? g.key;
    for (const y of g.years) for (const d of y.days) out.push({ label: `${weekday(d.date)} ${longDateArchive(d.date)}`, kind: '1945 to 1961', href: `/pmqs/1945-to-1961/${d.date}`, extra: pm });
  }
  return out;
}

const pmqsIndex = unstable_cache(build, ['pmqs-suggest-index-v1'], { revalidate: 86400, tags: [PMQS_TAG] });

let made: { from: Entry[]; list: Fielded<Entry>[] } | null = null;
function fielded(entries: Entry[]): Fielded<Entry>[] {
  if (made?.from !== entries) made = { from: entries, list: entries.map((e) => ({ item: e, fields: [wordsOf(e.label), wordsOf(e.extra)] })) };
  return made.list;
}

export async function pmqsSuggestions(q: string, most = 6): Promise<{ suggestions: Entry[]; typos: boolean }> {
  if (wordsOf(q).join('').length < 2) return { suggestions: [], typos: false };
  const { matches, typos } = searchList(fielded(await pmqsIndex()), q);
  return { suggestions: matches.slice(0, most), typos };
}
