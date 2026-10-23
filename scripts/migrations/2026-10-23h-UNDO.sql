-- 2026-10-23h UNDO: removes contract_ocids_with_notices. Without it the contracts list still shows, without title links
-- (app/transparency/[section]/page.tsx logs the error and carries on).
\set ON_ERROR_STOP on
BEGIN;
DROP FUNCTION public.contract_ocids_with_notices(text[]);
COMMIT;
