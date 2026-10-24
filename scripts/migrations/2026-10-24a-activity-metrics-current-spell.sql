-- 2026-10-24a: recompute_mp_activity_metrics() counts each MP's votes and rebellions from the same date as their
-- eligible divisions, greatest(4 July 2024, start of their current spell). Owner's approval, 24 Oct 2026.
-- Before this, votes ran from 4 July 2024 for everyone while eligible divisions ran from the current spell, so an MP
-- who left and returned had votes from both spells set against divisions from the current one (Nigel Farage: 185 of 40,
-- capped at 100%). MPs who have sat throughout are unaffected. Everything else is as in 2026-10-15c: SECURITY DEFINER,
-- search_path, return value, the ON CONFLICT update, and EXECUTE for service_role only.
-- Undo: 2026-10-24a-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

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
    -- Votes and rebellions from the same date as the eligible divisions: the start of the MP's current spell, or
    -- 4 July 2024 if that is later (2026-10-24a). Before, votes ran from 4 July 2024 for everyone, so an MP who left
    -- and returned had votes from the earlier spell set against divisions from the current one.
    SELECT v.member_id,
           count(DISTINCT v.division_id) FILTER (WHERE v.vote_type IN ('aye', 'no', 'both')) AS voted,
           count(*) FILTER (WHERE v.is_rebellion) AS rebellions
      FROM mp_division_votes v
      JOIN mp ON mp.member_id = v.member_id
     WHERE v.division_date_only >= mp.since
     GROUP BY v.member_id
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

-- Self-check: the public key must not be able to run it.
DO $$ BEGIN
  IF has_function_privilege('anon', 'public.recompute_mp_activity_metrics()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run recompute_mp_activity_metrics'; END IF;
END $$;

COMMIT;
