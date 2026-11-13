-- 2026-11-13f-cite-source-links-CHECK: read only. Each of the six records: its report, position, text and address now.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT v.slug, v.idx, left(e.evidence->'recordsReviewed'->v.idx->>'text', 50) AS text_start, e.evidence->'recordsReviewed'->v.idx->>'url' AS url,
       jsonb_array_length(e.evidence->'recordsReviewed') AS records
FROM (VALUES
  ('x9go2fkz1a', 1),
  ('x9go2fkz1a', 2),
  ('q1yfr4lome', 13),
  ('alghyhvbbo', 0),
  ('alghyhvbbo', 6),
  ('alghyhvbbo', 7)
) AS v(slug, idx) JOIN editorials e ON e.slug = v.slug ORDER BY v.slug, v.idx;
ROLLBACK;
