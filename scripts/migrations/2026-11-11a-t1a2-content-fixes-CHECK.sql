-- Read-only check after 2026-11-11a (or its UNDO): the headline and the source as they now stand.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT slug, headline FROM editorials WHERE slug = 'q1yfr4lome';
SELECT r->>'url' AS url, r->>'text' AS label FROM editorials e, jsonb_array_elements(e.evidence->'recordsReviewed') r
  WHERE e.slug = 'cgmgxzwyek' AND r->>'url' LIKE '%publications/55461/%';
SELECT count(*) AS reports_with_old_404_address FROM editorials WHERE evidence::text LIKE '%publications/55461/"%';
ROLLBACK;
