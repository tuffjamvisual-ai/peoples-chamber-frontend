-- Undo of 2026-11-04d-organisation-links.sql: removes the "Also see" links. No other table is touched.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.organisation_links;
COMMIT;
