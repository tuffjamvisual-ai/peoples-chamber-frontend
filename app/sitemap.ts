import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { departments } from '@/lib/departments';
import { editorials } from '@/lib/editorials';

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
    { url: `${SITE}/money`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/editorials`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/laws`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/polls`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/expenses`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/expenses/refused`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/explainers/donations`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/donors`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/secretariats`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/transparency/special-advisers`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/civil-service`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/spending`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/donations/foreign`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/late-disclosed`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/trust-funded`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/impermissible`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/bequest`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/leadership-contests`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/sponsored-visits`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/government-contractors`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/donations/constituencies`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/double-dip`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/appg-funders`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
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

  // Every editorial registered in lib/editorials, driven off the registry
  // so new pieces are picked up automatically (no hardcoded slug list).
  const editorialEntries: MetadataRoute.Sitemap = Object.values(editorials).map((e) => ({
    url: `${SITE}/editorials/${e.slug}`,
    lastModified: e.publishedAt ? new Date(e.publishedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  // Party sub-pages: /parties/[slug], /bio, /money for every party row
  // that has an EC recipient_name (parties with no donations register
  // entry don't get a /money page).
  const parties = await fetchAllRows<{ slug: string; recipient_name: string | null; mp_party_string: string | null }>(
    'parties',
    'slug, recipient_name, mp_party_string',
  );
  const partyEntries: MetadataRoute.Sitemap = [];
  for (const p of parties) {
    partyEntries.push({ url: `${SITE}/parties/${p.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
    partyEntries.push({ url: `${SITE}/parties/${p.slug}/bio`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
    if (p.recipient_name) {
      partyEntries.push({ url: `${SITE}/parties/${p.slug}/money`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
    }
    if (p.mp_party_string) {
      partyEntries.push({ url: `${SITE}/parties/${p.slug}/whip`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
    }
  }

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
  //
  // Read from the commons_divisions_distinct view (SELECT DISTINCT over
  // mp_division_votes, NULLs already excluded) rather than pulling all
  // ~268k vote rows and deduping in JS — the view returns ~597 rows in a
  // single page. The null filter below is belt-and-suspenders.
  const divisions = await fetchAllRows<{ division_date_only: string | null; division_number: number | null }>(
    'commons_divisions_distinct',
    'division_date_only, division_number',
  );
  const divisionEntries: MetadataRoute.Sitemap = divisions
    .filter((d) => d.division_date_only && d.division_number != null)
    .map((d) => ({
      url: `${SITE}/divisions/pw-${d.division_date_only}-${d.division_number}-commons`,
      lastModified: new Date(d.division_date_only as string),
      changeFrequency: 'yearly' as const,    // divisions are immutable once recorded
      priority: 0.5,
    }));

  return [
    ...staticEntries,
    ...transparencyEntries,
    ...deptEntries,
    ...editorialEntries,
    ...partyEntries,
    ...billEntries,
    ...mpEntries,
    ...newsEntries,
    ...councilEntries,
    ...divisionEntries,
  ];
}
