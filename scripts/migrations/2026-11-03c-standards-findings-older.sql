-- Standards findings, the 15 older Committee on Standards reports (owner's brief, 3 Nov 2026): outcome, rule_breached,
-- penalty and a plain summary from "Claude outputs/standards-findings-older.csv" (drafted with ChatGPT, spot checked by
-- Cowork). Matched by case_ref, each exactly once. Outcome: breach -> upheld, partial -> partially_upheld,
-- no breach -> not_upheld. member_id is not touched: Mercer (pcs-cmt-10634) is already 1435, and the joint
-- Rifkind and Straw report (pcs-cmt-12008) keeps member_id NULL. Undo: 2026-11-03c-standards-findings-older-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03c-standards-findings-older.sql
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
UPDATE mp_conduct_findings SET outcome = $q$partially_upheld$q$, rule_breached = $q$Code paragraphs 14 and 20$q$, penalty = $q$written apology to the House; register corrections shown in bold italic for 12 months$q$,
  summary = $q$Henry Bellingham registered company interests after the deadline and did not complete the requested corrections promptly; an allegation about a diplomatic meeting was not upheld.$q$
  WHERE case_ref = 'pcs-cmt-21390';

-- Keith Vaz
UPDATE mp_conduct_findings SET outcome = $q$partially_upheld$q$, rule_breached = $q$paragraph 16$q$, penalty = $q$suspension for 6 months; no former Member's pass$q$,
  summary = $q$Keith Vaz offered to buy cocaine for others and did not cooperate fully with the inquiry; an allegation under paragraph 10 was not upheld.$q$
  WHERE case_ref = 'pcs-cmt-21356';

-- Geoffrey Cox
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 13$q$, penalty = $q$apology to the House$q$,
  summary = $q$Geoffrey Cox registered eleven payments after the required deadline.$q$
  WHERE case_ref = 'pcs-cmt-12406';

-- Geoffrey Cox
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 14$q$, penalty = $q$written apology to the House; register entry italicised for 12 months$q$,
  summary = $q$Geoffrey Cox registered rental income after the deadline and gave an incorrect registration date.$q$
  WHERE case_ref = 'pcs-cmt-20763';

-- Boris Johnson
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 14$q$, penalty = $q$apology to the House on a point of order$q$,
  summary = $q$Boris Johnson registered remuneration after the deadline on nine occasions.$q$
  WHERE case_ref = 'pcs-cmt-18382';

-- Ian Paisley
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 15 and paid advocacy rules$q$, penalty = $q$suspension for 30 sitting days$q$,
  summary = $q$Ian Paisley did not register two visits to Sri Lanka paid for by its government and wrote to the Prime Minister about Sri Lanka without declaring the benefits.$q$
  WHERE case_ref = 'pcs-cmt-17284';

-- Margaret Hodge
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraphs 9 and 15$q$, penalty = $q$apology to the House on a point of order$q$,
  summary = $q$Margaret Hodge used parliamentary facilities for work commissioned by the Greater London Authority.$q$
  WHERE case_ref = 'pcs-cmt-15334';

-- Nigel Adams
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 13$q$, penalty = $q$apology to the House on a point of order; register entry italicised$q$,
  summary = $q$Nigel Adams did not register continuing company interests or declare interests during select committee proceedings.$q$
  WHERE case_ref = 'pcs-cmt-14444';

-- Kevin Barron
UPDATE mp_conduct_findings SET outcome = $q$partially_upheld$q$, rule_breached = $q$paragraph 15$q$, penalty = $q$no further action$q$,
  summary = $q$Kevin Barron accepted a payment linked to the use of House facilities by directing it to a charity; other allegations were not upheld.$q$
  WHERE case_ref = 'pcs-cmt-13595';

-- Karl Turner
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 13$q$, penalty = $q$written apology to the House$q$,
  summary = $q$Karl Turner did not declare his wife's employment when speaking in debates and tabling questions.$q$
  WHERE case_ref = 'pcs-cmt-13166';

-- Simon Danczuk
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 13$q$, penalty = $q$no additional action$q$,
  summary = $q$Simon Danczuk registered payments for a book after the 28 day deadline.$q$
  WHERE case_ref = 'pcs-cmt-11611';

-- Peter Lilley
UPDATE mp_conduct_findings SET outcome = $q$not_upheld$q$, rule_breached = $q$Guide to the Rules paragraph 74 (considered)$q$, penalty = $q$no further action$q$,
  summary = $q$Peter Lilley was investigated for not declaring a company directorship during two debates; the Committee found the rule was not clear at the time.$q$
  WHERE case_ref = 'pcs-cmt-11353';

-- Peter Bone
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$Green Book paragraph 3.9.1$q$, penalty = $q$no further action$q$,
  summary = $q$Peter Bone claimed overnight costs for a property outside the permitted areas on official advice given when he was a new Member.$q$
  WHERE case_ref = 'pcs-cmt-11014';

-- Patrick Mercer
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraphs 11 and 13 and 16$q$, penalty = $q$suspension for 6 months recommended; not imposed after his resignation$q$,
  summary = $q$Patrick Mercer received consultancy payments and used parliamentary proceedings to advance the clients' interests.$q$
  WHERE case_ref = 'pcs-cmt-10634';

-- Malcolm Rifkind and Mr Jack Straw
UPDATE mp_conduct_findings SET outcome = $q$not_upheld$q$, rule_breached = $q$paragraphs 11 and 13 (considered)$q$, penalty = $q$no further action$q$,
  summary = $q$Malcolm Rifkind and Jack Straw were investigated over offers to provide access and advice to paying clients; both were cleared.$q$
  WHERE case_ref = 'pcs-cmt-12008';

COMMIT;
