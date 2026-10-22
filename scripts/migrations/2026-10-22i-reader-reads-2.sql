-- 2026-10-22i: follow-up to 2026-10-22h, from its after timings (owner's approval, 22 Oct 2026).
--  1. press_release_stats: the partial index from 2026-10-22h is not used (99.8% of releases match it, and the planner
--     cannot read an expression index alone), so it is dropped and the result is stored instead, in
--     press_release_stats_stored, refreshed by refresh_press_release_stats() at the end of each gov.uk press release
--     sync (every 2 hours) and by the daily refresh. The page is cached for an hour anyway. If nothing is stored the
--     function works it out live as before.
--  2. topic_bills_page: its parameter row (the word patterns) is worked out once (MATERIALIZED) instead of being folded
--     into the bill scan: 350 ms down to 95 ms for culture, media and sport. Same results.
-- Replaced function definitions are kept in function_backup_20261022i.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '300s';
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.function_backup_20261022i') IS NOT NULL THEN RAISE EXCEPTION 'function_backup_20261022i already exists'; END IF;
  IF to_regclass('public.press_release_stats_stored') IS NOT NULL THEN RAISE EXCEPTION 'press_release_stats_stored already exists'; END IF;
  IF to_regclass('public.press_releases_gov_day_idx') IS NULL THEN RAISE EXCEPTION 'press_releases_gov_day_idx missing (2026-10-22h not applied?)'; END IF;
END $$;

CREATE TABLE public.function_backup_20261022i AS
  SELECT p.oid::regprocedure::text AS signature, pg_get_functiondef(p.oid) AS definition, now() AS backed_up_at
  FROM pg_proc p
  WHERE p.oid IN ('public.press_release_stats()'::regprocedure,
                  'public.topic_bills_page(text[], text[], text[], text[], boolean, integer, integer)'::regprocedure);
ALTER TABLE public.function_backup_20261022i ENABLE ROW LEVEL SECURITY;

CREATE TEMP TABLE before_stats ON COMMIT DROP AS SELECT public.press_release_stats() AS stats;
CREATE TEMP TABLE before_topic ON COMMIT DROP AS
  SELECT * FROM public.topic_bills_page(ARRAY['Department for Culture, Media and Sport','Department for Digital, Culture, Media and Sport'],
    ARRAY['Department for Digital, Culture, Media and Sport'], ARRAY['broadcasting','sport','museum','gambling'], ARRAY[]::text[], false, 50, 0);

DROP INDEX public.press_releases_gov_day_idx;

-- 1. press_release_stats stored (the same expression as the function).
CREATE MATERIALIZED VIEW public.press_release_stats_stored AS
  WITH g AS (
    SELECT (published_at AT TIME ZONE 'UTC')::date AS d FROM public.press_releases WHERE gov_url ILIKE '%gov.uk%'
  )
  SELECT 1 AS id, jsonb_build_object(
    'gov_total', (SELECT count(*) FROM g),
    'busiest_days', coalesce((SELECT jsonb_agg(jsonb_build_object('date', d, 'count', n) ORDER BY n DESC, d DESC)
                                FROM (SELECT d, count(*) AS n FROM g WHERE d IS NOT NULL GROUP BY d ORDER BY count(*) DESC, d DESC LIMIT 8) t), '[]'::jsonb)
  ) AS stats;
CREATE UNIQUE INDEX press_release_stats_stored_id_idx ON public.press_release_stats_stored (id);
REVOKE ALL ON public.press_release_stats_stored FROM anon, authenticated;
GRANT SELECT ON public.press_release_stats_stored TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.press_release_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (SELECT stats FROM public.press_release_stats_stored WHERE id = 1),
    (WITH g AS (
       SELECT (published_at AT TIME ZONE 'UTC')::date AS d FROM public.press_releases WHERE gov_url ILIKE '%gov.uk%'
     )
     SELECT jsonb_build_object(
       'gov_total', (SELECT count(*) FROM g),
       'busiest_days', coalesce((SELECT jsonb_agg(jsonb_build_object('date', d, 'count', n) ORDER BY n DESC, d DESC)
                                   FROM (SELECT d, count(*) AS n FROM g WHERE d IS NOT NULL GROUP BY d ORDER BY count(*) DESC, d DESC LIMIT 8) t), '[]'::jsonb))));
$function$;

CREATE FUNCTION public.refresh_press_release_stats() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '60s' AS $fn$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.press_release_stats_stored;
  RETURN (SELECT (stats->>'gov_total')::bigint FROM public.press_release_stats_stored WHERE id = 1);
END $fn$;
REVOKE ALL ON FUNCTION public.refresh_press_release_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_press_release_stats() TO service_role;

-- 2. topic_bills_page: parameter row worked out once.
CREATE OR REPLACE FUNCTION public.topic_bills_page(p_depts text[], p_shared text[], p_words text[], p_exclude text[], p_acts_only boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id integer, title text, is_act boolean, current_stage text, last_update timestamp with time zone, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH p AS MATERIALIZED (
    SELECT whole_words_pattern(p_words) AS inc, whole_words_pattern(p_exclude) AS exc,
           coalesce((SELECT array_agg(d) FROM unnest(p_depts) d WHERE d <> ALL (coalesce(p_shared, '{}'))), '{}') AS own
  )
  SELECT b.id, b.title, b.is_act, b.current_stage, b.last_update, count(*) OVER () AS total
  FROM public.bill_topic_listing_stored b, p
  WHERE (NOT p_acts_only OR b.is_act)
    AND (p.exc IS NULL OR b.title !~* p.exc)
    AND (
      (b.bill_type_id IN (1, 3, 4, 10) AND (b.sponsor_departments && p.own OR (b.sponsor_departments && p_depts AND b.title ~* p.inc)))
      OR (b.bill_type_id IN (2, 5, 6, 7, 8) AND b.title ~* p.inc)
    )
  ORDER BY b.last_update DESC, b.id DESC
  LIMIT p_limit OFFSET p_offset
$function$;

DO $$
DECLARE n bigint;
BEGIN
  IF (SELECT count(*) FROM public.function_backup_20261022i) <> 2 THEN RAISE EXCEPTION 'expected 2 functions backed up'; END IF;
  IF (SELECT stats FROM before_stats) IS DISTINCT FROM public.press_release_stats() THEN RAISE EXCEPTION 'press_release_stats differs'; END IF;
  IF (SELECT ((stats->>'gov_total')::bigint) FROM before_stats) < 40000 THEN RAISE EXCEPTION 'press_release_stats total looks wrong'; END IF;
  SELECT count(*) INTO n FROM (
    (SELECT * FROM before_topic EXCEPT ALL SELECT * FROM public.topic_bills_page(ARRAY['Department for Culture, Media and Sport','Department for Digital, Culture, Media and Sport'],
       ARRAY['Department for Digital, Culture, Media and Sport'], ARRAY['broadcasting','sport','museum','gambling'], ARRAY[]::text[], false, 50, 0))
    UNION ALL
    (SELECT * FROM public.topic_bills_page(ARRAY['Department for Culture, Media and Sport','Department for Digital, Culture, Media and Sport'],
       ARRAY['Department for Digital, Culture, Media and Sport'], ARRAY['broadcasting','sport','museum','gambling'], ARRAY[]::text[], false, 50, 0)
     EXCEPT ALL SELECT * FROM before_topic)) d;
  IF n <> 0 THEN RAISE EXCEPTION 'topic_bills_page differs in % rows', n; END IF;
  IF has_function_privilege('anon', 'public.refresh_press_release_stats()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can refresh'; END IF;
END $$;

SELECT 'gov.uk releases counted' AS step, (stats->>'gov_total')::bigint AS n FROM public.press_release_stats_stored
UNION ALL SELECT 'topic sample rows', count(*) FROM before_topic;

COMMIT;
