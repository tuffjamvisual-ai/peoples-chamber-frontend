-- NOT APPLIED. Undoes 2026-11-06b-petition-pages.sql: removes the five new columns and what the backfill put in them.
-- Run only after the pages and the sync that read and write them have been taken back out.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.petitions
  DROP COLUMN government_response_details,
  DROP COLUMN government_response_on,
  DROP COLUMN checked_at,
  DROP COLUMN debate_overview,
  DROP COLUMN debate_outcome_at;
COMMIT;
