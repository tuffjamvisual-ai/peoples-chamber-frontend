-- Security fixes from the Supabase Security Advisor (9 critical errors, 11 Oct 2026),
-- and a fast, refreshed source for the Commons divisions pages.
--
-- 1. rls_disabled_in_public: eight tables had Row-Level Security turned off, so anyone
--    with the project URL and the public anon key could read, edit and delete them.
--    Fix: turn RLS on and add a read-only rule for everyone. No rule allows inserting,
--    updating or deleting, so only the service role (used by the import scripts, and
--    not affected by RLS) can write. The site reads these tables with the anon key
--    (council pages; welfare API routes fall back to it), so the read rule is required.
--
-- 2. Divisions pages: commons_divisions_titled re-aggregates the ~1.14M-row
--    mp_division_votes on every request; listing the newest divisions as the anon role
--    takes longer than anon's 3-second statement timeout, so /divisions showed
--    "0 divisions". The visitor pages now read commons_divisions_fts (a materialized
--    copy, one row per division, indexed). refresh_sitemap_views(), which
--    sync-commons-votes-api calls after every votes import, now refreshes it too, with
--    the same shrink guard and state tracking as the sitemap copies.
--
-- 3. security_definer_view: commons_divisions_titled ran with its creator's permissions.
--    Fix: run it with the caller's permissions. Visitor pages no longer read it; the sync
--    routes that do use the service role. Its only table, mp_division_votes, has RLS on
--    with a public read rule.
--
-- Applied as one transaction; the final checks abort everything if any step did not take.
-- Section 1 was first applied on 13 Oct 2026; it is written to be safe to run again.

\set ON_ERROR_STOP on
BEGIN;

-- ── 1. RLS on the eight tables ────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'council_public_health_metrics',
    'council_service_spending',
    'welfare_constituency_geography',
    'welfare_constituency_summary',
    'welfare_source_releases',
    'welfare_constituency_metrics',
    'welfare_local_authority_summary',
    'welfare_local_authority_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t || '_public_read', t);
  END LOOP;
END $$;

-- ── 2. commons_divisions_fts: readable by visitors, refreshed after every sync ──
GRANT SELECT ON public.commons_divisions_fts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_sitemap_views()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  new_bill_count  integer;
  prev_bill_count integer;
  new_div_count   integer;
  prev_div_count  integer;
  new_fts_count   integer;
  prev_fts_count  integer;
BEGIN
  SELECT row_count INTO prev_bill_count
    FROM sitemap_refresh_state WHERE view_name = 'sitemap_bill_ids';
  SELECT row_count INTO prev_div_count
    FROM sitemap_refresh_state WHERE view_name = 'sitemap_divisions';
  SELECT row_count INTO prev_fts_count
    FROM sitemap_refresh_state WHERE view_name = 'commons_divisions_fts';

  REFRESH MATERIALIZED VIEW sitemap_bill_ids;
  REFRESH MATERIALIZED VIEW sitemap_divisions;
  -- CONCURRENTLY (it has a unique index) so the divisions pages keep reading during the refresh.
  REFRESH MATERIALIZED VIEW CONCURRENTLY commons_divisions_fts;

  SELECT COUNT(*) INTO new_bill_count FROM sitemap_bill_ids;
  SELECT COUNT(*) INTO new_div_count  FROM sitemap_divisions;
  SELECT COUNT(*) INTO new_fts_count  FROM commons_divisions_fts;

  IF prev_bill_count IS NOT NULL AND new_bill_count < prev_bill_count THEN
    RAISE EXCEPTION
      'sitemap_bill_ids shrank from % to % rows — aborting refresh. '
      'Override: UPDATE sitemap_refresh_state SET row_count = % '
      'WHERE view_name = ''sitemap_bill_ids''; then re-run.',
      prev_bill_count, new_bill_count, new_bill_count;
  END IF;

  IF prev_div_count IS NOT NULL AND new_div_count < prev_div_count THEN
    RAISE EXCEPTION
      'sitemap_divisions shrank from % to % rows — aborting refresh. '
      'Override: UPDATE sitemap_refresh_state SET row_count = % '
      'WHERE view_name = ''sitemap_divisions''; then re-run.',
      prev_div_count, new_div_count, new_div_count;
  END IF;

  IF prev_fts_count IS NOT NULL AND new_fts_count < prev_fts_count THEN
    RAISE EXCEPTION
      'commons_divisions_fts shrank from % to % rows — aborting refresh. '
      'Override: UPDATE sitemap_refresh_state SET row_count = % '
      'WHERE view_name = ''commons_divisions_fts''; then re-run.',
      prev_fts_count, new_fts_count, new_fts_count;
  END IF;

  INSERT INTO sitemap_refresh_state (view_name, refreshed_at, row_count)
  VALUES ('sitemap_bill_ids', NOW(), new_bill_count)
  ON CONFLICT (view_name) DO UPDATE
    SET refreshed_at = EXCLUDED.refreshed_at,
        row_count    = EXCLUDED.row_count;

  INSERT INTO sitemap_refresh_state (view_name, refreshed_at, row_count)
  VALUES ('sitemap_divisions', NOW(), new_div_count)
  ON CONFLICT (view_name) DO UPDATE
    SET refreshed_at = EXCLUDED.refreshed_at,
        row_count    = EXCLUDED.row_count;

  INSERT INTO sitemap_refresh_state (view_name, refreshed_at, row_count)
  VALUES ('commons_divisions_fts', NOW(), new_fts_count)
  ON CONFLICT (view_name) DO UPDATE
    SET refreshed_at = EXCLUDED.refreshed_at,
        row_count    = EXCLUDED.row_count;

  RETURN jsonb_build_object(
    'sitemap_bill_ids',      new_bill_count,
    'sitemap_divisions',     new_div_count,
    'commons_divisions_fts', new_fts_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_sitemap_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_sitemap_views() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sitemap_views() TO service_role;

-- Refresh everything once now (also records the first commons_divisions_fts count).
SELECT public.refresh_sitemap_views();

-- ── 3. commons_divisions_titled runs with the caller's permissions ────────────
ALTER VIEW public.commons_divisions_titled SET (security_invoker = true);

-- ── Checks ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  bad text;
  fts_rows integer;
  view_rows integer;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO bad
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('council_public_health_metrics','council_service_spending','welfare_constituency_geography','welfare_constituency_summary','welfare_source_releases','welfare_constituency_metrics','welfare_local_authority_summary','welfare_local_authority_metrics')
    AND (NOT c.relrowsecurity OR NOT EXISTS (
      SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.policyname = c.relname || '_public_read' AND p.cmd = 'SELECT'));
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'RLS fix did not take for: %', bad; END IF;

  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('council_public_health_metrics','council_service_spending','welfare_constituency_geography','welfare_constituency_summary','welfare_source_releases','welfare_constituency_metrics','welfare_local_authority_summary','welfare_local_authority_metrics')) <> 8 THEN
    RAISE EXCEPTION 'expected 8 tables';
  END IF;

  IF NOT has_table_privilege('anon', 'public.commons_divisions_fts', 'SELECT') THEN
    RAISE EXCEPTION 'anon cannot read commons_divisions_fts';
  END IF;

  SELECT count(*) INTO fts_rows FROM public.commons_divisions_fts;
  SELECT count(*) INTO view_rows FROM public.commons_divisions_titled;
  IF fts_rows <> view_rows THEN
    RAISE EXCEPTION 'commons_divisions_fts has % rows but commons_divisions_titled has %', fts_rows, view_rows;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'commons_divisions_titled'
      AND c.reloptions @> ARRAY['security_invoker=true']) THEN
    RAISE EXCEPTION 'commons_divisions_titled is not security_invoker';
  END IF;
END $$;

COMMIT;
