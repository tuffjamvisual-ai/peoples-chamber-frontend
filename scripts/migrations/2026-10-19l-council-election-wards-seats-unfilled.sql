-- Seats left unfilled at a poll because too few candidates stood (under-contested wards), so the council page can
-- count seats on offer, not only councillors elected (John's decision, 19 Oct 2026: "<n> of the council's <N> seats
-- were up for election" counts seats on offer).
-- council_election_wards.seats is the number of councillors returned at that poll; seats_unfilled is the number of
-- the ward's seats on offer that were left unfilled at it. The page adds them back unless a later poll counted with
-- the same election filled them (Comhairle nan Eilean Siar's polls of 30 June 2022).
-- Under-contested wards in the loaded results (Democracy Club cancellation reason UNDER_CONTESTED):
--   Shetland Islands, North Isles, 5 May 2022: 3 seats, 2 returned, 1 unfilled (filled at the by-election of 4 Aug 2022,
--     not collected)
--   Comhairle nan Eilean Siar, Barraigh agus Bhatarsaigh and Sgìr' Ùige agus Càrlabhagh, 5 May 2022: 2 seats each,
--     1 returned, 1 unfilled (filled at the poll of 30 June 2022, loaded as its own election)
\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.council_election_wards ADD COLUMN seats_unfilled integer NOT NULL DEFAULT 0 CHECK (seats_unfilled >= 0);
COMMENT ON COLUMN public.council_election_wards.seats_unfilled IS
  'Seats on offer at this poll left unfilled because too few candidates stood; seats is the number returned';

CREATE TEMP TABLE unfilled (gss text, election_date date, ward_name text, n integer) ON COMMIT DROP;
INSERT INTO unfilled VALUES
  ('S12000027', '2022-05-05', 'North Isles', 1),
  ('S12000013', '2022-05-05', 'Barraigh agus Bhatarsaigh', 1),
  ('S12000013', '2022-05-05', 'Sgìr'' Ùige agus Càrlabhagh', 1);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_election_wards w JOIN public.council_elections e ON e.id = w.election_id
    JOIN unfilled u ON u.gss = e.council_gss_code AND u.election_date = e.election_date AND u.ward_name = w.ward_name;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 under-contested wards, found %', n; END IF;
END $$;

UPDATE public.council_election_wards w SET seats_unfilled = u.n
  FROM public.council_elections e, unfilled u
 WHERE e.id = w.election_id AND u.gss = e.council_gss_code AND u.election_date = e.election_date AND u.ward_name = w.ward_name;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_election_wards WHERE seats_unfilled > 0;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 wards with unfilled seats, found %', n; END IF;
  SELECT sum(seats_unfilled) INTO n FROM public.council_election_wards;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 unfilled seats in all, found %', n; END IF;
END $$;

SELECT e.council_gss_code, e.election_date, w.ward_name, w.seats, w.seats_unfilled
  FROM public.council_election_wards w JOIN public.council_elections e ON e.id = w.election_id
 WHERE w.seats_unfilled > 0 ORDER BY 1, 3;

COMMIT;
