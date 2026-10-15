-- Official totals for each Commons division, as published by the Commons Votes API
-- (AyeCount / NoCount). Until now the division pages counted the rows in mp_division_votes,
-- which includes the four tellers and misses any voter Parliament's list does not name, so
-- totals could be off by one or two (division 2444: official 99-291, rows 99-292).
-- Filled by scripts/backfill-division-totals.js and, for new divisions, by
-- app/api/sync-commons-votes-api/route.ts.

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.commons_division_totals (
  division_id     integer PRIMARY KEY,         -- Commons Votes API DivisionId (= mp_division_votes.division_id)
  division_number integer NOT NULL,
  division_date   date NOT NULL,
  title           text,
  aye_count       integer NOT NULL,            -- official count, tellers not included
  no_count        integer NOT NULL,
  aye_tellers     text[] NOT NULL DEFAULT '{}',
  no_tellers      text[] NOT NULL DEFAULT '{}',
  is_deferred     boolean NOT NULL DEFAULT false,
  synced_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commons_division_totals_date_idx ON public.commons_division_totals (division_date, division_number);

ALTER TABLE public.commons_division_totals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commons_division_totals_public_read ON public.commons_division_totals;
CREATE POLICY commons_division_totals_public_read ON public.commons_division_totals FOR SELECT TO anon, authenticated USING (true);

COMMIT;
