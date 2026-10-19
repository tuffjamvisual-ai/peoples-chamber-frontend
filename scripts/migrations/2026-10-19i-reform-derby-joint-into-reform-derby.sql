-- Reform Derby shown as one party (John's decision, 19 Oct 2026): the "Reform Derby and Reform UK" description
-- (registered as a joint description of Reform Derby, PP11471, and Reform UK) is mapped to the same "Reform Derby"
-- entry as Reform Derby's five other descriptions (migration 2026-10-19h), with no separate joint entry.
-- Derby City Council 2023: 41 candidates move from reform-derby-and-reform-uk to reform-derby.
-- Old rows kept in public.party_names_backup_20261019i and public.council_election_candidates_backup_20261019i.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby-and-reform-uk' AND party_name = 'Reform Derby and Reform UK (joint)';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 Reform Derby and Reform UK (joint) entry, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id = 'reform-derby-and-reform-uk';
  IF n <> 41 THEN RAISE EXCEPTION 'expected 41 candidates on reform-derby-and-reform-uk, found %', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby' AND party_name = 'Reform Derby';
  IF n <> 5 THEN RAISE EXCEPTION 'expected 5 reform-derby entries, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id = 'reform-derby';
  IF n <> 10 THEN RAISE EXCEPTION 'expected 10 candidates on reform-derby, found %', n; END IF;
END $$;

CREATE TABLE public.party_names_backup_20261019i AS
  SELECT *, now() AS saved_at FROM public.party_names WHERE party_id = 'reform-derby-and-reform-uk';
CREATE TABLE public.council_election_candidates_backup_20261019i AS
  SELECT *, now() AS saved_at FROM public.council_election_candidates WHERE party_id = 'reform-derby-and-reform-uk';
ALTER TABLE public.party_names_backup_20261019i ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019i FROM anon, authenticated;
ALTER TABLE public.council_election_candidates_backup_20261019i ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_election_candidates_backup_20261019i FROM anon, authenticated;

UPDATE public.council_election_candidates SET party_id = 'reform-derby' WHERE party_id = 'reform-derby-and-reform-uk';
UPDATE public.party_names SET party_id = 'reform-derby', party_name = 'Reform Derby', parties_slug = NULL WHERE party_id = 'reform-derby-and-reform-uk';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.party_names_backup_20261019i; IF n <> 1 THEN RAISE EXCEPTION 'party_names backup holds %, expected 1', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates_backup_20261019i; IF n <> 41 THEN RAISE EXCEPTION 'candidates backup holds %, expected 41', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby' AND party_name = 'Reform Derby'; IF n <> 6 THEN RAISE EXCEPTION 'expected 6 reform-derby entries, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id = 'reform-derby'; IF n <> 51 THEN RAISE EXCEPTION 'expected 51 reform-derby candidates, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_election_candidates WHERE party_id = 'reform-derby-and-reform-uk'; IF n <> 0 THEN RAISE EXCEPTION '% candidates still on the joint entry', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'reform-derby-and-reform-uk'; IF n <> 0 THEN RAISE EXCEPTION 'joint entry still present'; END IF;
END $$;

SELECT published_name, party_id, party_name FROM public.party_names WHERE party_id = 'reform-derby' ORDER BY published_name;
SELECT party_id, count(*) AS candidates, sum(CASE WHEN elected THEN 1 ELSE 0 END) AS elected FROM public.council_election_candidates WHERE party_id = 'reform-derby' GROUP BY 1;

COMMIT;
