-- Correction: St Albans City and District Council's short name was stored cut off as
-- "St Albans City and". Set it to "St Albans", in line with other councils' short names.
-- Exactly one row must change, or nothing is applied.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE public.councils SET short_name = 'St Albans'
  WHERE gss_code = 'E07000240' AND name = 'St Albans City and District Council' AND short_name = 'St Albans City and';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'St Albans short name: expected 1 row, changed %', n; END IF;
END $$;

COMMIT;
