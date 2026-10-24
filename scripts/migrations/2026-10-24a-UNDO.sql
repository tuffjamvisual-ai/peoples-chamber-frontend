-- 2026-10-24a UNDO: restores recompute_mp_activity_metrics() exactly as defined in 2026-10-15c (votes and rebellions
-- counted from 4 July 2024 for every MP), with the same grants. Run only if 2026-10-24a must be reversed; then run the
-- function once to put the stored figures back.
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

-- Self-check: the public key must not be able to run it.
DO $$ BEGIN
  IF has_function_privilege('anon', 'public.recompute_mp_activity_metrics()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run recompute_mp_activity_metrics'; END IF;
END $$;

COMMIT;
