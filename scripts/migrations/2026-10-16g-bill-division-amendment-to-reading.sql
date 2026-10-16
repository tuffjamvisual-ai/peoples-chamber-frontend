-- Audit P10, second pass: 2026-10-16f kept divisions whose title mentions a reading, which
-- let through amendments TO a reading (e.g. "Steel Industry (Nationalisation) Bill: Reasoned
-- Amendment to Second Reading", 68-242, on a bill that passed). A bill's figure must be the
-- reading itself: the title ends with "Second Reading" or "Third Reading" and is not an
-- amendment, motion or instruction. Cleared rows are added to the same backup table.
--
-- UNDO: as 2026-10-16f, restricting to rows with cleared_at from this run.

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO bill_division_cleared_20261016
SELECT id, parliament_id, title, commons_division_id, commons_division_title, commons_vote_date, commons_ayes, commons_noes, now()
FROM bill
WHERE commons_division_id IS NOT NULL
  AND ( commons_division_title !~* '(second|third) reading[[:space:].]*$'
     OR commons_division_title ~* '(amendment|motion|instruction|resolution|programme|revival)' );

SELECT parliament_id, left(title, 50) AS bill, left(commons_division_title, 80) AS division, commons_ayes, commons_noes
FROM bill_division_cleared_20261016 WHERE cleared_at > now() - interval '5 minutes' ORDER BY parliament_id;

UPDATE bill b SET commons_division_id = NULL, commons_division_title = NULL, commons_vote_date = NULL,
                  commons_ayes = NULL, commons_noes = NULL
FROM bill_division_cleared_20261016 c
WHERE c.id = b.id AND c.cleared_at > now() - interval '5 minutes';

COMMIT;
