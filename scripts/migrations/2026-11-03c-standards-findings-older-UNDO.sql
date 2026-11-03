-- Undo of 2026-11-03c-standards-findings-older.sql: puts back outcome, rule_breached, penalty and summary as they were
-- before it (backup: "Claude outputs/standards-findings-older-backup-2026-11-03.json").
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03c-standards-findings-older-UNDO.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- Every case_ref below must exist exactly once.
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['pcs-cmt-21390', 'pcs-cmt-21356', 'pcs-cmt-12406', 'pcs-cmt-20763', 'pcs-cmt-18382', 'pcs-cmt-17284', 'pcs-cmt-15334', 'pcs-cmt-14444', 'pcs-cmt-13595', 'pcs-cmt-13166', 'pcs-cmt-11611', 'pcs-cmt-11353', 'pcs-cmt-11014', 'pcs-cmt-10634', 'pcs-cmt-12008'] LOOP
    SELECT count(*) INTO n FROM mp_conduct_findings WHERE case_ref = r;
    IF n <> 1 THEN RAISE EXCEPTION 'case_ref % found % times (expected exactly 1)', r, n; END IF;
  END LOOP;
END $$;

-- Henry Bellingham
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$2nd Report - Sir Henry Bellingham$q$
  WHERE case_ref = 'pcs-cmt-21390';

-- Keith Vaz
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$1st Report - Keith Vaz$q$
  WHERE case_ref = 'pcs-cmt-21356';

-- Geoffrey Cox
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$2nd Report - Mr Geoffrey Cox$q$
  WHERE case_ref = 'pcs-cmt-12406';

-- Geoffrey Cox
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$8th Report - Mr Geoffrey Cox$q$
  WHERE case_ref = 'pcs-cmt-20763';

-- Boris Johnson
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$4th Report - Boris Johnson$q$
  WHERE case_ref = 'pcs-cmt-18382';

-- Ian Paisley
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$3rd Report - Ian Paisley$q$
  WHERE case_ref = 'pcs-cmt-17284';

-- Margaret Hodge
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$1st Report - Dame Margaret Hodge$q$
  WHERE case_ref = 'pcs-cmt-15334';

-- Nigel Adams
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$3rd Report - Nigel Adams$q$
  WHERE case_ref = 'pcs-cmt-14444';

-- Kevin Barron
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$2nd Report - Kevin Barron$q$
  WHERE case_ref = 'pcs-cmt-13595';

-- Karl Turner
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$1st Report - Karl Turner$q$
  WHERE case_ref = 'pcs-cmt-13166';

-- Simon Danczuk
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$7th Report - Simon Danczuk$q$
  WHERE case_ref = 'pcs-cmt-11611';

-- Peter Lilley
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$5th Report - Mr Peter Lilley$q$
  WHERE case_ref = 'pcs-cmt-11353';

-- Peter Bone
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$2nd Report - Mr Peter Bone$q$
  WHERE case_ref = 'pcs-cmt-11014';

-- Patrick Mercer
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$11th Report - Patrick Mercer$q$
  WHERE case_ref = 'pcs-cmt-10634';

-- Malcolm Rifkind and Mr Jack Straw
UPDATE mp_conduct_findings SET outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$1st Report - Sir Malcolm Rifkind and Mr Jack Straw$q$
  WHERE case_ref = 'pcs-cmt-12008';

COMMIT;
