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

  // 'lobbyists' removed 2026-06-02. 'companies' removed 2026-06-03.
  // 'press-releases' added 2026-06-04 (7th transparency section; the
  // index page lists 100 most-recent releases, each linking through to
  // /news/[slug]).
  // See app/transparency/page.tsx for the full hub.
  const transparencySections = [
    'ministers-meetings',
    'appgs',
    'hospitality',
    'revolving-door',
    'donations',
    'contracts',
    'press-releases',
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
    { url: `${SITE}/expenses/refused`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/explainers/donations`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/donors`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/secretariats`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/foreign`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/late-disclosed`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/trust-funded`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/impermissible`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/your-tax-pound`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/budget-trade-offs`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/councils`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/council-tax`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/second-jobs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
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

  // Only ship bills with at least one substantive signal — a Commons
  // division on record, an active or known stage, or Royal Assent.
  // Drops ~2,700 thin bills (placeholder description, no division,
  // no stage) from the sitemap. They still serve 200 if accessed
  // directly; we just stop asking Google to crawl them. 2026-06-04
  // to clear Soft 404 + Duplicate-without-canonical signals flagged
  // in GSC.
  const bills = await fetchAllRows<{ id: number }>(
    'bill',
    'id',
    (q) =>
      q.or(
        'commons_division_id.not.is.null,is_act.eq.true,current_stage.not.is.null'
      ),
  );
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

  // Individual press release detail pages — same slug derivation as the
  // /transparency/press-releases index page. Cap at the 100 currently
  // retained (the sync trims older releases). 2026-06-04.
  const releases = await fetchAllRows<{ gov_url: string | null; published_at: string | null }>(
    'press_releases',
    'gov_url, published_at',
  );
  const newsEntries: MetadataRoute.Sitemap = releases
    .map((r) => {
      const match = r.gov_url?.match(/\/([a-z0-9-]+)\/?$/i);
      const slug = match ? match[1] : null;
      if (!slug) return null;
      return {
        url: `${SITE}/news/${slug}`,
        lastModified: r.published_at ? new Date(r.published_at) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // Every UK principal local authority — 382 councils across England,
  // Scotland, Wales and Northern Ireland. Per-council pages at
  // /councils/[slug] were previously orphaned (no sitemap entry); added
  // 2026-06-04 alongside the press release entries.
  const councils = await fetchAllRows<{ slug: string }>('councils', 'slug');
  const councilEntries: MetadataRoute.Sitemap = councils.map((c) => ({
    url: `${SITE}/councils/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Division detail pages — every distinct (date, division_number) in
  // mp_division_votes since the parlparse import (2026-06-05). The
  // natural-key tuple becomes the canonical slug pw-YYYY-MM-DD-N-commons.
  // Skipping rows where either column is NULL (legacy CVA rows before
  // phase 1 had NULL division_number; all are now backfilled, but the
  // guard is cheap insurance).
  const divisions = await fetchAllRows<{ division_date_only: string | null; division_number: number | null }>(
    'mp_division_votes',
    'division_date_only, division_number',
    (q) => q.not('division_date_only', 'is', null).not('division_number', 'is', null),
  );
  const uniqueDivisions = new Map<string, { date: string; num: number }>();
  for (const d of divisions) {
    if (!d.division_date_only || d.division_number == null) continue;
    const key = `${d.division_date_only}|${d.division_number}`;
    if (!uniqueDivisions.has(key)) uniqueDivisions.set(key, { date: d.division_date_only, num: d.division_number });
  }
  const divisionEntries: MetadataRoute.Sitemap = Array.from(uniqueDivisions.values()).map((d) => ({
    url: `${SITE}/divisions/pw-${d.date}-${d.num}-commons`,
    lastModified: new Date(d.date),
    changeFrequency: 'yearly' as const,    // divisions are immutable once recorded
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...transparencyEntries,
    ...deptEntries,
    ...billEntries,
    ...mpEntries,
    ...newsEntries,
    ...councilEntries,
    ...divisionEntries,
  ];
}
