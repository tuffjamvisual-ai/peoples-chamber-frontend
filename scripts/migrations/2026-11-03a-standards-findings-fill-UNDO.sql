-- UNDO for 2026-11-03a-standards-findings-fill.sql: puts back the values backed up before it ran (3 Nov 2026).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['pcs-cmt-55293', 'pcs-cmt-54173', 'pcs-cmt-54117', 'pcs-cmt-50720', 'pcs-cmt-50709', 'pcs-cmt-47688', 'pcs-cmt-45874', 'pcs-cmt-42581', 'pcs-cmt-42367', 'pcs-cmt-41434', 'pcs-cmt-41272', 'pcs-cmt-40781', 'pcs-cmt-40272', 'pcs-cmt-40177', 'pcs-cmt-34645', 'pcs-cmt-33922', 'pcs-cmt-31469', 'pcs-cmt-8457', 'pcs-cmt-7644', 'pcs-cmt-903', 'pcs-cmt-851', 'pcs-cmt-784', 'pcs-cmt-410', 'pcs-cmt-19372', 'pcs-cmt-10767'] LOOP
    SELECT count(*) INTO n FROM mp_conduct_findings WHERE case_ref = r;
    IF n <> 1 THEN RAISE EXCEPTION 'case_ref % found % times (expected exactly 1)', r, n; END IF;
  END LOOP;
END $$;

UPDATE mp_conduct_findings SET member_id = 4474, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$3rd Report - Interim Report: Kevin Hollinrake$q$
  WHERE case_ref = 'pcs-cmt-55293';
UPDATE mp_conduct_findings SET member_id = 1506, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$2nd Report – Andrew Gwynne$q$
  WHERE case_ref = 'pcs-cmt-54173';
UPDATE mp_conduct_findings SET member_id = 5163, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$1st Report - Dr Peter Prinsley$q$
  WHERE case_ref = 'pcs-cmt-54117';
UPDATE mp_conduct_findings SET member_id = 5325, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$5th Report - Charlie Maynard$q$
  WHERE case_ref = 'pcs-cmt-50720';
UPDATE mp_conduct_findings SET member_id = 5197, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$4th Report - Dr Neil Shastri-Hurst$q$
  WHERE case_ref = 'pcs-cmt-50709';
UPDATE mp_conduct_findings SET member_id = 4133, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$2nd report - Andrew Bridgen$q$
  WHERE case_ref = 'pcs-cmt-47688';
UPDATE mp_conduct_findings SET member_id = 3919, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$First Report - Bob Stewart$q$
  WHERE case_ref = 'pcs-cmt-45874';
UPDATE mp_conduct_findings SET member_id = 4793, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Second Report - Scott Benton$q$
  WHERE case_ref = 'pcs-cmt-42581';
UPDATE mp_conduct_findings SET member_id = 4735, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$First Report - Stephen Flynn$q$
  WHERE case_ref = 'pcs-cmt-42367';
UPDATE mp_conduct_findings SET member_id = 4483, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Fourteenth Report - Rishi Sunak$q$
  WHERE case_ref = 'pcs-cmt-41434';
UPDATE mp_conduct_findings SET member_id = 4446, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Thirteenth Report - Mr Marcus Fysh$q$
  WHERE case_ref = 'pcs-cmt-41272';
UPDATE mp_conduct_findings SET member_id = 4075, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Twelfth Report - Christopher Pincher$q$
  WHERE case_ref = 'pcs-cmt-40781';
UPDATE mp_conduct_findings SET member_id = 4370, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Eleventh Report - Jess Phillips$q$
  WHERE case_ref = 'pcs-cmt-40272';
UPDATE mp_conduct_findings SET member_id = 4070, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Tenth Report - Matt Hancock$q$
  WHERE case_ref = 'pcs-cmt-40177';
UPDATE mp_conduct_findings SET member_id = 4386, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Ninth Report - Margaret Ferrier$q$
  WHERE case_ref = 'pcs-cmt-34645';
UPDATE mp_conduct_findings SET member_id = 4849, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Sixth Report - Alex Davies-Jones$q$
  WHERE case_ref = 'pcs-cmt-33922';
UPDATE mp_conduct_findings SET member_id = 4133, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Fourth Report - Andrew Bridgen$q$
  WHERE case_ref = 'pcs-cmt-31469';
UPDATE mp_conduct_findings SET member_id = 1566, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Fifth Report - Daniel Kawczynski$q$
  WHERE case_ref = 'pcs-cmt-8457';
UPDATE mp_conduct_findings SET member_id = 274, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Third Report - Mr Owen Paterson$q$
  WHERE case_ref = 'pcs-cmt-7644';
UPDATE mp_conduct_findings SET member_id = 3922, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Fourth Report - Conor Burns$q$
  WHERE case_ref = 'pcs-cmt-903';
UPDATE mp_conduct_findings SET member_id = 1526, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Third Report - Greg Hands$q$
  WHERE case_ref = 'pcs-cmt-851';
UPDATE mp_conduct_findings SET member_id = 161, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$Second Report - Stephen Pound$q$
  WHERE case_ref = 'pcs-cmt-784';
UPDATE mp_conduct_findings SET member_id = 4515, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$First Report - Kate Osamor$q$
  WHERE case_ref = 'pcs-cmt-410';
UPDATE mp_conduct_findings SET member_id = NULL, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$6th Report - The Committee’s role in ICGS appeals$q$
  WHERE case_ref = 'pcs-cmt-19372';
UPDATE mp_conduct_findings SET member_id = NULL, outcome = NULL, rule_breached = NULL, penalty = NULL,
  summary = $q$1st Report - Respect Policy$q$
  WHERE case_ref = 'pcs-cmt-10767';

COMMIT;
