-- Allow candidates elected unopposed (uncontested wards, no poll) to be stored without votes.
-- council_election_candidates.votes and share_pct become nullable, but only together and only for an
-- elected candidate: a candidate with no votes must have no share and must have been elected.
-- The importer (scripts/import-council-election-results.js) only leaves votes empty when every candidate
-- in the ward has none, all are elected, and there are exactly as many candidates as seats.
-- First used for the Isles of Scilly (1 May 2025) and the City of London (20 March 2025).
-- Existing rows all have votes and a share, so no data changes; the checks below confirm it.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE votes IS NULL OR share_pct IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'expected no candidates without votes before this migration, found %', n; END IF;
END $$;

ALTER TABLE public.council_election_candidates ALTER COLUMN votes DROP NOT NULL;
ALTER TABLE public.council_election_candidates ALTER COLUMN share_pct DROP NOT NULL;
ALTER TABLE public.council_election_candidates
  ADD CONSTRAINT council_election_candidates_unopposed_check
  CHECK ((votes IS NULL) = (share_pct IS NULL) AND (votes IS NOT NULL OR elected));

COMMENT ON COLUMN public.council_election_candidates.votes IS
  'Votes (first preferences under single transferable vote); null only for a candidate elected unopposed';
COMMENT ON COLUMN public.council_election_candidates.share_pct IS
  'votes / all votes cast in the ward; null only for a candidate elected unopposed';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_constraint WHERE conname = 'council_election_candidates_unopposed_check';
  IF n <> 1 THEN RAISE EXCEPTION 'constraint not created'; END IF;
END $$;

COMMIT;
