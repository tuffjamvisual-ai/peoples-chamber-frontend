-- Migration: sitemap materialized views, refresh state, and helper functions
-- Applied: 2026-09-14
-- Purpose: precompute DISTINCT scans over mp_division_votes (1.14M rows) so
--          the sitemap route never hits the live table directly; eliminates the
--          intermittent 57014 build timeout caused by peak-concurrency query pressure.

-- ── Materialized views ────────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS public.sitemap_bill_ids AS
  SELECT DISTINCT bill_id
  FROM mp_division_votes
  WHERE bill_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sitemap_bill_ids_bill_id_idx
  ON public.sitemap_bill_ids (bill_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.sitemap_divisions AS
  SELECT DISTINCT division_date_only, division_number
  FROM mp_division_votes
  WHERE division_date_only IS NOT NULL
    AND division_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sitemap_divisions_date_num_idx
  ON public.sitemap_divisions (division_date_only, division_number);

-- ── Refresh state table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sitemap_refresh_state (
  view_name    text                     PRIMARY KEY,
  refreshed_at timestamp with time zone NOT NULL,
  row_count    integer                  NOT NULL
);

ALTER TABLE public.sitemap_refresh_state ENABLE ROW LEVEL SECURITY;
-- No policies: anon and authenticated reads return empty (deny-all RLS).
-- The get_sitemap_refresh_state() SECURITY DEFINER function is the read path.

-- ── View grants ──────────────────────────────────────────────────────────────

GRANT SELECT ON public.sitemap_bill_ids  TO anon;
GRANT SELECT ON public.sitemap_divisions TO anon;

-- ── refresh_sitemap_views() ───────────────────────────────────────────────────
-- Called unconditionally by sync-commons-votes-api on every invocation.
-- Refreshes both views (ACCESS EXCLUSIVE lock, ~213ms combined), updates
-- sitemap_refresh_state, and enforces a monotonic row-count guard.
-- service_role only; anon and authenticated are explicitly revoked.

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
BEGIN
  SELECT row_count INTO prev_bill_count
    FROM sitemap_refresh_state WHERE view_name = 'sitemap_bill_ids';
  SELECT row_count INTO prev_div_count
    FROM sitemap_refresh_state WHERE view_name = 'sitemap_divisions';

  REFRESH MATERIALIZED VIEW sitemap_bill_ids;
  REFRESH MATERIALIZED VIEW sitemap_divisions;

  SELECT COUNT(*) INTO new_bill_count FROM sitemap_bill_ids;
  SELECT COUNT(*) INTO new_div_count  FROM sitemap_divisions;

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

  RETURN jsonb_build_object(
    'sitemap_bill_ids',  new_bill_count,
    'sitemap_divisions', new_div_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_sitemap_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_sitemap_views() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sitemap_views() TO service_role;

-- ── get_sitemap_refresh_state() ───────────────────────────────────────────────
-- Read path for the freshness guard in app/sitemap.ts.
-- Readable by anon and authenticated via SECURITY DEFINER (bypasses the
-- deny-all RLS on sitemap_refresh_state).

CREATE OR REPLACE FUNCTION public.get_sitemap_refresh_state()
  RETURNS TABLE(view_name text, refreshed_at timestamp with time zone, row_count integer)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public', 'pg_temp'
AS $$
  SELECT view_name, refreshed_at, row_count FROM sitemap_refresh_state;
$$;

REVOKE ALL ON FUNCTION public.get_sitemap_refresh_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sitemap_refresh_state() TO anon, authenticated;

-- ── Seed ─────────────────────────────────────────────────────────────────────
-- Initial row counts at time of migration (2026-09-14).
-- ON CONFLICT makes this idempotent if re-run.

INSERT INTO public.sitemap_refresh_state (view_name, refreshed_at, row_count)
VALUES
  ('sitemap_bill_ids',  NOW(), 71),
  ('sitemap_divisions', NOW(), 2376)
ON CONFLICT (view_name) DO UPDATE
  SET refreshed_at = EXCLUDED.refreshed_at,
      row_count    = EXCLUDED.row_count;
