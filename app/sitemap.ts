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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const transparencySections = [
    'ministers-meetings',
    'lobbyists',
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
    { url: `${SITE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const transparencyEntries: MetadataRoute.Sitemap = transparencySections.map((s) => ({
    url: `${SITE}/transparency/${s}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const [bills, mps] = await Promise.all([
    fetchAllRows<{ id: number }>('bill', 'id'),
    fetchAllRows<{ member_id: number }>('mps', 'member_id', (q) => q.eq('current_member', true)),
  ]);

  const billEntries: MetadataRoute.Sitemap = bills.map((b) => ({
    url: `${SITE}/bills/${b.id}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  const mpEntries: MetadataRoute.Sitemap = mps.map((m) => ({
    url: `${SITE}/mps/${m.member_id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const deptEntries: MetadataRoute.Sitemap = departments.map((d) => ({
    url: `${SITE}/departments/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...transparencyEntries,
    ...billEntries,
    ...mpEntries,
    ...deptEntries,
  ];
}
