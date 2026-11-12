-- 2026-11-12a: contract lots (T1-LOT, owner approved 12 Nov 2026: "what works best for the site and users always the
-- priority"). Applied by Terminal 1 under the production rules (backup, UNDO first, ROLLBACK rehearsal, no deployment
-- building). Adds, changes nothing that exists:
--   contract_notices.lot_ids  text[], the lots a notice's award names (Find a Tender's awards[].relatedLots); NULL where
--     the notice names none or was stored before this (filled by the sync for new notices and by
--     scripts/backfill-contract-lots.mjs for procurements with more than one award). Adding a NULL column without a
--     default rewrites nothing.
--   contract_lots  one row per procurement and lot, from tender.lots in the newest release read: lot id, title,
--     description, value as published (amount and currency), status, the release it came from and when.
-- Secured like contract_notices (2026-10-21k): row level security on, read by anyone, written only with the server key.
-- Undo: 2026-11-12a-contract-lots-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.contract_lots') IS NOT NULL THEN RAISE EXCEPTION 'contract_lots already exists'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contract_notices' AND column_name = 'lot_ids') THEN
    RAISE EXCEPTION 'contract_notices.lot_ids already exists';
  END IF;
END $$;

ALTER TABLE public.contract_notices ADD COLUMN lot_ids text[];

CREATE TABLE public.contract_lots (
  ocid          text NOT NULL,
  lot_id        text NOT NULL,
  title         text,
  description   text,
  value         numeric,
  currency      text,
  status        text,
  release_id    text NOT NULL,          -- the release the row was last read from
  released_at   timestamptz,            -- that release's date; a newer release replaces the row, an older one does not
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ocid, lot_id)
);

ALTER TABLE public.contract_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_lots_read ON public.contract_lots FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.contract_lots FROM anon, authenticated;
GRANT SELECT ON public.contract_lots TO anon, authenticated;

DO $$ BEGIN RAISE NOTICE '2026-11-12a: contract_notices.lot_ids and contract_lots added'; END $$;
COMMIT;
