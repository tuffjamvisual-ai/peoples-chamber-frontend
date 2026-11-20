-- UNDO of 2026-11-20b: hansard_contributions_search_idx, its definition from pg_indexes on 20 Nov 2026
-- (archive-cold-data/2026-11-20/hansard_contributions_search_idx.definition.sql). Needs the search column: if 2026-11-20a
-- ran, run 2026-11-20d-cold-tier1-UNDO-search-column.sql first. CONCURRENTLY: reads and writes carry on; no transaction.
-- Building a GIN index over 298,572 tsvectors may take more than 60 s, so this file allows 600 s (an UNDO, run on the
-- owner's say); a cancelled CONCURRENTLY build leaves an INVALID index: DROP INDEX CONCURRENTLY it and run again.
\set ON_ERROR_STOP on
SET statement_timeout = '600s';
SET lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.hansard_contributions_search_idx') IS NOT NULL THEN RAISE EXCEPTION 'hansard_contributions_search_idx already exists'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.hansard_contributions'::regclass AND attname = 'search' AND NOT attisdropped) THEN RAISE EXCEPTION 'hansard_contributions.search not found: run 2026-11-20d-cold-tier1-UNDO-search-column.sql first'; END IF;
END $$;
CREATE INDEX CONCURRENTLY hansard_contributions_search_idx ON public.hansard_contributions USING gin (search);
SELECT indexrelid::regclass AS index, indisvalid AS valid FROM pg_index WHERE indexrelid = 'public.hansard_contributions_search_idx'::regclass;
