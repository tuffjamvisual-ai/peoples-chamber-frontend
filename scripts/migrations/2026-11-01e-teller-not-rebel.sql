-- 2026-11-01e: tellers are not stored as rebels (owner's approval, "yes", 1 Nov 2026).
-- A teller counts the votes and is not rebelling. lib/division-votes.ts already counts a rebel only when is_rebellion is
-- true and is_teller is false, but 317 teller rows (170 divisions, 149 MPs) were stored with is_rebellion = true.
-- 1. mp_division_votes: is_rebellion = false WHERE is_teller AND is_rebellion (317 rows; their ids are in the backup off
--    the repo, "Claude outputs/backups/2026-11-01e-teller-rebellion-before.csv").
-- 2. apply_division_parties(), which sets is_rebellion for each division on the Commons votes sync
--    (/api/sync-commons-votes-api) and scripts/backfill-division-parties.js, no longer flags tellers, so the next sync
--    does not set the flag again. Only its "flag" step changes.
-- 3. The stored totals built from is_rebellion are rebuilt in the same transaction: party_member_vote_stats (party
--    whip pages) and mp_vote_counts_stored (mp_vote_counts(), MP profiles) are refreshed, and
--    recompute_mp_activity_metrics() rewrites mp_activity_metrics.rebellions_total and rebellion_rate_pct.
--    party_division_splits does not use is_rebellion and is not touched.
-- Guards (RAISE): 317 teller rebels before; exactly 317 rows change; none afterwards; every other column and row of
-- mp_division_votes unchanged (row count and a checksum of every row without is_rebellion, before and after);
-- rebellion rows fall by exactly 317; the function holds the teller rule. Undo: 2026-11-01e-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE tnr_before ON COMMIT DROP AS
  SELECT count(*) AS n, sum(('x' || substr(md5((to_jsonb(v) - 'is_rebellion')::text), 1, 15))::bit(60)::bigint)::numeric AS checksum,
         count(*) FILTER (WHERE is_teller AND is_rebellion) AS teller_rebels,
         count(*) FILTER (WHERE is_rebellion) AS rebels
    FROM public.mp_division_votes v;
CREATE TEMP TABLE tnr_stored_before ON COMMIT DROP AS
  SELECT (SELECT coalesce(sum(rebellions), 0) FROM public.party_member_vote_stats) AS whip_rebellions,
         (SELECT coalesce(sum((counts->>'rebellions_all')::int), 0) FROM public.mp_vote_counts_stored) AS stored_rebellions,
         (SELECT coalesce(sum(rebellions_total), 0) FROM public.mp_activity_metrics) AS activity_rebellions;
CREATE TEMP TABLE tnr_changed (n integer) ON COMMIT DROP;

DO $$
DECLARE
  b record;
  changed integer;
BEGIN
  SELECT * INTO b FROM tnr_before;
  IF b.teller_rebels <> 317 THEN RAISE EXCEPTION 'expected 317 teller rows flagged as rebels before, found %', b.teller_rebels; END IF;
  UPDATE public.mp_division_votes SET is_rebellion = false WHERE is_teller AND is_rebellion;
  GET DIAGNOSTICS changed = ROW_COUNT;
  INSERT INTO tnr_changed VALUES (changed);
END $$;

CREATE OR REPLACE FUNCTION public.apply_division_parties(p_division_id integer, p_members jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    -- A teller counts the votes and is not rebelling (owner, 1 Nov 2026, migration 2026-11-01e).
    SELECT v2.id, (s.side IS NOT NULL AND v2.vote_type IN ('aye', 'no') AND v2.vote_type <> s.side AND NOT coalesce(v2.is_teller, false)) AS rebel
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
END $function$;

REFRESH MATERIALIZED VIEW CONCURRENTLY public.party_member_vote_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mp_vote_counts_stored;
SELECT public.recompute_mp_activity_metrics() IS NOT NULL AS activity_metrics_recomputed;

DO $$
DECLARE
  b record;
  a record;
  sb record;
  sa record;
  changed integer;
BEGIN
  SELECT * INTO b FROM tnr_before;
  SELECT * INTO sb FROM tnr_stored_before;
  SELECT n INTO changed FROM tnr_changed;
  SELECT count(*) AS n, sum(('x' || substr(md5((to_jsonb(v) - 'is_rebellion')::text), 1, 15))::bit(60)::bigint)::numeric AS checksum,
         count(*) FILTER (WHERE is_teller AND is_rebellion) AS teller_rebels,
         count(*) FILTER (WHERE is_rebellion) AS rebels
    INTO a FROM public.mp_division_votes v;
  SELECT (SELECT coalesce(sum(rebellions), 0) FROM public.party_member_vote_stats) AS whip_rebellions,
         (SELECT coalesce(sum((counts->>'rebellions_all')::int), 0) FROM public.mp_vote_counts_stored) AS stored_rebellions,
         (SELECT coalesce(sum(rebellions_total), 0) FROM public.mp_activity_metrics) AS activity_rebellions INTO sa;
  RAISE NOTICE 'rows changed %, teller rebels after %, rebellion rows % to %, rows % to %, other columns unchanged %, stored rebellions: whip % to %, profile counts % to %, activity metrics % to %',
    changed, a.teller_rebels, b.rebels, a.rebels, b.n, a.n, (a.checksum = b.checksum),
    sb.whip_rebellions, sa.whip_rebellions, sb.stored_rebellions, sa.stored_rebellions, sb.activity_rebellions, sa.activity_rebellions;
  IF changed <> 317 THEN RAISE EXCEPTION 'expected exactly 317 rows changed, got %', changed; END IF;
  IF a.teller_rebels <> 0 THEN RAISE EXCEPTION '% teller rows still flagged as rebels', a.teller_rebels; END IF;
  IF a.n <> b.n THEN RAISE EXCEPTION 'row count changed: % to %', b.n, a.n; END IF;
  IF a.checksum <> b.checksum THEN RAISE EXCEPTION 'a column other than is_rebellion changed'; END IF;
  IF a.rebels <> b.rebels - 317 THEN RAISE EXCEPTION 'rebellion rows % to %, expected a fall of 317', b.rebels, a.rebels; END IF;
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.apply_division_parties(integer, jsonb)'::regprocedure) NOT ILIKE '%AND NOT coalesce(v2.is_teller, false)) AS rebel%' THEN
    RAISE EXCEPTION 'apply_division_parties does not hold the teller rule';
  END IF;
END $$;

COMMIT;
