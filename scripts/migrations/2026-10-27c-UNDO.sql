-- Undo 2026-10-27c: removes the organisation summary, its contracts list, their refresh, the slug function and the two
-- source indexes. The source tables themselves are not touched.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP FUNCTION public.refresh_organisation_index();
DROP MATERIALIZED VIEW public.organisation_index;
DROP MATERIALIZED VIEW public.organisation_contracts;
DROP FUNCTION public.organisation_slug(text);
DROP INDEX public.political_donations_company_number_idx;
DROP INDEX public.government_grants_company_number_idx;
COMMIT;
