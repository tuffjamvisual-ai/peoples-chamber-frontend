-- Partial index so the nightly health check "Commons votes have a party" can count vote rows
-- without a party quickly. It counts mp_division_votes rows with party IS NULL in a date range;
-- without this index that scans the whole table and hits the statement timeout.
-- Only rows with no party are indexed (a handful), so the index is tiny and costs nothing on writes.
-- CONCURRENTLY: builds without locking the table. Must run outside a transaction (psql -f, no BEGIN).

\set ON_ERROR_STOP on
CREATE INDEX CONCURRENTLY IF NOT EXISTS mp_division_votes_party_null_idx
  ON public.mp_division_votes (division_date_only)
  WHERE party IS NULL;
