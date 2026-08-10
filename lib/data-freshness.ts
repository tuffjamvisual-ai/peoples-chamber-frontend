// Single source of truth for data freshness. Both the reader-facing
// "last updated" line (components/LastUpdated) and the freshness monitor
// (api/monitor-freshness) read from this, so thresholds and page mappings live
// in one place instead of being hardcoded twice.
//
// To cover a new data-driven page: add its table here with the timestamp column
// to check, the real-world cadence of the upstream source, and the page it feeds.

import { supabase } from '@/lib/supabase';

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

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
};

export const DATA_SOURCES: DataSource[] = [
  { key: 'department_budgets',   table: 'department_budgets',    column: 'updated_at',   cadence: 'weekly',    label: 'Departmental budgets',       source: 'GOV.UK supply estimates',      page: '/spending',                             syncRoute: '/api/sync-department-budgets' },
  { key: 'department_staffing',  table: 'department_staffing',   column: 'updated_at',   cadence: 'weekly',    label: 'Civil service staffing',     source: 'Cabinet Office workforce data', page: '/civil-service',                        syncRoute: '/api/sync-department-staffing' },
  { key: 'appgs',                table: 'appgs',                 column: 'scraped_at',   cadence: 'weekly',    label: 'APPG register',              source: 'mySociety / UK Parliament APPG register', page: '/secretariats',                     syncRoute: '/api/sync-appgs' },
  { key: 'government_contracts', table: 'government_contracts',  column: 'updated_at',   cadence: 'daily',     label: 'Government contracts',       source: 'Find a Tender (OCDS)',          page: '/donations/government-contractors',     syncRoute: '/api/sync-government-contracts' },
  { key: 'councils',             table: 'councils',              column: 'updated_at',   cadence: 'weekly',    label: 'Council data',               source: 'MHCLG / council accounts',      page: '/councils' /* no automated sync yet */ },
  { key: 'mp_expenses',          table: 'mp_expenses_detail',    column: 'updated_at',   cadence: 'quarterly', label: 'MP expenses',                source: 'IPSA',                          page: '/expenses' /* IPSA is quarterly; no cron */ },
  { key: 'press_releases',       table: 'press_releases',        column: 'published_at', cadence: 'daily',     label: 'Government press releases',   source: 'GOV.UK',                        page: '/transparency/press-releases',          syncRoute: '/api/sync-press-releases' },
  { key: 'division_votes',       table: 'mp_division_votes',     column: 'created_at',   cadence: 'daily',     label: 'Commons division votes',     source: 'Commons Votes API',             page: '/divisions',                            syncRoute: '/api/sync-commons-votes-api', zeroRunTolerance: 14 },
  { key: 'registered_interests', table: 'mp_registered_interests', column: 'last_seen_date', cadence: 'daily', label: 'Register of interests',      source: 'UK Parliament',                 page: '/transparency/register-of-interests',   syncRoute: '/api/sync-registered-interests', zeroRunTolerance: 14 },
  { key: 'hansard_contributions', table: 'mp_contributions',       column: 'updated_at',   cadence: 'daily',    label: 'Hansard chamber contributions', source: 'UK Parliament Members API',    page: '/mps/[id]',                         syncRoute: '/api/sync-hansard-contributions' },
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
