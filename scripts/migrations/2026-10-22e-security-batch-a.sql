-- 2026-10-22e: security batch A (owner's approval, 22 Oct 2026).
--  1. Drops the two always-true policies the public (anon) key could write through:
--     ap_policies "ap_policies counter update" (UPDATE any row) and comments "Anyone can insert comments"
--     (INSERT with any user_id). Comments are written by /api/comments with the service key, which RLS
--     does not apply to, so posting still works.
--  2. Drops the photos bucket's broad SELECT policy so the bucket cannot be listed with the public key.
--     The bucket stays public, so every photo is still served by its URL. The photo scripts now use the
--     service key. (The bucket's public INSERT and UPDATE policies are left for the owner to decide.)
--  3. Fixes search_path on the seven functions the database linter flagged.
--  4. Revokes EXECUTE on the trigger functions handle_new_user (auth.users trigger) and rls_auto_enable
--     (event trigger) from PUBLIC, anon and authenticated; triggers still fire. get_sitemap_refresh_state
--     keeps anon access: app/sitemap.ts calls it with the public key.
--  5. Adds humanise_usage and humanise_take_call() for the Humaniser's per user daily cap.
-- The dropped policies' definitions are kept in security_policy_backup_20261022.
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.security_policy_backup_20261022') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
  IF to_regclass('public.humanise_usage') IS NOT NULL THEN RAISE EXCEPTION 'humanise_usage already exists'; END IF;
END $$;

CREATE TABLE public.security_policy_backup_20261022 AS
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check, now() AS backed_up_at
  FROM pg_policies
  WHERE (schemaname, tablename, policyname) IN (
    ('public', 'ap_policies', 'ap_policies counter update'),
    ('public', 'comments', 'Anyone can insert comments'),
    ('storage', 'objects', 'Allow public reads from photos bucket'));
ALTER TABLE public.security_policy_backup_20261022 ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.security_policy_backup_20261022;
  IF n <> 3 THEN RAISE EXCEPTION 'backup has % policies, expected 3', n; END IF;
END $$;

DROP POLICY "ap_policies counter update" ON public.ap_policies;
DROP POLICY "Anyone can insert comments" ON public.comments;
DROP POLICY "Allow public reads from photos bucket" ON storage.objects;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM pg_policies
  WHERE (schemaname, tablename, policyname) IN (
    ('public', 'ap_policies', 'ap_policies counter update'),
    ('public', 'comments', 'Anyone can insert comments'),
    ('storage', 'objects', 'Allow public reads from photos bucket'));
  IF n <> 0 THEN RAISE EXCEPTION '% policies still present', n; END IF;
END $$;

ALTER FUNCTION public.bill_ids_with_votes() SET search_path = public, pg_temp;
ALTER FUNCTION public.reader_vi_vote_counts(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_sync_run(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.mp_contributions_stalest() SET search_path = public, pg_temp;
ALTER FUNCTION public.add_daily_random_votes() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.next_committee_sync_batch(integer) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') THEN
    RAISE EXCEPTION 'EXECUTE still granted';
  END IF;
END $$;

-- Humaniser daily cap: one row per user per UTC day.
CREATE TABLE public.humanise_usage (
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.humanise_usage ENABLE ROW LEVEL SECURITY;

-- Adds one call for today and returns the new count, or NULL (and adds nothing) when the cap is reached.
CREATE FUNCTION public.humanise_take_call(p_user_id bigint, p_cap integer)
RETURNS integer
LANGUAGE sql
SET search_path = public, pg_temp
AS $fn$
  INSERT INTO public.humanise_usage AS u (user_id, day, calls)
  VALUES (p_user_id, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET calls = u.calls + 1 WHERE u.calls < p_cap
  RETURNING calls;
$fn$;
REVOKE EXECUTE ON FUNCTION public.humanise_take_call(bigint, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.humanise_take_call(bigint, integer) TO service_role;

SELECT 'policies dropped' AS step, count(*) AS n FROM public.security_policy_backup_20261022
UNION ALL SELECT 'functions with fixed search_path', count(*) FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND proconfig IS NOT NULL
    AND proname IN ('bill_ids_with_votes','reader_vi_vote_counts','record_sync_run','mp_contributions_stalest','add_daily_random_votes','set_updated_at','next_committee_sync_batch');

COMMIT;
