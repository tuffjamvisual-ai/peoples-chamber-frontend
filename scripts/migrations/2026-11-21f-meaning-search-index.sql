-- Meaning search (Cowork ENTRY 390 GO), step 3 of 3: the HNSW index on search_embeddings, built AFTER the load
-- (2026-11-21e, then scripts/meaning/load-embeddings.ts --apply), so it is built once from the full set instead of being
-- updated row by row. Cosine distance on halfvec (the operator search_meaning() orders by), pgvector's defaults
-- (m = 16, ef_construction = 64).
-- CREATE INDEX CONCURRENTLY: no lock that blocks reads or writes; it cannot run inside a transaction, so no BEGIN here,
-- and the limits are session settings, reset at the end of this file (DATABASE_URL is the transaction pooler: run it
-- with the direct connection or check that the RESET lines ran). Timed in the rehearsal (BEGIN ... ROLLBACK, a plain
-- CREATE INDEX on a sample): see the loader's --dry-run report. If it stops on the time limit it leaves an INVALID
-- index: run the UNDO, report, and do not retry the same night.
-- Never between 03:00 and 04:00 UK time (the 03:08 sync) and never while a deploy is Building.
-- UNDO: 2026-11-21f-meaning-search-index-UNDO.sql.
\set ON_ERROR_STOP on
SET statement_timeout = '60s';
SET lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.search_embeddings') IS NULL THEN RAISE EXCEPTION 'search_embeddings not found (run 2026-11-21e first)'; END IF;
  IF to_regclass('public.search_embeddings_embedding_hnsw') IS NOT NULL THEN RAISE EXCEPTION 'search_embeddings_embedding_hnsw already exists'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.search_embeddings) THEN RAISE EXCEPTION 'search_embeddings is empty: load it first'; END IF;
END $$;
CREATE INDEX CONCURRENTLY search_embeddings_embedding_hnsw ON public.search_embeddings
  USING hnsw (embedding extensions.halfvec_cosine_ops);
RESET statement_timeout;
RESET lock_timeout;
SELECT c.relname, i.indisvalid, pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid WHERE c.relname = 'search_embeddings_embedding_hnsw';
