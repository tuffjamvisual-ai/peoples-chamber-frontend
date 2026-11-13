-- 2026-11-13e-heylo-headline: owner approved 13 Nov 2026 (option a, after the A2 time word stop on the T1-PUB-ASY push). /editorials/cq8m4xw2hl headline: the time word 'Now' removed.
-- Headline only: standfirst, text, address and every other column unchanged. search_vec is generated from the headline.
-- Guard (RAISE): the row holds exactly the expected headline before the change, and exactly 1 row changes.
-- Backup: "Claude outputs/heylo-headline-backup-2026-11-13.json" (the row whole, before).
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials WHERE slug = 'cq8m4xw2hl' AND headline = 'Heylo Housing Was Warned in 2022. Now Administrators Decide the Future of Nearly 3,500 Homes';
  IF n <> 1 THEN RAISE EXCEPTION 'Heylo headline: % rows hold the expected headline (expected 1)', n; END IF;
  UPDATE editorials SET headline = 'Heylo Housing Was Warned in 2022. Administrators Decide the Future of Nearly 3,500 Homes' WHERE slug = 'cq8m4xw2hl' AND headline = 'Heylo Housing Was Warned in 2022. Now Administrators Decide the Future of Nearly 3,500 Homes';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Heylo headline: % rows changed (expected 1)', n; END IF;
  RAISE NOTICE 'Heylo headline: 1 row changed';
END $$;

:end;
