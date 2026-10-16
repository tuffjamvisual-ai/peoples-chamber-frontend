-- Council leaders: clear eight leader_name values that are not a person's name. They were
-- picked up from Wikipedia infobox labels ("Leader & Committee Structure", "Leader and
-- Cabinet", "Committee system") or the council's own name, and showed on council pages as if
-- they were the leader. A blank leader is hidden on the page. Found 16 Oct 2026.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE public.councils SET leader_name = NULL
   WHERE (slug, leader_name) IN (
     ('st-albans-city-and', 'Leader & Committee Structure'),
     ('bassetlaw', 'Bassetlaw District Council'),
     ('chesterfield', 'Chesterfield Borough Council'),
     ('lisburn-and-castlereagh', 'Committee system'),
     ('eastleigh', 'Eastleigh Borough Council'),
     ('walsall', 'Walsall Metropolitan Borough Council'),
     ('preston', 'Preston City Council'),
     ('west-lancashire', 'Leader and Cabinet')
   );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 8 THEN RAISE EXCEPTION 'expected 8 councils, updated %', n; END IF;
END $$;

COMMIT;
