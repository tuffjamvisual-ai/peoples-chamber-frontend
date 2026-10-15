-- Votes against the party: each MP's party on the day of the vote, and a correct
-- is_rebellion flag on every Commons vote.
--
-- Before this, is_rebellion came from the old parlparse feed: only 68 of 1.1 million votes
-- were flagged and none after April 2024, so almost every MP page said "no votes against the
-- party line" while the party whip pages (which worked it out on the fly from today's party)
-- showed many. The Commons Votes API names each voter's party at the time of the vote, so an
-- MP who has since changed party is counted against the party they belonged to then.
--
-- The rule (applied by apply_division_parties):
--   - In each division, a party's side is the one most of its MPs voted for (tellers not
--     counted). An MP who voted the other way is flagged is_rebellion.
--   - No side when the party split exactly evenly; nobody in it is flagged.
--   - Independents and the Speaker have no party, so are never flagged.
--   - Free votes are not labelled by Parliament, so they are included. The pages say so.
--
-- Filled by scripts/backfill-division-parties.js (all divisions) and, for new divisions, by
-- app/api/sync-commons-votes-api/route.ts.
--
-- Also adds:
--   - party_division_splits and party_member_vote_stats: saved results for the party whip
--     pages (this Parliament only), refreshed by refresh_whip_views().
--   - recompute_mp_activity_metrics(): the weekly attendance and rebellion figures, worked out
--     in the database. The old route read at most 1,000 rows for the division total, so it
--     recorded 2 divisions for this Parliament.

\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.mp_division_votes ADD COLUMN IF NOT EXISTS party text;  -- party at the time of the vote (Commons Votes API)
ALTER TABLE public.commons_division_totals ADD COLUMN IF NOT EXISTS parties_applied_at timestamptz;  -- when apply_division_parties last ran for it

-- Fill party for one division and recompute its is_rebellion flags.
-- p_members: [{"member_id": 4858, "party": "Conservative"}, ...] from the API's division detail.
CREATE OR REPLACE FUNCTION public.apply_division_parties(p_division_id integer, p_members jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_set integer;
  v_rows integer;
  v_with_party integer;
  v_rebels integer;
BEGIN
  UPDATE mp_division_votes v
     SET party = x.party
    FROM jsonb_to_recordset(p_members) AS x(member_id integer, party text)
   WHERE v.division_id = p_division_id
     AND v.member_id = x.member_id
     AND nullif(trim(x.party), '') IS NOT NULL
     AND v.party IS DISTINCT FROM x.party;
  GET DIAGNOSTICS v_set = ROW_COUNT;

  WITH split AS (
    SELECT party,
           count(*) FILTER (WHERE vote_type = 'aye' AND NOT coalesce(is_teller, false)) AS ayes,
           count(*) FILTER (WHERE vote_type = 'no'  AND NOT coalesce(is_teller, false)) AS noes
      FROM mp_division_votes
     WHERE division_id = p_division_id
       AND party IS NOT NULL
       AND party NOT ILIKE 'Independent%'
       AND party <> 'Speaker'
     GROUP BY party
  ), side AS (
    SELECT party, CASE WHEN ayes > noes THEN 'aye' WHEN noes > ayes THEN 'no' END AS side FROM split
  ), flag AS (
    SELECT v2.id, (s.side IS NOT NULL AND v2.vote_type IN ('aye', 'no') AND v2.vote_type <> s.side) AS rebel
      FROM mp_division_votes v2
      LEFT JOIN side s ON s.party = v2.party
     WHERE v2.division_id = p_division_id
  )
  UPDATE mp_division_votes v
     SET is_rebellion = f.rebel
    FROM flag f
   WHERE v.id = f.id
     AND v.is_rebellion IS DISTINCT FROM f.rebel;

  SELECT count(*), count(party), count(*) FILTER (WHERE is_rebellion)
    INTO v_rows, v_with_party, v_rebels
    FROM mp_division_votes WHERE division_id = p_division_id;

  UPDATE commons_division_totals SET parties_applied_at = now() WHERE division_id = p_division_id;

  RETURN jsonb_build_object('division_id', p_division_id, 'party_set', v_set, 'rows', v_rows,
                            'rows_with_party', v_with_party, 'rebellions', v_rebels);
END $$;

REVOKE ALL ON FUNCTION public.apply_division_parties(integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_division_parties(integer, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_division_parties(integer, jsonb) TO service_role;

-- Party whip pages: how each party split in each division this Parliament.
DROP MATERIALIZED VIEW IF EXISTS public.party_division_splits;
CREATE MATERIALIZED VIEW public.party_division_splits AS
SELECT division_id,
       division_date_only,
       division_number,
       trim(min(division_title)) AS division_title,
       party,
       count(*) FILTER (WHERE vote_type = 'aye' AND NOT coalesce(is_teller, false)) AS ayes,
       count(*) FILTER (WHERE vote_type = 'no'  AND NOT coalesce(is_teller, false)) AS noes,
       now() AS refreshed_at
  FROM public.mp_division_votes
 WHERE division_date_only >= DATE '2024-07-04'
   AND party IS NOT NULL
   AND division_id IS NOT NULL
   AND vote_type IN ('aye', 'no')
 GROUP BY division_id, division_date_only, division_number, party;
CREATE UNIQUE INDEX party_division_splits_key ON public.party_division_splits (division_id, party);
CREATE INDEX party_division_splits_party_idx ON public.party_division_splits (party);

-- Party whip pages: each MP's votes and votes against the party, as a member of that party,
-- this Parliament. An MP who changed party has a row for each.
DROP MATERIALIZED VIEW IF EXISTS public.party_member_vote_stats;
CREATE MATERIALIZED VIEW public.party_member_vote_stats AS
SELECT party,
       member_id,
       count(*) FILTER (WHERE vote_type IN ('aye', 'no')) AS votes,
       count(*) FILTER (WHERE is_rebellion) AS rebellions,
       min(division_date_only) AS first_vote,
       max(division_date_only) AS last_vote,
       now() AS refreshed_at
  FROM public.mp_division_votes
 WHERE division_date_only >= DATE '2024-07-04'
   AND party IS NOT NULL
 GROUP BY party, member_id;
CREATE UNIQUE INDEX party_member_vote_stats_key ON public.party_member_vote_stats (party, member_id);

GRANT SELECT ON public.party_division_splits, public.party_member_vote_stats TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_whip_views()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.party_division_splits;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.party_member_vote_stats;
  RETURN jsonb_build_object(
    'party_division_splits', (SELECT count(*) FROM public.party_division_splits),
    'party_member_vote_stats', (SELECT count(*) FROM public.party_member_vote_stats),
    'refreshed_at', now()
  );
END $$;

REVOKE ALL ON FUNCTION public.refresh_whip_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_whip_views() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_whip_views() TO service_role;

-- Weekly MP activity figures for this Parliament (speeches_year and questions_year are
-- filled by a different job and are left alone). An MP's possible divisions are those since
-- the later of the July 2024 election and the start of their current seat.
CREATE OR REPLACE FUNCTION public.recompute_mp_activity_metrics()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_written integer;
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total FROM commons_division_totals WHERE division_date >= DATE '2024-07-04';

  WITH mp AS (
    SELECT member_id, greatest(DATE '2024-07-04', coalesce(start_date::date, DATE '2024-07-04')) AS since
      FROM mps WHERE current_member = true
  ), possible AS (
    SELECT mp.member_id, count(t.division_id) AS n
      FROM mp LEFT JOIN commons_division_totals t ON t.division_date >= mp.since
     GROUP BY mp.member_id
  ), per AS (
    SELECT member_id,
           count(DISTINCT division_id) FILTER (WHERE vote_type IN ('aye', 'no', 'both')) AS voted,
           count(*) FILTER (WHERE is_rebellion) AS rebellions
      FROM mp_division_votes
     WHERE division_date_only >= DATE '2024-07-04'
     GROUP BY member_id
  )
  INSERT INTO mp_activity_metrics AS a
         (member_id, divisions_voted, divisions_total, attendance_pct, rebellions_total, rebellion_rate_pct, refreshed_at)
  SELECT p.member_id,
         coalesce(per.voted, 0),
         p.n,
         CASE WHEN p.n > 0 THEN least(100, round(coalesce(per.voted, 0) * 100.0 / p.n, 2)) END,
         coalesce(per.rebellions, 0),
         CASE WHEN per.voted > 0 THEN round(per.rebellions * 100.0 / per.voted, 2) END,
         now()
    FROM possible p LEFT JOIN per USING (member_id)
  ON CONFLICT (member_id) DO UPDATE SET
         divisions_voted    = excluded.divisions_voted,
         divisions_total    = excluded.divisions_total,
         attendance_pct     = excluded.attendance_pct,
         rebellions_total   = excluded.rebellions_total,
         rebellion_rate_pct = excluded.rebellion_rate_pct,
         refreshed_at       = excluded.refreshed_at;
  GET DIAGNOSTICS v_written = ROW_COUNT;

  RETURN jsonb_build_object('members_written', v_written, 'divisions_this_parliament', v_total, 'refreshed_at', now());
END $$;

REVOKE ALL ON FUNCTION public.recompute_mp_activity_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_mp_activity_metrics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_mp_activity_metrics() TO service_role;

-- Self-check.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_division_votes' AND column_name = 'party') THEN
    RAISE EXCEPTION 'mp_division_votes.party missing';
  END IF;
  IF has_function_privilege('anon', 'public.apply_division_parties(integer, jsonb)', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run apply_division_parties'; END IF;
  IF has_function_privilege('anon', 'public.refresh_whip_views()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run refresh_whip_views'; END IF;
  IF has_function_privilege('anon', 'public.recompute_mp_activity_metrics()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run recompute_mp_activity_metrics'; END IF;
END $$;

COMMIT;
