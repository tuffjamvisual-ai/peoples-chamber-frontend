-- The "last updated" line (lib/data-freshness.ts newestTimestamp) reads the newest value of one column per data
-- source. Eleven of those columns had no index, so each read scanned its whole table (council_claimant_count 186,798
-- rows, council_crime_stats 170,730, ...). Since failed reads throw (21 Oct 2026), one of these timing out failed the
-- Vercel build of 0184129 (/sewage, sewage_overflows.synced_at). A descending index on each makes the read one index
-- entry. Tables under 5,000 rows are left as they are. Owner's approval, 21 Oct 2026 (page speed and build load).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$
DECLARE n text;
BEGIN
  FOREACH n IN ARRAY ARRAY['council_claimant_count_synced_at_idx','council_crime_stats_updated_at_idx','council_house_prices_synced_at_idx',
    'press_releases_published_at_idx','government_contracts_updated_at_idx','school_inspections_synced_at_idx','mp_contributions_updated_at_idx',
    'sewage_overflows_synced_at_idx','mp_registered_interests_last_seen_date_idx','council_road_casualties_synced_at_idx','council_homelessness_synced_at_idx'] LOOP
    IF to_regclass('public.' || n) IS NOT NULL THEN RAISE EXCEPTION 'index % already exists', n; END IF;
  END LOOP;
END $$;
CREATE INDEX council_claimant_count_synced_at_idx ON public.council_claimant_count (synced_at DESC);
CREATE INDEX council_crime_stats_updated_at_idx ON public.council_crime_stats (updated_at DESC);
CREATE INDEX council_house_prices_synced_at_idx ON public.council_house_prices (synced_at DESC);
CREATE INDEX press_releases_published_at_idx ON public.press_releases (published_at DESC);
CREATE INDEX government_contracts_updated_at_idx ON public.government_contracts (updated_at DESC);
CREATE INDEX school_inspections_synced_at_idx ON public.school_inspections (synced_at DESC);
CREATE INDEX mp_contributions_updated_at_idx ON public.mp_contributions (updated_at DESC);
CREATE INDEX sewage_overflows_synced_at_idx ON public.sewage_overflows (synced_at DESC);
CREATE INDEX mp_registered_interests_last_seen_date_idx ON public.mp_registered_interests (last_seen_date DESC);
CREATE INDEX council_road_casualties_synced_at_idx ON public.council_road_casualties (synced_at DESC);
CREATE INDEX council_homelessness_synced_at_idx ON public.council_homelessness (synced_at DESC);
ANALYZE public.council_claimant_count, public.council_crime_stats, public.council_house_prices, public.press_releases, public.government_contracts,
  public.school_inspections, public.mp_contributions, public.sewage_overflows, public.mp_registered_interests, public.council_road_casualties, public.council_homelessness;
COMMIT;
