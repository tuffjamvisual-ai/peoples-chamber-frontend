import { SHOW_LEAGUE_TABLE, SHOW_YOUR_TAX_POUND, SHOW_BUDGET_CHOICES } from '@/lib/feature-flags';
import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { departments } from '@/lib/departments';
import { editorials } from '@/lib/editorials';
import { editorialModifiedIso } from '@/lib/JsonLd';
import { COMMITTEE_IDS } from '@/lib/committees';
import { topics } from '@/lib/topics';
import { SECTION_PAGES } from '@/lib/site-nav';
import { fetchMajorProjectKeys, projectHref } from '@/lib/major-projects';

const SITE = 'https://www.opengovt.uk';

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
// lastmod (owner's approval, 29 Oct 2026, Search Console): a URL carries a date only where we hold a true one, the
// editorial's facts last checked or publish date, the division date and the bill's last update. Every other entry
// has no lastModified, so a deploy no longer tells search engines that every page changed.
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
    { url: `${SITE}`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/bills`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/mps`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/departments`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/transparency`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/transparency/register-of-interests`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/money`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/reports`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/laws`, changeFrequency: 'weekly', priority: 0.8 },
    // Laws made without a vote and treaties, from UK Parliament's APIs (report 81).
    { url: `${SITE}/laws/made-without-a-vote`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/treaties`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/polls`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/expenses`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/expenses/refused`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/explainers/donations`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/donors`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/secretariats`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/transparency/special-advisers`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/transparency/ministerial-directions`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/transparency/major-projects`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/transparency/freedom-of-information`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/civil-service`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/spending`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/donations/foreign`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/late-disclosed`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/trust-funded`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/impermissible`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/bequest`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/leadership-contests`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/sponsored-visits`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/government-contractors`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/donations/constituencies`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/donations/double-dip`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/appg-funders`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.8 },
    // Cookies and cookie settings (29 Oct 2026).
    { url: `${SITE}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/cookies/details`, changeFrequency: 'yearly', priority: 0.3 },
    // Commission research (launched 24 Oct 2026).
    { url: `${SITE}/commission`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/commission/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/newsletter`, changeFrequency: 'monthly', priority: 0.6 },
    ...(SHOW_YOUR_TAX_POUND ? [{ url: `${SITE}/your-tax-pound`, changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...(SHOW_BUDGET_CHOICES ? [{ url: `${SITE}/budget-trade-offs`, changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    { url: `${SITE}/councils`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/sewage`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/councils/blue-badges`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/councils/children-in-care`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/councils/road-condition`, changeFrequency: 'yearly', priority: 0.7 },
    ...(SHOW_LEAGUE_TABLE ? [{ url: `${SITE}/councils/league-table`, changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    { url: `${SITE}/second-jobs`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/lobbying`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/organisations`, changeFrequency: 'weekly', priority: 0.7 },
    // Everything on the site, A to Z (owner, 27 Oct 2026).
    { url: `${SITE}/directory`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/committees`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/topics`, changeFrequency: 'weekly', priority: 0.8 },
    // The parties index and the 2024 manifesto comparison, which moved from /parties (report 64).
    { url: `${SITE}/parties`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/parties/manifestos`, changeFrequency: 'monthly', priority: 0.7 },
    // The section pages the header links to (report 60).
    ...SECTION_PAGES.map((s) => ({ url: `${SITE}/sections/${s.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${SITE}/divisions`, changeFrequency: 'daily', priority: 0.8 },
  ];

  const transparencyEntries: MetadataRoute.Sitemap = transparencySections.map((s) => ({
    url: `${SITE}/transparency/${s}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const deptEntries: MetadataRoute.Sitemap = departments.map((d) => ({
    url: `${SITE}/departments/${d.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Every editorial registered in lib/editorials, driven off the registry
  // so new pieces are picked up automatically (no hardcoded slug list).
  // Briefings live at /briefings/<slug> (their /editorials/ address only redirects there).
  const editorialEntries: MetadataRoute.Sitemap = Object.values(editorials).map((e) => ({
    url: `${SITE}/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`,
    // The date the report's facts were last checked, else its publish date: the same rule as its NewsArticle
    // dateModified (lib/JsonLd.tsx editorialModifiedIso).
    lastModified: (() => { const iso = editorialModifiedIso(e.evidence?.lastChecked, e.publishedAt); return iso ? new Date(iso) : now; })(),
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  // Guard: abort the build if either materialized view is stale or unexpectedly small.
  // sitemap_refresh_state is RLS-protected; anon reads via SECURITY DEFINER function.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  type RefreshState = { view_name: string; refreshed_at: string; row_count: number };
  const { data: refreshStates, error: stateError } = await supabase.rpc('get_sitemap_refresh_state');
  if (stateError) throw new Error(`sitemap: get_sitemap_refresh_state failed: ${stateError.message}`);
  const stateMap = new Map(((refreshStates as RefreshState[]) || []).map((r) => [r.view_name, r]));
  for (const [viewName, floor] of [['sitemap_bill_ids', 50], ['sitemap_divisions', 2000]] as [string, number][]) {
    const state = stateMap.get(viewName);
    if (!state) throw new Error(`sitemap: ${viewName} missing from sitemap_refresh_state; run refresh_sitemap_views() or check migration`);
    const ageMs = Date.now() - new Date(state.refreshed_at).getTime();
    if (ageMs > SEVEN_DAYS_MS) {
      const ageDays = (ageMs / (1000 * 60 * 60 * 24)).toFixed(1);
      throw new Error(`sitemap: ${viewName} last refreshed ${ageDays} days ago; exceeds 7-day limit`);
    }
    if (state.row_count < floor) throw new Error(`sitemap: ${viewName} had only ${state.row_count} rows at last refresh (floor: ${floor})`);
  }

  // Party sub-pages: /parties/[slug], /bio, /money for every party row
  // that has an EC recipient_name (parties with no donations register
  // entry don't get a /money page).
  const parties = await fetchAllRows<{ slug: string; recipient_name: string | null; mp_party_string: string | null }>(
    'parties',
    'slug, recipient_name, mp_party_string',
    (q) => q.order('slug', { ascending: true }),
  );
  const partyEntries: MetadataRoute.Sitemap = [];
  for (const p of parties) {
    partyEntries.push({ url: `${SITE}/parties/${p.slug}`, changeFrequency: 'weekly', priority: 0.7 });
    partyEntries.push({ url: `${SITE}/parties/${p.slug}/bio`, changeFrequency: 'weekly', priority: 0.7 });
    if (p.recipient_name) {
      partyEntries.push({ url: `${SITE}/parties/${p.slug}/money`, changeFrequency: 'weekly', priority: 0.8 });
    }
    if (p.mp_party_string) {
      partyEntries.push({ url: `${SITE}/parties/${p.slug}/whip`, changeFrequency: 'weekly', priority: 0.7 });
    }
  }

  // Ship ONLY indexable bills, mirroring the bill page's noindex rule EXACTLY so
  // the sitemap never lists a noindexed URL (previously ~1,000 inert bills were
  // both sitemapped AND noindexed → "Submitted URL marked 'noindex'" in GSC).
  // A bill is indexable iff it has >=1 recorded Commons division vote (hasVotes)
  // OR its status is an active stage OR it became an Act OR it had a Commons
  // division (bill-level fields, since per-MP mp_division_votes is sparse).
  // KEEP THIS PREDICATE IN SYNC WITH app/bills/[id]/page.tsx generateMetadata —
  // the boolean below is byte-for-byte the same as that route's.
  const ACTIVE_STAGE = /committee|report|3rd reading|third reading|consideration/;
  const votedBillIdRows = await fetchAllRows<{ bill_id: number }>(
    'sitemap_bill_ids',
    'bill_id',
    (q) => q.order('bill_id', { ascending: true }),
  );
  const votedBillIds = new Set<number>(votedBillIdRows.map((r) => r.bill_id));
  // Hidden bills (bill.hidden_reason: duplicates, bad records) are never listed; their pages return 404.
  const allBills = await fetchAllRows<{ id: number; status: string | null; is_act: boolean | null; commons_division_id: number | null; last_update: string | null }>(
    'bill',
    'id, status, is_act, commons_division_id, last_update',
    // Ordered by id so paging is stable (24 Oct 2026, report 36): unordered pages can repeat or skip rows.
    (q) => q.is('hidden_reason', null).order('id', { ascending: true }),
  );
  const bills = allBills.filter((b) => {
    const hasVotes = votedBillIds.has(b.id);
    const activeStage = ACTIVE_STAGE.test((b.status || '').toLowerCase());
    const isAct = b.is_act === true;
    const hasDivision = b.commons_division_id != null;
    return hasVotes || activeStage || isAct || hasDivision;
  });
  // A bill's last update from the Bills API, where it is a valid date; otherwise no date is claimed.
  const billEntries: MetadataRoute.Sitemap = bills.map((b) => {
    const updated = b.last_update ? new Date(b.last_update) : null;
    return {
      url: `${SITE}/bills/${b.id}`,
      ...(updated && !Number.isNaN(updated.getTime()) ? { lastModified: updated } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    };
  });

  const mps = await fetchAllRows<{ member_id: number }>(
    'mps',
    'member_id',
    (q) => q.eq('current_member', true),
  );
  // No lastModified for MPs: on 29 Oct 2026, 638 of 650 current MPs (98.2 per cent) shared one updated_at date, so it
  // does not say when a profile changed.
  const mpEntries: MetadataRoute.Sitemap = mps.map((m) => ({
    url: `${SITE}/mps/${m.member_id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Republished GOV.UK press releases (/news/[slug]) are not listed: they are word-for-word
  // copies of GOV.UK pages, so they are noindex and Google is pointed at the originals
  // (Search Console review, 16 Oct 2026: 4,923 of 10,425 sitemap URLs were these copies).

  // Every UK principal local authority — 382 councils across England,
  // Scotland, Wales and Northern Ireland. Per-council pages at
  // /councils/[slug] were previously orphaned (no sitemap entry); added
  // 2026-06-04 alongside the press release entries.
  const councils = await fetchAllRows<{ slug: string }>('councils', 'slug', (q) => q.order('slug', { ascending: true }));
  const councilEntries: MetadataRoute.Sitemap = councils.map((c) => ({
    url: `${SITE}/councils/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Division detail pages — every distinct (date, division_number) pair.
  // Read from sitemap_divisions (materialized view, refreshed nightly by
  // refresh_sitemap_views()), which precomputes the DISTINCT over 1.14M
  // rows in mp_division_votes so the build sees a 2k-row table scan
  // instead of the full heap walk that caused build timeouts (57014).
  const divisions = await fetchAllRows<{ division_date_only: string | null; division_number: number | null }>(
    'sitemap_divisions',
    'division_date_only, division_number',
    (q) => q.order('division_date_only', { ascending: true }).order('division_number', { ascending: true }),
  );
  const divisionEntries: MetadataRoute.Sitemap = divisions
    .filter((d) => d.division_date_only && d.division_number != null)
    .map((d) => ({
      url: `${SITE}/divisions/pw-${d.division_date_only}-${d.division_number}-commons`,
      lastModified: new Date(d.division_date_only as string),
      changeFrequency: 'yearly' as const,    // divisions are immutable once recorded
      priority: 0.5,
    }));

  // Committee profile pages — 29 select committee IDs from lib/committees.ts.
  // Membership changes nightly; weekly changeFrequency matches the sync cadence.
  const committeeEntries: MetadataRoute.Sitemap = COMMITTEE_IDS.map((id) => ({
    url: `${SITE}/committees/${id}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Topic pages and lobbying organisation pages were reachable only through links
  // (search engine check, 16 Oct 2026).
  const topicEntries: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${SITE}/topics/${t.slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  const lobbyOrgs = await fetchAllRows<{ slug: string }>('lobby_org_rankings', 'slug', (q) => q.order('org_id'));
  const lobbyEntries: MetadataRoute.Sitemap = lobbyOrgs.filter((o) => o.slug).map((o) => ({
    url: `${SITE}/lobbying/${o.slug}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  // Organisation pages (report 71), one per organisation_index row. A failed read leaves them out rather than failing
  // the sitemap.
  const orgSlugs = await fetchAllRows<{ slug: string }>('organisation_index', 'slug', (q) => q.order('slug')).catch(() => [] as { slug: string }[]);
  const orgEntries: MetadataRoute.Sitemap = orgSlugs.map((o) => ({
    url: `${SITE}/organisations/${o.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Major project pages (/transparency/major-projects/<project_key>), one per project in major_projects.
  // The annual reports come out once a year; a failed read leaves them out rather than failing the sitemap.
  const majorProjectKeys = await fetchMajorProjectKeys().catch(() => [] as string[]);
  const majorProjectEntries: MetadataRoute.Sitemap = majorProjectKeys.map((k) => ({
    url: `${SITE}${projectHref(k)}`,
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  // The bill archive: /bills/sessions and one page per session that has bills. The current session changes daily;
  // past sessions rarely. A failed read leaves the session pages out rather than failing the sitemap.
  const billSessionIds = await fetchAllRows<{ session_id: number; is_current: boolean }>('parliament_session_bill_counts', 'session_id, is_current', (q) => q.order('session_id', { ascending: true })).catch(() => []);
  const billSessionEntries: MetadataRoute.Sitemap = [
    { url: `${SITE}/bills/sessions`, changeFrequency: 'weekly', priority: 0.6 },
    ...billSessionIds.map((r) => ({
      url: `${SITE}/bills/sessions/${r.session_id}`,
        changeFrequency: r.is_current ? ('daily' as const) : ('yearly' as const),
      priority: r.is_current ? 0.6 : 0.4,
    })),
  ];

  return [
    ...staticEntries,
    ...topicEntries,
    ...lobbyEntries,
    ...orgEntries,
    ...transparencyEntries,
    ...deptEntries,
    ...editorialEntries,
    ...partyEntries,
    ...billEntries,
    ...billSessionEntries,
    ...mpEntries,
    ...councilEntries,
    ...divisionEntries,
    ...committeeEntries,
    ...majorProjectEntries,
  ];
}
