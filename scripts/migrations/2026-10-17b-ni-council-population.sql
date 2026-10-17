-- Northern Ireland council populations: NISRA 2024 mid-year estimates (MYE24-POP_TOTALS.xlsx,
-- unrounded, LGD2014). Belfast was stored as 579,276, the wider urban area, not the council
-- (NISRA: 352,390). Old values kept in public.ni_population_backup_20261017.
-- Each update is guarded on the current value; the whole file rolls back if any row differs.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS public.ni_population_backup_20261017 AS SELECT slug, gss_code, population, now() AS saved_at FROM public.councils WHERE gss_code LIKE 'N09%';
ALTER TABLE public.ni_population_backup_20261017 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ni_population_backup_20261017 FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.councils SET population = 148100 WHERE gss_code = 'N09000001' AND population = 142492; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000001: % rows', n; END IF;
  UPDATE public.councils SET population = 222511 WHERE gss_code = 'N09000002' AND population = 214090; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000002: % rows', n; END IF;
  UPDATE public.councils SET population = 352390 WHERE gss_code = 'N09000003' AND population = 579276; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000003: % rows', n; END IF;
  UPDATE public.councils SET population = 141954 WHERE gss_code = 'N09000004' AND population = 141745; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000004: % rows', n; END IF;
  UPDATE public.councils SET population = 152383 WHERE gss_code = 'N09000005' AND population = 150679; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000005: % rows', n; END IF;
  UPDATE public.councils SET population = 117687 WHERE gss_code = 'N09000006' AND population = 116835; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000006: % rows', n; END IF;
  UPDATE public.councils SET population = 151669 WHERE gss_code = 'N09000007' AND population = 144381; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000007: % rows', n; END IF;
  UPDATE public.councils SET population = 139913 WHERE gss_code = 'N09000008' AND population = 138773; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000008: % rows', n; END IF;
  UPDATE public.councils SET population = 152718 WHERE gss_code = 'N09000009' AND population = 147392; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000009: % rows', n; END IF;
  UPDATE public.councils SET population = 183115 WHERE gss_code = 'N09000010' AND population = 180012; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000010: % rows', n; END IF;
  UPDATE public.councils SET population = 165415 WHERE gss_code = 'N09000011' AND population = 160864; GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'N09000011: % rows', n; END IF;
END $do$;
SELECT gss_code, name, population FROM public.councils WHERE gss_code LIKE 'N09%' ORDER BY gss_code;
COMMIT;
