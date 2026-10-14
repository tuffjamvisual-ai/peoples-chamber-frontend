-- Lobbying page: turn the two views from 2026-10-14c into materialized views.
--
-- Why: as plain views they re-count ~60,000 rows on every read. Alone they took 0.06-1.4 s,
-- but during the Vercel production build (many pages at once) a read went past the
-- 3-second limit for the public (anon) role, the /lobbying prerender was cancelled and the
-- whole build failed. A materialized view is a saved result, so a read is a plain table read.
--
-- They are refreshed by refresh_lobbying_views(), which runs:
--   - at the end of scripts/build-lobbying-index.js --write and
--     scripts/import-orcl-returns.js --write
--   - every night in the Daily Department Updates workflow (so "last 12 months" moves on).
-- Same SQL as 2026-10-14c, plus refreshed_at. Public read is granted explicitly (RLS does not
-- apply to materialized views; the data comes only from tables that are public-read anyway).

\set ON_ERROR_STOP on
BEGIN;

DROP VIEW IF EXISTS public.lobby_org_rankings;
DROP VIEW IF EXISTS public.lobby_summary;

CREATE MATERIALIZED VIEW public.lobby_org_rankings AS
WITH m AS (
  SELECT org_id,
         count(DISTINCT meeting_key) AS meetings_all,
         count(DISTINCT meeting_key) FILTER (WHERE meeting_date > current_date - 365 AND meeting_date <= current_date) AS meetings_12m,
         count(DISTINCT minister_name) AS ministers_all,
         count(DISTINCT minister_name) FILTER (WHERE meeting_date > current_date - 365 AND meeting_date <= current_date) AS ministers_12m,
         max(meeting_date) FILTER (WHERE date_flag IS NULL) AS last_meeting
  FROM public.lobby_meeting_mentions
  WHERE match_type = 'alias' AND org_id IS NOT NULL
  GROUP BY org_id
), c AS (
  SELECT client_org_id AS org_id,
         count(DISTINCT firm_norm) AS lobbying_firms,
         count(DISTINCT quarter_start) AS lobbying_quarters,
         max(quarter_start) AS last_lobbying_quarter
  FROM public.orcl_client_returns
  WHERE match_type = 'alias' AND client_org_id IS NOT NULL
  GROUP BY client_org_id
)
SELECT o.id AS org_id, o.slug, o.name, o.org_type, o.source, o.reviewed,
       coalesce(m.meetings_all, 0) AS meetings_all,
       coalesce(m.meetings_12m, 0) AS meetings_12m,
       coalesce(m.ministers_all, 0) AS ministers_all,
       coalesce(m.ministers_12m, 0) AS ministers_12m,
       m.last_meeting,
       coalesce(c.lobbying_firms, 0) AS lobbying_firms,
       coalesce(c.lobbying_quarters, 0) AS lobbying_quarters,
       c.last_lobbying_quarter,
       now() AS refreshed_at
FROM public.lobby_orgs o
LEFT JOIN m ON m.org_id = o.id
LEFT JOIN c ON c.org_id = o.id
WHERE m.org_id IS NOT NULL OR c.org_id IS NOT NULL;

CREATE UNIQUE INDEX lobby_org_rankings_org_id_idx ON public.lobby_org_rankings (org_id);
CREATE UNIQUE INDEX lobby_org_rankings_slug_idx ON public.lobby_org_rankings (slug);

CREATE MATERIALIZED VIEW public.lobby_summary AS
SELECT
  1 AS id,
  (SELECT count(DISTINCT meeting_key) FROM public.lobby_meeting_mentions) AS meeting_entries,
  (SELECT count(*) FROM public.lobby_meeting_mentions) AS mentions,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'alias') AS mentions_matched,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'unmatched') AS mentions_unmatched,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'excluded') AS mentions_excluded,
  (SELECT min(meeting_date) FROM public.lobby_meeting_mentions WHERE date_flag IS NULL) AS first_meeting,
  (SELECT max(meeting_date) FROM public.lobby_meeting_mentions WHERE date_flag IS NULL) AS last_meeting,
  (SELECT max(built_at) FROM public.lobby_meeting_mentions) AS meetings_built_at,
  (SELECT count(*) FROM public.orcl_client_returns) AS orcl_rows,
  (SELECT count(DISTINCT firm_norm) FROM public.orcl_client_returns) AS orcl_firms,
  (SELECT count(DISTINCT client_norm) FROM public.orcl_client_returns) AS orcl_clients,
  (SELECT min(quarter_start) FROM public.orcl_client_returns) AS orcl_first_quarter,
  (SELECT max(quarter_start) FROM public.orcl_client_returns) AS orcl_last_quarter,
  (SELECT max(built_at) FROM public.orcl_client_returns) AS orcl_built_at,
  now() AS refreshed_at;

CREATE UNIQUE INDEX lobby_summary_id_idx ON public.lobby_summary (id);

GRANT SELECT ON public.lobby_org_rankings, public.lobby_summary TO anon, authenticated;

-- Refresh both. CONCURRENTLY keeps the old result readable while the new one is built.
-- Only the service role (scripts and the nightly workflow) may run it.
CREATE OR REPLACE FUNCTION public.refresh_lobbying_views()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.lobby_org_rankings;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.lobby_summary;
  RETURN jsonb_build_object(
    'lobby_org_rankings', (SELECT count(*) FROM public.lobby_org_rankings),
    'refreshed_at', now()
  );
END $$;

REVOKE ALL ON FUNCTION public.refresh_lobbying_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_lobbying_views() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_lobbying_views() TO service_role;

-- Self-check.
DO $$ BEGIN
  IF (SELECT count(*) FROM public.lobby_org_rankings) = 0 THEN RAISE EXCEPTION 'lobby_org_rankings is empty'; END IF;
  IF (SELECT mentions FROM public.lobby_summary) = 0 THEN RAISE EXCEPTION 'lobby_summary shows no mentions'; END IF;
  IF has_function_privilege('anon', 'public.refresh_lobbying_views()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run the refresh'; END IF;
END $$;

COMMIT;
