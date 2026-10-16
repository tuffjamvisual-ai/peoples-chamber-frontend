-- Removes duplicate rows from government_contracts, reversibly.
--
-- The retired script scripts/sync-government-contracts.js inserted rows with no OCDS
-- identifiers (ocid NULL) on every run between 29 Apr and 15 Oct 2026, so the same contract
-- was stored many times (preview 2026-10-16c: 24,155 rows without an ocid).
--
-- A row without an ocid is removed when:
--   1. "identified twin": a row WITH an ocid exists for the same supplier, title, award date and
--      buyer. That row is the official record of the same Find a Tender release, so the
--      identified rows are kept and every copy without an ocid goes.
--   2. "repeat": no identified twin exists, and an earlier row without an ocid has the same
--      supplier, title, award date, buyer AND value. The earliest copy is kept. Value is part of
--      the match here so that separate lots of one release (different values) are all kept.
-- Rows with an ocid are never touched.
--
-- Every removed row is first copied to government_contracts_duplicates_20261016 (row level
-- security on, no policies, so the public API cannot read it). The counts are checked before
-- COMMIT; any mismatch rolls the whole thing back.
--
-- Afterwards the table refuses new rows without an ocid (CHECK ... NOT VALID: existing kept
-- rows without an ocid stay, new ones are refused). The Vercel route always sets ocid.
--
-- UNDO (if ever needed):
--   ALTER TABLE government_contracts DROP CONSTRAINT government_contracts_ocid_required;
--   INSERT INTO government_contracts SELECT * FROM government_contracts_duplicates_20261016;

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '290s';

CREATE TABLE IF NOT EXISTS government_contracts_duplicates_20261016
  (LIKE government_contracts INCLUDING DEFAULTS);
ALTER TABLE government_contracts_duplicates_20261016 ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM government_contracts_duplicates_20261016) THEN
    RAISE EXCEPTION 'Backup table already has rows: this clean-up has already been run.';
  END IF;
END $$;

CREATE TEMP TABLE contract_dups ON COMMIT DROP AS
SELECT id, CASE WHEN has_identified THEN 'identified twin' ELSE 'repeat' END AS reason
FROM (
  SELECT id, ocid,
         bool_or(ocid IS NOT NULL) OVER (PARTITION BY supplier, title, awarded_date, dept_slug) AS has_identified,
         row_number() OVER (PARTITION BY supplier, title, awarded_date, dept_slug, value, (ocid IS NULL) ORDER BY id) AS rn
  FROM government_contracts
) x
WHERE ocid IS NULL AND (has_identified OR rn > 1);

SELECT reason, count(*) AS rows_to_remove FROM contract_dups GROUP BY reason ORDER BY reason;

INSERT INTO government_contracts_duplicates_20261016
SELECT g.* FROM government_contracts g JOIN contract_dups d ON d.id = g.id;

DELETE FROM government_contracts g USING contract_dups d WHERE d.id = g.id;

DO $$
DECLARE n_dups bigint; n_backup bigint; n_left_no_ocid bigint; n_total bigint;
BEGIN
  SELECT count(*) INTO n_dups FROM contract_dups;
  SELECT count(*) INTO n_backup FROM government_contracts_duplicates_20261016;
  SELECT count(*) INTO n_left_no_ocid FROM government_contracts WHERE ocid IS NULL;
  SELECT count(*) INTO n_total FROM government_contracts;
  IF n_dups = 0 THEN RAISE EXCEPTION 'Nothing matched: rolled back.'; END IF;
  IF n_dups > 24155 THEN RAISE EXCEPTION 'Matched % rows, more than the 24,155 rows without an ocid: rolled back.', n_dups; END IF;
  IF n_backup <> n_dups THEN RAISE EXCEPTION 'Backup has % rows but % were matched: rolled back.', n_backup, n_dups; END IF;
  IF EXISTS (SELECT 1 FROM government_contracts_duplicates_20261016 WHERE ocid IS NOT NULL) THEN
    RAISE EXCEPTION 'A row with an ocid was matched: rolled back.';
  END IF;
  RAISE NOTICE 'Removed % duplicate rows (copied to government_contracts_duplicates_20261016). Rows left: %, of which without an ocid: %.', n_dups, n_total, n_left_no_ocid;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'government_contracts_ocid_required') THEN
    ALTER TABLE government_contracts ADD CONSTRAINT government_contracts_ocid_required CHECK (ocid IS NOT NULL) NOT VALID;
  END IF;
END $$;

COMMIT;
