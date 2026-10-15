-- bill.description: allow it to be empty, and remove the placeholder text.
--
-- description holds the Bills API "summary", which Parliament leaves blank for most bills.
-- The column was NOT NULL, so the old sync filled it with "No description available", and
-- that placeholder showed on bill cards on /bills and /laws. The rewritten sync
-- (sync-bills-incremental.js) saves an empty summary as NULL; the bill page already falls
-- back to the long title, and cards then show no summary rather than the placeholder.

\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.bill ALTER COLUMN description DROP NOT NULL;
UPDATE public.bill SET description = NULL WHERE trim(description) IN ('', 'No description available');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.bill WHERE description = 'No description available') THEN
    RAISE EXCEPTION 'placeholder still present';
  END IF;
END $$;

COMMIT;
