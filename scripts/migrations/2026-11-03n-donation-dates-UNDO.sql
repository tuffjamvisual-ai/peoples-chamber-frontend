-- Undo of 2026-11-03n-donation-dates.sql: puts accepted_date, reported_date and received_date back from the backup for
-- the rows it changed. Run from the repository root:
--   psql "$DATABASE_URL" -f scripts/migrations/2026-11-03n-donation-dates-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE dates_backup (id bigint, ec_ref text, accepted_date date, reported_date date, received_date text) ON COMMIT DROP;
\copy dates_backup FROM 'Claude outputs/backups/2026-11-03n-donation-dates-before.csv' WITH (FORMAT csv, HEADER true)
CREATE TEMP TABLE date_fix (id bigint, ec_ref text, accepted_date date, reported_date date, received_date date) ON COMMIT DROP;
\copy date_fix FROM 'Claude outputs/registers/history-2026-11-03/donation-date-fixes.csv' WITH (FORMAT csv, HEADER true)
UPDATE public.political_donations p SET accepted_date = b.accepted_date, reported_date = b.reported_date, received_date = b.received_date
  FROM dates_backup b JOIN date_fix f ON f.id = b.id WHERE p.id = b.id;

COMMIT;
