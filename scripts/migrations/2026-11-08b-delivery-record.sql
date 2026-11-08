-- 2026-11-08b: MP delivery record storage (owner approved the format, 8 Nov 2026, DR1).
-- Written by Terminal 2, not applied; Terminal 1 applies it under the production rules (backup, ROLLBACK rehearsal of this
-- file and its UNDO, no deployment building). Adds one nullable column to public.mp_biography and changes nothing else:
--   delivery_record  jsonb  NULL or one JSON object { "items": [...], "pledges": [...] }
-- Shape (documented and validated in lib/delivery-record.ts): each item has area, claim, stage, mp_role, delivered_by,
-- start, end, detail, sources, attribution and scope; each pledge has wording, made, status and source. No measures are
-- stored: the page works them out (computePanel()). Written only through
-- scripts/background/make-background-migration.ts --column delivery.
-- Row level security: mp_biography already has it on, with one policy, "Anyone can read mp biography" (SELECT, public);
-- the new column is covered by it. Privileges are untouched. The self-check below fails if RLS is off or the policy count
-- changes.
-- Code: works with the code on main as it is (nothing reads this column yet); the DR1 page code (t2-work) reads it and
-- shows no delivery record while it is NULL or missing.
-- Undo: 2026-11-08b-delivery-record-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE dr_policies_before ON COMMIT DROP AS
SELECT count(*) AS n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_biography';
CREATE TEMP TABLE dr_rows_before ON COMMIT DROP AS SELECT count(*) AS n FROM public.mp_biography;

ALTER TABLE public.mp_biography ADD COLUMN IF NOT EXISTS delivery_record jsonb NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mp_biography'::regclass AND conname = 'mp_biography_delivery_record_is_object') THEN
    ALTER TABLE public.mp_biography
      ADD CONSTRAINT mp_biography_delivery_record_is_object CHECK (delivery_record IS NULL OR jsonb_typeof(delivery_record) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN public.mp_biography.delivery_record IS
  'MP delivery record: NULL or an object { items, pledges } (lib/delivery-record.ts). Written only through scripts/background/make-background-migration.ts --column delivery. Measures are worked out by the page, never stored.';

-- Self-check: the column exists as jsonb with its constraint, RLS on, the policy count and the row count unchanged.
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'delivery_record') IS DISTINCT FROM 'jsonb' THEN
    RAISE EXCEPTION 'delivery_record missing or not jsonb';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mp_biography'::regclass AND conname = 'mp_biography_delivery_record_is_object') THEN
    RAISE EXCEPTION 'delivery_record check constraint missing';
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
  RAISE NOTICE '2026-11-08b: delivery_record added; % rows, % policies unchanged', (SELECT n FROM dr_rows_before), (SELECT n FROM dr_policies_before);
END $$;

COMMIT;
