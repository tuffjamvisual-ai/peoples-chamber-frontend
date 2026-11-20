-- Drop an unused index (owner approved, Cowork ENTRY 420, 20 Nov 2026; ENTRY 416 Tier 1): hansard_contributions_search_idx,
-- 84 MB, 0 scans since the 11 Nov restart (pg_stat_user_indexes, 20 Nov 2026); no code searches hansard_contributions.search.
-- Run before 2026-11-20a (which drops the search column; if this file has not run, that drop takes the index with it
-- inside its transaction instead).
-- DROP INDEX CONCURRENTLY: no lock that blocks reads or writes; it cannot run inside a transaction, so no BEGIN here.
-- UNDO: 2026-11-20b-cold-tier1-index-UNDO.sql (definition from pg_indexes on 20 Nov 2026; needs the search column).
\set ON_ERROR_STOP on
SET statement_timeout = '60s';
SET lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.hansard_contributions_search_idx') IS NULL THEN RAISE EXCEPTION 'hansard_contributions_search_idx not found'; END IF;
END $$;
DROP INDEX CONCURRENTLY public.hansard_contributions_search_idx;
SELECT coalesce(to_regclass('public.hansard_contributions_search_idx')::text, 'dropped') AS result;
