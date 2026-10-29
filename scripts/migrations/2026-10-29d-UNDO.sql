-- Undo 2026-10-29d-pac-recommendations.sql: drops the four recommendations tracker tables only (and their data).
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.pac_recommendation_events;
DROP TABLE IF EXISTS public.pac_recommendations;
DROP TABLE IF EXISTS public.pac_reports;
DROP TABLE IF EXISTS public.pac_source_documents;
COMMIT;
