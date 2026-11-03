-- Undo of 2026-11-03f-standards-findings-bailey-mcmurdock.sql: puts back outcome, rule_breached, penalty and summary as
-- they were before it (backup: "Claude outputs/standards-findings-bailey-mcmurdock-backup-2026-11-03.json").
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03f-standards-findings-bailey-mcmurdock-UNDO.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- Every case_ref below must exist exactly once.
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['pcs-cmt-55617', 'pcs-cmt-55624'] LOOP
    SELECT count(*) INTO n FROM mp_conduct_findings WHERE case_ref = r;
    IF n <> 1 THEN RAISE EXCEPTION 'case_ref % found % times (expected exactly 1)', r, n; END IF;
  END LOOP;
END $$;

-- Calvin Bailey
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$5th Report – Mr Calvin Bailey$q$
  WHERE case_ref = 'pcs-cmt-55617';

-- James McMurdock
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$4th Report - James McMurdock$q$
  WHERE case_ref = 'pcs-cmt-55624';

COMMIT;
