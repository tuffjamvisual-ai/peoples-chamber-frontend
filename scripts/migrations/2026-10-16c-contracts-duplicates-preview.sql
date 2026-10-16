-- READ ONLY. Counts duplicate rows in government_contracts before any clean-up.
-- The old workflow script (scripts/sync-government-contracts.js, removed from the workflow on
-- 15 Oct 2026) inserted rows with no OCDS identifiers on every run, so the same contract
-- appears many times (e.g. Ecotricity: 3 real contracts shown as 8).

\set ON_ERROR_STOP on

SELECT
  (SELECT count(*) FROM government_contracts) AS total_rows,
  (SELECT count(*) FROM government_contracts WHERE ocid IS NULL) AS rows_without_ocid,
  -- rows without identifiers that have an identified twin (same supplier, title, date, buyer)
  (SELECT count(*) FROM government_contracts g
     WHERE g.ocid IS NULL AND EXISTS (
       SELECT 1 FROM government_contracts t
        WHERE t.ocid IS NOT NULL AND t.supplier IS NOT DISTINCT FROM g.supplier
          AND t.title IS NOT DISTINCT FROM g.title AND t.awarded_date IS NOT DISTINCT FROM g.awarded_date
          AND t.dept_slug IS NOT DISTINCT FROM g.dept_slug)) AS no_ocid_with_identified_twin,
  -- rows without identifiers, no identified twin, but repeating another such row (all but the first)
  (SELECT count(*) FROM (
     SELECT row_number() OVER (PARTITION BY supplier, title, awarded_date, dept_slug ORDER BY id) AS rn
       FROM government_contracts g
      WHERE g.ocid IS NULL AND NOT EXISTS (
        SELECT 1 FROM government_contracts t
         WHERE t.ocid IS NOT NULL AND t.supplier IS NOT DISTINCT FROM g.supplier
           AND t.title IS NOT DISTINCT FROM g.title AND t.awarded_date IS NOT DISTINCT FROM g.awarded_date
           AND t.dept_slug IS NOT DISTINCT FROM g.dept_slug)) x WHERE rn > 1) AS no_ocid_repeats,
  (SELECT min(updated_at)::date FROM government_contracts WHERE ocid IS NULL) AS first_no_ocid,
  (SELECT max(updated_at)::date FROM government_contracts WHERE ocid IS NULL) AS last_no_ocid;
