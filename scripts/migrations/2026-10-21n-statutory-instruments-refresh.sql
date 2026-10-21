-- Statutory instruments: kept up to date from the Commons divisions (owner's approval, 21 Oct 2026). The table held
-- 3 rows entered by hand on 21 May 2026 and had no loader. Each row is a Commons division on a statutory instrument;
-- refresh_statutory_instruments() adds every such division from commons_division_totals and refreshes the vote
-- counts of those already listed. /api/sync-commons-votes-api calls it after each run.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '120s';
DO $$ BEGIN
  IF to_regprocedure('public.refresh_statutory_instruments()') IS NOT NULL THEN RAISE EXCEPTION 'refresh_statutory_instruments already exists'; END IF;
END $$;

CREATE FUNCTION public.refresh_statutory_instruments() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE n integer;
BEGIN
  INSERT INTO statutory_instrument (division_id, title, date, ayes, noes, passed, created_at, updated_at)
  SELECT d.division_id, btrim(regexp_replace(d.title, '\s+', ' ', 'g')), d.division_date, d.aye_count, d.no_count,
         d.aye_count > d.no_count, now(), now()
  FROM commons_division_totals d
  WHERE (
      -- "... Regulations 2026", "... Order 2025", "... (No. 4) Regulations 2026"
      d.title ~* '\m(regulations|order|rules|scheme)(\s+\(no\.\s?\d+\))?\s+(19|20)\d\d\M'
      -- "... Regulations (S.I. 2019 No. 62)", "... SI No 1400"
      OR d.title ~* '\m(s\.i\.|si no)'
      -- "Draft ... Regulations" with no year
      OR d.title ~* '^\s*draft\M.*\m(regulations|order|rules)\s*$'
    )
    AND d.title !~* '\m(bill|opposition day|standing order|public order act)\M'
  ON CONFLICT (division_id) DO UPDATE SET
    ayes = EXCLUDED.ayes, noes = EXCLUDED.noes, passed = EXCLUDED.passed, date = EXCLUDED.date, updated_at = now()
  WHERE (statutory_instrument.ayes, statutory_instrument.noes, statutory_instrument.date)
        IS DISTINCT FROM (EXCLUDED.ayes, EXCLUDED.noes, EXCLUDED.date);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $fn$;
REVOKE ALL ON FUNCTION public.refresh_statutory_instruments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_statutory_instruments() TO service_role;

DO $$ DECLARE added int; total int; BEGIN
  added := public.refresh_statutory_instruments();
  SELECT count(*) INTO total FROM statutory_instrument;
  IF total < 200 THEN RAISE EXCEPTION 'only % statutory instruments after refresh', total; END IF;
  IF NOT EXISTS (SELECT 1 FROM statutory_instrument WHERE division_id = 2336) THEN RAISE EXCEPTION 'lost an existing row'; END IF;
  RAISE NOTICE 'added or updated %, total %', added, total;
END $$;
COMMIT;
