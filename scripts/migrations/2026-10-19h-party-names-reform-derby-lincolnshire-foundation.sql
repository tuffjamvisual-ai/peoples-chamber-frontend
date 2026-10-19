-- Party entries checked against the Electoral Commission register (19 Oct 2026); John's decisions, 19 Oct 2026.
-- 1. Reform Derby (PP11471, voluntarily deregistered 05/08/26): its five own descriptions become one party entry,
--    party_id 'reform-derby', "Reform Derby" (Derby City Council 2023: 10 candidates). "Reform Derby and Reform UK"
--    (a joint description of Reform Derby and Reform UK) keeps its own entry, named "Reform Derby and Reform UK
--    (joint)" so the page shows it whole, merged with neither party.
-- 2. Lincolnshire Independents Lincolnshire First (PP733): shown as "Lincolnshire Independents" (one of its registered
--    descriptions). The separate "Lincolnshire Independent" entry (West Lindsey) is left as it is: "Lincolnshire
--    Independent" on its own is not a PP733 description on the register.
-- 3. Foundation Party (PP6742, voluntarily deregistered 05/01/24): "Foundation Party - Openness And" shown as
--    "Foundation Party".
-- Old rows kept in public.party_names_backup_20261019h and public.council_election_candidates_backup_20261019h.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE rd_old (party_id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO rd_old VALUES ('reform-derby-for-a-better-derby'), ('reform-derby-putting-alvaston-and-allenton-first'),
  ('reform-derby-putting-sinfin-and-osmaston-first'), ('reform-derby-for-chellaston-shelton-lock'), ('reform-derby-no-to-the-incinerator');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.party_names WHERE party_id IN (SELECT party_id FROM rd_old);
  IF n <> 5 THEN RAISE EXCEPTION 'expected 5 Reform Derby description entries, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id IN (SELECT party_id FROM rd_old);
  IF n <> 10 THEN RAISE EXCEPTION 'expected 10 Reform Derby candidates, found %', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby';
  IF n <> 0 THEN RAISE EXCEPTION 'party_id reform-derby already in use (% rows)', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby-and-reform-uk' AND party_name = 'Reform Derby and Reform UK';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 Reform Derby and Reform UK entry, found %', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'lincolnshire-independents-lincolnshire-first' AND party_name = 'Lincolnshire Independents Lincolnshire First';
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 Lincolnshire Independents Lincolnshire First entries, found %', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'foundation-party-openness-and' AND party_name = 'Foundation Party - Openness And';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 Foundation Party entry, found %', n; END IF;
END $$;

CREATE TABLE public.party_names_backup_20261019h AS
  SELECT *, now() AS saved_at FROM public.party_names
   WHERE party_id IN (SELECT party_id FROM rd_old)
      OR party_id IN ('reform-derby-and-reform-uk', 'lincolnshire-independents-lincolnshire-first', 'foundation-party-openness-and');
CREATE TABLE public.council_election_candidates_backup_20261019h AS
  SELECT *, now() AS saved_at FROM public.council_election_candidates WHERE party_id IN (SELECT party_id FROM rd_old);
ALTER TABLE public.party_names_backup_20261019h ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019h FROM anon, authenticated;
ALTER TABLE public.council_election_candidates_backup_20261019h ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_election_candidates_backup_20261019h FROM anon, authenticated;

-- 1. Reform Derby
UPDATE public.council_election_candidates SET party_id = 'reform-derby' WHERE party_id IN (SELECT party_id FROM rd_old);
UPDATE public.party_names SET party_id = 'reform-derby', party_name = 'Reform Derby', parties_slug = NULL WHERE party_id IN (SELECT party_id FROM rd_old);
UPDATE public.party_names SET party_name = 'Reform Derby and Reform UK (joint)' WHERE party_id = 'reform-derby-and-reform-uk';
-- 2. Lincolnshire Independents
UPDATE public.party_names SET party_name = 'Lincolnshire Independents' WHERE party_id = 'lincolnshire-independents-lincolnshire-first';
-- 3. Foundation Party
UPDATE public.party_names SET party_name = 'Foundation Party' WHERE party_id = 'foundation-party-openness-and';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.party_names_backup_20261019h; IF n <> 10 THEN RAISE EXCEPTION 'party_names backup holds %, expected 10', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates_backup_20261019h; IF n <> 10 THEN RAISE EXCEPTION 'candidates backup holds %, expected 10', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby' AND party_name = 'Reform Derby'; IF n <> 5 THEN RAISE EXCEPTION 'expected 5 reform-derby entries, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id = 'reform-derby'; IF n <> 10 THEN RAISE EXCEPTION 'expected 10 reform-derby candidates, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id IN (SELECT party_id FROM rd_old); IF n <> 0 THEN RAISE EXCEPTION '% candidates still on old ids', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby-and-reform-uk' AND party_name = 'Reform Derby and Reform UK (joint)'; IF n <> 1 THEN RAISE EXCEPTION 'joint entry not renamed'; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'lincolnshire-independents-lincolnshire-first' AND party_name = 'Lincolnshire Independents'; IF n <> 3 THEN RAISE EXCEPTION 'expected 3 Lincolnshire entries renamed, found %', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'foundation-party-openness-and' AND party_name = 'Foundation Party'; IF n <> 1 THEN RAISE EXCEPTION 'Foundation Party entry not renamed'; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'lincolnshire-independents' AND party_name = 'Lincolnshire Independents'; IF n <> 1 THEN RAISE EXCEPTION 'separate Lincolnshire Independent entry changed'; END IF;
END $$;

SELECT published_name, party_id, party_name FROM public.party_names
 WHERE party_id IN ('reform-derby', 'reform-derby-and-reform-uk', 'lincolnshire-independents-lincolnshire-first', 'lincolnshire-independents', 'foundation-party-openness-and')
 ORDER BY party_id, published_name;

COMMIT;
