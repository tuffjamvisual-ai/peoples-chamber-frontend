-- Audit P10, third pass. A bill's Commons figure must come from a division held while the
-- bill was before Parliament (first to last stage sitting, a day either side). The old
-- matcher matched names only, so e.g. the 2024 Investigatory Powers (Amendment) Act showed
-- the 2016 Investigatory Powers Bill's Second Reading (281-15). This clears any saved
-- division outside its bill's window, or on a bill with no sitting dates to check against.
-- Cleared rows go to the same backup table. scripts/sync-bill-divisions.js (now date-checked,
-- and accepting "Third Reading of the ... Bill" and "(Amendment)" in bill names) refills the
-- right ones.

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE bill_windows ON COMMIT DROP AS
SELECT b.id,
       min((s->>'date')::timestamptz) - interval '1 day' AS win_from,
       max((s->>'date')::timestamptz) + interval '1 day' AS win_to
FROM bill b
CROSS JOIN LATERAL jsonb_array_elements(coalesce(b.stages->'items', '[]'::jsonb)) it
CROSS JOIN LATERAL jsonb_array_elements(coalesce(it->'stageSittings', '[]'::jsonb)) s
WHERE b.commons_division_id IS NOT NULL AND s->>'date' IS NOT NULL
GROUP BY b.id;

INSERT INTO bill_division_cleared_20261016
SELECT b.id, b.parliament_id, b.title, b.commons_division_id, b.commons_division_title, b.commons_vote_date, b.commons_ayes, b.commons_noes, now()
FROM bill b LEFT JOIN bill_windows w ON w.id = b.id
WHERE b.commons_division_id IS NOT NULL
  AND (w.id IS NULL OR b.commons_vote_date IS NULL OR b.commons_vote_date < w.win_from OR b.commons_vote_date > w.win_to);

SELECT c.parliament_id, left(c.title, 50) AS bill, left(c.commons_division_title, 60) AS division, c.commons_vote_date::date AS vote_date,
       w.win_from::date, w.win_to::date
FROM bill_division_cleared_20261016 c LEFT JOIN bill_windows w ON w.id = c.id
WHERE c.cleared_at = now() ORDER BY c.parliament_id;

UPDATE bill b SET commons_division_id = NULL, commons_division_title = NULL, commons_vote_date = NULL,
                  commons_ayes = NULL, commons_noes = NULL
FROM bill_division_cleared_20261016 c
WHERE c.id = b.id AND c.cleared_at = now();

COMMIT;
