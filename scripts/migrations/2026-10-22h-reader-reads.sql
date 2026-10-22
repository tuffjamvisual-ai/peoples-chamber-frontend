-- 2026-10-22h: the slowest reads on reader pages (owner's approval, 22 Oct 2026: "EXPLAIN ANALYZE, add the missing
-- index or precompute it into a stored table refreshed daily"), and what the contracts and EDM syncs need to resume.
-- Every one of these reads is fast once its pages are in memory (0.6 to 100 ms) and slow when they are not (200 to
-- 3,400 ms): the database has about 0.9 GB of memory for 2.3 GB of data and swaps. So each fix makes the read touch
-- far fewer pages, or reads a small stored copy.
--  1. related_press_releases (read next on /news/[slug]): the "already shown" list walked the whole published_at
--     index (33,000 rows, 24,700 buffers) to find 7 rows of one organisation; it now uses the (organisation,
--     published_at) index. Same results.
--  2. mp_vote_counts (/mps/[id]): counts stored per MP in mp_vote_counts_stored (refreshed after the daily votes sync
--     and by the daily refresh). An MP not in the stored copy, or a different start date, is counted live as before.
--  3. Constituency unit lookup (/donations/constituencies/[slug]): trigram index on accounting_unit_name.
--  4. council_claimant_count: covering index, so a council's ~490 months come from a few index pages.
--  5. press_release_stats: partial index on the publication day of gov.uk releases, so the counts read the index only.
--  6. getParliamentSessions / getSessionBills: bill_in_session and parliament_session_bill_counts stored
--     (bill_in_session_stored, parliament_session_bill_counts_stored), refreshed after each bill stages and sponsors
--     sync and by the daily refresh.
--  7. political_donations on /transparency/donations: index matching its order (received_date DESC NULLS LAST).
--  8. Topic bills pages: topic_bills_page reads a narrow stored copy of the visible bills (bill_topic_listing_stored).
--  9. refresh_contractor_donor_matches gets its own 120 s statement timeout (the API applies a function's own
--     statement_timeout; tested 22 Oct 2026), and two new refresh functions get the same.
-- 10. sync_cursor: where the contracts and EDM syncs stopped, so the next run carries on.
-- Replaced function definitions are kept in function_backup_20261022h. Results of the replaced functions are compared
-- before and after for sample inputs; the migration stops if any differ.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.function_backup_20261022h') IS NOT NULL THEN RAISE EXCEPTION 'function_backup_20261022h already exists'; END IF;
  IF to_regclass('public.mp_vote_counts_stored') IS NOT NULL THEN RAISE EXCEPTION 'mp_vote_counts_stored already exists'; END IF;
  IF to_regclass('public.bill_in_session_stored') IS NOT NULL THEN RAISE EXCEPTION 'bill_in_session_stored already exists'; END IF;
  IF to_regclass('public.sync_cursor') IS NOT NULL THEN RAISE EXCEPTION 'sync_cursor already exists'; END IF;
END $$;

CREATE TABLE public.function_backup_20261022h AS
  SELECT p.oid::regprocedure::text AS signature, pg_get_functiondef(p.oid) AS definition, now() AS backed_up_at
  FROM pg_proc p
  WHERE p.oid IN ('public.related_press_releases(integer, integer)'::regprocedure,
                  'public.mp_vote_counts(integer, date)'::regprocedure,
                  'public.topic_bills_page(text[], text[], text[], text[], boolean, integer, integer)'::regprocedure,
                  'public.refresh_contractor_donor_matches()'::regprocedure);
ALTER TABLE public.function_backup_20261022h ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.function_backup_20261022h) <> 4 THEN RAISE EXCEPTION 'expected 4 functions backed up'; END IF;
END $$;

-- Results before, for the comparison at the end.
CREATE TEMP TABLE before_related ON COMMIT DROP AS
  SELECT s.id, r.* FROM (
    SELECT 38293 AS id
    UNION ALL (SELECT id FROM public.press_releases WHERE organisation = 'Prime Minister''s Office, 10 Downing Street' AND news_slug IS NOT NULL ORDER BY published_at DESC LIMIT 1)
    UNION ALL (SELECT id FROM public.press_releases WHERE organisation = 'Environment Agency' AND news_slug IS NOT NULL ORDER BY published_at DESC OFFSET 40 LIMIT 1)
  ) s, LATERAL public.related_press_releases(s.id, 2) r;
CREATE TEMP TABLE before_votes ON COMMIT DROP AS
  SELECT m AS member_id, public.mp_vote_counts(m, '2024-07-04') AS counts FROM unnest(ARRAY[1409, 4491, 4617, 4798, 5091]) m;
CREATE TEMP TABLE before_topic ON COMMIT DROP AS
  SELECT * FROM public.topic_bills_page(ARRAY['Department for Culture, Media and Sport','Department for Digital, Culture, Media and Sport'],
    ARRAY['Department for Digital, Culture, Media and Sport'], ARRAY['broadcasting','sport','museum','gambling'], ARRAY[]::text[], false, 50, 0);

-- 1. related_press_releases: the "already shown" list reads the organisation's newest 7 from its own index.
CREATE OR REPLACE FUNCTION public.related_press_releases(p_id integer, p_limit integer DEFAULT 2)
 RETURNS TABLE(news_slug text, title text, organisation text, published_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH r AS (
    SELECT id, title, organisation, published_at FROM public.press_releases WHERE id = p_id
  ),
  q AS (
    SELECT to_tsquery('simple', string_agg(quote_literal(l), ' | ')) AS tq
      FROM r, unnest(tsvector_to_array(to_tsvector('english', r.title))) l
     WHERE length(l) > 2
  ),
  shown AS (
    SELECT p.id FROM public.press_releases p
     WHERE p.organisation = (SELECT organisation FROM r) AND p.gov_url IS NOT NULL AND p.removed_upstream IS NOT TRUE
     ORDER BY p.published_at DESC
     LIMIT 7
  ),
  candidates AS MATERIALIZED (
    SELECT p.id, p.news_slug, p.title, p.organisation, p.published_at,
           to_tsvector('english', p.title || ' ' || coalesce(p.description, '')) AS v
      FROM public.press_releases p, r
     WHERE p.organisation = r.organisation
       AND p.published_at BETWEEN r.published_at - interval '180 days' AND r.published_at + interval '180 days'
       AND p.id <> r.id AND p.news_slug IS NOT NULL AND p.removed_upstream IS NOT TRUE
  )
  SELECT c.news_slug, c.title, c.organisation, c.published_at
    FROM candidates c, q
   WHERE q.tq IS NOT NULL AND c.v @@ q.tq AND c.id NOT IN (SELECT id FROM shown)
   ORDER BY ts_rank(c.v, q.tq) DESC, c.published_at DESC
   LIMIT p_limit;
$function$;

-- 2. mp_vote_counts: stored counts for the current Parliament.
CREATE MATERIALIZED VIEW public.mp_vote_counts_stored AS
  SELECT member_id, '2024-07-04'::date AS since,
    jsonb_build_object(
      'all_votes', count(*),
      'aye_no', count(*) FILTER (WHERE vote_type IN ('aye', 'no')),
      'aye_no_since', count(*) FILTER (WHERE vote_type IN ('aye', 'no') AND division_date_only >= '2024-07-04'::date),
      'rebellions_since', count(*) FILTER (WHERE is_rebellion AND division_date_only >= '2024-07-04'::date),
      'rebellions_all', count(*) FILTER (WHERE is_rebellion)) AS counts
  FROM public.mp_division_votes
  WHERE member_id IS NOT NULL
  GROUP BY member_id;
CREATE UNIQUE INDEX mp_vote_counts_stored_member_since_idx ON public.mp_vote_counts_stored (member_id, since);
REVOKE ALL ON public.mp_vote_counts_stored FROM anon, authenticated;
GRANT SELECT ON public.mp_vote_counts_stored TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mp_vote_counts(p_member_id integer, p_since date DEFAULT '2024-07-04'::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (SELECT counts FROM public.mp_vote_counts_stored WHERE member_id = p_member_id AND since = p_since),
    (SELECT jsonb_build_object(
      'all_votes', count(*),
      'aye_no', count(*) FILTER (WHERE vote_type IN ('aye', 'no')),
      'aye_no_since', count(*) FILTER (WHERE vote_type IN ('aye', 'no') AND division_date_only >= p_since),
      'rebellions_since', count(*) FILTER (WHERE is_rebellion AND division_date_only >= p_since),
      'rebellions_all', count(*) FILTER (WHERE is_rebellion))
     FROM public.mp_division_votes WHERE member_id = p_member_id));
$function$;

-- 3. Constituency unit lookup: ILIKE '%word%' on accounting_unit_name.
CREATE INDEX political_donations_accounting_unit_trgm_idx ON public.political_donations USING gin (accounting_unit_name gin_trgm_ops);

-- 4. council_claimant_count: a council's months from the index alone.
CREATE INDEX council_claimant_count_gss_month_cover_idx ON public.council_claimant_count (council_gss_code, month)
  INCLUDE (claimants, claimants_men, claimants_women, rate, rate_men, rate_women);

-- 5. press_release_stats: the publication day of every gov.uk release, from the index alone.
CREATE INDEX press_releases_gov_day_idx ON public.press_releases (((published_at AT TIME ZONE 'UTC')::date))
  WHERE gov_url ILIKE '%gov.uk%';

-- 6. Sessions: bill_in_session and its counts stored.
CREATE MATERIALIZED VIEW public.bill_in_session_stored AS SELECT * FROM public.bill_in_session;
CREATE UNIQUE INDEX bill_in_session_stored_key_idx ON public.bill_in_session_stored (bill_id, session_id);
CREATE INDEX bill_in_session_stored_session_title_idx ON public.bill_in_session_stored (session_id, title, bill_id);
CREATE MATERIALIZED VIEW public.parliament_session_bill_counts_stored AS SELECT * FROM public.parliament_session_bill_counts;
CREATE UNIQUE INDEX parliament_session_bill_counts_stored_session_idx ON public.parliament_session_bill_counts_stored (session_id);
REVOKE ALL ON public.bill_in_session_stored, public.parliament_session_bill_counts_stored FROM anon, authenticated;
GRANT SELECT ON public.bill_in_session_stored, public.parliament_session_bill_counts_stored TO anon, authenticated;

-- 7. /transparency/donations orders by received_date DESC NULLS LAST; the existing index is NULLS FIRST.
CREATE INDEX political_donations_received_date_nulls_last_idx ON public.political_donations (received_date DESC NULLS LAST);

-- 8. Topic bills: a narrow stored copy of the visible bills.
CREATE MATERIALIZED VIEW public.bill_topic_listing_stored AS
  SELECT id, title::text AS title, is_act, current_stage, last_update, bill_type_id, sponsor_departments
  FROM public.bill WHERE hidden_reason IS NULL;
CREATE UNIQUE INDEX bill_topic_listing_stored_id_idx ON public.bill_topic_listing_stored (id);
REVOKE ALL ON public.bill_topic_listing_stored FROM anon, authenticated;
GRANT SELECT ON public.bill_topic_listing_stored TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.topic_bills_page(p_depts text[], p_shared text[], p_words text[], p_exclude text[], p_acts_only boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id integer, title text, is_act boolean, current_stage text, last_update timestamp with time zone, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH p AS (
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

-- 9. Refresh functions, each with its own statement timeout (the API's default is 8 s).
ALTER FUNCTION public.refresh_contractor_donor_matches() SET statement_timeout = '120s';

CREATE FUNCTION public.refresh_bill_stores() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '120s' AS $fn$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.bill_in_session_stored;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.parliament_session_bill_counts_stored;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.bill_topic_listing_stored;
  RETURN jsonb_build_object(
    'bill_in_session', (SELECT count(*) FROM public.bill_in_session_stored),
    'sessions', (SELECT count(*) FROM public.parliament_session_bill_counts_stored),
    'topic_listing', (SELECT count(*) FROM public.bill_topic_listing_stored));
END $fn$;

CREATE FUNCTION public.refresh_vote_counts() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '120s' AS $fn$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mp_vote_counts_stored;
  RETURN (SELECT count(*) FROM public.mp_vote_counts_stored);
END $fn$;

REVOKE ALL ON FUNCTION public.refresh_bill_stores(), public.refresh_vote_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_bill_stores(), public.refresh_vote_counts() TO service_role;

-- 10. Where a resumable sync stopped.
CREATE TABLE public.sync_cursor (
  route text PRIMARY KEY,
  cursor jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_cursor ENABLE ROW LEVEL SECURITY;

-- Checks: same results as before, stored copies complete, permissions as intended.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM (
    (SELECT * FROM before_related EXCEPT ALL
       SELECT s.id, r.* FROM (SELECT DISTINCT id FROM before_related) s, LATERAL public.related_press_releases(s.id, 2) r)
    UNION ALL
    (SELECT s.id, r.* FROM (SELECT DISTINCT id FROM before_related) s, LATERAL public.related_press_releases(s.id, 2) r
     EXCEPT ALL SELECT * FROM before_related)) d;
  IF n <> 0 THEN RAISE EXCEPTION 'related_press_releases differs in % rows', n; END IF;
  IF (SELECT count(*) FROM before_related) < 4 THEN RAISE EXCEPTION 'related_press_releases sample too small'; END IF;

  SELECT count(*) INTO n FROM before_votes b WHERE public.mp_vote_counts(b.member_id, '2024-07-04') IS DISTINCT FROM b.counts;
  IF n <> 0 THEN RAISE EXCEPTION 'mp_vote_counts differs for % MPs', n; END IF;
  SELECT count(*) INTO n FROM before_votes b WHERE NOT EXISTS (SELECT 1 FROM public.mp_vote_counts_stored s WHERE s.member_id = b.member_id);
  IF n <> 0 THEN RAISE EXCEPTION '% sample MPs not stored', n; END IF;
  SELECT count(*) INTO n FROM (SELECT DISTINCT member_id FROM public.mp_division_votes WHERE member_id IS NOT NULL) m;
  IF n <> (SELECT count(*) FROM public.mp_vote_counts_stored) THEN RAISE EXCEPTION 'mp_vote_counts_stored has % MPs, expected %', (SELECT count(*) FROM public.mp_vote_counts_stored), n; END IF;

  SELECT count(*) INTO n FROM (
    (SELECT * FROM before_topic EXCEPT ALL SELECT * FROM public.topic_bills_page(ARRAY['Department for Culture, Media and Sport','Department for Digital, Culture, Media and Sport'],
       ARRAY['Department for Digital, Culture, Media and Sport'], ARRAY['broadcasting','sport','museum','gambling'], ARRAY[]::text[], false, 50, 0))
    UNION ALL
    (SELECT * FROM public.topic_bills_page(ARRAY['Department for Culture, Media and Sport','Department for Digital, Culture, Media and Sport'],
       ARRAY['Department for Digital, Culture, Media and Sport'], ARRAY['broadcasting','sport','museum','gambling'], ARRAY[]::text[], false, 50, 0)
     EXCEPT ALL SELECT * FROM before_topic)) d;
  IF n <> 0 THEN RAISE EXCEPTION 'topic_bills_page differs in % rows', n; END IF;
  IF (SELECT count(*) FROM before_topic) < 10 THEN RAISE EXCEPTION 'topic_bills_page sample too small'; END IF;

  IF (SELECT count(*) FROM public.bill_in_session_stored) <> (SELECT count(*) FROM public.bill_in_session) THEN RAISE EXCEPTION 'bill_in_session_stored incomplete'; END IF;
  IF (SELECT count(*) FROM public.parliament_session_bill_counts_stored) < 10 THEN RAISE EXCEPTION 'parliament_session_bill_counts_stored too small'; END IF;

  IF has_function_privilege('anon', 'public.refresh_bill_stores()', 'EXECUTE') OR has_function_privilege('anon', 'public.refresh_vote_counts()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can refresh'; END IF;
  IF NOT has_table_privilege('anon', 'public.mp_vote_counts_stored', 'SELECT') OR NOT has_table_privilege('anon', 'public.bill_in_session_stored', 'SELECT') THEN RAISE EXCEPTION 'anon cannot read the stored copies'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.sync_cursor'::regclass) OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sync_cursor') THEN RAISE EXCEPTION 'sync_cursor not closed'; END IF;
END $$;

SELECT 'related sample rows' AS step, count(*) AS n FROM before_related
UNION ALL SELECT 'MPs with stored vote counts', count(*) FROM public.mp_vote_counts_stored
UNION ALL SELECT 'bill_in_session_stored rows', count(*) FROM public.bill_in_session_stored
UNION ALL SELECT 'sessions stored', count(*) FROM public.parliament_session_bill_counts_stored
UNION ALL SELECT 'visible bills stored', count(*) FROM public.bill_topic_listing_stored
UNION ALL SELECT 'topic sample rows', count(*) FROM before_topic;

COMMIT;
