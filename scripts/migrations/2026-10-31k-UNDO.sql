-- 2026-10-31k UNDO: removes the donor backgrounds added by 2026-10-31k-donor-profiles.sql: drops
-- public.donor_profile_slugs, then public.donor_profiles. No other table changes. The data stays in the uncommitted file.
-- Guards (RAISE): the tables still hold 25 profiles and 41 slugs before they are dropped.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE profiles integer; slug_rows integer;
BEGIN
  SELECT count(*) INTO profiles FROM public.donor_profiles;
  SELECT count(*) INTO slug_rows FROM public.donor_profile_slugs;
  IF profiles <> 25 THEN RAISE EXCEPTION 'expected 25 profiles before the undo, got %', profiles; END IF;
  IF slug_rows <> 41 THEN RAISE EXCEPTION 'expected 41 slugs before the undo, got %', slug_rows; END IF;
END $$;

DROP TABLE public.donor_profile_slugs;
DROP TABLE public.donor_profiles;

DO $$ BEGIN
  RAISE NOTICE 'UNDO: donor_profile_slugs dropped %, donor_profiles dropped %', to_regclass('public.donor_profile_slugs') IS NULL, to_regclass('public.donor_profiles') IS NULL;
  IF to_regclass('public.donor_profiles') IS NOT NULL OR to_regclass('public.donor_profile_slugs') IS NOT NULL THEN RAISE EXCEPTION 'a table is still there'; END IF;
END $$;

COMMIT;
