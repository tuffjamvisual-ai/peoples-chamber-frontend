-- Correct councils.last_election_year for three councils that did not hold elections on 7 May 2026.
-- Each now elects all its councillors every four years; source: Democracy Club's elections list
-- (elections.democracyclub.org.uk, checked 18 Oct 2026). Later polls were single seat by-elections.
--   Liverpool  2026 -> 2023  (4 May 2023: 64 wards, 85 seats)
--   Rotherham  2026 -> 2024  (2 May 2024: 25 wards, 59 seats)
--   Wirral     2026 -> 2023  (4 May 2023: 22 wards, 66 seats)
-- Old rows kept in public.councils_backup_20261018a.
-- Exactly one row must change per council or the whole file rolls back.
\set ON_ERROR_STOP on
BEGIN;
SELECT slug, name, gss_code, last_election_year AS before FROM public.councils
 WHERE slug IN ('liverpool', 'rotherham', 'wirral') ORDER BY slug;
CREATE TABLE IF NOT EXISTS public.councils_backup_20261018a AS
  SELECT *, now() AS saved_at FROM public.councils WHERE slug IN ('liverpool', 'rotherham', 'wirral');
ALTER TABLE public.councils_backup_20261018a ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.councils_backup_20261018a FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.councils SET last_election_year = 2023
   WHERE slug = 'liverpool' AND gss_code = 'E08000012' AND last_election_year = 2026;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'liverpool: % rows', n; END IF;
  UPDATE public.councils SET last_election_year = 2024
   WHERE slug = 'rotherham' AND gss_code = 'E08000018' AND last_election_year = 2026;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'rotherham: % rows', n; END IF;
  UPDATE public.councils SET last_election_year = 2023
   WHERE slug = 'wirral' AND gss_code = 'E08000015' AND last_election_year = 2026;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'wirral: % rows', n; END IF;
END $do$;
SELECT slug, name, gss_code, last_election_year AS after FROM public.councils
 WHERE slug IN ('liverpool', 'rotherham', 'wirral') ORDER BY slug;
COMMIT;
