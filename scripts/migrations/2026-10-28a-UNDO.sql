-- Undo 2026-10-28a: removes spad_releases and spad_appointments (the sync fills them again), the row_key columns and
-- the quarter indexes, and restores the roster's unique key (name, area). Refuses while the quarterly tables hold
-- more than one quarter, since the old key cannot hold history: back up and decide which quarters to keep first.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF (SELECT count(DISTINCT quarter) FROM public.special_advisers) > 1 THEN RAISE EXCEPTION 'special_advisers holds more than one quarter'; END IF;
END $$;
DROP TABLE public.spad_appointments;
DROP TABLE public.spad_releases;
ALTER TABLE public.spad_gifts DROP COLUMN row_key;
ALTER TABLE public.spad_hospitality DROP COLUMN row_key;
ALTER TABLE public.spad_media_meetings DROP COLUMN row_key;
DROP INDEX public.idx_spad_gifts_quarter;
DROP INDEX public.idx_spad_hospitality_quarter;
DROP INDEX public.idx_spad_media_meetings_quarter;
DROP INDEX public.idx_special_advisers_quarter;
ALTER TABLE public.special_advisers DROP CONSTRAINT special_advisers_name_area_quarter_key;
ALTER TABLE public.special_advisers ADD CONSTRAINT special_advisers_name_area_key UNIQUE (name, area);
COMMIT;
