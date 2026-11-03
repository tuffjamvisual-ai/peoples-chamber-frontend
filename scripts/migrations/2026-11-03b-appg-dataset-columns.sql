-- APPG refresh (owner's brief, 3 Nov 2026): the weekly sync now reads mySociety's published dataset
-- (pages.mysociety.org/appg-membership, "APPG Groups and Memberships", CC BY 4.0) instead of the GitHub files.
-- New columns:
--   appgs.register_edition       the Register edition the group's entry comes from (cmallparty/YYMMDD/ in source_url)
--   appgs.dataset_version        the dataset version the row was last checked against (e.g. 0.27.0)
--   appg_officers.source         where the officer row comes from; only 'parliament' (the Register itself) is loaded,
--                                never mySociety's 'ai_search' rows
--   appg_funders.value_exact     the exact £ figure of a Financial Benefit ("Value £s"); value_band stays for in kind
--   appg_funders.period_from/to  "From: dd/mm/yyyy To: dd/mm/yyyy" in the description, when it parses
--   appg_funders.paid_via_secretariat  the description says the secretariat "is paid by the following"
--   appg_funders.payer_list      that list of payers, as written, unsplit
-- Backfill here: register_edition from source_url, and source = 'parliament' for every officer (all 2,520 stored
-- officers match the dataset's source=parliament officers exactly, checked 3 Nov 2026). The funder columns are filled
-- by the first sync run. Undo: 2026-11-03b-appg-dataset-columns-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03b-appg-dataset-columns.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

ALTER TABLE appgs
  ADD COLUMN IF NOT EXISTS register_edition date,
  ADD COLUMN IF NOT EXISTS dataset_version text;

ALTER TABLE appg_officers
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE appg_funders
  ADD COLUMN IF NOT EXISTS value_exact numeric,
  ADD COLUMN IF NOT EXISTS period_from date,
  ADD COLUMN IF NOT EXISTS period_to date,
  ADD COLUMN IF NOT EXISTS paid_via_secretariat boolean,
  ADD COLUMN IF NOT EXISTS payer_list text;

UPDATE appgs
   SET register_edition = to_date(substring(source_url from 'cmallparty/(\d{6})/'), 'YYMMDD')
 WHERE source_url ~ 'cmallparty/\d{6}/'
   AND register_edition IS DISTINCT FROM to_date(substring(source_url from 'cmallparty/(\d{6})/'), 'YYMMDD');

UPDATE appg_officers SET source = 'parliament' WHERE source IS NULL;

COMMIT;
