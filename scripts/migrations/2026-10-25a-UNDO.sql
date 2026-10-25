-- Undo 2026-10-25a: remove change_bill_vote. Vote rows and counts already changed through it stay as they are.
\set ON_ERROR_STOP on
BEGIN;
DROP FUNCTION IF EXISTS public.change_bill_vote(integer, integer, text);
DO $$ BEGIN
  IF to_regprocedure('public.change_bill_vote(integer, integer, text)') IS NOT NULL THEN RAISE EXCEPTION 'not dropped'; END IF;
END $$;
COMMIT;
