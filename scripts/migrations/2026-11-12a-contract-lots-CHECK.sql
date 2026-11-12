-- 2026-11-12a CHECK (read only): the new column and table exist, are empty, and contract_notices kept its rows.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT (SELECT data_type FROM information_schema.columns WHERE table_name = 'contract_notices' AND column_name = 'lot_ids') AS lot_ids_type,
       to_regclass('public.contract_lots') IS NOT NULL AS contract_lots_exists,
       (SELECT relrowsecurity FROM pg_class WHERE relname = 'contract_lots') AS rls_on,
       (SELECT count(*) FROM public.contract_lots) AS lots_rows,
       (SELECT reltuples::bigint FROM pg_class WHERE relname = 'contract_notices') AS notices_rows_estimate;
ROLLBACK;
