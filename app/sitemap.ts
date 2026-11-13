import { SHOW_LEAGUE_TABLE, SHOW_YOUR_TAX_POUND, SHOW_BUDGET_CHOICES } from '@/lib/feature-flags';
import { partyVerdictShown } from '@/lib/party-verdict';
import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { departments } from '@/lib/departments';
import { allEditorials } from '@/lib/editorials-source';
import { pmqsSet } from '@/lib/pmqs';
import { archiveSessions } from '@/lib/pmqs-archive';
import { STANDARDS } from '@/lib/standards-cases';
import { allPetitions } from '@/lib/petition-pages';
import { allConstituencies } from '@/lib/constituency-pages';
import { edmSitemapRows } from '@/lib/edm-pages';
import { questionDepartmentStats } from '@/lib/question-pages';
import { QUESTION_DEPARTMENTS } from '@/lib/question-departments';
import { editorialModifiedIso } from '@/lib/JsonLd';
import { COMMITTEE_IDS } from '@/lib/committees';
import { topics } from '@/lib/topics';
import { SECTION_PAGES } from '@/lib/site-nav';
import { projectHref } from '@/lib/major-projects';
import { RECOMMENDATIONS_PUBLIC, allStatus, recPath, isBuildPhase, retrySoon } from '@/lib/pac';
import { divisionHref, yearHref } from '@/lib/division-links';
import { preFixedSummary } from '@/lib/pm-questions-1945-1961';
import { FORMER_MP_PROFILE_IDS } from '@/lib/former-mp-profile-ids';
import { billIndexable, currentSessionBillIds } from '@/lib/bill-indexing';
import { isLaw } from '@/lib/bill-status';

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
// Total URL count (about 23,400 in November 2026) is well under the 50k
// single-sitemap limit, so one file is simplest.
// lastmod (owner's approval, 29 Oct 2026, Search Console; widened 5 Nov 2026, visibility campaign item 13): a URL carries
// a date only where we hold a true one for that record, as each entry below says. Every other entry has no lastModified,
// so a deploy or a bulk import never tells search engines that every page changed.

// The newest of a record's dates, no later than today (a contract can carry a future date). Undefined when it has none.
function newest(...dates: (string | null | undefined)[]): Date | undefined {
  const today = new Date().toISOString().slice(0, 10);
  const d = dates.filter((x): x is string => !!x).map((x) => x.slice(0, 10)).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && x <= today).sort().pop();
  return d ? new Date(d) : undefined;
}
const dated = (d: Date | undefined) => (d ? { lastModified: d } : {});

// Archive pages (owner, 7 Nov 2026, Search Console "Invalid date": Google rejects lastmod before 1970). lastmod is when
// OUR page last changed, never the sitting or vote date: the later of the time the row was loaded into our database and
// changed_at. None of these tables has a load date column, so the load is the time its migration was applied:
//   pmqs_archive_exchanges (PMQs archive, 1961 to 2024): 2026-11-05h, committed by 21:05:02 GMT on 5 Nov 2026
//   historic_commons_divisions (votes, 2004 to 2016): 2026-11-06h, applied 15:01:52 GMT on 6 Nov 2026
//   pm_questions_1945_1961 (Questions to the Prime Minister, 1945 to 1961): 2026-11-06i, applied 22:59:53 GMT on 6 Nov 2026
const PMQS_ARCHIVE_LOADED = '2026-11-05T21:05:02Z';
const HISTORIC_DIVISIONS_LOADED = '2026-11-06T15:01:52Z';
const PM_QUESTIONS_1945_1961_LOADED = '2026-11-06T22:59:53Z';
// The later of a load time and changed_at, as an ISO timestamp.
const loadedOrChanged = (loaded: string, changedAt: string | null | undefined) => {
  const c = changedAt ? Date.parse(changedAt) : NaN;
  return new Date(Number.isFinite(c) && c > Date.parse(loaded) ? c : Date.parse(loaded)).toISOString();
};
// The last guard: no lastmod before 1970 or in the future; such an entry is listed with no date
// (scripts/checks/sitemap-dates-check.mjs fails the push check if one gets through).
const EARLIEST_LASTMOD = Date.parse('1970-01-01T00:00:00Z');
function validDates(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const now = Date.now();
  return entries.map((e) => {
    if (e.lastModified == null) return e;
    const t = new Date(e.lastModified).getTime();
    if (Number.isFinite(t) && t >= EARLIEST_LASTMOD && t <= now) return e;
    const { lastModified: _dropped, ...rest } = e; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    // This week in Parliament, linked from the homepage (MOB1, 8 Nov 2026). No lastModified: it is drawn from Parliament's
    // live feeds every 10 minutes, so there is no one true date for the page.
    { url: `${SITE}/this-week`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/mps`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/pmqs`, changeFrequency: 'monthly', priority: 0.6 },
    // The Commissioner for Standards cases (T1): dated by the day the lists were collected (lib/data/standards-cases.json).
    { url: `${SITE}/standards`, lastModified: new Date(`${STANDARDS.collected}T00:00:00Z`), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/lords`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/departments`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/transparency`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/transparency/register-of-interests`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/money`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/reports`, changeFrequency: 'weekly', priority: 0.8 },
    // The area finder itself (3 Nov 2026); its search and result views are noindex and never listed.
    { url: `${SITE}/your-area`, changeFrequency: 'weekly', priority: 0.7 },
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
    { url: `${SITE}/commission/sample`, changeFrequency: 'yearly', priority: 0.4 },
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
    { url: `${SITE}/register-history`, changeFrequency: 'yearly', priority: 0.5 },
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

  // Every session of Prime Minister's Questions we hold.
  const pmqsEntries: MetadataRoute.Sitemap = await pmqsSet().then((set) => set.sessions.map((p) => ({ url: `${SITE}/pmqs/${p.date}`, ...dated(newest(p.date)), changeFrequency: 'monthly' as const, priority: 0.5 }))).catch(() => []);

  // Every session in the PMQs archive, 1961 to 2024: the later of the archive's load and the last change to any of its rows (owner, 7 Nov 2026).
  // pmqs_archive_exchanges has no index on changed_at, so this read walks the whole table; on a busy build it can pass the
  // 8 s statement timeout (deploy of 60966e0b failed so, 7 Nov 2026). A failed read leaves those days at the archive's load
  // date rather than failing the sitemap and the build.
  const changedExchanges = await fetchAllRows<{ date: string; item_order: number; changed_at: string }>('pmqs_archive_exchanges', 'date, item_order, changed_at', (q) => q.not('changed_at', 'is', null).order('date').order('item_order'))
    .catch((e) => { console.error(`[sitemap] pmqs_archive_exchanges changed_at: ${e instanceof Error ? e.message : e}`); return [] as { date: string; item_order: number; changed_at: string }[]; });
  const pmqsDayChanged = new Map<string, string>();
  for (const r of changedExchanges) if (Date.parse(r.changed_at) > Date.parse(pmqsDayChanged.get(r.date) ?? '1970-01-01')) pmqsDayChanged.set(r.date, r.changed_at);
  const pmqsArchiveDays = (await archiveSessions()).map((p) => loadedOrChanged(PMQS_ARCHIVE_LOADED, pmqsDayChanged.get(p.date)));
  const pmqsArchiveEntries: MetadataRoute.Sitemap = (await archiveSessions()).map((p) => ({ url: `${SITE}/pmqs/${p.date}`, lastModified: new Date(loadedOrChanged(PMQS_ARCHIVE_LOADED, pmqsDayChanged.get(p.date))), changeFrequency: 'yearly' as const, priority: 0.4 }));
  // The archive's year folds have no address of their own: they sit on /pmqs, which takes the latest of the sessions it lists.
  const pmqsPage = staticEntries.find((e) => e.url === `${SITE}/pmqs`);
  const pmqsNewest = newest(...pmqsArchiveDays, ...pmqsEntries.map((e) => (e.lastModified ? new Date(e.lastModified).toISOString() : null)));
  if (pmqsPage && pmqsNewest) pmqsPage.lastModified = pmqsNewest;

  // /questions and each department's page, dated by the latest answer. Individual questions are not listed (owner, 6 Nov 2026).
  const questionStats = await questionDepartmentStats().catch(() => []);
  // Questions to the Prime Minister, 1945 to 1961: the notes page, dated by when these questions were added, and each day, dated by
  // its load (the table has no changed_at; no migration has changed it since).
  const preFixed = await preFixedSummary().catch(() => null);
  const preFixedEntries: MetadataRoute.Sitemap = preFixed ? [
    { url: `${SITE}/pmqs/1945-to-1961`, lastModified: new Date('2026-11-07'), changeFrequency: 'yearly', priority: 0.5 },
    ...preFixed.groups.flatMap((g) => g.years.flatMap((y) => y.days.map((d) => ({ url: `${SITE}/pmqs/1945-to-1961/${d.date}`, lastModified: new Date(PM_QUESTIONS_1945_1961_LOADED), changeFrequency: 'yearly' as const, priority: 0.4 })))),
  ] : [];

  const questionEntries: MetadataRoute.Sitemap = questionStats.length ? [
    { url: `${SITE}/questions`, ...dated(newest(...questionStats.map((r) => r.latest_answer))), changeFrequency: 'daily' as const, priority: 0.6 },
    ...QUESTION_DEPARTMENTS.map((d) => ({ url: `${SITE}/questions/department/${d.slug}`, ...dated(newest(questionStats.find((r) => r.answering_body_id === d.id)?.latest_answer)), changeFrequency: 'weekly' as const, priority: 0.5 })),
  ] : [];

  // /edms and each motion with 10 or more signatures, dated by its latest signature. Others stay indexable by link.
  const motionRows = await edmSitemapRows().catch(() => []);
  const motionEntries: MetadataRoute.Sitemap = motionRows.length ? [{ url: `${SITE}/edms`, ...dated(newest(...motionRows.map((m) => m.last))), changeFrequency: 'daily' as const, priority: 0.6 }, ...motionRows.map((m) => ({ url: `${SITE}/edms/${m.id}`, ...dated(newest(m.last)), changeFrequency: 'weekly' as const, priority: 0.4 }))] : [];

  // Every constituency page: dated by the seat's latest election or change of MP.
  const seatRows = await allConstituencies().catch(() => []);
  const constituencyEntries: MetadataRoute.Sitemap = seatRows.length ? [{ url: `${SITE}/constituencies`, ...dated(newest(...seatRows.map((c) => c.last_change))), changeFrequency: 'monthly' as const, priority: 0.6 }, ...seatRows.map((c) => ({ url: `${SITE}/constituencies/${c.slug}`, ...dated(newest(c.last_change)), changeFrequency: 'monthly' as const, priority: 0.5 }))] : [];

  // Every petition page: dated by its last change (the count or any other field, synced_at) or its response, whichever is later.
  const petitionRows = await allPetitions().catch(() => []);
  const petitionPageEntries: MetadataRoute.Sitemap = petitionRows.map((p) => ({ url: `${SITE}/petitions/${p.id}`, ...dated(newest(p.synced_at, p.government_response_on)), changeFrequency: 'weekly' as const, priority: 0.5 }));
  const petitionEntries: MetadataRoute.Sitemap = petitionRows.length ? [{ url: `${SITE}/petitions`, ...dated(newest(...petitionRows.flatMap((p) => [p.synced_at, p.government_response_on]))), changeFrequency: 'daily' as const, priority: 0.6 }, ...petitionPageEntries] : [];

  // Every published editorial in the database
  // so new pieces are picked up automatically (no hardcoded slug list).
  // Briefings live at /briefings/<slug> (their /editorials/ address only redirects there).
  const editorialEntries: MetadataRoute.Sitemap = (await allEditorials()).map((e) => ({
    url: `${SITE}/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`,
    // The report's latest stored update date, else its publish date: the same rule as its NewsArticle dateModified
    // (lib/JsonLd.tsx editorialModifiedIso; T1-UPDATED, 13 Nov 2026: never the facts checked date). Briefings: the publish date.
    ...(() => { const iso = editorialModifiedIso(e.kind === 'briefing' ? null : e.updateNote, e.publishedAt); return iso ? { lastModified: new Date(iso) } : {}; })(),
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  // Published daily briefings from the briefings table (owner, 5 Nov 2026), those not already listed above. Their lastmod is
  // the publish date: the table holds no facts last checked date. A failed read leaves them out.
  const editorialSlugs = new Set((await allEditorials()).map((e) => e.slug));
  const dbBriefings = await fetchAllRows<{ slug: string; published_at: string | null }>(
    'briefings',
    'slug, published_at',
    (q) => q.eq('is_published', true).not('published_at', 'is', null).order('slug'),
  ).catch(() => [] as { slug: string; published_at: string | null }[]);
  const dbBriefingEntries: MetadataRoute.Sitemap = dbBriefings.filter((b) => !editorialSlugs.has(b.slug)).map((b) => ({
    url: `${SITE}/briefings/${b.slug}`,
    ...dated(newest(b.published_at)),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
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
  // Each MP's most recent vote and each party's (party_member_vote_stats.last_vote, a view refreshed nightly): the voting
  // record is what changes on an MP's page and a party's whip page. A failed read leaves the dates out.
  const voteRows = await fetchAllRows<{ party: string | null; member_id: number; last_vote: string | null }>(
    'party_member_vote_stats',
    'party, member_id, last_vote',
    (q) => q.order('member_id', { ascending: true }).order('party', { ascending: true }),
  ).catch(() => [] as { party: string | null; member_id: number; last_vote: string | null }[]);
  const lastVoteByMember = new Map<number, string>(), lastVoteByParty = new Map<string, string>();
  const later = <K,>(m: Map<K, string>, k: K, d: string) => { const c = m.get(k); if (!c || d > c) m.set(k, d); };
  for (const r of voteRows) {
    if (!r.last_vote) continue;
    later(lastVoteByMember, r.member_id, r.last_vote);
    if (r.party) later(lastVoteByParty, r.party, r.last_vote);
  }

  const parties = await fetchAllRows<{ slug: string; recipient_name: string | null; mp_party_string: string | null }>(
    'parties',
    'slug, recipient_name, mp_party_string',
    (q) => q.order('slug', { ascending: true }),
  );
  const partyEntries: MetadataRoute.Sitemap = [];
  for (const p of parties) {
    partyEntries.push({ url: `${SITE}/parties/${p.slug}`, changeFrequency: 'weekly', priority: 0.7 });
    // The verdict page only while it is shown (T1-VERD, 12 Nov 2026); hidden, it sends readers to the party's first page.
    if (partyVerdictShown(p.slug)) partyEntries.push({ url: `${SITE}/parties/${p.slug}/bio`, changeFrequency: 'weekly', priority: 0.7 });
    if (p.recipient_name) {
      partyEntries.push({ url: `${SITE}/parties/${p.slug}/money`, changeFrequency: 'weekly', priority: 0.8 });
    }
    if (p.mp_party_string) {
      partyEntries.push({ url: `${SITE}/parties/${p.slug}/whip`, ...dated(newest(lastVoteByParty.get(p.mp_party_string))), changeFrequency: 'weekly', priority: 0.7 });
    }
  }

  // Ship ONLY indexable bills, so the sitemap never lists a noindexed URL. The rule is billIndexable in
  // lib/bill-indexing.ts, the same function the bill page's robots tag uses (owner, 7 Nov 2026).
  const votedBillIdRows = await fetchAllRows<{ bill_id: number }>(
    'sitemap_bill_ids',
    'bill_id',
    (q) => q.order('bill_id', { ascending: true }),
  );
  const votedBillIds = new Set<number>(votedBillIdRows.map((r) => r.bill_id));
  // Hidden bills (bill.hidden_reason: duplicates, bad records) are never listed; their pages return 404.
  const allBills = await fetchAllRows<{ id: number; current_stage: string | null; is_act: boolean | null; commons_division_id: number | null; last_update: string | null; introduced_session_id: number | null }>(
    'bill',
    'id, current_stage, is_act, commons_division_id, last_update, introduced_session_id',
    // Ordered by id so paging is stable (24 Oct 2026, report 36): unordered pages can repeat or skip rows.
    (q) => q.is('hidden_reason', null).order('id', { ascending: true }),
  );
  const currentSessionBills = await currentSessionBillIds();
  const bills = allBills.filter((b) => billIndexable({
    currentStage: b.current_stage,
    isLaw: isLaw(b),
    commonsDivisionId: b.commons_division_id,
    hasVotes: votedBillIds.has(b.id),
    inCurrentSession: currentSessionBills.has(b.id),
  }));
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
  // Not mps.updated_at: on 29 Oct 2026, 638 of 650 current MPs (98.2 per cent) shared one date, so it does not say when
  // a profile changed. The MP's most recent vote does; an MP with no recorded vote has no date.
  const mpEntries: MetadataRoute.Sitemap = mps.map((m) => ({
    url: `${SITE}/mps/${m.member_id}`,
    ...dated(newest(lastVoteByMember.get(m.member_id))),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // The 93 basic former MP profiles (owner, 7 Nov 2026). Dated by the day their wording last changed: their record is otherwise historic.
  const formerProfileEntries: MetadataRoute.Sitemap = FORMER_MP_PROFILE_IDS.map((id) => ({ url: `${SITE}/mps/${id}`, lastModified: new Date('2026-11-07'), changeFrequency: 'yearly', priority: 0.4 }));

  // Members of the House of Lords with a page (owner, 3 Nov 2026): current peers and anyone who has sat since 4 July
  // 2024 (lib/peers.ts peerHasPage). Their questions pages are not listed, like the MPs'.
  const peers = await fetchAllRows<{ member_id: number }>(
    'peers',
    'member_id',
    (q) => q.or('is_current.eq.true,end_date.gte.2024-07-04'),
  );
  const peerEntries: MetadataRoute.Sitemap = peers.map((p) => ({
    url: `${SITE}/lords/${p.member_id}`,
    changeFrequency: 'weekly',
    priority: 0.5,
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

  // The year archives (owner, 31 Oct 2026): /divisions/year/<yyyy> and its page 2 onwards (100 divisions a page), so
  // every division is two clicks from a page in the sitemap. Each page is dated by the latest of the rows it lists (owner, 7 Nov 2026).
  type YearRow = { date: string; number: number; day: string; archive: boolean };
  const yearRows = new Map<number, YearRow[]>();
  const addYearRow = (r: YearRow) => { const y = Number(r.date.slice(0, 4)); yearRows.set(y, [...(yearRows.get(y) ?? []), r]); };
  for (const d of divisions) if (d.division_date_only) addYearRow({ date: d.division_date_only, number: d.division_number ?? 0, day: d.division_date_only, archive: false });
  // The archive's 2,908 division pages (11 Oct 2004 to 8 Mar 2016), each dated by the later of the archive's load and the last change to its row (owner, 7 Nov 2026).
  const archiveDivisions = await fetchAllRows<{ division_date: string; division_number: number; changed_at: string | null }>('historic_commons_divisions', 'division_date, division_number, changed_at', (q) => q.order('division_date', { ascending: true }).order('division_number', { ascending: true })).catch(() => []);
  const archiveDivisionEntries: MetadataRoute.Sitemap = archiveDivisions.map((d) => ({ url: `${SITE}${divisionHref(d.division_date, d.division_number)}`, lastModified: new Date(loadedOrChanged(HISTORIC_DIVISIONS_LOADED, d.changed_at)), changeFrequency: 'yearly' as const, priority: 0.4 }));
  for (const d of archiveDivisions) addYearRow({ date: d.division_date.slice(0, 10), number: d.division_number, day: loadedOrChanged(HISTORIC_DIVISIONS_LOADED, d.changed_at), archive: true });
  const thisYear = new Date().getUTCFullYear();
  const divisionYearEntries: MetadataRoute.Sitemap = [...yearRows.entries()].sort((a, b) => a[0] - b[0]).flatMap(([y, rows]) => {
    // The order the year page lists them (lib/division-links.ts yearDivisions): sitting votes newest first, then the archive's newest first.
    const listed = [...rows].sort((a, b) => Number(a.archive) - Number(b.archive) || b.date.localeCompare(a.date) || b.number - a.number);
    return Array.from({ length: Math.ceil(listed.length / 100) }, (_, k) => ({
      url: `${SITE}${yearHref(y, k + 1)}`,
      ...dated(newest(...listed.slice(k * 100, (k + 1) * 100).map((r) => r.day))),
      changeFrequency: y === thisYear ? ('weekly' as const) : ('yearly' as const),
      priority: 0.5,
    }));
  });

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
  // The organisation's most recent ministerial meeting or lobbying register quarter.
  const lobbyOrgs = await fetchAllRows<{ slug: string; last_meeting: string | null; last_lobbying_quarter: string | null }>('lobby_org_rankings', 'slug, last_meeting, last_lobbying_quarter', (q) => q.order('org_id'));
  const lobbyEntries: MetadataRoute.Sitemap = lobbyOrgs.filter((o) => o.slug).map((o) => ({
    url: `${SITE}/lobbying/${o.slug}`,
    ...dated(newest(o.last_meeting, o.last_lobbying_quarter)),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  // Organisation pages (report 71), one per organisation_index row. A failed read leaves them out rather than failing
  // the sitemap.
  // The date is the organisation's most recent donation, contract, grant, meeting or lobbying quarter.
  type OrgRow = { slug: string; last_donation: string | null; last_contract: string | null; last_grant: string | null; last_meeting: string | null; last_lobbying_quarter: string | null };
  const orgSlugs = await fetchAllRows<OrgRow>('organisation_index', 'slug, last_donation, last_contract, last_grant, last_meeting, last_lobbying_quarter', (q) => q.order('slug')).catch(() => [] as OrgRow[]);
  const orgEntries: MetadataRoute.Sitemap = orgSlugs.map((o) => ({
    url: `${SITE}/organisations/${o.slug}`,
    ...dated(newest(o.last_donation, o.last_contract, o.last_grant, o.last_meeting, o.last_lobbying_quarter)),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Major project pages (/transparency/major-projects/<project_key>), one per project in major_projects.
  // The annual reports come out once a year; a failed read leaves them out rather than failing the sitemap.
  // The date is when we last imported the project's rows (major_projects.imported_at): the page shows only those rows.
  const majorProjectRows = await fetchAllRows<{ project_key: string; imported_at: string | null }>('major_projects', 'project_key, imported_at', (q) => q.order('project_key').order('report_year')).catch(() => [] as { project_key: string; imported_at: string | null }[]);
  const majorProjectDates = new Map<string, string | null>();
  for (const r of majorProjectRows) { const c = majorProjectDates.get(r.project_key); if (c == null || (r.imported_at && r.imported_at > c)) majorProjectDates.set(r.project_key, r.imported_at); }
  const majorProjectEntries: MetadataRoute.Sitemap = [...majorProjectDates].map(([k, d]) => ({
    url: `${SITE}${projectHref(k)}`,
    ...dated(newest(d)),
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
      // The newest update to a bill introduced in that session (bills carried in from an earlier session are not counted).
      ...dated(newest(...allBills.filter((b) => b.introduced_session_id === r.session_id).map((b) => b.last_update))),
        changeFrequency: r.is_current ? ('daily' as const) : ('yearly' as const),
      priority: r.is_current ? 0.6 : 0.4,
    })),
  ];

  // The recommendations tracker (30 Oct 2026, "go public"), only while RECOMMENDATIONS_PUBLIC is on: /recommendations
  // and every recommendation page (not the filtered list addresses). lastmod is the newest date held for the
  // recommendation: its latest Treasury document, or a later delivery evidence, Open Govt check or target update date
  // when newer; the list takes the newest of them all. A failed read (after the shared read and its retry) uses the last
  // good list this server read (lib/pac.ts); with none, the addresses are left out and the failure is logged, rather than
  // failing the sitemap or the build (owner, 7 Nov 2026, AB4).
  const recommendationRows = RECOMMENDATIONS_PUBLIC ? await allStatus().catch(async (e) => {
    console.error(`sitemap: recommendation addresses left out (${e instanceof Error ? e.message : String(e)})`);
    if (isBuildPhase()) await retrySoon(); // built without them: rendered again in 10 minutes
    return [];
  }) : [];
  const newestDate = (...dates: (string | null)[]) => dates.filter((d): d is string => !!d).map((d) => d.slice(0, 10)).sort().pop();
  const recommendationEntries: MetadataRoute.Sitemap = recommendationRows.map((r) => {
    const d = newestDate(r.latest_published_on, r.evidence_delivered_on, r.review_checked_on, r.target_source_published_on);
    return { url: `${SITE}${recPath(r)}`, changeFrequency: 'monthly' as const, priority: 0.5, ...(d ? { lastModified: new Date(d) } : {}) };
  });
  if (recommendationRows.length) {
    const newest = newestDate(...recommendationEntries.map((e) => (e.lastModified ? new Date(e.lastModified).toISOString() : null)));
    recommendationEntries.unshift({ url: `${SITE}/recommendations`, changeFrequency: 'weekly', priority: 0.7, ...(newest ? { lastModified: new Date(newest) } : {}) });
  }

  return validDates([
    ...staticEntries,
    ...topicEntries,
    ...lobbyEntries,
    ...orgEntries,
    ...transparencyEntries,
    ...deptEntries,
    ...editorialEntries,
    ...dbBriefingEntries,
    ...pmqsEntries,
    ...pmqsArchiveEntries,
    ...preFixedEntries,
    ...petitionEntries,
    ...constituencyEntries,
    ...motionEntries,
    ...questionEntries,
    ...partyEntries,
    ...billEntries,
    ...billSessionEntries,
    ...mpEntries,
    ...formerProfileEntries,
    ...peerEntries,
    ...councilEntries,
    ...divisionEntries,
    ...archiveDivisionEntries,
    ...divisionYearEntries,
    ...committeeEntries,
    ...majorProjectEntries,
    ...recommendationEntries,
  ]);
}
