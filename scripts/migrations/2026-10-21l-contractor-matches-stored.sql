-- /donations/government-contractors: the counted totals stored, not worked out on every read (owner's approval,
-- 21 Oct 2026: "well under 3 s; add an index or move it into a function if not"). contractor_donor_matches
-- (migration 2026-10-21j) re-counts all ~27,000 contract rows on each read: 0.6 to 1.0 s when the database is quiet,
-- but it hit the anon role's 3 s limit while the contract notices backfill was writing. No index helps a whole-table
-- count, so the result is kept in a materialized view, refreshed by refresh_contractor_donor_matches(), which the
-- daily contracts sync (/api/sync-government-contracts) calls after it writes. The page is cached for a day anyway.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$ BEGIN
  IF to_regclass('public.contractor_donor_matches_stored') IS NOT NULL THEN RAISE EXCEPTION 'contractor_donor_matches_stored already exists'; END IF;
END $$;

CREATE MATERIALIZED VIEW public.contractor_donor_matches_stored AS
  SELECT display_name, norm, contracts, contract_value, donations, donated, framework_places, unpublished
  FROM public.contractor_donor_matches;
-- REFRESH ... CONCURRENTLY needs a unique index; it keeps the old rows readable while the new ones are worked out.
CREATE UNIQUE INDEX contractor_donor_matches_stored_norm_idx ON public.contractor_donor_matches_stored (norm);
REVOKE ALL ON public.contractor_donor_matches_stored FROM anon, authenticated;
GRANT SELECT ON public.contractor_donor_matches_stored TO anon, authenticated;

-- Runs as the owner (a materialized view can only be refreshed by its owner); only the service role may call it.
CREATE FUNCTION public.refresh_contractor_donor_matches() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE n bigint;
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.contractor_donor_matches_stored;
  SELECT count(*) INTO n FROM public.contractor_donor_matches_stored;
  RETURN n;
END $fn$;
REVOKE ALL ON FUNCTION public.refresh_contractor_donor_matches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_contractor_donor_matches() TO service_role;
COMMENT ON MATERIALIZED VIEW public.contractor_donor_matches_stored IS 'contractor_donor_matches stored; refreshed by the daily contracts sync (migration 2026-10-21l)';

DO $$
DECLARE n bigint; v numeric;
BEGIN
  SELECT count(*), sum(contract_value) INTO n, v FROM public.contractor_donor_matches_stored;
  IF n < 50 THEN RAISE EXCEPTION 'only % rows stored', n; END IF;
  IF has_function_privilege('anon', 'public.refresh_contractor_donor_matches()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can refresh'; END IF;
  IF NOT has_table_privilege('anon', 'public.contractor_donor_matches_stored', 'SELECT') THEN RAISE EXCEPTION 'anon cannot read'; END IF;
  RAISE NOTICE 'stored % companies, contract value %', n, v;
END $$;
COMMIT;
