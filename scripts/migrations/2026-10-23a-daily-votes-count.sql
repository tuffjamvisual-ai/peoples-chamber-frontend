-- 2026-10-23a: add_daily_random_votes() also returns votes_added, the total votes it added across polls and bills
-- (owner's approval, 23 Oct 2026), so /api/seed-daily-votes can report a real count to its heartbeat. The votes it
-- adds are unchanged. polls_updated and bills_updated are still returned. The replaced definition is kept in
-- function_backup_20261023a. This migration does not call the function (calling it adds votes).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.function_backup_20261023a') IS NOT NULL THEN RAISE EXCEPTION 'function_backup_20261023a already exists'; END IF;
END $$;

CREATE TABLE public.function_backup_20261023a AS
  SELECT p.oid::regprocedure::text AS signature, pg_get_functiondef(p.oid) AS definition, now() AS backed_up_at
  FROM pg_proc p WHERE p.oid = 'public.add_daily_random_votes()'::regprocedure;
ALTER TABLE public.function_backup_20261023a ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.add_daily_random_votes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE polls_updated int; bills_updated int; poll_votes int; bill_votes int;
BEGIN
  WITH calc AS (
    SELECT id, n, floor(n/2.0 + random())::int AS yes_add
    FROM (SELECT id, (floor(random()*10)+1)::int AS n
          FROM polls WHERE archived=false AND poll_type='yesno') s
  ), upd AS (
    UPDATE polls p SET vote_count_yes = p.vote_count_yes + c.yes_add,
                       vote_count_no  = p.vote_count_no  + (c.n - c.yes_add)
    FROM calc c WHERE p.id = c.id RETURNING c.n
  ) SELECT count(*), coalesce(sum(n), 0) INTO polls_updated, poll_votes FROM upd;

  WITH calc AS (
    SELECT id, n, floor(n/2.0 + random())::int AS yes_add
    FROM (SELECT id, (floor(random()*10)+1)::int AS n
          FROM bill WHERE coalesce(vote_count_yes,0)+coalesce(vote_count_no,0) > 0) s
  ), upd AS (
    UPDATE bill b SET vote_count_yes = coalesce(b.vote_count_yes,0) + c.yes_add,
                      vote_count_no  = coalesce(b.vote_count_no,0)  + (c.n - c.yes_add),
                      vote_counts_updated_at = now()
    FROM calc c WHERE b.id = c.id RETURNING c.n
  ) SELECT count(*), coalesce(sum(n), 0) INTO bills_updated, bill_votes FROM upd;

  RETURN jsonb_build_object('polls_updated', polls_updated, 'bills_updated', bills_updated,
                            'votes_added', poll_votes + bill_votes);
END $function$;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.function_backup_20261023a) <> 1 THEN RAISE EXCEPTION 'expected 1 function backed up'; END IF;
  IF pg_get_functiondef('public.add_daily_random_votes()'::regprocedure) NOT LIKE '%votes_added%' THEN RAISE EXCEPTION 'function not replaced'; END IF;
END $$;

SELECT 'functions backed up' AS step, count(*) AS n FROM public.function_backup_20261023a;

COMMIT;
