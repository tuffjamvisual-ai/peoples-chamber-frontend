// The single way the site gets editorials (owner's approval, 29 Oct 2026, "go stage B"). Behind a switch:
//   EDITORIALS_FROM_DB unset (the default, and production until it is switched): exactly the code registry
//     (lib/editorials, in its order) and the topics' editorialSlugs (lib/topics.ts), as before.
//   EDITORIALS_FROM_DB=1: the editorials table, read with the server key (server only), rebuilt into EditorialEntry
//     objects the same way as scripts/checks/editorials-db-roundtrip.ts, unpublished rows left out, in registry_order;
//     topic lists from topic_positions. Reads go through unstable_cache for a week under the 'editorials' tag (one piece
//     by slug also under 'editorial:<slug>'), deduplicated within a render by React cache, and refreshed by
//     node scripts/revalidate.js --tag editorials after a publish (scripts/publish-editorial.ts does it).
//     MP and bill pages read only the pieces linked to them (cache Stage 2a, owner, 30 Oct 2026), under
//     'editorial-links:mp:<id>' and 'editorial-links:bill:<id>' and not 'editorials', so a publish rebuilds only the MP
//     and bill pages the piece names, before or after the change. Nothing here reads cookies, headers or no-store, so
//     every route renders in the same mode as with the switch off.
// Every consumer orders pieces exactly as it did from the code, so switching gives the same pages
// (scripts/checks/editorials-source-compare.ts).
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { editorials as registry } from '@/lib/editorials';
import { topics } from '@/lib/topics';
import type { EditorialEntry } from '@/lib/editorials/types';

export const EDITORIALS_FROM_DB = process.env.EDITORIALS_FROM_DB === '1';

type Row = Record<string, unknown>;
export type EditorialSet = {
  list: EditorialEntry[];                        // registry order
  bySlug: Record<string, EditorialEntry>;
  topicSlugs: Record<string, string[]>;           // each topic's editorial slugs, in its order
};

const WEEK = 604800;   // owner, 30 Oct 2026 (was a day): a publish refreshes the tags straight away
const COLUMNS = 'slug, headline, standfirst, summary, published_at, author_byline, kind, kicker, body_json, related_dept_slugs, related_member_ids, related_bill_ids, opinion, hero_image, hero_alt, evidence, update_note, related_programme_slugs, explore, read_next, topic_positions, registry_order, unpublished';

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
    // Plain fetch: the code copy is used as written (quoted official titles keep their dashes), so the database copy is too.
  });
}

// A row back into an EditorialEntry: NULL is an absent field; the three older related_* arrays store absent as empty.
function fromRow(r: Row): EditorialEntry {
  const e: Record<string, unknown> = {
    slug: r.slug, headline: r.headline, standfirst: r.standfirst, publishedAt: r.published_at, authorByline: r.author_byline, body: r.body_json,
  };
  const optional: [string, string][] = [
    ['summary', 'summary'], ['kind', 'kind'], ['kicker', 'kicker'], ['opinion', 'opinion'], ['heroImage', 'hero_image'], ['heroAlt', 'hero_alt'],
    ['evidence', 'evidence'], ['updateNote', 'update_note'], ['relatedProgrammeSlugs', 'related_programme_slugs'], ['explore', 'explore'], ['readNext', 'read_next'],
  ];
  for (const [field, col] of optional) if (r[col] !== null && r[col] !== undefined) e[field] = r[col];
  for (const [field, col] of [['relatedDeptSlugs', 'related_dept_slugs'], ['relatedMemberIds', 'related_member_ids'], ['relatedBillIds', 'related_bill_ids']]) {
    if (Array.isArray(r[col]) && (r[col] as unknown[]).length > 0) e[field] = r[col];
  }
  // Keys in the order the code objects are written in, so serialised output (JSON-LD) is the same.
  return e as unknown as EditorialEntry;
}

const fromCode: EditorialSet = {
  list: Object.values(registry),
  bySlug: registry,
  topicSlugs: Object.fromEntries(topics.map((t) => [t.slug, t.editorialSlugs])),
};

async function readSet(): Promise<EditorialSet> {
  const { data, error } = await client().from('editorials').select(COLUMNS).eq('unpublished', false).order('registry_order', { ascending: true, nullsFirst: false }).range(0, 4999);
  if (error) throw new Error(`editorials source: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  const list = rows.map(fromRow);
  const topicSlugs: Record<string, string[]> = {};
  for (const t of topics) {
    topicSlugs[t.slug] = rows
      .filter((r) => (r.topic_positions as Record<string, number> | null)?.[t.slug] !== undefined)
      .sort((a, b) => (a.topic_positions as Record<string, number>)[t.slug] - (b.topic_positions as Record<string, number>)[t.slug])
      .map((r) => r.slug as string);
  }
  return { list, bySlug: Object.fromEntries(list.map((e) => [e.slug, e])), topicSlugs };
}

const fromDatabase = cache(unstable_cache(readSet, ['editorials-source-set'], { tags: ['editorials'], revalidate: WEEK }));

async function readOne(slug: string): Promise<EditorialEntry | null> {
  const { data, error } = await client().from('editorials').select(COLUMNS).eq('slug', slug).eq('unpublished', false).maybeSingle();
  if (error) throw new Error(`editorials source: ${error.message}`);
  return data ? fromRow(data as unknown as Row) : null;
}

const oneFromDatabase = cache((slug: string) =>
  unstable_cache(() => readOne(slug), ['editorials-source-one', slug], { tags: ['editorials', `editorial:${slug}`], revalidate: WEEK })());

// Every published piece, its lookup by slug, and the topics' lists.
export async function editorialSet(): Promise<EditorialSet> {
  return EDITORIALS_FROM_DB ? fromDatabase() : fromCode;
}

export async function allEditorials(): Promise<EditorialEntry[]> {
  return (await editorialSet()).list;
}

export async function editorialsBySlug(): Promise<Record<string, EditorialEntry>> {
  return (await editorialSet()).bySlug;
}

// One piece by slug (undefined if there is none or it is unpublished); `kind` narrows it.
export async function getEditorial(slug: string, kind?: 'briefing' | 'investigation'): Promise<EditorialEntry | undefined> {
  let piece: EditorialEntry | undefined;
  if (!EDITORIALS_FROM_DB) piece = registry[slug];
  else piece = (await oneFromDatabase(slug)) ?? undefined;
  if (!piece || !kind) return piece;
  return (kind === 'briefing') === (piece.kind === 'briefing') ? piece : undefined;
}

// Slugs for generateStaticParams: investigations, briefings or all.
export async function editorialSlugsFor(kind?: 'briefing' | 'investigation'): Promise<string[]> {
  return (await allEditorials()).filter((e) => !kind || (kind === 'briefing') === (e.kind === 'briefing')).map((e) => e.slug);
}

// A topic's editorial slugs in its order (from the code these may include slugs not published; callers look them up).
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
  if (EDITORIALS_FROM_DB) return linkedFromDatabase('mp', memberId);
  return fromCode.list.filter((e) => (e.relatedMemberIds ?? []).includes(memberId));
}

export async function editorialsForDepartment(deptSlug: string): Promise<EditorialEntry[]> {
  return (await allEditorials()).filter((e) => (e.relatedDeptSlugs ?? []).includes(deptSlug));
}

export async function editorialsForBill(billId: number): Promise<EditorialEntry[]> {
  if (EDITORIALS_FROM_DB) return linkedFromDatabase('bill', billId);
  return fromCode.list.filter((e) => (e.relatedBillIds ?? []).includes(billId));
}

// The newest n pieces by publishedAt, ties in registry order (a stable sort), optionally filtered.
export async function newestEditorials(n: number, filter: (e: EditorialEntry) => boolean = () => true): Promise<EditorialEntry[]> {
  return (await allEditorials()).filter(filter).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, n);
}
