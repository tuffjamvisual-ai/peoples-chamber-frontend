-- 2026-11-13c-twist-batch1-headlines-UNDO: owner approved 13 Nov 2026 (DECISIONS.md), headline rule of 13 Nov 2026. Undo: the 16 headlines back to their old values (7f60n23aw5 has its own UNDO, 2026-11-13b-ar7-headline-UNDO.sql).
-- The 16 rows of "Claude outputs/search-positions/headlines-twist-batch1.md" (all reports in editorials; no briefings). Row 1 of
-- the approval, /editorials/7f60n23aw5, was applied on its own at 11:03:39 GMT (2026-11-13b-ar7-headline); the guard
-- requires it to hold its new headline. Headline only; standfirst, text, addresses and every other column unchanged.
-- Backup: "Claude outputs/twist-batch1-headlines-backup-2026-11-13.json" (the 17 rows whole, before).
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE twist1 (slug text PRIMARY KEY, old text NOT NULL, new text NOT NULL) ON COMMIT DROP;
INSERT INTO twist1 VALUES
  ('ten-worst-performing-councils-england', 'Worst Councils in England: The 10 Biggest Failures Since 2018', 'Worst Councils in England: The 10 Biggest Failures Since 2018. Eight Are Still Under Government Intervention'),
  ('hx7n4qw2mk', 'Operation Hexagon Was Never Reviewed, Greater Manchester Police Says', 'Operation Hexagon Arrested an Oldham Campaigner. Police Never Reviewed Whether It Was Lawful'),
  ('britains-most-disgraced-politicians', 'Britain''s Most Disgraced Politicians: 11 Scandals and What Sank Them', 'Britain''s Most Disgraced Politicians: 11 Scandals. The Cover Up Didn''t Always Sink Them'),
  ('qn4k9mxw7r', 'Cabinet Office Rewrites Consultation Rules Before Publishing Them', 'Cabinet Office Is Rewriting the Consultation Rules. No Plan to Show Parliament'),
  ('q7m3k9xw2r', 'Reform UK Deleted Nigel Farage''s Crypto Bill Without Saying Why', 'Farage Promised a Crypto Bill as Prime Minister. Reform Deleted It and Didn''t Say Why'),
  ('cq8m4xw2hl', 'Heylo Housing: Administrators Take Charge of Nearly 3,500 Homes', 'Heylo Housing Was Warned in 2022. Now Administrators Decide the Future of Nearly 3,500 Homes'),
  ('vb8k4mxn9r', 'Great British Grid Has No First Project or Savings Estimate', 'Great British Grid Has Launched. No First Project and No Savings Estimate'),
  ('kmxo0lenet', 'Under 16 Social Media Ban Likely Means Age Checks for Adults', 'Under 16 Social Media Ban: Adults Will Likely Have to Prove Their Age Too, Ofcom Says'),
  ('em7k4mxw9n', 'Electronic Tagging: 5,043 People on Orders Had No Equipment Assigned', '5,043 People Were Ordered to Be Electronically Tagged. They Had No Equipment Assigned'),
  ('vk4n9mxw7r', 'British Steel Costs Taxpayers £1.3m a Day With No Costed Plan', 'British Steel Costs Taxpayers £1.3m a Day. Still No Costed Plan'),
  ('gw4k9mxn7r', 'Water Nationalisation: Plan Takes No Company Into Public Ownership', 'Ministers Promised Public Control of Water. Not One Company Is Being Taken Into Public Ownership'),
  ('y9aa644amu', 'Luton Council Failed to Collect £4.2m in Developer Contributions', 'Luton Council Left £4.2m of Developer Payments Uncollected. Some Date Back to 2010'),
  ('373qnkdlvr', 'No 10 North: Cabinet Office Still Hasn''t Told Parliament the Running Costs', 'No 10 North Is Open. Parliament Still Hasn''t Been Told What It Costs to Run'),
  ('whr8acs2gf', 'Employer National Insurance Rise: Workers Bear Most of It, OBR Says', 'Employer National Insurance Rise: Workers Will Pay Most of It in Lower Wages, OBR Says'),
  ('px4n9mxw7r', 'Electronic Tagging: ''Toughest Ever'' Regime Risks False Assurance, Inspectors Warn', 'Ministers Call Tagging the ''Toughest Ever''. Inspectors Warn of False Assurance'),
  ('aq4pfusttu', '£45bn Digital Savings Claimed While Government Can''t Yet Publish the Spending', 'Government Claims £45bn in Digital Savings. It Can''t Yet Publish What It Spent');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials WHERE slug = '7f60n23aw5' AND headline = 'Offshore Wind Got £890m More. The Grid It Plugs Into Is Already Jammed';
  IF n <> 1 THEN RAISE EXCEPTION 'TWIST-1 UNDO: 7f60n23aw5 does not hold its new headline'; END IF;
  SELECT count(*) INTO n FROM editorials e JOIN twist1 t ON t.slug = e.slug AND e.headline = t.new;
  IF n <> 16 THEN RAISE EXCEPTION 'TWIST-1 UNDO: % of 16 rows hold the expected headline', n; END IF;
  SELECT count(*) INTO n FROM twist1 t WHERE (SELECT count(*) FROM editorials e WHERE e.headline = t.new) <> 1;
  IF n <> 0 THEN RAISE EXCEPTION 'TWIST-1 UNDO: % expected headlines are not held exactly once', n; END IF;
  UPDATE editorials e SET headline = t.old FROM twist1 t WHERE e.slug = t.slug AND e.headline = t.new;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 16 THEN RAISE EXCEPTION 'TWIST-1 UNDO: % rows changed (expected 16)', n; END IF;
  RAISE NOTICE 'TWIST-1 UNDO: 16 rows changed';
END $$;

:end;
