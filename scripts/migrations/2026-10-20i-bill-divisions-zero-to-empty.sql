-- Bills with no Commons division stored 0 ayes and 0 noes (owner's approval, 20 Oct 2026). The zeros came from the
-- columns' default of 0, not from Parliament: none of these rows has a division ID, title or date. They become empty
-- (NULL), and the default is dropped so new bills start empty too. The nightly matcher
-- (app/api/sync-bill-commons-votes) already looks for "null or 0", so it is unaffected.
--
-- Each changed row's id is first copied to bill_division_zero_20261020 (row level security on, no policies).
-- UNDO: UPDATE bill b SET commons_ayes = 0, commons_noes = 0 FROM bill_division_zero_20261020 z WHERE z.id = b.id;
--       ALTER TABLE bill ALTER COLUMN commons_ayes SET DEFAULT 0, ALTER COLUMN commons_noes SET DEFAULT 0;
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE bill_division_zero_20261020 AS
SELECT id, parliament_id, title, commons_ayes, commons_noes, now() AS cleared_at
FROM bill
WHERE commons_ayes = 0 AND commons_noes = 0 AND commons_division_id IS NULL;
ALTER TABLE bill_division_zero_20261020 ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM bill_division_zero_20261020;
  IF n <> 3441 THEN RAISE EXCEPTION 'expected 3441 bills with a 0-0 division and no division ID, found %', n; END IF;
  SELECT count(*) INTO n FROM bill WHERE commons_ayes = 0 AND commons_noes = 0 AND commons_division_id IS NOT NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% bills have a division ID and 0-0; not touching those', n; END IF;
END $$;

UPDATE bill b SET commons_ayes = NULL, commons_noes = NULL
FROM bill_division_zero_20261020 z WHERE z.id = b.id;

ALTER TABLE bill ALTER COLUMN commons_ayes DROP DEFAULT, ALTER COLUMN commons_noes DROP DEFAULT;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM bill WHERE commons_ayes = 0 AND commons_noes = 0;
  IF n <> 0 THEN RAISE EXCEPTION '% bills still show 0-0', n; END IF;
  SELECT count(*) INTO n FROM bill WHERE commons_ayes IS NULL;
  IF n <> 532 + 3441 THEN RAISE EXCEPTION 'expected % empty divisions, found %', 532 + 3441, n; END IF;
  SELECT count(*) INTO n FROM bill WHERE coalesce(commons_ayes, 0) + coalesce(commons_noes, 0) > 0;
  IF n <> 90 THEN RAISE EXCEPTION 'expected the 90 real divisions to be unchanged, found %', n; END IF;
END $$;

COMMIT;
