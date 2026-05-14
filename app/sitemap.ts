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

// Sitemap index — Next.js auto-builds /sitemap.xml that references
// /sitemap/main.xml, /sitemap/bills.xml, /sitemap/mps.xml.
export async function generateSitemaps() {
  return [
    { id: 'main' },
    { id: 'bills' },
    { id: 'mps' },
  ];
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  if (id === 'main') {
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

    const deptEntries: MetadataRoute.Sitemap = departments.map((d) => ({
      url: `${SITE}/departments/${d.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticEntries, ...transparencyEntries, ...deptEntries];
  }

  if (id === 'bills') {
    const bills = await fetchAllRows<{ id: number }>('bill', 'id');
    return bills.map((b) => ({
      url: `${SITE}/bills/${b.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    }));
  }

  if (id === 'mps') {
    const mps = await fetchAllRows<{ member_id: number }>(
      'mps',
      'member_id',
      (q) => q.eq('current_member', true),
    );
    return mps.map((m) => ({
      url: `${SITE}/mps/${m.member_id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  }

  return [];
}
