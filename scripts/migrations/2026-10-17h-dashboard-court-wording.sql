-- Broken State dashboard: reword the Crown Court note after the hyphen swap in 2026-10-17g
-- left "pre Covid". Old rows kept in public.dashboard_indicators_backup_20261017h.
-- The phrase must be found in exactly one row or the whole file rolls back.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS public.dashboard_indicators_backup_20261017h AS SELECT *, now() AS saved_at FROM public.dashboard_indicators;
ALTER TABLE public.dashboard_indicators_backup_20261017h ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_indicators_backup_20261017h FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.dashboard_indicators
    SET definition_note = replace(definition_note,
      'More than double the December 2019 pre Covid level (about 38,000).',
      'More than double the level in December 2019, before Covid (about 38,000).')
  WHERE service = 'criminal_courts'
    AND definition_note LIKE '%More than double the December 2019 pre Covid level (about 38,000).%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'courts: % rows', n; END IF;
END $do$;
SELECT service, definition_note FROM public.dashboard_indicators WHERE service = 'criminal_courts';
COMMIT;
