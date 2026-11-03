-- Standards findings (owner's brief, 3 Nov 2026): member_id for three former MPs now in the Lords, whose reports the
-- sync could not match because the Members API Commons search finds no one under their Commons name. Each id is the
-- only member who held that exact name (Members API name history) and served in the Commons before the report date:
--   pcs-cmt-11353 Peter Lilley (report 16 Jan 2015)     -> 68   (Commons 1983 to 2017, St Albans then Hitchin and Harpenden; Lord Lilley since 2018)
--   pcs-cmt-15334 Margaret Hodge (report 7 Dec 2017)    -> 140  (Commons 1994 to 2024, Barking; Baroness Hodge of Barking since 2024)
--   pcs-cmt-21390 Henry Bellingham (report 31 Oct 2019) -> 1441 (Commons 1983 to 2019, North West Norfolk; Lord Bellingham since 2020)
-- Only rows whose member_id is still NULL are changed. Backup: "Claude outputs/standards-findings-lords-ids-backup-2026-11-03.json".
-- Undo: 2026-11-03e-standards-findings-peer-ids-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03e-standards-findings-peer-ids.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- Every case_ref below must exist exactly once, with member_id still NULL.
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['pcs-cmt-11353', 'pcs-cmt-15334', 'pcs-cmt-21390'] LOOP
    SELECT count(*) INTO n FROM mp_conduct_findings WHERE case_ref = r;
    IF n <> 1 THEN RAISE EXCEPTION 'case_ref % found % times (expected exactly 1)', r, n; END IF;
    SELECT count(*) INTO n FROM mp_conduct_findings WHERE case_ref = r AND member_id IS NOT NULL;
    IF n <> 0 THEN RAISE EXCEPTION 'case_ref % already has a member_id', r; END IF;
  END LOOP;
END $$;

UPDATE mp_conduct_findings SET member_id = 68   WHERE case_ref = 'pcs-cmt-11353' AND member_id IS NULL;
UPDATE mp_conduct_findings SET member_id = 140  WHERE case_ref = 'pcs-cmt-15334' AND member_id IS NULL;
UPDATE mp_conduct_findings SET member_id = 1441 WHERE case_ref = 'pcs-cmt-21390' AND member_id IS NULL;

COMMIT;
