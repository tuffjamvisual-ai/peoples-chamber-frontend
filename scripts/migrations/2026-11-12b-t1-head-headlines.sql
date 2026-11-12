-- 2026-11-12b-t1-head-headlines: T1-HEAD (owner decision and approval 12 Nov 2026: one headline per report, on the page and in Google). The
-- owner approved headline rewrites in "Claude outputs/search-positions/headlines-approved-2026-11-12.md" (124 reports, rows 1
-- to 124; rows 1 to 15 are accuracy fixes). Only the headline changes: 120 rows in editorials and 4 daily briefings in
-- briefings (rows 121 to 124); slugs, addresses, bodies and every other column unchanged. search_vec is a generated column.
-- Guard (RAISE): every row's headline is exactly the old value before the change, and exactly 120 and 4 rows change.
-- Backup: "Claude outputs/t1-head-headlines-backup-2026-11-12.json" (the 124 rows whole, before).
-- Undo: 2026-11-12b-t1-head-headlines-UNDO.sql. Check (read only, after): 2026-11-12b-t1-head-headlines-CHECK.sql.
-- Rehearse: psql "$DATABASE_URL" -v end=ROLLBACK -f scripts/migrations/2026-11-12b-t1-head-headlines.sql
-- Run:      psql "$DATABASE_URL" -v end=COMMIT   -f scripts/migrations/2026-11-12b-t1-head-headlines.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE t1_head_ed (slug text PRIMARY KEY, old text NOT NULL, new text NOT NULL) ON COMMIT DROP;
INSERT INTO t1_head_ed VALUES
  ('0w7zrd55z9', 'Every UK council ''bankruptcy'' notice since 2018', 'Council ''Bankruptcy'' Notices in England and Wales: Every Section 114 Since 2018'),
  ('cgmgxzwyek', 'DWP Must Go 16 Times Faster to Fix Carer Debt Errors', 'Carer''s Allowance Overpayments: 230,900 Cases Could Wait 40 Years at Current Pace'),
  ('alghyhvbbo', '£505m Tag Deal for Firms Behind Fraud Scandal', 'Serco and G4S Back on Tagging Contracts Worth Up to £505m After Fraud Settlements'),
  ('t2p0bxutip', '£49m Sat Frozen for a Year While Whitehall Haggled', 'British Council Couldn''t Use £49m From Madrid School Sale for a Year, MPs Say'),
  ('0m3n1skwru', 'Plane Grounded After £46m Upgrade. UKRI: Process "Robust"', 'UKRI Spent £46m Upgrading Its Research Plane, Then Grounded It'),
  ('ou8npnpzzm', 'Disabled Workers Wait 125 Days. DWP Won''t Publish Monthly', 'Access to Work Waits Averaged 125 Days as DWP Sticks to Yearly Figures'),
  ('qahx28g34f', 'Sizewell C: Consumers Risk £21.8bn, Investors Just £30m', 'Sizewell C Overrun: Consumers Could Pay £21.8bn More, Investors £30m'),
  ('y9aa644amu', 'Luton Council Took Five Years to Chase £4m Developer Debt', 'Luton Council Failed to Collect £4.2m in Developer Contributions'),
  ('mxredcgexu', 'DfE Won''t Publish the SEND Plans Behind £5bn Deficit Relief', 'DfE Won''t Commit to Publishing the SEND Plans Behind £5bn Deficit Relief'),
  ('2qlh4c2zii', 'DWP Algorithm Flags Foreign Claimants Three Times as Often', 'DWP Universal Credit Fraud Tool Flags Foreign Claimants 3.35 Times as Often'),
  ('hn4k9mxw7r', 'Housing Ministry Referred to Prosecutors Over Grenfell', 'Grenfell: Police Refer Housing Ministry File to Prosecutors'),
  ('fr9k2mxw7q', 'Station Face Scans Ran 17 Times and Caught No One', 'Station Facial Recognition Ran 17 Times With No Confirmed Matches'),
  ('hx4m2kq9w7', 'Drug Firms Raised an NHS Tablet Price From 70p to £88', 'NHS Hydrocortisone Price Rose From 70p to £88 a Pack'),
  ('ag7k4mxq9w', 'Six Threat Cases Should Have Brought Election Bans. None Did', 'Six Threat Cases Should Have Brought Election Bans, Speaker''s Conference Says. None Did'),
  ('obd5xiiexy', 'Police DVLA Access Rules Don''t Ban Facial Recognition', 'Draft Police DVLA Access Rules Don''t Ban Facial Recognition'),
  ('ten-worst-performing-councils-england', 'England''s 10 Worst Council Failures Since 2018', 'Worst Councils in England: The 10 Biggest Failures Since 2018'),
  ('britains-most-disgraced-politicians', 'The Cover Up Didn''t Always Sink Them: 11 Political Scandals', 'Britain''s Most Disgraced Politicians: 11 Scandals and What Sank Them'),
  ('qn4k9mxw7r', 'Ministers Rewrite Consultation Rules Before Publishing Them', 'Cabinet Office Rewrites Consultation Rules Before Publishing Them'),
  ('j6axxkn4kr', 'MoD Gave Palantir £240m Without a Contest. Again', 'Palantir Won £240.6m MoD Contract Without Competition. Again'),
  ('cq8m4xw2hl', 'Administrators Take Charge of Nearly 3,500 Heylo Homes', 'Heylo Housing: Administrators Take Charge of Nearly 3,500 Homes'),
  ('kxlkhj1jgj', 'Ten Westminster Scandals. Three Ended in a Rule Breach', 'Westminster Scandals: 10 Cases, Only 3 Ended in a Rule Breach'),
  ('cq4r8vn2mp', 'Dorset Has England''s Highest Band D Council Tax: £2,765', 'Highest Council Tax in England: Dorset''s Band D Average Is £2,765'),
  ('gx4k9mxw7r', 'Train Leasing Firms Paid £275m as Ownership Is Weighed', 'Train Leasing Firms Paid Out £275m in Dividends in a Year'),
  ('kmxo0lenet', 'Teen Social Media Ban Likely Means Age Checks for Adults', 'Under 16 Social Media Ban Likely Means Age Checks for Adults'),
  ('vk4n9mxw7r', 'British Steel Costs £1.3m a Day Without a Costed Plan', 'British Steel Costs Taxpayers £1.3m a Day With No Costed Plan'),
  ('gw4k9mxn7r', 'Water "Public Control" Plan Takes No Company Into Ownership', 'Water Nationalisation: Plan Takes No Company Into Public Ownership'),
  ('sayvn6kccc', 'DWP Uses AI to Read Claimants'' Post. Won''t Say What It Cost', 'DWP AI Reads 25,000 Claimant Letters a Day. Won''t Say What It Cost'),
  ('7f60n23aw5', 'Grid Already Under Strain. Then Ministers Nearly Doubled Wind Budget', 'Offshore Wind Auction: £890m Budget Rise Left Out Grid Congestion'),
  ('er5t8wq3mz', '1.3 Million NHS Worklist Entries Vanish in Six Months', 'NHS Referral System Removed 1.3m Worklist Entries in Six Months'),
  ('wd8wio8qm9', 'MOD Took 14 Months to Tell Pensioners of £5.1m Error', 'Armed Forces Pensions: MOD Took 14 Months to Tell of £5.1m Error'),
  ('x9go2fkz1a', 'Standards Committee Overrules Commissioner on McMurdock Post', 'James McMurdock Cleared of Code Breach as Committee Overrules Commissioner'),
  ('q1yfr4lome', 'Minutes Record No Burnham Declaration Before £31m Loans', 'Andy Burnham: GMCA Minutes Record No Declaration Before £31.2m Mansour Loans'),
  ('bmcgmghjcz', '£20,000 of Burnham''s Declared Gifts No Longer Published', 'Andy Burnham''s £20,000 of Declared Gifts and Hospitality Vanish From GMCA Registers'),
  ('wkw5rm5eg5', 'Gas Field Approved, Help for Oil Workers Delayed to 2027', 'Jackdaw Gas Field Approved as Oil Worker Jobs Help Slips to 2027'),
  ('0qcn1ofw7f', 'Bedford Signed Station Deal Knowing It Could Be Scrapped', 'Bedford Signed Wixams Station Contract Knowing It Could Be Scrapped'),
  ('9kzu72dksk', 'Defra Boss on Food Emergency Plan: "The Short Answer Is No"', 'Defra Has No Finished Food Emergency Plan. Its Boss: "The Short Answer Is No"'),
  ('x6ysojha6n', 'Universities Most Exposed to Student Levy Already in Deficit', 'Overseas Student Levy: Eight Most Exposed Universities Already in Deficit'),
  ('mhcveuxdyi', 'Hillsborough Law Lets Spy Chiefs'' Disclosure Duty Lapse', 'Hillsborough Law: Spy Chiefs'' Duty to Pass On Evidence Can Lapse'),
  ('upk2tz9zw9', 'Council Paid £951k Twice for Same Care. Still No Report', 'Tower Hamlets Paid £951k Twice for Same Care. Councillors Still Have No Report'),
  ('mr6k2vq9xt', 'Three Defence Secretaries in Six Weeks', 'UK Had Three Defence Secretaries in Six Weeks'),
  ('pc4w8nq2tk', 'Consumer Confidence Falls 11 Points, Sharpest Since Pandemic', 'UK Consumer Confidence Falls 11 Points in October, Sharpest Since Pandemic'),
  ('hz7w3nq5rk', 'New Help to Buy Scheme Has No Published Cost', 'New Help to Buy Equity Loan Scheme Has No Published Cost'),
  ('cp4w8xq2rn', 'Capture Victims Must Clear Their Names Before Compensation', 'Post Office Capture Scandal: Convicted Postmasters Must Clear Names Before Compensation'),
  ('fq7m2wx9kd', 'Labour''s 154 Completed Forde Reforms Are Its Own Assessment', 'Labour Says It Completed 154 Forde Report Reforms. That Is Its Own Assessment'),
  ('2k888r5iqy', 'Taxpayers May Pay Twice for PFI Repairs at Handback', 'PFI Handback: Taxpayers Could Pay Twice for Unfinished Repairs'),
  ('power-for-sale-20-politicians-who-cashed-in', 'Nineteen Politicians Who Turned Office Into Private Income', '19 UK Politicians Who Turned Public Office Into Private Income'),
  ('pw7k3nq9hd', 'Pamela Hindley Was Sent Home Before Her House Was Made Safe', 'Pamela Hindley Discharged From Hospital Before Her Cornwall Home Was Made Safe'),
  ('hm4q9xk2ta', 'Home Office Won’t Publish How Many Asylum HMOs It Uses', 'Home Office Won''t Publish How Many Shared Houses (HMOs) It Uses for Asylum'),
  ('in6v2kq8wr', 'Insulin Support Failures Linked to Patient Deaths', 'Insulin Support Failures Linked to NHS Patient Deaths, Investigators Find'),
  ('q7m3k9xw2r', 'Reform Deleted Farage’s Crypto Bill Without Saying Why', 'Reform UK Deleted Nigel Farage''s Crypto Bill Without Saying Why'),
  ('x4g3y1z5d8', 'Supported Housing Licensing Pushed Into 2027, Three Years On', 'Supported Housing Licensing: Draft Rules Push Start to 2027, Three Years On'),
  ('373qnkdlvr', 'No 10 North''s Running Costs Still Not Given to Parliament', 'No 10 North: Cabinet Office Still Hasn''t Told Parliament the Running Costs'),
  ('aq4pfusttu', 'No Digital Spending Figures, but a £45bn Savings Claim', '£45bn Digital Savings Claimed While Government Can''t Yet Publish the Spending'),
  ('fxdep4e6wh', 'Kirklees Lacked Current Records for Most of Its Homes', 'Kirklees Council Had Current Records for Only About a Quarter of Its 21,286 Homes'),
  ('ai755882dw', 'Police Could Breach AI Rules Unknowingly, Watchdog Warns', 'Police Officers Could Breach AI Rules Without Knowing, Watchdog Warns'),
  ('bc4n8mxw2t', 'BBC Fee for Streaming Only Homes Has No Published Costings', 'BBC Licence Fee for Streaming Only Homes Has No Published Costings'),
  ('nq7x4km2wp', 'Regulator''s £54.7bn ''New Borrowing'' Is Partly Refinancing', 'Social Housing Regulator''s £54.7bn ''New Borrowing'' Is Partly Refinancing'),
  ('px4n9mxw7r', 'Inspectors: ''Toughest Ever'' Tagging Risks False Assurance', 'Electronic Tagging: ''Toughest Ever'' Regime Risks False Assurance, Inspectors Warn'),
  ('dw4k9mxw7r', 'Waste Crime Tracking Won''t Cover Carriers Until October 2027', 'Digital Waste Tracking Won''t Cover Carriers Until October 2027'),
  ('mk4n9mxw7r', '£600m Energy Subsidy Opens Before Old Scheme Is Evaluated', '£600m a Year Industry Energy Subsidy Opens With No Published Evaluation of Earlier Support'),
  ('ia4k9mxw7r', '£209m Crime Law Costing Published Five Months After Passage', 'Crime and Policing Act Costed at £209m, More Than Double, After It Became Law'),
  ('kv4n9mxw7r', 'Triple Lock Saving Planned Before Care Service Is Costed', '£15bn Triple Lock Saving Planned Before National Care Service Is Costed'),
  ('tn4k7mxw9r', 'Cornwall Lithium Battery Claim Differs From Earlier Figures', 'Cornwall Lithium: Ministers'' 180,000 Car Battery Claim Differs From Earlier Figures'),
  ('bm4k9mxw7r', 'Help to Buy Model Returns Before Its Income Limits Are Set', 'Help to Buy Returns Before Its Income and House Price Limits Are Set'),
  ('cr4k9mxw7r', 'Rape Courts Expand Without Evidence the Pilot Cut Delays', 'Specialist Rape Courts Expand Without Evidence the Pilot Cut Delays'),
  ('tk4n9mxw7r', '50 Per Cent Steel Tariff Can Hit Goods Britain Doesn''t Make', 'UK Steel Tariffs of 50 Per Cent Can Hit Goods Britain Doesn''t Make'),
  ('wk4n9mxw7r', 'Norfolk Builders Could Pay £2,675 a Home to Offset Nutrients', 'Norfolk Builders Could Pay £2,675 a Home for Nutrient Mitigation'),
  ('pb4k9mxw7r', '500 More Economic Crime Officers, No Recovery Target', '500 More Economic Crime Officers Funded With No Target for Money Recovered'),
  ('ew4k9mxn7r', '£91m More for 14 Councils as 35 Need £1.5bn Support', 'Struggling Councils: 14 Get £91m as 35 Approved for £1.5bn Support'),
  ('td4k9mxw7r', 'Most Wanted a Cap. Mayors Get an Uncapped Overnight Tax', 'English Mayors Get Uncapped Overnight Visitor Tax. Most Wanted a Cap'),
  ('rm4n9mxw7r', 'Compensation Reform Deadline Missed as Claimants Report Harm', 'Government Misses Compensation Reform Deadline as 76 Per Cent of Claimants Report Distress'),
  ('kn4r9mxw7q', 'Child Nude Image Block Promised With No Accuracy Standard', 'Under 18 Nude Image Block Promised With No Published Accuracy Standard'),
  ('mf7k3qxw9n', 'MoD Still Can''t Say How Much It Loses to Fraud', 'MoD Still Can''t Estimate How Much It Loses to Fraud, Despite Blocking £400m'),
  ('pn8k4qxw2r', 'Early Releases Began Without Updated Prison Capacity Figures', 'Prison Early Releases Began Without Updated Capacity Figures'),
  ('q4m8k2xw7n', 'MoD Reversed 884 Afghan Refusals Made Without Key UK Records', 'MoD Overturned 884 Afghan Special Forces Refusals Made Without Key UK Records'),
  ('pk9v2mrx4t', 'Prison Programme Wrote Off £24m Without Naming Projects', 'Prison Expansion Programme Wrote Off Almost £24m Without Naming the Projects'),
  ('em7k4mxw9n', '5,043 People on Tagging Orders Had No Equipment Assigned', 'Electronic Tagging: 5,043 People on Orders Had No Equipment Assigned'),
  ('rk9m4qxw7d', 'MPs Say Robbins Was Sacked Before Facts Were Established', 'Olly Robbins Sacked Over Mandelson Vetting Before Facts Were Established, MPs Say'),
  ('rs8k4mxw9n', 'Burnham''s Rough Sleeping Pledge Has No Date for Zero', 'Andy Burnham''s Rough Sleeping Pledge Has No Date for Reaching Zero'),
  ('vt6k9mxw3n', 'Burnham''s £45 Power Bill Cut Relies on Unidentified Savings', 'Andy Burnham''s £45 Electricity Bill Cut Relies Partly on Unidentified Savings'),
  ('k9m4qxw7n2', 'Asylum Sites Advance Without a Performance Regime in Place', 'Two Large Asylum Sites Advance With No Home Office Performance Regime'),
  ('bn6k4qxw27', 'Burnham Became Leader on 379 MP Nominations, No Member Vote', 'Andy Burnham Became Labour Leader on 379 MP Nominations, With No Member Vote'),
  ('ms9k4qxw7n', 'Planned £1m Slavery Fines Won''t Require Supply Chain Checks', 'Modern Slavery: Planned £1m Fines Won''t Require Supply Chain Checks'),
  ('mn8k4qxw7v', 'Mandelson Cleared Against Vetting Advice, Reasons Withheld', 'Peter Mandelson Given Security Clearance Against Vetting Advice. Reasons Withheld'),
  ('tq6m4kx9w2', '£1.6bn for Sovereign AI Without Saying What It Must Control', '£1.6bn for UK Sovereign AI, but Ministers Haven''t Said What It Must Control, MPs Say'),
  ('pf7k3mxw9q', 'PFAS Could Be Irreversible. Still No Date for Limits', 'PFAS Forever Chemicals Could Be Irreversible. Still No Date for Restrictions'),
  ('st6k9mxq4w', 'Treasury Committee: Student Loans Were Wrongly Sold', 'Student Loans Were Wrongly Sold, Treasury Committee Says'),
  ('dk9m2xq7w4', 'DUP Says Donaldson Information Never Reached Party Officers', 'DUP Says Information About Jeffrey Donaldson Never Reached Party Officers'),
  ('hx7n4qw2mk', 'Operation Hexagon Was Never Reviewed, GMP Says', 'Operation Hexagon Was Never Reviewed, Greater Manchester Police Says'),
  ('m7k4qxw9n2', 'Healey Quit Over Treasury Limits, Then Became Chancellor', 'John Healey Quit Over Treasury Limits on Defence, Then Became Chancellor'),
  ('vq8k3mxw7n', 'British Steel Valued at Nothing After £555m of Support', 'British Steel Valued at Nothing by Government After £555m of Taxpayer Support'),
  ('wq7m4kx2np', 'Voluntary Digital ID Faces Function Creep Warning From MPs', 'UK Digital ID: MPs Warn of Function Creep in Voluntary Scheme'),
  ('zt7m4kq9xw', 'Rivals Call Clacton a Stunt but Hand Farage the Stage', 'Clacton By Election: Rivals Call It a Farage Stunt but Hand Him the Stage'),
  ('skq4m9xw2t', 'State of the UK: Paying for Delayed Decisions', 'State of the UK: How Delayed Decisions Push Up Public Costs'),
  ('pc7m3wq9k2', 'DfE Cannot Say What a Fair Price Is for Children''s Homes', 'Children''s Homes: DfE Can''t Say What a Fair Price Is as Private Firms Hold 74 Per Cent of Places'),
  ('as6k2mwx9q', '£4.9bn on Asylum, but Failed Claimant Numbers Unknown', 'UK Asylum System Cost £4.9bn, but Home Office Can''t Count Failed Claimants'),
  ('hl7k2mx9w4', 'No Paid Leave for Parents While Their Child Is Seriously Ill', 'No Statutory Paid Leave for Parents While Their Child Is Seriously Ill'),
  ('jx4m9wk2q7', 'Crown Court Caseload Down 37, With Over 22,000 a Year Old', 'Crown Court Backlog: Over 22,000 Cases Open for More Than a Year'),
  ('se9k4m2xq7', 'MPs Approved £1.15 Trillion, Debating Few of the Estimates', 'MPs Approved £1.15 Trillion of Spending Estimates, Debating Few of Them'),
  ('ck8m2wq7x3', 'Nearly 1m Council Tax Court Actions in a Year, GMB Finds', 'Nearly 1 Million Council Tax Court Actions in England in a Year, GMB Finds'),
  ('rm9x2qk7v4', 'Joe Fortune Named Labour General Secretary After Ridley Exit', 'Joe Fortune Named Labour General Secretary After Hollie Ridley Exit'),
  ('dn4p8rk2wq', 'Defence Plan''s 60,000 Jobs Claim Leaves Out Losses Elsewhere', 'Defence Plan''s 60,000 Jobs Claim Leaves Out Jobs Lost Elsewhere'),
  ('bk7m3wq9x2', 'Burnham''s Warehouse Tax Plan for High Streets Has No Sums', 'Andy Burnham''s Warehouse Tax Plan for High Streets Has No Published Sums'),
  ('v3n8q2xk6w', 'Farage Need Not List Assets Owned by His Company', 'Nigel Farage Need Not List Assets Owned by His Company, Parliament Says'),
  ('p9k4w2rx7m', '£4.7bn of £15bn Defence Pledge Had No Identified Funding', '£4.7bn of £15bn UK Defence Pledge Had No Identified Funding'),
  ('p4w9k2xr7n', 'Harborne''s Over £30m in Donations Includes £5m Under Inquiry', 'Christopher Harborne''s More Than £30m in Political Donations Includes £5m Under Inquiry'),
  ('m2v9k7qx4r', 'Media Merger Test Still Ignores Who Owns Streaming Services', 'UK Media Merger Test Still Ignores Who Owns Streaming Services'),
  ('r4n8k2wq7m', 'Immigration Views Harden as Recorded Race Hate Crime Rises', 'UK Immigration Views Harden as Recorded Race Hate Crime Rises'),
  ('w7q2m9rk5t', 'Burnham Not Told of £4.7bn Defence Budget Need, Reports Say', 'Andy Burnham Not Told of £4.7bn Defence Budget Need, Reports Say'),
  ('k3p9w7nx2d', 'A38 and A46 Upgrades Put at Risk to Fund Defence', 'A38 and A46 Road Upgrades Put at Risk to Fund Defence'),
  ('d8m4xpq2vt', 'Britain Keeps £944m Tech Tax Despite Trump''s Tariff Threat', 'Britain Keeps £944m Digital Services Tax Despite Trump''s Tariff Threat'),
  ('kp7m2xqv9d', '23 MPs Vote at Less Than Half the Average Commons Rate', '23 MPs Voted in Less Than Half the Average Share of Commons Divisions'),
  ('awsucrmvr1', 'Council Tax Has Risen 66% Since 2010', 'Council Tax Has Risen 66 Per Cent Since 2010'),
  ('whr8acs2gf', 'OBR Says Workers Bear Most of the National Insurance Rise', 'Employer National Insurance Rise: Workers Bear Most of It, OBR Says'),
  ('when-did-politicians-stop-taking-responsibility', 'Ministers Answer for Failure but Needn''t Resign', 'Ministerial Responsibility: Ministers Answer for Failure but Needn''t Resign'),
  ('the-revolving-door', 'Ex Ministers Can Lobby After Two Years. Reform Unanswered', 'Revolving Door: Ex Ministers Can Lobby After Two Years. Reform Unanswered'),
  ('andy-burnham-the-record-behind-the-reputation', 'Burnham''s Record: Buses Delivered, Rough Sleeping Missed', 'Andy Burnham''s Record in Greater Manchester: Buses Delivered, Rough Sleeping Missed'),
  ('hw9k4mxq2t', 'South East Water''s Bosses Gone, Turnaround Plan Unwritten', 'South East Water: Bosses Gone, Turnaround Plan Still Unwritten'),
  ('siicjkcsr6', 'Ministers Backed None of Three Lords Reform Bills', 'Government Backed None of Three Lords Reform Bills'),
  ('6vui3xxze9', '379 Labour MPs Back Burnham, So Members Unlikely to Vote', '379 Labour MPs Back Andy Burnham, So Members Unlikely to Get a Vote');
CREATE TEMP TABLE t1_head_br (slug text PRIMARY KEY, old text NOT NULL, new text NOT NULL) ON COMMIT DROP;
INSERT INTO t1_head_br VALUES
  ('7bb78d3366', 'Burnham on course for PM by Sunday as nominations close', 'Andy Burnham on Course to Become Prime Minister as Labour Nominations Close'),
  ('920e6b2857', 'Lords to debate cohabitation rights and undercover policing', 'House of Lords to Debate Cohabitation Rights and Undercover Policing'),
  ('9daa8d566a', 'Tunbridge Wells water: boss gone, regulators yet to act', 'Tunbridge Wells Water: South East Water Bosses Gone, Regulators Yet to Act'),
  ('dc5ff3e650', 'Labour nominations open with no serious rival to Burnham', 'Labour Leadership Nominations Open With No Serious Rival to Andy Burnham');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials e JOIN t1_head_ed t ON t.slug = e.slug AND e.headline = t.old;
  IF n <> 120 THEN RAISE EXCEPTION 'T1-HEAD: % of 120 editorials hold the expected headline', n; END IF;
  SELECT count(*) INTO n FROM briefings b JOIN t1_head_br t ON t.slug = b.slug AND b.headline = t.old;
  IF n <> 4 THEN RAISE EXCEPTION 'T1-HEAD: % of 4 briefings hold the expected headline', n; END IF;
  UPDATE editorials e SET headline = t.new FROM t1_head_ed t WHERE e.slug = t.slug AND e.headline = t.old;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 120 THEN RAISE EXCEPTION 'T1-HEAD: % editorials changed (expected 120)', n; END IF;
  UPDATE briefings b SET headline = t.new FROM t1_head_br t WHERE b.slug = t.slug AND b.headline = t.old;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'T1-HEAD: % briefings changed (expected 4)', n; END IF;
  RAISE NOTICE 'T1-HEAD: 120 editorials and 4 briefings changed';
END $$;

:end;
