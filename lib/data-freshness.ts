// Single source of truth for data freshness. Both the reader-facing
// "last updated" line (components/LastUpdated) and the freshness monitor
// (api/monitor-freshness) read from this, so thresholds and page mappings live
// in one place instead of being hardcoded twice.
//
// To cover a new data-driven page: add its table here with the timestamp column
// to check, the real-world cadence of the upstream source, and the page it feeds.

import { supabase } from '@/lib/supabase';
import { SHOW_LEAGUE_TABLE } from '@/lib/feature-flags';

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface DataSource {
  key: string;      // stable id used by <LastUpdated sourceKey="..." />
  table: string;    // table to read
  column: string;   // freshness timestamp column on that table
  cadence: Cadence; // how often the UPSTREAM source actually changes
  label: string;    // human description of the data
  source: string;   // upstream provider (shown to the reader, plain text)
  page: string;     // primary page path it feeds (used in monitor alerts)
  syncRoute?: string; // the /api route that refreshes it (heartbeat key); omit if no automated sync yet
  zeroRunTolerance?: number; // consecutive zero-row runs before the zero-run WATCH flags it (default 5).
                             // Raise for sitting-day sources (Commons votes, register of interests) that
                             // legitimately return nothing over weekends and recess, so they don't sit
                             // permanently on the watch list. Does not affect run-freshness alerts.
}

// Default consecutive zero-row runs before a source appears on the zero-run watch.
export const DEFAULT_ZERO_RUN_TOLERANCE = 5;

// Grace-inclusive max age before a source is considered stale, per cadence.
// A weekly source gets 9 days (one missed run + slack), etc.
export const CADENCE_MAX_AGE_DAYS: Record<Cadence, number> = {
  daily: 2,
  weekly: 9,
  monthly: 35,
  quarterly: 100,
  annual: 400,
};

export const DATA_SOURCES: DataSource[] = [
  { key: 'department_budgets',   table: 'department_budgets',    column: 'updated_at',   cadence: 'weekly',    label: 'Departmental budgets',       source: 'GOV.UK supply estimates',      page: '/spending',                             syncRoute: '/api/sync-department-budgets' },
  { key: 'department_staffing',  table: 'department_staffing',   column: 'updated_at',   cadence: 'weekly',    label: 'Civil service staffing',     source: 'Cabinet Office workforce data', page: '/civil-service',                        syncRoute: '/api/sync-department-staffing' },
  { key: 'appgs',                table: 'appgs',                 column: 'scraped_at',   cadence: 'weekly',    label: 'APPG register',              source: 'mySociety / UK Parliament APPG register', page: '/secretariats',                     syncRoute: '/api/sync-appgs' },
  { key: 'government_contracts', table: 'government_contracts',  column: 'updated_at',   cadence: 'daily',     label: 'Government contracts',       source: 'Find a Tender (OCDS)',          page: '/donations/government-contractors',     syncRoute: '/api/sync-government-contracts' },
  // Council details (leaders, party control, council tax, finance) are kept up to date by hand:
  // council tax each March, leaders after the May elections, finance once a year. There is no
  // reliable automated feed of council leaders, so this is checked yearly, not weekly.
  { key: 'councils',             table: 'councils',              column: 'updated_at',   cadence: 'annual',    label: 'Council details',            source: 'MHCLG and council publications, updated by hand', page: '/councils' },
  { key: 'mp_expenses',          table: 'mp_expenses_detail',    column: 'updated_at',   cadence: 'quarterly', label: 'MP expenses',                source: 'IPSA',                          page: '/expenses',                            syncRoute: '/github-actions/ipsa-expenses' /* Daily Department Updates workflow, step ipsa-expenses */ },
  { key: 'press_releases',       table: 'press_releases',        column: 'published_at', cadence: 'daily',     label: 'Government press releases',   source: 'GOV.UK',                        page: '/transparency/press-releases',          syncRoute: '/api/sync-press-releases' },
  { key: 'bills',                table: 'bill',                  column: 'last_update',  cadence: 'daily',     label: 'Bills',                      source: 'UK Parliament Bills API',       page: '/bills',                                syncRoute: '/github-actions/bills' /* Daily Data Sync workflow, sync-bills-incremental.js */ },
  { key: 'division_votes',       table: 'mp_division_votes',     column: 'created_at',   cadence: 'daily',     label: 'Commons division votes',     source: 'Commons Votes API',             page: '/divisions',                            syncRoute: '/api/sync-commons-votes-api', zeroRunTolerance: 14 },
  { key: 'registered_interests', table: 'mp_registered_interests', column: 'last_seen_date', cadence: 'daily', label: 'Register of interests',      source: 'UK Parliament',                 page: '/transparency/register-of-interests',   syncRoute: '/github-actions/registered-interests' /* Daily Department Updates workflow; the Vercel route is no longer scheduled */ },
  { key: 'hansard_contributions', table: 'mp_contributions',       column: 'updated_at',   cadence: 'daily',    label: 'Hansard chamber contributions', source: 'UK Parliament Members API',    page: '/mps/[id]',                         syncRoute: '/api/sync-hansard-contributions' },
  // synced_at is set on every write, so it advances on every successful daily run even
  // when no new petition crossed the threshold (open petitions are re-fetched daily).
  { key: 'petitions',            table: 'petitions',             column: 'synced_at',    cadence: 'daily',     label: 'Petition signatures',        source: 'UK Parliament Petitions (petition.parliament.uk)', page: '/mps/[id]',                    syncRoute: '/api/sync-petitions' },
  // synced_at advances every run: each run re-fetches the 14 days before the newest
  // stored division, so it re-writes rows even through recess.
  { key: 'lords_divisions',      table: 'lords_divisions',       column: 'synced_at',    cadence: 'daily',     label: 'Lords votes',                source: 'UK Parliament Lords Votes API', page: '/bills/[id]',                          syncRoute: '/api/sync-lords-votes' },
  // synced_at advances every run: each run re-fetches new/changed motions plus the 300
  // least recently checked.
  { key: 'early_day_motions',    table: 'early_day_motions',     column: 'synced_at',    cadence: 'daily',     label: 'Early Day Motions',          source: 'UK Parliament Oral Questions and Motions API', page: '/mps/[id]',                 syncRoute: '/api/sync-edms' },
  // Council crime: England & Wales runs in GitHub Actions (.github/workflows/council-crime-weekly.yml),
  // not a Vercel route; NI is run by hand. The script records a heartbeat under these keys. If one goes overdue the
  // monitor's self-heal can't call it (it isn't a site route), so it falls through to the
  // alert email, which is the right outcome.
  { key: 'council_crime_police_uk', table: 'council_crime_stats', column: 'updated_at',  cadence: 'weekly',    label: 'Council crime (England & Wales)', source: 'data.police.uk', page: '/councils/[slug]',          syncRoute: '/github-actions/council-crime-police-uk' },
  // NI is refreshed by hand monthly (PSNI's pages block automated access), so it's on a
  // monthly cadence: the alert email doubles as the reminder to run the update.
  { key: 'council_crime_psni',      table: 'council_crime_stats', column: 'updated_at',  cadence: 'monthly',   label: 'Council crime (Northern Ireland)', source: 'PSNI recorded crime tables', page: '/councils/[slug]', syncRoute: '/github-actions/council-crime-psni' },
  // UK HPI is released monthly (2nd-4th Wednesday), so the daily check returns 0 rows on
  // most days; the zero-run tolerance covers the longest gap between releases (~6 weeks).
  { key: 'council_house_prices',    table: 'council_house_prices', column: 'synced_at', cadence: 'monthly',   label: 'House prices by council', source: 'HM Land Registry UK House Price Index', page: '/councils/[slug]', syncRoute: '/api/sync-house-prices', zeroRunTolerance: 45 },
  // MHCLG statutory homelessness is quarterly; the weekly check returns 0 rows on most runs,
  // so the zero-run tolerance covers a quarter plus a slipped release (~20 weeks).
  { key: 'council_homelessness',    table: 'council_homelessness', column: 'synced_at', cadence: 'quarterly', label: 'Homelessness by council', source: 'MHCLG statutory homelessness statistics', page: '/councils/[slug]', syncRoute: '/api/sync-homelessness', zeroRunTolerance: 20 },
  // synced_at advances every run: the daily sync rewrites the latest 3 months for every council.
  { key: 'council_claimant_count',  table: 'council_claimant_count', column: 'synced_at', cadence: 'monthly', label: 'Claimant count by council', source: 'ONS Claimant Count (Nomis)', page: '/councils/[slug]', syncRoute: '/api/sync-claimant-count' },
  // Ofsted publishes a new snapshot twice a year (June and November); the weekly check returns 0 rows
  // on most runs, so the zero-run tolerance covers the ~6 months between snapshots plus slippage.
  { key: 'school_inspections',      table: 'school_inspections', column: 'synced_at', cadence: 'quarterly', label: 'School inspections', source: 'Ofsted state-funded schools inspections and outcomes', page: '/councils/[slug]', syncRoute: '/api/sync-school-inspections', zeroRunTolerance: 32 },
  // DESNZ publishes sub-regional fuel poverty once a year (May); the weekly check returns 0 rows
  // on most runs, so the zero-run tolerance covers a year plus slippage.
  { key: 'council_fuel_poverty',    table: 'council_fuel_poverty', column: 'synced_at', cadence: 'quarterly', label: 'Fuel poverty by council', source: 'DESNZ sub-regional fuel poverty statistics', page: '/councils/[slug]', syncRoute: '/api/sync-fuel-poverty', zeroRunTolerance: 60 },
  // DfT publishes a new RAS0403 edition once a year (July); the weekly check returns 0 rows on
  // most runs, so the zero-run tolerance covers a year plus slippage.
  { key: 'council_road_casualties', table: 'council_road_casualties', column: 'synced_at', cadence: 'quarterly', label: 'Road casualties by council', source: 'DfT reported road casualties (RAS0403)', page: '/councils/[slug]', syncRoute: '/api/sync-road-casualties', zeroRunTolerance: 60 },
  // Ofcom publishes Connected Nations data a few times a year; the weekly check returns 0 rows on
  // most runs, so the zero-run tolerance covers the gap between releases plus slippage.
  { key: 'council_connectivity',    table: 'council_broadband', column: 'synced_at', cadence: 'quarterly', label: 'Broadband and mobile coverage by council', source: 'Ofcom Connected Nations', page: '/councils/[slug]', syncRoute: '/api/sync-connectivity', zeroRunTolerance: 40 },
  // Storm overflows: the Environment Agency publishes its annual return once a year; Scottish Water
  // and NI Water update their workbooks about once a year. All are loaded by hand
  // (scripts/import-sewage.js, scripts/import-sewage-scotland.js — Scottish Water refuses automated
  // downloads, so its two workbooks are downloaded in a browser); the monitor emails when a new EA
  // year appears on data.gov.uk (see api/monitor-freshness).
  { key: 'sewage_overflows',        table: 'sewage_overflows', column: 'synced_at', cadence: 'quarterly', label: 'Storm overflow figures', source: 'Environment Agency storm overflow annual return; Scottish Water overflow event data; NI Water Event Duration Monitor data', page: '/sewage' /* loaded by hand; no automated sync */ },
  // Council area league table: written by scripts/score-areas.js --write, run by hand when its
  // source figures change (no automated sync).
  { key: 'council_league_table',    table: 'area_ratings', column: 'synced_at', cadence: 'quarterly', label: 'Council area ratings', source: 'Open Govt calculation from Ofsted, ONS, DfT, police.uk, DWP, DESNZ, MHCLG, Defra, Environment Agency and Ofcom figures', page: SHOW_LEAGUE_TABLE ? '/councils/league-table' : '/councils' /* run by hand; no automated sync */ },
  // The two lobbying dates are read from the one-row lobby_summary (refreshed with each rebuild), not by finding the
  // newest built_at across 55,814 mentions and 10,915 returns, which took up to 3.1 s and timed out builds
  // (owner's approval, 21 Oct 2026).
  { key: 'lobbying_meetings',       table: 'lobby_summary', column: 'meetings_built_at', cadence: 'quarterly', label: 'Ministers\u2019 meetings lobbying index', source: 'GOV.UK ministers\u2019 meetings transparency returns', page: '/lobbying',                           syncRoute: '/github-actions/lobbying-index' /* scripts/build-lobbying-index.js, nightly */ },
  { key: 'consultant_lobbyists',    table: 'lobby_summary', column: 'orcl_built_at', cadence: 'quarterly', label: 'Consultant lobbyists and their clients', source: 'Registrar of Consultant Lobbyists quarterly returns', page: '/lobbying' /* files downloaded by hand; scripts/import-orcl-returns.js */ },
];

export function dataSource(key: string): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.key === key);
}

// Read the newest timestamp for a source. Uses the same anon client the pages
// already read these tables with, so RLS that permits the page permits this.
export async function newestTimestamp(src: DataSource): Promise<Date | null> {
  const { data } = await supabase
    .from(src.table)
    .select(src.column)
    .order(src.column, { ascending: false })
    .limit(1)
    .maybeSingle();
  const raw = (data as Record<string, unknown> | null)?.[src.column];
  if (!raw) return null;
  const d = new Date(raw as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ageInDays(newest: Date, now: Date): number {
  return Math.floor((now.getTime() - newest.getTime()) / 86_400_000);
}

export function isStale(newest: Date | null, cadence: Cadence, now: Date): boolean {
  if (!newest) return true;
  return ageInDays(newest, now) > CADENCE_MAX_AGE_DAYS[cadence];
}
