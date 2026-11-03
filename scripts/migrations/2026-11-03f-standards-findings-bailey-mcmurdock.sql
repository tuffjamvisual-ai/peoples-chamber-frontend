-- Standards findings, the two Committee on Standards reports of 3 Nov 2026 (owner's brief, 3 Nov 2026): outcome,
-- rule_breached, penalty and a plain summary for the 5th Report (Calvin Bailey, HC 753) and the 4th Report (James
-- McMurdock, HC 752), values as given by the owner. Matched by case_ref, each exactly once. member_id is not touched.
-- Backup: "Claude outputs/standards-findings-bailey-mcmurdock-backup-2026-11-03.json".
-- Undo: 2026-11-03f-standards-findings-bailey-mcmurdock-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03f-standards-findings-bailey-mcmurdock.sql
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
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$Rule 14$q$, penalty = $q$no further action; he apologised and withdrew the letter$q$,
  summary = $q$Calvin Bailey wrote to the Commissioner during the investigation into James McMurdock, urging him to reject Mr McMurdock's explanation. The Committee found this a minor and inadvertent breach of the rule against lobbying the Commissioner.$q$
  WHERE case_ref = 'pcs-cmt-55617';

-- James McMurdock
UPDATE mp_conduct_findings SET outcome = $q$not_upheld$q$, rule_breached = $q$Rule 11 (considered)$q$, penalty = $q$no further action$q$,
  summary = $q$The Committee found that James McMurdock posted the letter "N" himself, rejecting his explanations, and in doing so started a racial slur online. It overruled the Commissioner, who found a breach, because it could not establish that he intended this.$q$
  WHERE case_ref = 'pcs-cmt-55624';

COMMIT;
