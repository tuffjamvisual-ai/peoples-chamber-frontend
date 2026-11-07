-- UNDO for 2026-11-07d-ministerial-salary-rates.sql: puts back the peer_finance row exactly, drops dept_ministers.salary_category,
-- the ministerial_salaries check row and the ministerial_salary_rates table. dept_ministers.salary_band was never changed. Revert the t2-salaries merge first.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $undo$
DECLARE n integer;
BEGIN
  UPDATE public.peer_finance SET ministerial_salary_annual = 100819, period_label = $v$Last published April 2022 to figure listed for Attorney General when held by a Commons MP. The Lords-AG entitled salary is not separately disclosed in the April 2022 ministerial-salary publication.$v$, ministerial_source_url = $v$https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-april-2022-html$v$
   WHERE slug = 'richard-hermer' AND ministerial_salary_annual IS NULL AND period_label IS NULL AND ministerial_source_url IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'peer_finance: expected 1 row restored, restored %', n; END IF;
END
$undo$;
DELETE FROM public.hand_loaded_datasets WHERE key = 'ministerial_salaries';
ALTER TABLE public.dept_ministers DROP COLUMN salary_category;
DROP TABLE public.ministerial_salary_rates;
COMMIT;
