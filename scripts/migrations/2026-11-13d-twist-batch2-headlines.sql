-- 2026-11-13d-twist-batch2-headlines: owner approved 13 Nov 2026 (DECISIONS.md: headline twist batch 2, 10 reports). Changes 10 headlines (guard: each old value held exactly once, exactly 10 rows change).
-- The 10 rows of "Claude outputs/search-positions/headlines-twist-batch2.md" (all reports in editorials; no briefings).
-- Headline only; standfirst, text, addresses and every other column unchanged. search_vec is generated from the headline.
-- Backup: "Claude outputs/twist-batch2-headlines-backup-2026-11-13.json" (the 10 rows whole, before).
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT.
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE twist2 (slug text PRIMARY KEY, old text NOT NULL, new text NOT NULL) ON COMMIT DROP;
INSERT INTO twist2 VALUES
  ('x6ysojha6n', 'Overseas Student Levy: Eight Most Exposed Universities Already in Deficit', 'Eight Universities Already in the Red. Then Comes the £925 Student Levy'),
  ('fr9k2mxw7q', 'Station Facial Recognition Ran 17 Times With No Confirmed Matches', '17 Facial Recognition Operations at London Stations. Confirmed Matches: Zero'),
  ('onha85twx7', 'MoD Withholds Bulwark Sale Price After £72m Refit', 'Taxpayers Spent £72m Fixing Up HMS Bulwark. Then It Was Sold, and the Price Is Secret'),
  ('kp7m2xqv9d', '23 MPs Voted in Less Than Half the Average Share of Commons Divisions', '23 MPs Vote Less Than Half as Often as Their Colleagues. Is Yours One?'),
  ('pk9v2mrx4t', 'Prison Expansion Programme Wrote Off Almost £24m Without Naming the Projects', 'Almost £24m Written Off on Building Prisons. Which Projects? Nobody Has Said'),
  ('pc4w8nq2tk', 'UK Consumer Confidence Falls 11 Points in October, Sharpest Since Pandemic', 'Shoppers Lose Their Nerve: Confidence Crashes 11 Points, the Worst Since the Pandemic'),
  ('the-revolving-door', 'Revolving Door: Ex Ministers Can Lobby After Two Years. Reform Unanswered', 'Ex Ministers Wait Two Years, Then Lobby Their Old Colleagues. The Fix Is Stuck'),
  ('fq7m2wx9kd', 'Labour Says It Completed 154 Forde Report Reforms. That Is Its Own Assessment', 'Labour Marked Its Own Homework: 154 of 165 Forde Reforms ''Done'''),
  ('tk4n9mxw7r', 'UK Steel Tariffs of 50 Per Cent Can Hit Goods Britain Doesn''t Make', 'Britain''s 50 Per Cent Steel Tariff Can Hit Steel It Doesn''t Even Make'),
  ('pb4k9mxw7r', '500 More Economic Crime Officers Funded With No Target for Money Recovered', '500 More Economic Crime Officers. Target for Money Recovered: None');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials e JOIN twist2 t ON t.slug = e.slug AND e.headline = t.old;
  IF n <> 10 THEN RAISE EXCEPTION 'TWIST-2: % of 10 rows hold the expected headline', n; END IF;
  SELECT count(*) INTO n FROM twist2 t WHERE (SELECT count(*) FROM editorials e WHERE e.headline = t.old) <> 1;
  IF n <> 0 THEN RAISE EXCEPTION 'TWIST-2: % expected headlines are not held exactly once', n; END IF;
  UPDATE editorials e SET headline = t.new FROM twist2 t WHERE e.slug = t.slug AND e.headline = t.old;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 10 THEN RAISE EXCEPTION 'TWIST-2: % rows changed (expected 10)', n; END IF;
  RAISE NOTICE 'TWIST-2: 10 rows changed';
END $$;

:end;
