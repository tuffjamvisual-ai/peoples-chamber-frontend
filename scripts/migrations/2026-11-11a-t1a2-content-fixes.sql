-- 2026-11-11a: T1-A2 content fixes from T1-A1 (owner approved, 10 Nov 2026). Exact replacements, nothing else changes:
--   (1) report q1yfr4lome headline "Burnham Declared No Interest Before £31m Loans, Minutes Show" becomes
--       "Minutes Record No Burnham Declaration Before £31m Loans" (address and body unchanged; the homepage card follows).
--   (2) report cgmgxzwyek: the source https://committees.parliament.uk/publications/55461/ (HTTP 404, Cowork) becomes
--       https://committees.parliament.uk/publications/55461/documents/307819/default/ (the PDF), with the label
--       "Letter from Sir Stephen Timms MP to the Work and Pensions Committee, 14 October 2026, with key data annex, pages 2 and 5 (annex)".
--       It is the one entry with that address in evidence.recordsReviewed; its other fields and the other entries stay.
-- Guard (RAISE): each old value is present exactly once before the change. No check query runs inside the write
-- (production rules, 25 Oct 2026); the after check is read only: 2026-11-11a-t1a2-content-fixes-CHECK.sql.
-- Backup: "Claude outputs/t1-a2-editorials-backup-2026-11-11.json" (both rows' headline and evidence before).
-- Undo: 2026-11-11a-t1a2-content-fixes-UNDO.sql. Rehearse with REHEARSE=1 (ends in ROLLBACK).
-- Run: psql "$DATABASE_URL" -v end=COMMIT -f scripts/migrations/2026-11-11a-t1a2-content-fixes.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials WHERE slug = 'q1yfr4lome' AND headline = 'Burnham Declared No Interest Before £31m Loans, Minutes Show';
  IF n <> 1 THEN RAISE EXCEPTION 'q1yfr4lome old headline found % times (expected 1)', n; END IF;
  SELECT count(*) INTO n FROM editorials e, jsonb_array_elements(e.evidence->'recordsReviewed') r
    WHERE e.slug = 'cgmgxzwyek' AND r->>'url' = 'https://committees.parliament.uk/publications/55461/';
  IF n <> 1 THEN RAISE EXCEPTION 'cgmgxzwyek old source found % times (expected 1)', n; END IF;
END $$;

UPDATE editorials SET headline = 'Minutes Record No Burnham Declaration Before £31m Loans'
  WHERE slug = 'q1yfr4lome' AND headline = 'Burnham Declared No Interest Before £31m Loans, Minutes Show';

UPDATE editorials e SET evidence = jsonb_set(e.evidence, '{recordsReviewed}', (
    SELECT jsonb_agg(CASE WHEN r->>'url' = 'https://committees.parliament.uk/publications/55461/'
      THEN r || jsonb_build_object('url', 'https://committees.parliament.uk/publications/55461/documents/307819/default/',
                                   'text', 'Letter from Sir Stephen Timms MP to the Work and Pensions Committee, 14 October 2026, with key data annex, pages 2 and 5 (annex)')
      ELSE r END ORDER BY i)
    FROM jsonb_array_elements(e.evidence->'recordsReviewed') WITH ORDINALITY AS t(r, i)))
  WHERE e.slug = 'cgmgxzwyek';


:end;
