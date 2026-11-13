-- 2026-11-13d-twist-batch2-headlines-CHECK: owner approved 13 Nov 2026 (DECISIONS.md: headline twist batch 2, 10 reports). Read only: each row old or new, and how often each value occurs.
-- The 10 rows of "Claude outputs/search-positions/headlines-twist-batch2.md" (all reports in editorials; no briefings).
-- Headline only; standfirst, text, addresses and every other column unchanged. search_vec is generated from the headline.
-- Backup: "Claude outputs/twist-batch2-headlines-backup-2026-11-13.json" (the 10 rows whole, before).
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
WITH twist2 (slug, old, new) AS (VALUES
  ('x6ysojha6n', 'Overseas Student Levy: Eight Most Exposed Universities Already in Deficit', 'Eight Universities Already in the Red. Then Comes the £925 Student Levy'),
  ('fr9k2mxw7q', 'Station Facial Recognition Ran 17 Times With No Confirmed Matches', '17 Facial Recognition Operations at London Stations. Confirmed Matches: Zero'),
  ('onha85twx7', 'MoD Withholds Bulwark Sale Price After £72m Refit', 'Taxpayers Spent £72m Fixing Up HMS Bulwark. Then It Was Sold, and the Price Is Secret'),
  ('kp7m2xqv9d', '23 MPs Voted in Less Than Half the Average Share of Commons Divisions', '23 MPs Vote Less Than Half as Often as Their Colleagues. Is Yours One?'),
  ('pk9v2mrx4t', 'Prison Expansion Programme Wrote Off Almost £24m Without Naming the Projects', 'Almost £24m Written Off on Building Prisons. Which Projects? Nobody Has Said'),
  ('pc4w8nq2tk', 'UK Consumer Confidence Falls 11 Points in October, Sharpest Since Pandemic', 'Shoppers Lose Their Nerve: Confidence Crashes 11 Points, the Worst Since the Pandemic'),
  ('the-revolving-door', 'Revolving Door: Ex Ministers Can Lobby After Two Years. Reform Unanswered', 'Ex Ministers Wait Two Years, Then Lobby Their Old Colleagues. The Fix Is Stuck'),
  ('fq7m2wx9kd', 'Labour Says It Completed 154 Forde Report Reforms. That Is Its Own Assessment', 'Labour Marked Its Own Homework: 154 of 165 Forde Reforms ''Done'''),
  ('tk4n9mxw7r', 'UK Steel Tariffs of 50 Per Cent Can Hit Goods Britain Doesn''t Make', 'Britain''s 50 Per Cent Steel Tariff Can Hit Steel It Doesn''t Even Make'),
  ('pb4k9mxw7r', '500 More Economic Crime Officers Funded With No Target for Money Recovered', '500 More Economic Crime Officers. Target for Money Recovered: None'))
SELECT t.slug, CASE WHEN e.headline = t.new THEN 'new' WHEN e.headline = t.old THEN 'old' ELSE 'UNEXPECTED' END AS state,
  (SELECT count(*) FROM editorials x WHERE x.headline = t.old) AS old_held, (SELECT count(*) FROM editorials x WHERE x.headline = t.new) AS new_held
FROM twist2 t JOIN editorials e ON e.slug = t.slug ORDER BY 1;
ROLLBACK;
