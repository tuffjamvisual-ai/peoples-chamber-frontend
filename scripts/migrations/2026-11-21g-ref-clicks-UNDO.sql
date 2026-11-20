-- UNDO for 2026-11-21g-ref-clicks.sql: drops public.ref_click_add and public.ref_clicks with every click counted in it.
-- Deploy the code without /api/ref-click first, or it will log errors (the browser side is silent either way).
-- Back up first if it holds counts the owner wants kept:
--   \copy (SELECT * FROM public.ref_clicks ORDER BY hour, ref, path) TO 'ref_clicks-backup.csv' WITH (FORMAT csv, HEADER)
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP FUNCTION IF EXISTS public.ref_click_add(text, text, timestamptz);
DROP TABLE IF EXISTS public.ref_clicks;
DO $$ BEGIN
  IF to_regclass('public.ref_clicks') IS NOT NULL OR to_regprocedure('public.ref_click_add(text, text, timestamptz)') IS NOT NULL THEN
    RAISE EXCEPTION 'ref_clicks or ref_click_add still exists';
  END IF;
END $$;
COMMIT;
