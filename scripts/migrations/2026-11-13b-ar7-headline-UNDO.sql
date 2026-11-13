-- 2026-11-13b-ar7-headline-UNDO: owner approved 13 Nov 2026 (DECISIONS.md). Undo: the headline back to 'Offshore Wind Auction: £890m Budget Rise Left Out Grid Congestion'.
-- Headline only: standfirst, text, address and every other column unchanged. search_vec is generated from the headline.
-- Guard (RAISE): the row holds exactly the expected headline before the change, and exactly 1 row changes.
-- Backup: "Claude outputs/ar7-headline-backup-2026-11-13.json" (the row whole, before).
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials WHERE slug = '7f60n23aw5' AND headline = 'Offshore Wind Got £890m More. The Grid It Plugs Into Is Already Jammed';
  IF n <> 1 THEN RAISE EXCEPTION 'AR7 headline-UNDO: % rows hold the expected headline (expected 1)', n; END IF;
  UPDATE editorials SET headline = 'Offshore Wind Auction: £890m Budget Rise Left Out Grid Congestion' WHERE slug = '7f60n23aw5' AND headline = 'Offshore Wind Got £890m More. The Grid It Plugs Into Is Already Jammed';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'AR7 headline-UNDO: % rows changed (expected 1)', n; END IF;
  RAISE NOTICE 'AR7 headline-UNDO: 1 row changed';
END $$;

:end;
