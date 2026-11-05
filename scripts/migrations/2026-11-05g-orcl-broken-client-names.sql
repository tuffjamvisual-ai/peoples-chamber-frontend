-- Applied to production on 5 Nov 2026 at 20:30:59 GMT, on the owner's yes.
-- Five rows of public.orcl_client_returns, April to June 2026. The Registrar's CSV is Windows-1252; scripts/import-orcl-returns.js
-- read it as UTF-8 and stored U+FFFD. Text from data/orcl/Quarterly-Return-Client-Data-April-June.csv. client_name only:
-- client_norm, client_org_id and match_type are left as they are.
-- Either all five change or none: each WHERE names the id and the broken text, and the block stops on any other count.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer; total integer := 0;
BEGIN
  UPDATE public.orcl_client_returns SET client_name = 'Z' || U&'\00FC' || 'hlke Engineering'
   WHERE id = 9777 AND client_name = 'Z' || U&'\FFFD' || 'hlke Engineering';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.orcl_client_returns SET client_name = 'Defence and Security Sectors ' || U&'\2013' || ' Supporting Local Communities'
   WHERE id = 9897 AND client_name = 'Defence and Security Sectors ' || U&'\FFFD' || ' Supporting Local Communities';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.orcl_client_returns SET client_name = U&'\00D8' || 'rsted'
   WHERE id = 10001 AND client_name = U&'\FFFD' || 'rsted';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.orcl_client_returns SET client_name = U&'\00D8' || 'rsted A/S'
   WHERE id = 10092 AND client_name = U&'\FFFD' || 'rsted A/S';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.orcl_client_returns SET client_name = 'Scottish Fishermen' || U&'\2019' || 's Federation'
   WHERE id = 10108 AND client_name = 'Scottish Fishermen' || U&'\FFFD' || 's Federation';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  IF total <> 5 THEN RAISE EXCEPTION 'expected 5 rows, changed %', total; END IF;
END $$;
COMMIT;
