-- UNDO for 2026-11-21e-meaning-search.sql (Cowork ENTRY 390 GO): drops search_meaning(), search_embeddings (its rows and
-- any index on it, including the HNSW index of 2026-11-21f, go with it) and the vector extension.
-- Deploy the code without /api/meaning-search first, or let it run: it answers an empty list when the function is
-- missing (lib/meaning/search.ts), so /search shows no 'Related by meaning' group and nothing else changes.
-- No backup needed: every row is rebuilt from the database and the model by scripts/meaning/load-embeddings.ts.
-- DROP EXTENSION has no CASCADE: if anything else has started to use vector since, it stops here with an error and the
-- whole UNDO rolls back; then drop only the function and the table, and report.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP FUNCTION IF EXISTS public.search_meaning(text, integer);
DROP TABLE IF EXISTS public.search_embeddings;
DROP EXTENSION IF EXISTS vector;
DO $$ BEGIN
  IF to_regclass('public.search_embeddings') IS NOT NULL OR to_regprocedure('public.search_meaning(text,integer)') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'UNDO incomplete';
  END IF;
  RAISE NOTICE '2026-11-21e UNDO: search_meaning, search_embeddings and the vector extension removed';
END $$;
COMMIT;
