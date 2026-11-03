-- Undo of 2026-11-03g-editorials-related-councils.sql: drops the column and its index. The code reading the column
-- must be reverted first (lib/editorials-source.ts selects it).
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03g-editorials-related-councils-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS editorials_related_council_slugs_idx;
ALTER TABLE editorials DROP COLUMN IF EXISTS related_council_slugs;

COMMIT;
