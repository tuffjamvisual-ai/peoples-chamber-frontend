-- Undo of 2026-11-03b-appg-dataset-columns.sql: drops the columns it added (and whatever the sync wrote into them).
-- The rest of the APPG rows are as the sync left them; the backup taken before the migration is in
-- "Claude outputs/appg/backup-2026-11-03/". The sync must be back on its previous version before this is run.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03b-appg-dataset-columns-UNDO.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

ALTER TABLE appg_funders
  DROP COLUMN IF EXISTS value_exact,
  DROP COLUMN IF EXISTS period_from,
  DROP COLUMN IF EXISTS period_to,
  DROP COLUMN IF EXISTS paid_via_secretariat,
  DROP COLUMN IF EXISTS payer_list;

ALTER TABLE appg_officers
  DROP COLUMN IF EXISTS source;

ALTER TABLE appgs
  DROP COLUMN IF EXISTS register_edition,
  DROP COLUMN IF EXISTS dataset_version;

DELETE FROM sync_cursor WHERE route = 'sync-appgs:dataset';

COMMIT;
