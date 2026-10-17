-- Newport, Wales: show the council's official name, "Newport City Council"
-- (https://www.newport.gov.uk), instead of "Newport Council".
-- Only the name changes; the slug, and so every link to the council page, stays the same.
-- Old row kept in public.councils_backup_20261017i.
-- Exactly one row must change or the whole file rolls back.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS public.councils_backup_20261017i AS
  SELECT *, now() AS saved_at FROM public.councils WHERE name = 'Newport Council' AND gss_code LIKE 'W06%';
ALTER TABLE public.councils_backup_20261017i ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.councils_backup_20261017i FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.councils SET name = 'Newport City Council'
  WHERE name = 'Newport Council' AND gss_code LIKE 'W06%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'newport: % rows', n; END IF;
END $do$;
SELECT slug, name, short_name, gss_code FROM public.councils WHERE name ILIKE 'Newport%';
COMMIT;
