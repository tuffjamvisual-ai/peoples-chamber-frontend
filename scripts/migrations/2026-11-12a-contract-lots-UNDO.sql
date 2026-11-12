-- 2026-11-12a UNDO: drops public.contract_lots and contract_notices.lot_ids, returning the database to its shape before
-- 2026-11-12a-contract-lots.sql. The lots stored are lost; they can be read again from Find a Tender
-- (scripts/backfill-contract-lots.mjs). Nothing else in contract_notices is touched. Deploy code that does not read
-- lot_ids or contract_lots first, or the contract pages lose their lot labels until it does (the pages tolerate both
-- missing).
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS public.contract_lots;
ALTER TABLE public.contract_notices DROP COLUMN IF EXISTS lot_ids;

DO $$ BEGIN
  IF to_regclass('public.contract_lots') IS NOT NULL THEN RAISE EXCEPTION 'contract_lots still present'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contract_notices' AND column_name = 'lot_ids') THEN
    RAISE EXCEPTION 'contract_notices.lot_ids still present';
  END IF;
  IF to_regclass('public.contract_notices') IS NULL THEN RAISE EXCEPTION 'contract_notices is missing'; END IF;
  RAISE NOTICE '2026-11-12a UNDO: contract_lots and contract_notices.lot_ids removed';
END $$;

COMMIT;
