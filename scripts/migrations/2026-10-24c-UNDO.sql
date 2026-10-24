-- 2026-10-24c UNDO: sets background_timeline and background_last_checked back to NULL for the 10 pilot MPs only
-- (member_ids 4483, 1427, 5091, 4356, 400, 5449, 5068, 5145, 5284, 5309), as they were before 2026-10-24c-background-pilot.sql (the backup table
-- public.mp_biography_background_backup_20261024c holds their earlier values, which were NULL). No other row changes.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE bt_before ON COMMIT DROP AS
SELECT member_id, md5(to_jsonb(b)::text) AS h FROM public.mp_biography b WHERE member_id NOT IN (4483, 1427, 5091, 4356, 400, 5449, 5068, 5145, 5284, 5309);

UPDATE public.mp_biography SET background_timeline = NULL, background_last_checked = NULL WHERE member_id IN (4483, 1427, 5091, 4356, 400, 5449, 5068, 5145, 5284, 5309);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.mp_biography WHERE member_id IN (4483, 1427, 5091, 4356, 400, 5449, 5068, 5145, 5284, 5309) AND (background_timeline IS NOT NULL OR background_last_checked IS NOT NULL)) THEN
    RAISE EXCEPTION 'a pilot row still has a timeline';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mp_biography b JOIN bt_before o USING (member_id) WHERE md5(to_jsonb(b)::text) IS DISTINCT FROM o.h) THEN
    RAISE EXCEPTION 'a row outside the pilot changed';
  END IF;
END $$;

COMMIT;
