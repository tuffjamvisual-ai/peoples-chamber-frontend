-- Amber Valley, Crich and South Wingfield, 4 May 2023: Marcus Walter Johnson's description.
-- The council's results feed labels him and his running mate Kate Smith "Liberal" (party code LIB). Kate Smith's
-- councillor record gives "Liberal Democrat" (corrected before the 2023 load). John's decision, 19 Oct 2026: the feed's
-- "Liberal" is shorthand, so Johnson is mapped to Liberal Democrats as well, the same as Kate Smith.
-- One row; old row kept in public.council_election_candidates_backup_20261019a. The ward's shares are unchanged
-- (only the party changes).
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_election_candidates c
    JOIN public.council_election_wards w ON w.id = c.ward_id JOIN public.council_elections e ON e.id = w.election_id
   WHERE e.council_gss_code = 'E07000032' AND e.election_date = '2023-05-04' AND w.ward_name = 'Crich and South Wingfield'
     AND c.candidate_published = 'Johnson, Marcus Walter' AND c.party_published = 'Liberal' AND c.party_id = 'the-liberal-party';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row for Marcus Walter Johnson still labelled Liberal, found %', n; END IF;
END $$;

CREATE TABLE public.council_election_candidates_backup_20261019a AS
  SELECT c.*, now() AS saved_at FROM public.council_election_candidates c
    JOIN public.council_election_wards w ON w.id = c.ward_id JOIN public.council_elections e ON e.id = w.election_id
   WHERE e.council_gss_code = 'E07000032' AND e.election_date = '2023-05-04' AND w.ward_name = 'Crich and South Wingfield'
     AND c.candidate_published = 'Johnson, Marcus Walter';
ALTER TABLE public.council_election_candidates_backup_20261019a ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_election_candidates_backup_20261019a FROM anon, authenticated;

UPDATE public.council_election_candidates c SET party_published = 'Liberal Democrats', party_id = 'liberal-democrats'
  FROM public.council_election_candidates_backup_20261019a b WHERE c.id = b.id;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_election_candidates c JOIN public.council_election_candidates_backup_20261019a b ON b.id = c.id
   WHERE c.party_id = 'liberal-democrats' AND c.party_published = 'Liberal Democrats';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 updated row, found %', n; END IF;
END $$;

SELECT c.candidate_display, c.party_published, c.party_id, c.votes FROM public.council_election_candidates c
  JOIN public.council_election_candidates_backup_20261019a b ON b.id = c.id;

COMMIT;
