-- Migration: government_contracts durable OCDS keys + dedup
-- Date: 2026-07-27
--
-- Context: the old scripts/sync-government-contracts.js used .insert() with no
-- dedup, so re-running the rolling 30-day window accumulated duplicates. As of
-- this migration: 39,611 rows, only 6,132 distinct content keys — 33,479 dupes.
--
-- This migration runs in TWO separate steps (not one transaction) so that if the
-- dedup leaves any duplicate behind, the unique-index creation fails loudly and
-- we see why, rather than a silent full rollback.
--
-- Dedup keep-rule: duplicate sets are content-identical (same dept_slug, title,
-- supplier, value, awarded_date), differing only in id/updated_at. Keep the row
-- with the latest updated_at, tie-broken by the lowest id. Deterministic; the
-- choice does not change displayed data because the rows are identical.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — backup, add columns, dedup.  (run and VERIFY before step 2)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Full backup — seconds to run; guards months of accumulated data against a
--     bad migration. Drop it once the migration is confirmed good.
CREATE TABLE IF NOT EXISTS government_contracts_backup AS
  SELECT * FROM government_contracts;

-- 1b. Durable OCDS identifier columns. Legacy rows stay NULL (we cannot
--     reconstruct their OCIDs); new sync rows populate all three.
ALTER TABLE government_contracts ADD COLUMN IF NOT EXISTS ocid        text;
ALTER TABLE government_contracts ADD COLUMN IF NOT EXISTS award_id    text;
ALTER TABLE government_contracts ADD COLUMN IF NOT EXISTS contract_id text;

-- 1c. Dedup: delete all but the kept row in each content-key group.
DELETE FROM government_contracts g
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY dept_slug, title, supplier, value, awarded_date
           ORDER BY updated_at DESC NULLS LAST, id ASC
         ) AS rn
  FROM government_contracts
) d
WHERE g.id = d.id AND d.rn > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — add the unique index.  (run ONLY after step 1 verifies zero dupes)
-- ─────────────────────────────────────────────────────────────────────────────
-- Full unique index. Legacy rows are all (NULL, NULL, NULL); NULLS DISTINCT
-- (the default) lets them coexist, while new rows with real OCDS ids are
-- deduped. ON CONFLICT (ocid, award_id, contract_id) upserts against this.
CREATE UNIQUE INDEX IF NOT EXISTS government_contracts_ocds_key
  ON government_contracts (ocid, award_id, contract_id);
