-- UNDO for 2026-11-11a: puts back the headline and the source entry exactly as in
-- "Claude outputs/t1-a2-editorials-backup-2026-11-11.json".
-- Run: psql "$DATABASE_URL" -v end=COMMIT -f scripts/migrations/2026-11-11a-t1a2-content-fixes-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
UPDATE editorials SET headline = 'Burnham Declared No Interest Before £31m Loans, Minutes Show'
  WHERE slug = 'q1yfr4lome' AND headline = 'Minutes Record No Burnham Declaration Before £31m Loans';
UPDATE editorials e SET evidence = jsonb_set(e.evidence, '{recordsReviewed}', (
    SELECT jsonb_agg(CASE WHEN r->>'url' = 'https://committees.parliament.uk/publications/55461/documents/307819/default/'
      THEN r || jsonb_build_object('url', 'https://committees.parliament.uk/publications/55461/',
                                   'text', 'Letter from Sir Stephen Timms MP to the Work and Pensions Committee, 14 October 2026, with key data annex (published 21 October 2026)')
      ELSE r END ORDER BY i)
    FROM jsonb_array_elements(e.evidence->'recordsReviewed') WITH ORDINALITY AS t(r, i)))
  WHERE e.slug = 'cgmgxzwyek';
:end;
