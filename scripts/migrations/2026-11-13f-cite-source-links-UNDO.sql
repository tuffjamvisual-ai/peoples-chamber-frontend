-- cite-source-links-UNDO: COWORK-TO-T1 ENTRY 5 (13 Nov 2026), T1-CITE item 1. PREPARED AND REHEARSED ONLY: apply waits for the owner's yes.
-- Undo: the six addresses back as they were (the three added addresses removed).
-- Only the "url" of six records in editorials.evidence->recordsReviewed changes; every source's text (wording) is unchanged,
-- and so is every other record, column and report. Each record is found by its report, its position and its exact text,
-- and must hold exactly the expected address before (none, for the three unlinked sources), or the whole change stops.
-- Checked in a real browser on 13 Nov 2026 (Claude outputs/audit/t1-cite/findings.md).
-- Backup: "Claude outputs/cite-source-links-backup-2026-11-13.json" (the three rows' evidence, before).
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT. After a COMMIT: node scripts/revalidate.js --tag editorials.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE c record; cur jsonb; n int; total int := 0;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('x9go2fkz1a', 1, 'Committee on Standards, Mr Calvin Bailey, Fifth Report of Session 2026–27, HC 753', 'https://publications.parliament.uk/pa/cm5902/cmselect/cmstandards/753/report.html', 'https://committees.parliament.uk/publications/55617/'),
    ('x9go2fkz1a', 2, 'Committee on Standards, Influencing Code of Conduct Investigations, Sixth Report of Session 2024–26, HC 1571', 'https://publications.parliament.uk/pa/cm5901/cmselect/cmstandards/1571/report.html', 'https://committees.parliament.uk/publications/50721/'),
    ('q1yfr4lome', 13, 'Hansard, Prime Minister''s Questions, 21 Oct 2026', 'https://hansard.parliament.uk/Commons/2026-10-21/debates/776D8A1E-626D-4996-9C9D-A6EE9276D907/OralAnswersToQuestions', 'https://hansard.parliament.uk/Commons/2026-10-21/debates/75C8A826-17E0-47BD-A4C3-A2DCD01144FB/Engagements'),
    ('alghyhvbbo', 0, 'National Audit Office, The Ministry of Justice''s electronic monitoring contracts, HC 737, 19 November 2013', 'https://www.nao.org.uk/reports/the-ministry-of-justices-electronic-monitoring-contracts/', NULL),
    ('alghyhvbbo', 6, 'Written answer 56230, 11 June 2025 (Ministry of Justice)', 'https://questions-statements.parliament.uk/written-questions/detail/2025-06-02/56230', NULL),
    ('alghyhvbbo', 7, 'Justice and Home Affairs Committee, oral evidence, 16 September 2025, Q54', 'https://committees.parliament.uk/oralevidence/16469/html/', NULL)
  ) AS v(slug, idx, txt, url_before, url_after)
  LOOP
    SELECT evidence->'recordsReviewed'->c.idx INTO cur FROM editorials WHERE slug = c.slug;
    IF cur IS NULL OR cur->>'text' IS DISTINCT FROM c.txt THEN
      RAISE EXCEPTION 'cite-source-links-UNDO: % record % does not hold the expected text', c.slug, c.idx;
    END IF;
    IF cur->>'url' IS DISTINCT FROM c.url_before THEN
      RAISE EXCEPTION 'cite-source-links-UNDO: % record % holds address %, expected %', c.slug, c.idx, cur->>'url', c.url_before;
    END IF;
    UPDATE editorials
       SET evidence = jsonb_set(evidence, ARRAY['recordsReviewed', c.idx::text],
             CASE WHEN c.url_after IS NULL THEN cur - 'url' ELSE cur || jsonb_build_object('url', c.url_after) END)
     WHERE slug = c.slug;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'cite-source-links-UNDO: % rows changed for % record % (expected 1)', n, c.slug, c.idx; END IF;
    total := total + 1;
  END LOOP;
  IF total <> 6 THEN RAISE EXCEPTION 'cite-source-links-UNDO: % records changed (expected 6)', total; END IF;
  RAISE NOTICE 'cite-source-links-UNDO: 6 records in 3 reports changed';
END $$;

:end;
