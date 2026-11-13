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
// No lastmod: none of these records holds a date for the page as a whole (the file's rule: a true date or none).
// Left out on purpose: debates (a debate page decides noindex from its content, read live from Hansard) and contracts
// (held for the owner: about 235,000 pages).
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';
import { donorRegistry } from '@/lib/donor-registry';
import { minorSpellingSlugs } from '@/lib/donor-name-match';
import { secretariatNameToSlug } from '@/lib/secretariat-slug';
import { isApiId } from '@/lib/si-treaties-data';
import { buildMainEntries } from './main';
import { SITE, pack, unpack, type SitemapEntry } from './xml';

const DAY = 86400;

type Part = { build: () => Promise<SitemapEntry[]>; tags: string[] };

const slugEntries = (base: string, slugs: Iterable<string>, changeFrequency = 'monthly', priority = 0.4): SitemapEntry[] =>
  [...new Set(slugs)].filter(Boolean).sort().map((s) => ({ url: `${SITE}${base}/${encodeURIComponent(s)}`, changeFrequency, priority }));

export const PARTS: Record<string, Part> = {
  main: { build: async () => (await buildMainEntries()) as SitemapEntry[], tags: ['editorials'] },
  donors: {
    tags: ['sitemap:donors'],
    build: async () => {
      const { bySlug } = await donorRegistry();
      const minor = minorSpellingSlugs(bySlug.values());
      return slugEntries('/donors', [...bySlug.keys()].filter((s) => !minor.has(s)), 'monthly', 0.4);
    },
  },
  secretariats: {
    tags: ['sitemap:secretariats'],
    build: async () => {
      const rows = await readAll<{ secretariat: string | null }>(() => supabase.from('appgs'), { columns: 'slug, secretariat', orderBy: 'slug', label: 'sitemap secretariats', filter: (q) => q.not('secretariat', 'is', null) });
      return slugEntries('/secretariats', rows.map((r) => secretariatNameToSlug(String(r.secretariat ?? ''))), 'monthly', 0.4);
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
      const api = await readAll<{ api_id: string | null }>(() => supabase.from('statutory_instruments'), { columns: 'api_id', orderBy: 'api_id', label: 'sitemap statutory instruments' });
      const div = await readAll<{ division_id: number | null }>(() => supabase.from('statutory_instrument'), { columns: 'division_id', orderBy: 'division_id', label: 'sitemap statutory instrument divisions', filter: (q) => q.not('division_id', 'is', null) });
      return [
        ...slugEntries('/statutory-instruments', api.map((r) => String(r.api_id ?? '')).filter(isApiId), 'monthly', 0.4),
        ...slugEntries('/statutory-instruments', div.map((r) => String(r.division_id ?? '')), 'monthly', 0.4),
      ];
    },
  },
};

export const TYPE_PARTS = Object.keys(PARTS).filter((k) => k !== 'main');

const cached = new Map<string, () => Promise<string>>();

// A part's entries: from the data cache, built when the cache has none (or its tags were refreshed).
export async function partEntries(name: string): Promise<SitemapEntry[] | null> {
  const part = PARTS[name];
  if (!part) return null;
  let read = cached.get(name);
  if (!read) {
    read = unstable_cache(async () => pack(await part.build()), ['sitemap-part', name, 'v1'], { tags: ['sitemap', `sitemap:${name}`, ...part.tags], revalidate: DAY });
    cached.set(name, read);
  }
  return unpack(await read());
}
