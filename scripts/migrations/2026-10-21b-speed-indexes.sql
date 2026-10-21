-- Page speed and build load: indexes and small read functions (owner's approval, 21 Oct 2026). Each replaces a read
-- that scanned a whole table or paged through it in the app:
--   1. mp_expenses_detail(updated_at DESC), mp_division_votes(created_at DESC), lobby_meeting_mentions(built_at DESC):
--      "newest row" reads (lib/data-freshness.ts, the lobby_summary refresh) scanned 570,485 / 1.15 million / 55,814
--      rows (5.9 s / 4.2 s / 2.3 s cold).
--   2. mp_division_votes(member_id, division_date_only) INCLUDE (vote_type, is_rebellion) and mp_vote_counts(): the MP
--      page's five separate vote counts become one index-only read (app/mps/[id]/page.tsx).
--   3. Trigram index on bill.title: the topic pages' keyword search (app/topics/[slug]/page.tsx) scanned the 18 MB
--      table and timed out 6 times in a build.
--   4. bill(last_update DESC) WHERE hidden_reason IS NULL: feed.xml and the bill lists sort visible bills by date.
--   5. party_donations_total() and a btree on political_donations(recipient_name): the party page summed donations
--      in the app from one unpaged read, which the API caps at 1,000 rows (Labour has over 15,000), so the total
--      was incomplete. The function sums every row.
--   6. top_question_askers(): the topic pages read all of mp_contribution_totals and every MP to rank five MPs.
--   7. commons_division_keys(): the votes and debates syncs read the commons_divisions_titled view, which groups
--      all 1.15 million vote rows; this returns the same divisions for a date range from the date/number index.
-- Functions are read only and SECURITY INVOKER (the caller's own rights; anon can already read these tables).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';

DO $$
DECLARE n text;
BEGIN
  FOREACH n IN ARRAY ARRAY['mp_expenses_detail_updated_at_idx','mp_division_votes_created_at_idx',
    'lobby_meeting_mentions_built_at_idx','mp_division_votes_member_date_counts_idx','bill_title_trgm_idx',
    'bill_visible_last_update_idx','political_donations_recipient_name_idx'] LOOP
    IF to_regclass('public.' || n) IS NOT NULL THEN RAISE EXCEPTION 'index % already exists', n; END IF;
  END LOOP;
  FOREACH n IN ARRAY ARRAY['public.mp_vote_counts(integer,date)','public.party_donations_total(text)',
    'public.top_question_askers(text[],integer)','public.commons_division_keys(date,date)'] LOOP
    IF to_regprocedure(n) IS NOT NULL THEN RAISE EXCEPTION 'function % already exists', n; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN RAISE EXCEPTION 'pg_trgm is not installed'; END IF;
END $$;

CREATE INDEX mp_expenses_detail_updated_at_idx ON public.mp_expenses_detail (updated_at DESC);
CREATE INDEX mp_division_votes_created_at_idx ON public.mp_division_votes (created_at DESC);
CREATE INDEX lobby_meeting_mentions_built_at_idx ON public.lobby_meeting_mentions (built_at DESC);
CREATE INDEX mp_division_votes_member_date_counts_idx ON public.mp_division_votes (member_id, division_date_only) INCLUDE (vote_type, is_rebellion);
CREATE INDEX bill_title_trgm_idx ON public.bill USING gin (title gin_trgm_ops);
CREATE INDEX bill_visible_last_update_idx ON public.bill (last_update DESC NULLS LAST) WHERE hidden_reason IS NULL;
CREATE INDEX political_donations_recipient_name_idx ON public.political_donations (recipient_name);

-- The MP page's vote counts, same rules as before: every vote held, aye/no votes, aye/no votes since p_since (the
-- July 2024 election), and votes against most of the MP's party (is_rebellion) since p_since and in all.
CREATE FUNCTION public.mp_vote_counts(p_member_id integer, p_since date DEFAULT '2024-07-04') RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  SELECT jsonb_build_object(
    'all_votes', count(*),
    'aye_no', count(*) FILTER (WHERE vote_type IN ('aye', 'no')),
    'aye_no_since', count(*) FILTER (WHERE vote_type IN ('aye', 'no') AND division_date_only >= p_since),
    'rebellions_since', count(*) FILTER (WHERE is_rebellion AND division_date_only >= p_since),
    'rebellions_all', count(*) FILTER (WHERE is_rebellion))
  FROM public.mp_division_votes WHERE member_id = p_member_id;
$fn$;

-- Every donation recorded to one Electoral Commission recipient name, summed in full.
CREATE FUNCTION public.party_donations_total(p_recipient_name text) RETURNS numeric
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  SELECT coalesce(sum(amount), 0) FROM public.political_donations WHERE recipient_name = p_recipient_name;
$fn$;

-- MPs who asked the most written questions to the given departments (wq_top_departments), the topic pages' rule:
-- serving or unknown-status MPs only, a count above 0, highest first (ties by member id).
CREATE FUNCTION public.top_question_askers(p_depts text[], p_limit integer DEFAULT 5)
RETURNS TABLE (member_id integer, name text, party text, questions bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  SELECT t.member_id, m.name, m.party, sum((e->>'count')::bigint) AS questions
    FROM public.mp_contribution_totals t
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(t.wq_top_departments, '[]'::jsonb)) e
    JOIN public.mps m ON m.member_id = t.member_id AND (m.current_member IS NULL OR m.current_member)
   WHERE e->>'dept' = ANY (p_depts)
   GROUP BY t.member_id, m.name, m.party
  HAVING sum((e->>'count')::bigint) > 0
   ORDER BY questions DESC, t.member_id
   LIMIT p_limit;
$fn$;

-- The divisions we hold vote rows for in a date range (one row per division), as commons_divisions_titled gave.
CREATE FUNCTION public.commons_division_keys(p_from date, p_to date DEFAULT NULL)
RETURNS TABLE (division_date_only date, division_number integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  SELECT DISTINCT v.division_date_only, v.division_number
    FROM public.mp_division_votes v
   WHERE v.division_date_only >= p_from AND (p_to IS NULL OR v.division_date_only <= p_to)
     AND v.division_number IS NOT NULL
   ORDER BY 1, 2;
$fn$;

COMMENT ON FUNCTION public.mp_vote_counts(integer, date) IS 'Vote counts for the MP page (migration 2026-10-21b)';
COMMENT ON FUNCTION public.party_donations_total(text) IS 'All donations to one recipient name, for the party page (migration 2026-10-21b)';
COMMENT ON FUNCTION public.top_question_askers(text[], integer) IS 'Top MPs by written questions to departments, for topic pages (migration 2026-10-21b)';
COMMENT ON FUNCTION public.commons_division_keys(date, date) IS 'Divisions held in a date range, for the votes and debates syncs (migration 2026-10-21b)';
REVOKE ALL ON FUNCTION public.mp_vote_counts(integer, date), public.party_donations_total(text),
  public.top_question_askers(text[], integer), public.commons_division_keys(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mp_vote_counts(integer, date), public.party_donations_total(text),
  public.top_question_askers(text[], integer), public.commons_division_keys(date, date) TO anon, authenticated, service_role;

ANALYZE public.mp_expenses_detail, public.mp_division_votes, public.lobby_meeting_mentions, public.bill, public.political_donations;

-- Each function gives exactly what the query it replaces gives.
DO $$
DECLARE j jsonb; mid int; n bigint; a numeric; b numeric; d1 bigint; d2 bigint;
BEGIN
  FOREACH mid IN ARRAY ARRAY[39, 1427, 4119] LOOP
    j := public.mp_vote_counts(mid);
    SELECT count(*) INTO n FROM public.mp_division_votes WHERE member_id = mid;
    IF (j->>'all_votes')::bigint <> n THEN RAISE EXCEPTION 'mp_vote_counts(%) all_votes % <> %', mid, j->>'all_votes', n; END IF;
    SELECT count(*) INTO n FROM public.mp_division_votes WHERE member_id = mid AND vote_type IN ('aye','no') AND division_date_only >= '2024-07-04';
    IF (j->>'aye_no_since')::bigint <> n THEN RAISE EXCEPTION 'mp_vote_counts(%) aye_no_since % <> %', mid, j->>'aye_no_since', n; END IF;
    SELECT count(*) INTO n FROM public.mp_division_votes WHERE member_id = mid AND is_rebellion;
    IF (j->>'rebellions_all')::bigint <> n THEN RAISE EXCEPTION 'mp_vote_counts(%) rebellions_all % <> %', mid, j->>'rebellions_all', n; END IF;
  END LOOP;
  SELECT sum(amount) INTO a FROM public.political_donations WHERE recipient_name = 'Labour Party';
  b := public.party_donations_total('Labour Party');
  IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'party_donations_total % <> %', b, a; END IF;
  SELECT count(*) INTO d1 FROM public.commons_division_keys((current_date - 365)::date);
  SELECT count(*) INTO d2 FROM public.commons_divisions_titled WHERE division_date_only >= current_date - 365;
  IF d1 <> d2 OR d1 = 0 THEN RAISE EXCEPTION 'commons_division_keys % rows, view % rows', d1, d2; END IF;
  IF (SELECT count(*) FROM public.top_question_askers(ARRAY['Department for Transport'])) = 0 THEN RAISE EXCEPTION 'top_question_askers is empty'; END IF;
  IF NOT has_function_privilege('anon', 'public.mp_vote_counts(integer,date)', 'EXECUTE') THEN RAISE EXCEPTION 'anon cannot run the functions'; END IF;
END $$;

SELECT public.mp_vote_counts(39) AS mp_39, public.party_donations_total('Labour Party') AS labour_total,
       (SELECT count(*) FROM public.commons_division_keys((current_date - 365)::date)) AS divisions_last_year;

COMMIT;
