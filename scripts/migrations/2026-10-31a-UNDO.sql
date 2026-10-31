-- 2026-10-31a UNDO: sets background_timeline and background_last_checked back to NULL for the 10 batch 2 MPs only
-- (member_ids 5168, 4998, 5099, 163, 4212, 3935, 249, 345, 4769, 4743), as they were before 2026-10-31a-background-batch2.sql (both NULL beforehand;
-- the backup is "Claude outputs/backups/2026-10-31a-mp-biography-before.csv", off the repo). No other row changes.
-- Guards (RAISE): exactly 10 rows change; the 10 pilot timelines are unchanged; non-NULL timelines go from 20 to 10.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.mp_biography WHERE background_timeline IS NOT NULL) <> 20 THEN RAISE EXCEPTION 'expected 20 timelines before the undo'; END IF;
END $$;

CREATE TEMP TABLE bt_before ON COMMIT DROP AS
SELECT member_id, md5(to_jsonb(b)::text) AS h, md5(coalesce(background_timeline::text, '')) AS th FROM public.mp_biography b;

UPDATE public.mp_biography SET background_timeline = NULL, background_last_checked = NULL WHERE member_id IN (5168, 4998, 5099, 163, 4212, 3935, 249, 345, 4769, 4743);

DO $$
DECLARE
  changed integer;
  changed_outside integer;
  pilot_changed integer;
  non_null integer;
BEGIN
  SELECT count(*) INTO changed FROM public.mp_biography b JOIN bt_before o USING (member_id) WHERE md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO changed_outside FROM public.mp_biography b JOIN bt_before o USING (member_id)
   WHERE b.member_id NOT IN (5168, 4998, 5099, 163, 4212, 3935, 249, 345, 4769, 4743) AND md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO pilot_changed FROM public.mp_biography b JOIN bt_before o USING (member_id)
   WHERE b.member_id IN (4483, 1427, 5091, 4356, 400, 5449, 5068, 5145, 5284, 5309) AND md5(coalesce(b.background_timeline::text, '')) IS DISTINCT FROM o.th;
  SELECT count(*) INTO non_null FROM public.mp_biography WHERE background_timeline IS NOT NULL;
  RAISE NOTICE 'rows changed %, outside batch 2 %, pilot timelines changed %, non-NULL timelines %', changed, changed_outside, pilot_changed, non_null;
  IF changed <> 10 THEN RAISE EXCEPTION 'expected exactly 10 rows changed, got %', changed; END IF;
  IF changed_outside <> 0 THEN RAISE EXCEPTION '% rows outside batch 2 changed', changed_outside; END IF;
  IF pilot_changed <> 0 THEN RAISE EXCEPTION '% pilot timelines changed', pilot_changed; END IF;
  IF non_null <> 10 THEN RAISE EXCEPTION 'expected 10 non-NULL timelines after the undo, got %', non_null; END IF;
END $$;

COMMIT;
