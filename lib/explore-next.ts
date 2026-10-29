// The "Explore next" selection (app/components/ExploreNext.tsx), shared with the Read next block (lib/read-next.ts)
// so Read next never repeats a link ExploreNext shows. Moved here unchanged on 21 Oct 2026.
import { editorialSet } from '@/lib/editorials-source';
import { topics } from '@/lib/topics';
import type { EditorialEntry } from '@/lib/editorials/types';
import { subjectsOf } from '@/lib/editorials/subjects';

export type ExploreItem = { href: string; label: string; note?: string };

export async function exploreNextSelection(piece: EditorialEntry): Promise<{
  isBriefing: boolean; base: string; data: ExploreItem[]; next: EditorialEntry[]; latest: EditorialEntry[];
  moreRelated: EditorialEntry[]; hrefs: string[];
}> {
  type Item = ExploreItem;
  const set = await editorialSet();
  const editorials = set.bySlug;
  const inTopic = (t: (typeof topics)[number], slug: string) => (set.topicSlugs[t.slug] ?? []).includes(slug);
  const isBriefing = piece.kind === 'briefing';
  const pieceTopics = topics.filter((t) => inTopic(t, piece.slug));

  const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'what', 'when', 'who', 'how', 'why', 'are', 'was', 'were', 'has', 'have', 'its', 'their', 'they', 'but', 'not', 'more', 'than', 'after', 'about', 'which', 'will', 'been', 'government', 'minister', 'ministers', 'uk', 'britain', 'british']);
  const stem = (text: string) => new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, '')));
  const words = (e: EditorialEntry) => stem(`${e.headline} ${e.standfirst || ''}`);
  const mine = words(piece);

  // Explore the data: hand-picked first, then each topic's data pages and topic page.
  // A topic's data page is offered only when it shares a subject word with this piece
  // (reassessment, 17 Oct 2026: an industrial electricity subsidy piece was offered
  // "Sewage spills" because both sit in the climate and energy topic). Generic words such as
  // "data", "council" or "spending" do not count as a shared subject.
  const DATA_GENERIC = stem('data england every area areas council councils public spending figures record records year years page local national service services each shows compare latest total totals');
  const relevant = (title: string, note?: string) => {
    for (const w of stem(`${title} ${note || ''}`)) if (!DATA_GENERIC.has(w) && mine.has(w)) return true;
    return false;
  };
  const data: Item[] = [];
  const seen = new Set<string>();
  const add = (it: Item) => { if (!seen.has(it.href)) { seen.add(it.href); data.push(it); } };
  for (const it of piece.explore || []) add(it);
  for (const t of pieceTopics) for (const d of t.dataPages || []) if (relevant(d.title, d.description)) add({ href: d.href, label: d.title, note: d.description });
  data.splice(8);
  // Each topic's own page always shows, after the hand-picked and data links.
  for (const t of pieceTopics) add({ href: `/topics/${t.slug}`, label: `Everything on ${t.title}`, note: 'Departments, votes, bills, MPs and reporting on this subject' });

  // Read next (audit reassessment, 16 Oct 2026): only pieces that continue the reader's
  // subject are offered as "More investigations": hand-picked first, then pieces ranked by
  // shared subject groups (lib/editorials/subjects.ts), shared topic hubs (lib/topics.ts),
  // shared headline words and date. Any places left are filled with the newest pieces under a
  // separate "Latest investigations" heading, so the panel never implies a connection the
  // selection does not have.
  const all = set.list.filter((e) => e.slug !== piece.slug && (e.kind === 'briefing') === isBriefing);
  const byDate = (a: EditorialEntry, b: EditorialEntry) => (b.publishedAt || '').localeCompare(a.publishedAt || '');
  const picked = (piece.readNext || []).map((s) => editorials[s]).filter((e): e is EditorialEntry => !!e && e.slug !== piece.slug);
  const used = new Set(picked.map((e) => e.slug));
  const overlap = (e: EditorialEntry) => { let n = 0; for (const w of words(e)) if (mine.has(w)) n++; return n; };
  const mySubjects = new Set(subjectsOf(piece.slug));
  const sharedSubjects = (e: EditorialEntry) => subjectsOf(e.slug).filter((s) => mySubjects.has(s)).length;
  const sharedTopics = (e: EditorialEntry) => pieceTopics.filter((t) => inTopic(t, e.slug)).length;
  // Topic hubs are broad (Housing also holds council-finance pieces), so pieces sharing a
  // subject group rank first, then pieces sharing a topic hub, then headline words, then date.
  const related = all
    .filter((e) => !used.has(e.slug))
    .map((e) => ({ e, s: sharedSubjects(e), t: sharedTopics(e), n: overlap(e) }))
    .filter((x) => x.s > 0 || x.t > 0)
    .sort((a, b) => b.s - a.s || b.t - a.t || b.n - a.n || byDate(a.e, b.e))
    .map((x) => x.e);
  const next = [...picked, ...related].slice(0, 3);
  for (const e of next) used.add(e.slug);
  const latest = all.filter((e) => !used.has(e.slug)).sort(byDate).slice(0, 3 - next.length);
  const base = isBriefing ? '/briefings' : '/editorials';


  // Pieces on the same subject that ExploreNext has no room for (Read next offers the first of these).
  const moreRelated = related.filter((e) => !used.has(e.slug));
  const hrefs = [...data.map((d) => d.href), ...next.map((e) => `${base}/${e.slug}`), ...latest.map((e) => `${base}/${e.slug}`), '/reports'];
  return { isBriefing, base, data, next, latest, moreRelated, hrefs };
}
