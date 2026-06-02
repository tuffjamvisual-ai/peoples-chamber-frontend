import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { departments } from '@/lib/departments';

const SITE = 'https://www.thepeopleschamber.uk';

export const revalidate = 86400;

type SupabaseQuery = ReturnType<ReturnType<typeof supabase.from>['select']>;

async function fetchAllRows<T>(
  table: string,
  column: string,
  filter?: (q: SupabaseQuery) => SupabaseQuery,
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let from = 0;
  const out: T[] = [];
  for (;;) {
    let query: SupabaseQuery = supabase.from(table).select(column);
    if (filter) query = filter(query);
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

// Single sitemap served at /sitemap.xml (matching robots.txt).
//
// Previously this used generateSitemaps() to split output across
// /sitemap/main.xml, /sitemap/bills.xml, /sitemap/mps.xml. That was broken on
// two counts: (1) Next never produced a /sitemap.xml index (robots.txt 404'd),
// and (2) under Next 16 the `id` arg is a Promise<string>, but the code compared
// it as a plain string, so every section fell through to an empty result.
// Total URL count (static + transparency + departments + ~3.9k bills + 650 MPs)
// is well under the 50k single-sitemap limit, so one file is simplest.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 'lobbyists' removed 2026-06-02 — see app/transparency/page.tsx.
  const transparencySections = [
    'ministers-meetings',
    'appgs',
    'hospitality',
    'revolving-door',
    'donations',
    'contracts',
    'companies',
  ];

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE}`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/bills`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/mps`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/departments`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/transparency`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/laws`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/polls`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/expenses`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const transparencyEntries: MetadataRoute.Sitemap = transparencySections.map((s) => ({
    url: `${SITE}/transparency/${s}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const deptEntries: MetadataRoute.Sitemap = departments.map((d) => ({
    url: `${SITE}/departments/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const bills = await fetchAllRows<{ id: number }>('bill', 'id');
  const billEntries: MetadataRoute.Sitemap = bills.map((b) => ({
    url: `${SITE}/bills/${b.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const mps = await fetchAllRows<{ member_id: number }>(
    'mps',
    'member_id',
    (q) => q.eq('current_member', true),
  );
  const mpEntries: MetadataRoute.Sitemap = mps.map((m) => ({
    url: `${SITE}/mps/${m.member_id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...transparencyEntries,
    ...deptEntries,
    ...billEntries,
    ...mpEntries,
  ];
}
