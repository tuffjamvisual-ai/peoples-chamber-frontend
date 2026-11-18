// The single way the site gets editorials (owner's approval, 29 Oct 2026, "go stage B"). The editorials table is the
// only copy (Stage D, owner, 5 Nov 2026): read with the server key (server only), rebuilt into EditorialEntry objects,
// unpublished rows left out, in registry_order; topic lists from topic_positions. Reads go through unstable_cache for a
// week under the 'editorials' tag (one piece by slug also under 'editorial:<slug>'), deduplicated within a render by
// React cache, and refreshed by node scripts/revalidate.js --tag editorials after a publish (scripts/publish-editorial.ts
// does it). MP and bill pages read only the pieces linked to them (cache Stage 2a, owner, 30 Oct 2026), under
// 'editorial-links:mp:<id>' and 'editorial-links:bill:<id>' and not 'editorials', so a publish rebuilds only the MP and
// bill pages the piece names, before or after the change. Nothing here reads cookies, headers or no-store.
// If the database cannot be read, a read throws: a page already built keeps being served, and any other shows
// app/error.tsx.
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { topics } from '@/lib/topics';
import type { EditorialEntry } from '@/lib/editorials/types';
import { entryWords } from '@/lib/reading-time';
import { releaseKeysOf } from '@/lib/editorial-release-keys';
import { councilSlugsOf } from '@/lib/editorials/council-slugs';

type Row = Record<string, unknown>;

// The editorials index (owner, 31 Oct 2026, editorials cache fix). Lists (home, reports, topics, departments, read
// next, feed, sitemap, the "examined by" links on /news) read one small entry per piece, never the body: the whole set
// with every body was 2.57 MB, over the 2 MB Vercel will cache, so every render read the whole table. What a list
// derives from the body or the evidence is worked out when the index is built and stored as a short field. The full
// text of a piece comes only from getEditorial (one piece, 'editorials-source-one').
export type EditorialListEntry = Pick<EditorialEntry, 'slug' | 'headline' | 'standfirst' | 'summary' | 'publishedAt' | 'kind' | 'kicker' | 'opinion' | 'relatedDeptSlugs'> & {
  words: number;              // headline and body words (lib/reading-time.ts entryWords), for "N min read"
  lede?: string;              // the first body block's text when it is a paragraph (the front page's lead piece)
  updateNote?: EditorialEntry['updateNote'];   // update_note, the stored updates (the sitemap's lastModified, T1-UPDATED)
  releasePaths?: string[];    // the GOV.UK releases the piece examines (lib/editorial-release-keys.ts)
  releaseTitles?: string[];
  councilSlugs?: string[];    // relatedCouncilSlugs and the councils its text links to (lib/editorials/council-slugs.ts), for council pages' Related links
};
export type EditorialSet = {
  list: EditorialListEntry[];                    // registry order
  bySlug: Record<string, EditorialListEntry>;    // built in memory from list
  topicSlugs: Record<string, string[]>;           // each topic's editorial slugs, in its order, built in memory
};
// What the cache stores: the entries once each, with the topic positions the topic lists are built from.
type IndexEntry = EditorialListEntry & { topicPositions?: Record<string, number> };

// Over this the build and development fail; production logs every rebuild's size, so growth shows long before 2 MB.
const INDEX_LIMIT = 1_000_000;

const WEEK = 604800;   // owner, 30 Oct 2026 (was a day): a publish refreshes the tags straight away
const COLUMNS = 'slug, headline, standfirst, summary, published_at, author_byline, kind, kicker, body_json, related_dept_slugs, related_member_ids, related_bill_ids, opinion, hero_image, hero_alt, evidence, update_note, related_programme_slugs, related_council_slugs, explore, read_next, topic_positions, registry_order, unpublished';

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
    // Plain fetch: rows are used as written (quoted official titles keep their dashes).
  });
}

// A row back into an EditorialEntry: NULL is an absent field; the older related_* arrays and related_council_slugs store
// absent as empty.
function fromRow(r: Row): EditorialEntry {
  const e: Record<string, unknown> = {
    slug: r.slug, headline: r.headline, standfirst: r.standfirst, publishedAt: r.published_at, authorByline: r.author_byline, body: r.body_json,
  };
  const optional: [string, string][] = [
    ['summary', 'summary'], ['kind', 'kind'], ['kicker', 'kicker'], ['opinion', 'opinion'], ['heroImage', 'hero_image'], ['heroAlt', 'hero_alt'],
    ['evidence', 'evidence'], ['updateNote', 'update_note'], ['relatedProgrammeSlugs', 'related_programme_slugs'], ['explore', 'explore'], ['readNext', 'read_next'],
  ];
  for (const [field, col] of optional) if (r[col] !== null && r[col] !== undefined) e[field] = r[col];
  for (const [field, col] of [['relatedDeptSlugs', 'related_dept_slugs'], ['relatedMemberIds', 'related_member_ids'], ['relatedBillIds', 'related_bill_ids'], ['relatedCouncilSlugs', 'related_council_slugs']]) {
    if (Array.isArray(r[col]) && (r[col] as unknown[]).length > 0) e[field] = r[col];
  }
  // Keys in a fixed order, so serialised output (JSON-LD) stays the same.
  return e as unknown as EditorialEntry;
}

// A full piece into its index entry; fields a piece does not have stay absent.
function toListEntry(e: EditorialEntry): EditorialListEntry {
  const out: Record<string, unknown> = { slug: e.slug, headline: e.headline, standfirst: e.standfirst, publishedAt: e.publishedAt, words: entryWords(e) };
  for (const k of ['summary', 'kind', 'kicker', 'opinion', 'relatedDeptSlugs'] as const) if (e[k] !== undefined) out[k] = e[k];
  const b0 = e.body?.[0];
  if (b0 && b0.type === 'paragraph') out.lede = b0.text;
  if (e.updateNote?.length) out.updateNote = e.updateNote.map((u) => ({ date: u.date, text: '' }));   // dates only: the index stays small
  const keys = releaseKeysOf(e);
  if (keys.paths.length) out.releasePaths = keys.paths;
  if (keys.titles.length) out.releaseTitles = keys.titles;
  // The councils it names (related_council_slugs) and the ones its text links to, once each (3 Nov 2026).
  const councils = [...new Set([...(e.relatedCouncilSlugs ?? []), ...councilSlugsOf(e)])];
  if (councils.length) out.councilSlugs = councils;
  return out as EditorialListEntry;
}

const bySlugOf = (list: EditorialListEntry[]) => Object.fromEntries(list.map((e) => [e.slug, e]));

async function readIndex(): Promise<IndexEntry[]> {
  const { data, error } = await client().from('editorials').select(COLUMNS).eq('unpublished', false).order('registry_order', { ascending: true, nullsFirst: false }).range(0, 4999);
  if (error) throw new Error(`editorials source: ${error.message}`);
  const entries = ((data ?? []) as unknown as Row[]).map((r) => {
    const e: IndexEntry = toListEntry(fromRow(r));
    const positions = r.topic_positions as Record<string, number> | null;
    if (positions && Object.keys(positions).length) e.topicPositions = positions;
    return e;
  });
  // Runs only when the cache is rebuilt, so this logs each rebuild.
  const bytes = Buffer.byteLength(JSON.stringify(entries));
  console.log(`[editorials-source] index rebuilt: ${entries.length} pieces, ${bytes} bytes (limit ${INDEX_LIMIT})`);
  if (bytes > INDEX_LIMIT) {
    const message = `[editorials-source] the editorials index is ${bytes} bytes, over ${INDEX_LIMIT}: Vercel caches nothing over 2 MB, so trim the index fields in lib/editorials-source.ts`;
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') throw new Error(message);
    console.error(message);
  }
  return entries;
}

// The list, the lookup by slug and the topics' lists, built in memory from the cached entries (topic order from
// topic_positions; entries are in registry order, and the sort is stable).
function expand(entries: IndexEntry[]): EditorialSet {
  const topicSlugs: Record<string, string[]> = {};
  for (const t of topics) {
    topicSlugs[t.slug] = entries
      .filter((e) => e.topicPositions?.[t.slug] !== undefined)
      .sort((a, b) => a.topicPositions![t.slug] - b.topicPositions![t.slug])
      .map((e) => e.slug);
  }
  return { list: entries, bySlug: bySlugOf(entries), topicSlugs };
}

const indexFromDatabase = unstable_cache(readIndex, ['editorials-source-index'], { tags: ['editorials'], revalidate: WEEK });
const fromDatabase = cache(async () => expand(await indexFromDatabase()));

async function readOne(slug: string): Promise<EditorialEntry | null> {
  const { data, error } = await client().from('editorials').select(COLUMNS).eq('slug', slug).eq('unpublished', false).maybeSingle();
  if (error) throw new Error(`editorials source: ${error.message}`);
  return data ? fromRow(data as unknown as Row) : null;
}

// One piece in any state, uncached, for the owner's private preview only (lib/draft-preview.ts). Never use it on a public page.
export async function readEditorialAnyState(slug: string): Promise<(EditorialEntry & { unpublished: boolean }) | null> {
  const { data, error } = await client().from('editorials').select(`${COLUMNS}, unpublished`).eq('slug', slug).maybeSingle();
  if (error) throw new Error(`editorials source: ${error.message}`);
  return data ? { ...fromRow(data as unknown as Row), unpublished: (data as unknown as { unpublished: boolean }).unpublished } : null;
}

const oneFromDatabase = cache((slug: string) =>
  unstable_cache(() => readOne(slug), ['editorials-source-one', slug], { tags: ['editorials', `editorial:${slug}`], revalidate: WEEK })());

// Every published piece (index entries, no body), its lookup by slug, and the topics' lists.
export async function editorialSet(): Promise<EditorialSet> {
  return fromDatabase();
}

export async function allEditorials(): Promise<EditorialListEntry[]> {
  return (await editorialSet()).list;
}

export async function editorialsBySlug(): Promise<Record<string, EditorialListEntry>> {
  return (await editorialSet()).bySlug;
}

// One piece by slug (undefined if there is none or it is unpublished); `kind` narrows it.
export async function getEditorial(slug: string, kind?: 'briefing' | 'investigation'): Promise<EditorialEntry | undefined> {
  const piece = (await oneFromDatabase(slug)) ?? undefined;
  if (!piece || !kind) return piece;
  return (kind === 'briefing') === (piece.kind === 'briefing') ? piece : undefined;
}

// Slugs for generateStaticParams: investigations, briefings or all.
export async function editorialSlugsFor(kind?: 'briefing' | 'investigation'): Promise<string[]> {
  return (await allEditorials()).filter((e) => !kind || (kind === 'briefing') === (e.kind === 'briefing')).map((e) => e.slug);
}

// A topic's editorial slugs in its order.
export async function topicEditorialSlugs(topicSlug: string): Promise<string[]> {
  return (await editorialSet()).topicSlugs[topicSlug] ?? [];
}

// The slugs of the topics a piece belongs to, in topic order.
export function topicsOfIn(set: EditorialSet, slug: string): string[] {
  return topics.filter((t) => (set.topicSlugs[t.slug] ?? []).includes(slug)).map((t) => t.slug);
}

// The pieces linked to one MP or bill, in registry order, read on their own so the MP and bill pages do not carry the
// 'editorials' tag. Tag: 'editorial-links:<mp|bill>:<id>', refreshed by scripts/publish-editorial.ts for every MP and
// bill a piece names before or after the change.
const LINK_COLUMN = { mp: 'related_member_ids', bill: 'related_bill_ids' } as const;

async function readLinked(kind: 'mp' | 'bill', id: number): Promise<EditorialEntry[]> {
  const { data, error } = await client().from('editorials').select(COLUMNS).contains(LINK_COLUMN[kind], [id]).eq('unpublished', false)
    .order('registry_order', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`editorials source (${kind} ${id}): ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map(fromRow);
}

export const editorialLinksTag = (kind: 'mp' | 'bill', id: number) => `editorial-links:${kind}:${id}`;

const linkedFromDatabase = cache((kind: 'mp' | 'bill', id: number) =>
  unstable_cache(() => readLinked(kind, id), ['editorials-source-links', kind, String(id)], { tags: [editorialLinksTag(kind, id)], revalidate: WEEK })());

export async function editorialsForMember(memberId: number): Promise<EditorialEntry[]> {
  return linkedFromDatabase('mp', memberId);
}

export async function editorialsForDepartment(deptSlug: string): Promise<EditorialListEntry[]> {
  return (await allEditorials()).filter((e) => (e.relatedDeptSlugs ?? []).includes(deptSlug));
}

export async function editorialsForBill(billId: number): Promise<EditorialEntry[]> {
  return linkedFromDatabase('bill', billId);
}

// The newest n pieces by publishedAt, ties in registry order (a stable sort), optionally filtered.
export async function newestEditorials(n: number, filter: (e: EditorialListEntry) => boolean = () => true): Promise<EditorialListEntry[]> {
  return (await allEditorials()).filter(filter).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, n);
}
