// The sitemap's parts (T1-SITEMAP (c), Cowork 13 Nov 2026, COWORK-TO-T1 ENTRY 8): each part is built from the database
// once and kept, compressed (lib/sitemap/xml.ts), in a data cache under the tag 'sitemap' and its own tags, for a day.
// A publish or sync refresh of a part's tags (scripts/revalidate.js, which now expires tags at once) makes the next
// request build it again; there are no hourly reads. /sitemap.xml is the main part (every page the old app/sitemap.ts
// listed); the new page types are their own parts, listed with it in /sitemap-index.xml.
//
// Each new type lists a page only when it has real content and is not noindex, as its page decides:
//   donors                 every donor page (lib/donor-registry.ts) except minor spellings, which are noindex
//                          (lib/donor-related.ts minorSpellingSlugs, the rule of mainSpellingFor)
//   secretariats           every APPG secretariat named in appgs (the page's own list)
//   people                 every person in person_cache (the page answers 404 without a row)
//   agencies               every agency in agency_cache (likewise)
//   statutory-instruments  every instrument in statutory_instruments (by its API id) and every division on an
//                          instrument in statutory_instrument (by its division id): both page kinds
//   news                   recent press releases whose page is indexable (ENTRY 368 GO): the "What the record shows"
//                          box adds enough (lib/news-record-core.ts newsRecordIndexable, the page's own test); only
//                          releases of the last 30 days are judged (lib/news-record.ts indexableNewsSlugs, its cost)
// lastmod (Cowork ENTRY 531 item 1, owner approved 23 Nov 2026; the owner's 7 Nov rule: when OUR page last changed, the
// later of the rows' load or last change and the content's own date, where a load time is held): donors, the newest
// published (else reported, then accepted) date of their donations, content dates only, as the donations' updated_at is
// a bulk sync touch, not a load (lib/sitemap/dates.ts); instruments, the newest of the laid, made and in force dates and
// the row's updated_at (a load); their division pages, the later of the division date and the row's updated_at;
// secretariats, the later of the newest register edition of the APPGs listed and their scraped_at (the load); news, the
// release's publish date only, as fetched_at moves on every re-fetch (142 of 329 releases of the last 30 days were
// fetched again days after publishing, 23 Nov 2026), so it is a sync time, not a load. People and agencies stay undated: their rows hold only fetch and
// sync times, which say when we looked, not when the content changed.
// Left out on purpose: debates (a debate page decides noindex from its content, read live from Hansard) and contracts
// (held for the owner: about 235,000 pages).
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';
import { donorRegistry } from '@/lib/donor-registry';
import { minorSpellingSlugs } from '@/lib/donor-name-match';
import { secretariatNameToSlug } from '@/lib/secretariat-slug';
import { isApiId } from '@/lib/si-treaties-data';
import { indexableNews, NEWS_SITEMAP_TAGS } from '@/lib/news-record';
import { donationDates } from './dates';
import { buildMainEntries, newest, validDates } from './main';
import { SITE, pack, unpack, type SitemapEntry } from './xml';

const DAY = 86400;
// The cache key's version: v2 since the parts carry dates (ENTRY 531), so no undated copy is served after a deploy.

type Part = { build: () => Promise<SitemapEntry[]>; tags: string[] };

const slugEntries = (base: string, slugs: Iterable<string>, changeFrequency = 'monthly', priority = 0.4): SitemapEntry[] =>
  [...new Set(slugs)].filter(Boolean).sort().map((s) => ({ url: `${SITE}${base}/${encodeURIComponent(s)}`, changeFrequency, priority }));
// The same, with each page's own date where it has one (the newest of its dates, no later than today; none before 1970).
const datedEntries = (base: string, slugDates: Map<string, (string | null | undefined)[]>, changeFrequency = 'monthly', priority = 0.4): SitemapEntry[] =>
  validDates([...slugDates].filter(([s]) => s).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([s, ds]) => {
    const d = newest(...ds);
    return { url: `${SITE}${base}/${encodeURIComponent(s)}`, changeFrequency: changeFrequency as 'monthly', priority, ...(d ? { lastModified: d } : {}) };
  })) as SitemapEntry[];
const collect = (pairs: [string, string | null | undefined][]) => {
  const m = new Map<string, (string | null | undefined)[]>();
  for (const [k, d] of pairs) { const l = m.get(k) ?? []; l.push(d); m.set(k, l); }
  return m;
};

export const PARTS: Record<string, Part> = {
  main: { build: async () => (await buildMainEntries()) as SitemapEntry[], tags: ['editorials'] },
  donors: {
    tags: ['sitemap:donors'],
    build: async () => {
      const { bySlug } = await donorRegistry();
      const minor = minorSpellingSlugs(bySlug.values());
      const dates = await donationDates();
      return datedEntries('/donors', new Map([...bySlug].filter(([s]) => !minor.has(s)).map(([s, e]) => [s, [dates.donor(e.names)]])), 'monthly', 0.4);
    },
  },
  secretariats: {
    tags: ['sitemap:secretariats'],
    build: async () => {
      const rows = await readAll<{ secretariat: string | null; register_edition: string | null; scraped_at: string | null }>(() => supabase.from('appgs'), { columns: 'slug, secretariat, register_edition, scraped_at', orderBy: 'slug', label: 'sitemap secretariats', filter: (q) => q.not('secretariat', 'is', null) });
      const slugOf = (r: { secretariat: string | null }) => secretariatNameToSlug(String(r.secretariat ?? ''));
      return datedEntries('/secretariats', collect(rows.flatMap((r) => [[slugOf(r), r.register_edition], [slugOf(r), r.scraped_at]] as [string, string | null][])), 'monthly', 0.4);
    },
  },
  people: {
    tags: ['sitemap:people'],
    build: async () => {
      const rows = await readAll<{ slug: string | null }>(() => supabase.from('person_cache'), { columns: 'slug', orderBy: 'slug', label: 'sitemap people' });
      return slugEntries('/people', rows.map((r) => String(r.slug ?? '')), 'monthly', 0.5);
    },
  },
  agencies: {
    tags: ['sitemap:agencies'],
    build: async () => {
      const rows = await readAll<{ slug: string | null }>(() => supabase.from('agency_cache'), { columns: 'slug', orderBy: 'slug', label: 'sitemap agencies' });
      return slugEntries('/agencies', rows.map((r) => String(r.slug ?? '')), 'monthly', 0.5);
    },
  },
  'statutory-instruments': {
    tags: ['sitemap:statutory-instruments'],
    build: async () => {
      const api = await readAll<{ api_id: string | null; laid_date: string | null; made_date: string | null; in_force_date: string | null; updated_at: string | null }>(() => supabase.from('statutory_instruments'), { columns: 'api_id, laid_date, made_date, in_force_date, updated_at', orderBy: 'api_id', label: 'sitemap statutory instruments' });
      const div = await readAll<{ division_id: number | null; date: string | null; updated_at: string | null }>(() => supabase.from('statutory_instrument'), { columns: 'division_id, date, updated_at', orderBy: 'division_id', label: 'sitemap statutory instrument divisions', filter: (q) => q.not('division_id', 'is', null) });
      return [
        ...datedEntries('/statutory-instruments', collect(api.filter((r) => isApiId(String(r.api_id ?? ''))).flatMap((r) => [[String(r.api_id), r.laid_date], [String(r.api_id), r.made_date], [String(r.api_id), r.in_force_date], [String(r.api_id), r.updated_at]] as [string, string | null][])), 'monthly', 0.4),
        ...datedEntries('/statutory-instruments', collect(div.flatMap((r) => [[String(r.division_id ?? ''), r.date], [String(r.division_id ?? ''), r.updated_at]] as [string, string | null][])), 'monthly', 0.4),
      ];
    },
  },
  news: {
    tags: NEWS_SITEMAP_TAGS,
    build: async () => datedEntries('/news', collect((await indexableNews()).map((n) => [n.slug, n.publishedAt])), 'monthly', 0.4),
  },
};

// One sitemap per page type (Cowork ENTRY 531 item 2, owner approved 23 Nov 2026): the record pages of these types move
// out of /sitemap.xml into /sitemaps/<type>.xml, cut from the same cached main build (no extra database reads); the list
// and hub pages (/divisions, /pmqs ...) stay in /sitemap.xml, where the hub coverage check looks for them. The same
// addresses in all, nothing added or removed. editorials also takes /briefings/<slug> (a report kind).
export const SPLIT_TYPES: Record<string, string[]> = {
  divisions: ['divisions'], pmqs: ['pmqs'], edms: ['edms'], organisations: ['organisations'], lobbying: ['lobbying'],
  lords: ['lords'], mps: ['mps'], constituencies: ['constituencies'], petitions: ['petitions'],
  recommendations: ['recommendations'], bills: ['bills'], editorials: ['editorials', 'briefings'], councils: ['councils'],
};
// The split type a main address belongs to: its first path part names the type and it has a second part (a record page,
// a year or month page, a session page), so the type's own list page stays in /sitemap.xml.
export function splitTypeOf(url: string): string | null {
  const parts = url.slice(SITE.length).split('/').filter(Boolean);
  if (parts.length < 2) return null;
  for (const [t, firsts] of Object.entries(SPLIT_TYPES)) if (firsts.includes(parts[0])) return t;
  return null;
}

export const TYPE_PARTS = [...Object.keys(SPLIT_TYPES), ...Object.keys(PARTS).filter((k) => k !== 'main')];

const cached = new Map<string, () => Promise<string>>();

// A part's entries: from the data cache, built when the cache has none (or its tags were refreshed). 'main' is
// /sitemap.xml: the main build without the split types' record pages; a split type is its share of the main build.
export async function partEntries(name: string): Promise<SitemapEntry[] | null> {
  if (name === 'main' || SPLIT_TYPES[name]) {
    const all = (await builtEntries('main')) ?? [];
    return name === 'main' ? all.filter((e) => !splitTypeOf(e.url)) : all.filter((e) => splitTypeOf(e.url) === name);
  }
  return builtEntries(name);
}

async function builtEntries(name: string): Promise<SitemapEntry[] | null> {
  const part = PARTS[name];
  if (!part) return null;
  let read = cached.get(name);
  if (!read) {
    read = unstable_cache(async () => pack(await part.build()), ['sitemap-part', name, 'v5'], { tags: ['sitemap', `sitemap:${name}`, ...part.tags], revalidate: DAY });
    cached.set(name, read);
  }
  return unpack(await read());
}
