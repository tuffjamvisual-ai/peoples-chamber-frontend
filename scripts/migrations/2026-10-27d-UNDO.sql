-- Undo 2026-10-27d: removes the member follows, digest and saved search tables and mp_expenses_detail.first_seen_at.
-- Refuses while any of the member tables holds rows: back them up first (they are members' own choices).
-- alert_log rows are only a send record and are dropped with it.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.member_follows) OR EXISTS (SELECT 1 FROM public.saved_searches)
     OR EXISTS (SELECT 1 FROM public.member_alert_settings) THEN
    RAISE EXCEPTION 'member tables hold rows: back them up before undoing';
  END IF;
END $$;
DROP TABLE public.alert_log;
DROP TABLE public.saved_searches;
DROP TABLE public.member_follows;
DROP TABLE public.member_alert_settings;
ALTER TABLE public.mp_expenses_detail DROP COLUMN first_seen_at;
COMMIT;
