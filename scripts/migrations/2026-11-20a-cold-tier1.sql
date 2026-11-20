-- Tier 1 cold data (owner approved, Cowork ENTRY 420, 20 Nov 2026, the ENTRY 416 Tier 1 list; readers in
-- Claude outputs/audit/cold-data-416/LIST.md): data no page reads. Drops four tables and three columns:
--   tables   mp_questions (171,747 rows), government_contracts_backup (39,611), government_contracts_duplicates_20261016
--            (17,974), archive_test_index (4,718; with its two helper functions archive_test_search and
--            archive_test_words, which only it uses; mp_questions_id_seq goes with mp_questions)
--   columns  hansard_contributions.search (generated tsvector; its index goes with it if 2026-11-20b has not run),
--            hansard_contributions.value_html (the sync now compares contribution_text, branch t1-cold1),
--            pmqs_archive_exchanges.parlparse_text (read only by scripts/load-pmqs-archive.py, now changed)
-- Copies first: /Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/ and
-- /Volumes/GoliathSSD/opengovt-backups/cold-data-2026-11-20/ (CSV per table and column, DDL from pg_dump --schema-only,
-- MANIFEST.tsv with rows, bytes, sha256 and the database's count; CHECKSUMS.tsv), restored into a scratch schema in a
-- rolled-back transaction on 20 Nov 2026 with equal counts and checksums.
-- Run order: deploy the t1-cold1 code first (the sync must no longer write value_html), then 2026-11-20b (the index,
-- CONCURRENTLY, no transaction), then this file. DROP TABLE frees its space at COMMIT; DROP COLUMN is a catalogue change
-- and frees nothing until hansard_contributions and pmqs_archive_exchanges are rewritten (VACUUM FULL, as ENTRY 391).
-- Locks: ACCESS EXCLUSIVE on each table for the moment of the catalogue change; lock_timeout 5 s, so a busy table makes
-- the file stop (nothing changed) and it can be run again. Not while a sync-parliament-archive run is writing.
-- UNDO: 2026-11-20a-cold-tier1-UNDO.sql, then 2026-11-20c-cold-tier1-UNDO-fill-columns.sql, then
-- 2026-11-20d-cold-tier1-UNDO-search-column.sql and 2026-11-20b-cold-tier1-index-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.mp_questions') IS NULL THEN RAISE EXCEPTION 'mp_questions not found'; END IF;
  IF to_regclass('public.government_contracts_backup') IS NULL THEN RAISE EXCEPTION 'government_contracts_backup not found'; END IF;
  IF to_regclass('public.government_contracts_duplicates_20261016') IS NULL THEN RAISE EXCEPTION 'government_contracts_duplicates_20261016 not found'; END IF;
  IF to_regclass('public.archive_test_index') IS NULL THEN RAISE EXCEPTION 'archive_test_index not found'; END IF;
  IF to_regprocedure('public.archive_test_search(text, integer)') IS NULL THEN RAISE EXCEPTION 'archive_test_search(text, integer) not found'; END IF;
  IF to_regprocedure('public.archive_test_words(text[])') IS NULL THEN RAISE EXCEPTION 'archive_test_words(text[]) not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.hansard_contributions'::regclass AND attname = 'search' AND attgenerated = 's' AND NOT attisdropped) THEN RAISE EXCEPTION 'hansard_contributions.search (generated) not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.hansard_contributions'::regclass AND attname = 'value_html' AND NOT attisdropped) THEN RAISE EXCEPTION 'hansard_contributions.value_html not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.pmqs_archive_exchanges'::regclass AND attname = 'parlparse_text' AND NOT attisdropped) THEN RAISE EXCEPTION 'pmqs_archive_exchanges.parlparse_text not found'; END IF;
  -- Row counts as copied on 20 Nov 2026: the four tables are not written by anything, so a different count means
  -- something wrote to them after the copy; stop and copy again.
  IF (SELECT count(*) FROM public.mp_questions) <> 171747 THEN RAISE EXCEPTION 'mp_questions count changed since the copy'; END IF;
  IF (SELECT count(*) FROM public.government_contracts_backup) <> 39611 THEN RAISE EXCEPTION 'government_contracts_backup count changed since the copy'; END IF;
  IF (SELECT count(*) FROM public.government_contracts_duplicates_20261016) <> 17974 THEN RAISE EXCEPTION 'government_contracts_duplicates_20261016 count changed since the copy'; END IF;
  IF (SELECT count(*) FROM public.archive_test_index) <> 4718 THEN RAISE EXCEPTION 'archive_test_index count changed since the copy'; END IF;
  IF to_regclass('public.hansard_contributions_search_idx') IS NOT NULL THEN RAISE NOTICE 'hansard_contributions_search_idx still present (2026-11-20b not run): DROP COLUMN search drops it in this transaction'; END IF;
END $$;

DROP TABLE public.mp_questions;
DROP TABLE public.government_contracts_backup;
DROP TABLE public.government_contracts_duplicates_20261016;
DROP TABLE public.archive_test_index;
DROP FUNCTION public.archive_test_search(text, integer);
DROP FUNCTION public.archive_test_words(text[]);
ALTER TABLE public.hansard_contributions DROP COLUMN search, DROP COLUMN value_html;
ALTER TABLE public.pmqs_archive_exchanges DROP COLUMN parlparse_text;

SELECT 'tables left' AS check, count(*) AS n FROM unnest(ARRAY['public.mp_questions', 'public.government_contracts_backup', 'public.government_contracts_duplicates_20261016', 'public.archive_test_index', 'public.hansard_contributions_search_idx', 'public.mp_questions_id_seq']) t WHERE to_regclass(t) IS NOT NULL
UNION ALL SELECT 'columns left', count(*) FROM pg_attribute WHERE NOT attisdropped AND ((attrelid = 'public.hansard_contributions'::regclass AND attname IN ('search', 'value_html')) OR (attrelid = 'public.pmqs_archive_exchanges'::regclass AND attname = 'parlparse_text'))
UNION ALL SELECT 'functions left', count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('archive_test_search', 'archive_test_words');
COMMIT;
