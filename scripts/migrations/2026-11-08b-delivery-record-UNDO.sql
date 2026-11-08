-- 2026-11-08b UNDO: removes the MP delivery record column from public.mp_biography (its CHECK constraint, then
-- delivery_record), returning the table to its shape before 2026-11-08b-delivery-record.sql. Dropping the column deletes
-- every stored delivery record: export it first if it must be kept (it cannot be rebuilt from any API).
-- Revert the DR1 page code first: it reads this column (it shows no delivery record if the column is missing, but do not
-- rely on that).
-- Written by Terminal 2 (DR1, 8 Nov 2026), not applied; Terminal 1 applies under the production rules.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE dr_policies_before ON COMMIT DROP AS
SELECT count(*) AS n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_biography';
CREATE TEMP TABLE dr_rows_before ON COMMIT DROP AS SELECT count(*) AS n FROM public.mp_biography;

ALTER TABLE public.mp_biography DROP CONSTRAINT IF EXISTS mp_biography_delivery_record_is_object;
ALTER TABLE public.mp_biography DROP COLUMN IF EXISTS delivery_record;

-- Self-check: the column and its constraint are gone, RLS still on, the policy count and row count unchanged.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'delivery_record') THEN
    RAISE EXCEPTION 'delivery_record still present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mp_biography'::regclass AND conname = 'mp_biography_delivery_record_is_object') THEN
    RAISE EXCEPTION 'delivery_record check constraint still present';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.mp_biography'::regclass) THEN
    RAISE EXCEPTION 'row level security is off on mp_biography';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_biography') <> (SELECT n FROM dr_policies_before) THEN
    RAISE EXCEPTION 'mp_biography policy count changed';
  END IF;
  IF (SELECT count(*) FROM public.mp_biography) <> (SELECT n FROM dr_rows_before) THEN
    RAISE EXCEPTION 'row count changed';
  END IF;
  RAISE NOTICE '2026-11-08b UNDO: delivery_record removed; % rows, % policies unchanged', (SELECT n FROM dr_rows_before), (SELECT n FROM dr_policies_before);
END $$;

COMMIT;
