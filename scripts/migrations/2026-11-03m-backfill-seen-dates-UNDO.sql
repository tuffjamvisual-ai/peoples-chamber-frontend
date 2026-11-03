-- Undo of 2026-11-03m-backfill-seen-dates.sql: puts first_seen_date and last_seen_date of the interests-api-edition
-- rows back from the backup. Run from the repository root:
--   psql "$DATABASE_URL" -f scripts/migrations/2026-11-03m-backfill-seen-dates-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE seen_backup (id bigint, member_id int, interest_id int, first_seen_date date, last_seen_date date) ON COMMIT DROP;
\copy seen_backup FROM 'Claude outputs/backups/2026-11-03m-backfill-seen-dates-before.csv' WITH (FORMAT csv, HEADER true)
UPDATE public.mp_registered_interests r SET first_seen_date = b.first_seen_date, last_seen_date = b.last_seen_date
  FROM seen_backup b WHERE r.id = b.id AND r.source = 'interests-api-edition';

COMMIT;
