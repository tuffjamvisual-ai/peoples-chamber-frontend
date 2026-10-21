-- /transparency/press-releases (owner's approval, 21 Oct 2026, build reliability): the page counted GOV.UK releases
-- (an exact count on every request; the page reads its address, so it renders on each request) and found the
-- busiest days by reading all 46,606 releases in pages of 1,000 (47 reads, 9 s when not cached). press_release_stats()
-- returns both from one pass: the GOV.UK total and the 8 days with most GOV.UK releases. Same rules as the page:
-- gov_url ILIKE '%gov.uk%', the day being the first 10 characters of published_at as the API returns it (UTC).
-- Read only, SECURITY INVOKER.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$ BEGIN
  IF to_regprocedure('public.press_release_stats()') IS NOT NULL THEN RAISE EXCEPTION 'function already exists'; END IF;
END $$;
CREATE FUNCTION public.press_release_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  WITH g AS (
    SELECT (published_at AT TIME ZONE 'UTC')::date AS d FROM public.press_releases WHERE gov_url ILIKE '%gov.uk%'
  )
  SELECT jsonb_build_object(
    'gov_total', (SELECT count(*) FROM g),
    'busiest_days', coalesce((SELECT jsonb_agg(jsonb_build_object('date', d, 'count', n) ORDER BY n DESC, d DESC)
                                FROM (SELECT d, count(*) AS n FROM g WHERE d IS NOT NULL GROUP BY d ORDER BY count(*) DESC, d DESC LIMIT 8) t), '[]'::jsonb)
  );
$fn$;
COMMENT ON FUNCTION public.press_release_stats() IS 'GOV.UK press release total and busiest days, for /transparency/press-releases (migration 2026-10-21i)';
REVOKE ALL ON FUNCTION public.press_release_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.press_release_stats() TO anon, authenticated, service_role;
DO $$
DECLARE j jsonb; n bigint;
BEGIN
  j := public.press_release_stats();
  SELECT count(*) INTO n FROM public.press_releases WHERE gov_url ILIKE '%gov.uk%';
  IF (j->>'gov_total')::bigint <> n OR jsonb_array_length(j->'busiest_days') <> 8 THEN RAISE EXCEPTION 'unexpected stats %', j; END IF;
END $$;
COMMIT;
