-- St Helens Borough Council, 7 May 2026: council-wide turnout 34%, from the council's election results by party page
-- (https://sthelens.moderngov.co.uk/mgElectionResults.aspx?ID=34&RPID=58005317, "Turnout: 34%"), the same way as
-- Peterborough (John's decision, 19 Oct 2026). The council publishes no ward turnouts, so the importer left it blank.
-- One row (the main election; the Town Centre postponed poll keeps no turnout). Old row kept in
-- public.council_elections_backup_20261019f.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_elections
   WHERE council_gss_code = 'E08000013' AND election_date = '2026-05-07' AND wards_contested = 17 AND turnout_pct IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 St Helens 7 May 2026 election with no turnout, found %', n; END IF;
END $$;

CREATE TABLE public.council_elections_backup_20261019f AS
  SELECT *, now() AS saved_at FROM public.council_elections WHERE council_gss_code = 'E08000013' AND election_date = '2026-05-07';
ALTER TABLE public.council_elections_backup_20261019f ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_elections_backup_20261019f FROM anon, authenticated;

UPDATE public.council_elections SET turnout_pct = 34
 WHERE council_gss_code = 'E08000013' AND election_date = '2026-05-07' AND turnout_pct IS NULL;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_elections WHERE council_gss_code = 'E08000013' AND election_date = '2026-05-07' AND turnout_pct = 34;
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 updated row, found %', n; END IF;
END $$;

SELECT election_date, wards_contested, turnout_pct FROM public.council_elections WHERE council_gss_code = 'E08000013' ORDER BY election_date;

COMMIT;
