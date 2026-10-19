-- Set council_composition to the declared 2026 results for the six councils whose May 2026 election was
-- all out (every seat up) and whose Open Council Data snapshot differs from the results we loaded
-- (council_elections, migration 2026-10-17m). Councils electing by halves or thirds are not touched.
-- Seats are counted from the elected candidates in council_election_candidates, including the
-- postponed 18 June polls (Bradford, Idle and Thackley; Hillingdon, Hillingdon West), which the snapshot
-- showed as vacant ('other'). Party groups as in scripts/import-council-composition.js: Labour and
-- Co-operative counts as Labour; independents and local parties are 'other'.
-- total_seats, largest_party, largest_seats and majority_party are recalculated (a party with more than
-- half the seats has a majority; 'other' never does). administration_code is not changed.
--   Council     changes (snapshot -> results)
--   birmingham  ref 22->23, other 15->14; largest ref 22 -> ref 23
--   bradford    ld 1->4, other 16->13; largest ref 29 -> ref 29
--   camden      green 10->11, other 2->1; largest lab 30 -> lab 30
--   croydon     green 7->8, other 1->0; largest lab 30 -> lab 30
--   hillingdon  con 30->32, other 2->0; largest con 30 -> con 32
--   lewisham    green 39->40, other 1->0; largest green 39 -> green 40
-- Bradford's councils.political_control_status is corrected from 'NOC (largest: Reform UK 29/87)' to
-- 'NOC (largest: Reform UK 29/90)' (the 87 left out the three postponed Idle and Thackley seats).
-- Old rows kept in public.council_composition_backup_20261018c and public.councils_backup_20261018c.
-- Each UPDATE must change exactly one row whose seats still match the snapshot, or the whole file rolls back.
\set ON_ERROR_STOP on
BEGIN;
SELECT council_slug, total_seats, seats, largest_party, largest_seats, majority_party FROM public.council_composition
 WHERE gss_code IN ('E08000025', 'E08000032', 'E09000007', 'E09000008', 'E09000017', 'E09000023') ORDER BY council_slug;
CREATE TABLE public.council_composition_backup_20261018c AS
  SELECT *, now() AS saved_at FROM public.council_composition
   WHERE gss_code IN ('E08000025', 'E08000032', 'E09000007', 'E09000008', 'E09000017', 'E09000023');
ALTER TABLE public.council_composition_backup_20261018c ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_composition_backup_20261018c FROM anon, authenticated;
CREATE TABLE public.councils_backup_20261018c AS
  SELECT *, now() AS saved_at FROM public.councils WHERE slug = 'bradford';
ALTER TABLE public.councils_backup_20261018c ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.councils_backup_20261018c FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.council_composition SET total_seats = 101, seats = '{"con": 16, "green": 19, "lab": 17, "ld": 12, "other": 14, "pc": 0, "ref": 23, "snp": 0, "ukip": 0}'::jsonb,
         largest_party = 'ref', largest_seats = 23, majority_party = NULL,
         source = 'Open Council Data UK (CC0); seats from the declared 2026 results'
   WHERE gss_code = 'E08000025' AND council_slug = 'birmingham' AND total_seats = 101
     AND seats = '{"con": 16, "green": 19, "lab": 17, "ld": 12, "other": 15, "pc": 0, "ref": 22, "snp": 0, "ukip": 0}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'birmingham: % rows', n; END IF;
  UPDATE public.council_composition SET total_seats = 90, seats = '{"con": 18, "green": 9, "lab": 17, "ld": 4, "other": 13, "pc": 0, "ref": 29, "snp": 0, "ukip": 0}'::jsonb,
         largest_party = 'ref', largest_seats = 29, majority_party = NULL,
         source = 'Open Council Data UK (CC0); seats from the declared 2026 results'
   WHERE gss_code = 'E08000032' AND council_slug = 'bradford' AND total_seats = 90
     AND seats = '{"con": 18, "green": 9, "lab": 17, "ld": 1, "other": 16, "pc": 0, "ref": 29, "snp": 0, "ukip": 0}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'bradford: % rows', n; END IF;
  UPDATE public.council_composition SET total_seats = 55, seats = '{"con": 3, "green": 11, "lab": 30, "ld": 10, "other": 1, "pc": 0, "ref": 0, "snp": 0, "ukip": 0}'::jsonb,
         largest_party = 'lab', largest_seats = 30, majority_party = 'lab',
         source = 'Open Council Data UK (CC0); seats from the declared 2026 results'
   WHERE gss_code = 'E09000007' AND council_slug = 'camden' AND total_seats = 55
     AND seats = '{"con": 3, "green": 10, "lab": 30, "ld": 10, "other": 2, "pc": 0, "ref": 0, "snp": 0, "ukip": 0}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'camden: % rows', n; END IF;
  UPDATE public.council_composition SET total_seats = 70, seats = '{"con": 28, "green": 8, "lab": 30, "ld": 2, "other": 0, "pc": 0, "ref": 2, "snp": 0, "ukip": 0}'::jsonb,
         largest_party = 'lab', largest_seats = 30, majority_party = NULL,
         source = 'Open Council Data UK (CC0); seats from the declared 2026 results'
   WHERE gss_code = 'E09000008' AND council_slug = 'croydon' AND total_seats = 70
     AND seats = '{"con": 28, "green": 7, "lab": 30, "ld": 2, "other": 1, "pc": 0, "ref": 2, "snp": 0, "ukip": 0}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'croydon: % rows', n; END IF;
  UPDATE public.council_composition SET total_seats = 53, seats = '{"con": 32, "green": 1, "lab": 16, "ld": 0, "other": 0, "pc": 0, "ref": 4, "snp": 0, "ukip": 0}'::jsonb,
         largest_party = 'con', largest_seats = 32, majority_party = 'con',
         source = 'Open Council Data UK (CC0); seats from the declared 2026 results'
   WHERE gss_code = 'E09000017' AND council_slug = 'hillingdon' AND total_seats = 53
     AND seats = '{"con": 30, "green": 1, "lab": 16, "ld": 0, "other": 2, "pc": 0, "ref": 4, "snp": 0, "ukip": 0}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'hillingdon: % rows', n; END IF;
  UPDATE public.council_composition SET total_seats = 54, seats = '{"con": 0, "green": 40, "lab": 14, "ld": 0, "other": 0, "pc": 0, "ref": 0, "snp": 0, "ukip": 0}'::jsonb,
         largest_party = 'green', largest_seats = 40, majority_party = 'green',
         source = 'Open Council Data UK (CC0); seats from the declared 2026 results'
   WHERE gss_code = 'E09000023' AND council_slug = 'lewisham' AND total_seats = 54
     AND seats = '{"con": 0, "green": 39, "lab": 14, "ld": 0, "other": 1, "pc": 0, "ref": 0, "snp": 0, "ukip": 0}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'lewisham: % rows', n; END IF;
  UPDATE public.councils SET political_control_status = 'NOC (largest: Reform UK 29/90)'
   WHERE slug = 'bradford' AND gss_code = 'E08000032' AND political_control_status = 'NOC (largest: Reform UK 29/87)';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'bradford status: % rows', n; END IF;
END $do$;
SELECT council_slug, total_seats, seats, largest_party, largest_seats, majority_party, source FROM public.council_composition
 WHERE gss_code IN ('E08000025', 'E08000032', 'E09000007', 'E09000008', 'E09000017', 'E09000023') ORDER BY council_slug;
SELECT slug, political_control, political_control_status FROM public.councils WHERE slug = 'bradford';
COMMIT;
