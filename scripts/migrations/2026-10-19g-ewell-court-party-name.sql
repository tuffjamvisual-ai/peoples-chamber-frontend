-- Party name shown for Ewell Court Residents' Association (Epsom and Ewell): the stored standard name has a backtick
-- for the apostrophe ("Ewell Court Residents` Association"). John's decision, 19 Oct 2026: show an apostrophe.
-- Only party_names.party_name changes (the name the council page shows); published_name and the candidates'
-- party_published keep the description exactly as the source printed it. One row; old row kept in
-- public.party_names_backup_20261019g.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.party_names
   WHERE party_id = 'ewell-court-residents-association' AND party_name = 'Ewell Court Residents` Association';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 party_names row with the backtick, found %', n; END IF;
END $$;

CREATE TABLE public.party_names_backup_20261019g AS
  SELECT *, now() AS saved_at FROM public.party_names WHERE party_id = 'ewell-court-residents-association';
ALTER TABLE public.party_names_backup_20261019g ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019g FROM anon, authenticated;

UPDATE public.party_names SET party_name = 'Ewell Court Residents'' Association'
 WHERE party_id = 'ewell-court-residents-association' AND party_name = 'Ewell Court Residents` Association';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.party_names WHERE party_id = 'ewell-court-residents-association' AND party_name = 'Ewell Court Residents'' Association';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 updated row, found %', n; END IF;
  SELECT count(*) INTO n FROM public.party_names WHERE party_name LIKE '%`%' AND party_id = 'ewell-court-residents-association';
  IF n <> 0 THEN RAISE EXCEPTION 'backtick still present in % rows', n; END IF;
END $$;

SELECT published_name, party_id, party_name FROM public.party_names WHERE party_id = 'ewell-court-residents-association';

COMMIT;
