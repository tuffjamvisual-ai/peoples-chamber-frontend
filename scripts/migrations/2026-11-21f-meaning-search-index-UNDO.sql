-- UNDO for 2026-11-21f-meaning-search-index.sql: drops the HNSW index (also an INVALID one left by a build that stopped).
-- search_meaning() keeps working without it, by reading every row (about 32,000; tens of milliseconds).
-- DROP INDEX CONCURRENTLY: no lock that blocks reads or writes; not inside a transaction; session limits reset at the end.
\set ON_ERROR_STOP on
SET statement_timeout = '60s';
SET lock_timeout = '5s';
DROP INDEX CONCURRENTLY IF EXISTS public.search_embeddings_embedding_hnsw;
RESET statement_timeout;
RESET lock_timeout;
SELECT coalesce(to_regclass('public.search_embeddings_embedding_hnsw')::text, 'dropped') AS result;
