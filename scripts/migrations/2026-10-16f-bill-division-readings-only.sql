-- Audit P10: a bill's "Parliament: ayes-noes" figure must be the vote on the bill itself
-- (Second or Third Reading). The old matchers fell back to the most recent division that
-- mentioned the bill, so some bills showed an amendment or Lords-amendment vote instead
-- (e.g. "Parliament: 68-242" on a Steel Industry bill that passed).
--
-- This clears the Commons division fields on bills whose saved division is not a Second or
-- Third Reading. Each cleared row is first copied to bill_division_cleared_20261016 (row
-- level security on, no policies). The nightly matchers, now readings-only, refill any bill
-- that had a reading division.
--
-- UNDO: UPDATE bill b SET commons_division_id = c.commons_division_id,
--         commons_division_title = c.commons_division_title, commons_vote_date = c.commons_vote_date,
--         commons_ayes = c.commons_ayes, commons_noes = c.commons_noes
--       FROM bill_division_cleared_20261016 c WHERE c.id = b.id;

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS bill_division_cleared_20261016 AS
SELECT id, parliament_id, title, commons_division_id, commons_division_title, commons_vote_date, commons_ayes, commons_noes, now() AS cleared_at
FROM bill WHERE false;
ALTER TABLE bill_division_cleared_20261016 ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM bill_division_cleared_20261016) THEN
    RAISE EXCEPTION 'Backup table already has rows: this clean-up has already been run.';
  END IF;
END $$;

INSERT INTO bill_division_cleared_20261016
SELECT id, parliament_id, title, commons_division_id, commons_division_title, commons_vote_date, commons_ayes, commons_noes, now()
FROM bill
WHERE commons_division_id IS NOT NULL
  AND coalesce(commons_division_title, '') !~* '(second|third) reading';

SELECT count(*) AS bills_cleared FROM bill_division_cleared_20261016;
SELECT parliament_id, left(title, 50) AS bill, left(commons_division_title, 70) AS division, commons_ayes, commons_noes
FROM bill_division_cleared_20261016 ORDER BY commons_vote_date DESC NULLS LAST LIMIT 15;

UPDATE bill b SET commons_division_id = NULL, commons_division_title = NULL, commons_vote_date = NULL,
                  commons_ayes = NULL, commons_noes = NULL
FROM bill_division_cleared_20261016 c WHERE c.id = b.id;

COMMIT;
