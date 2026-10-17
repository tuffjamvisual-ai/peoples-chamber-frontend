-- Our own text stored in the database: em and en dashes rewritten by hand (owner's rule,
-- 16 Oct 2026: no dashes on the site). Each update is guarded on the exact current value and
-- must change exactly one row, or the whole migration rolls back. Originals are kept in
-- public.emdash_backup_20261017 so any row can be restored.

\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS public.emdash_backup_20261017 (tbl text, row_key text, col text, old_value text, saved_at timestamptz DEFAULT now());
ALTER TABLE public.emdash_backup_20261017 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emdash_backup_20261017 FROM anon, authenticated;
DO $do$
DECLARE n int;
BEGIN
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$rc8m4kqx7n$k$, 'standfirst', $o$Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032–33. More than £500 million has already been spent on mitigation. A further £440 million of operational capital is being provided to the seven trusts over four years while replacements are built.$o$);
  UPDATE public.editorials SET standfirst = $n$Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032-33. More than £500 million has already been spent on mitigation. A further £440 million of operational capital is being provided to the seven trusts over four years while replacements are built.$n$ WHERE slug::text = $k$rc8m4kqx7n$k$ AND standfirst = $o$Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032–33. More than £500 million has already been spent on mitigation. A further £440 million of operational capital is being provided to the seven trusts over four years while replacements are built.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$rc8m4kqx7n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$bg9k4mxw2q$k$, 'standfirst', $o$MBR Acres breeds beagles intended for use in laboratory research. Since 12 February, it falls within a criminal offence originally created to protect infrastructure including railways, airports, oil and gas facilities and electricity generation. The government did not name MBR Acres in the legislation — ministers changed the definition of "key national infrastructure" by adding a new category covering life sciences premises. The High Court has now given permission for a challenge to whether they had the legal power to do so.$o$);
  UPDATE public.editorials SET standfirst = $n$MBR Acres breeds beagles intended for use in laboratory research. Since 12 February, it falls within a criminal offence originally created to protect infrastructure including railways, airports, oil and gas facilities and electricity generation. The government did not name MBR Acres in the legislation. Ministers changed the definition of "key national infrastructure" by adding a new category covering life sciences premises. The High Court has now given permission for a challenge to whether they had the legal power to do so.$n$ WHERE slug::text = $k$bg9k4mxw2q$k$ AND standfirst = $o$MBR Acres breeds beagles intended for use in laboratory research. Since 12 February, it falls within a criminal offence originally created to protect infrastructure including railways, airports, oil and gas facilities and electricity generation. The government did not name MBR Acres in the legislation — ministers changed the definition of "key national infrastructure" by adding a new category covering life sciences premises. The High Court has now given permission for a challenge to whether they had the legal power to do so.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$bg9k4mxw2q$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$hg0gkukta5$k$, 'standfirst', $o$Government press releases are written to show decisions in the best possible light. The problem is structural: political communications and serious evaluation operate on completely different clocks. A 2019 review found that 64 per cent of £432 billion in major-project spending had no evaluation plan at all. Six case studies — the Green Homes Grant, Help to Buy, Test and Trace, Levelling Up, HS2, and the Rwanda partnership — show the same pattern recurring across governments: a forecast becomes a headline, an allocation becomes an outcome, and the audit arrives years later, read by a fraction of the people who saw the launch.$o$);
  UPDATE public.editorials SET standfirst = $n$Government press releases are written to show decisions in the best possible light. The problem is structural: political communications and serious evaluation operate on completely different clocks. A 2019 review found that 64 per cent of £432 billion in major-project spending had no evaluation plan at all. Six case studies (the Green Homes Grant, Help to Buy, Test and Trace, Levelling Up, HS2, and the Rwanda partnership) show the same pattern recurring across governments: a forecast becomes a headline, an allocation becomes an outcome, and the audit arrives years later, read by a fraction of the people who saw the launch.$n$ WHERE slug::text = $k$hg0gkukta5$k$ AND standfirst = $o$Government press releases are written to show decisions in the best possible light. The problem is structural: political communications and serious evaluation operate on completely different clocks. A 2019 review found that 64 per cent of £432 billion in major-project spending had no evaluation plan at all. Six case studies — the Green Homes Grant, Help to Buy, Test and Trace, Levelling Up, HS2, and the Rwanda partnership — show the same pattern recurring across governments: a forecast becomes a headline, an allocation becomes an outcome, and the audit arrives years later, read by a fraction of the people who saw the launch.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$hg0gkukta5$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$cq4r8vn2mp$k$, 'standfirst', $o$Dorset has the highest average Band D council tax in England this year at £2,765.02. But five of the ten highest areas are district council areas where most of the bill is not set by the district council at all — it goes to county councils, police, fire services and parish or town councils. In two of them, the district council did not increase its own charge at all this year.$o$);
  UPDATE public.editorials SET standfirst = $n$Dorset has the highest average Band D council tax in England this year at £2,765.02. But five of the ten highest areas are district council areas where most of the bill is not set by the district council at all. It goes to county councils, police, fire services and parish or town councils. In two of them, the district council did not increase its own charge at all this year.$n$ WHERE slug::text = $k$cq4r8vn2mp$k$ AND standfirst = $o$Dorset has the highest average Band D council tax in England this year at £2,765.02. But five of the ten highest areas are district council areas where most of the bill is not set by the district council at all — it goes to county councils, police, fire services and parish or town councils. In two of them, the district council did not increase its own charge at all this year.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$cq4r8vn2mp$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$pk9v2mrx4t$k$, 'standfirst', $o$HM Prison and Probation Service wrote off almost £24 million from its prison expansion programme after construction projects were reduced in scope and a supplier failed. The published accounts do not identify the three losses individually — no names, no per-project amounts, no prison places affected. The losses sit inside a programme already running four years late and nearly double its original budget.$o$);
  UPDATE public.editorials SET standfirst = $n$HM Prison and Probation Service wrote off almost £24 million from its prison expansion programme after construction projects were reduced in scope and a supplier failed. The published accounts do not identify the three losses individually: no names, no per-project amounts, no prison places affected. The losses sit inside a programme already running four years late and nearly double its original budget.$n$ WHERE slug::text = $k$pk9v2mrx4t$k$ AND standfirst = $o$HM Prison and Probation Service wrote off almost £24 million from its prison expansion programme after construction projects were reduced in scope and a supplier failed. The published accounts do not identify the three losses individually — no names, no per-project amounts, no prison places affected. The losses sit inside a programme already running four years late and nearly double its original budget.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$pk9v2mrx4t$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$eoi32xxnct$k$, 'standfirst', $o$The Cabinet Office puts estimated lifetime benefits from its shared services programme at £4.3 billion across five clusters over 15 years. The National Audit Office's own calculation — restricted to the three clusters with ring-fenced Spending Review funding — is around £1 billion. Confirmed savings to date are £168 million. One cluster, Matrix, has slipped five months without public explanation. Another, Synergy, has awarded a £700 million outsourcing contract to Capita on a bid reportedly 40 per cent below the government's own cost estimate.$o$);
  UPDATE public.editorials SET standfirst = $n$The Cabinet Office puts estimated lifetime benefits from its shared services programme at £4.3 billion across five clusters over 15 years. The National Audit Office's own calculation, restricted to the three clusters with ring-fenced Spending Review funding, is around £1 billion. Confirmed savings to date are £168 million. One cluster, Matrix, has slipped five months without public explanation. Another, Synergy, has awarded a £700 million outsourcing contract to Capita on a bid reportedly 40 per cent below the government's own cost estimate.$n$ WHERE slug::text = $k$eoi32xxnct$k$ AND standfirst = $o$The Cabinet Office puts estimated lifetime benefits from its shared services programme at £4.3 billion across five clusters over 15 years. The National Audit Office's own calculation — restricted to the three clusters with ring-fenced Spending Review funding — is around £1 billion. Confirmed savings to date are £168 million. One cluster, Matrix, has slipped five months without public explanation. Another, Synergy, has awarded a £700 million outsourcing contract to Capita on a bid reportedly 40 per cent below the government's own cost estimate.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$eoi32xxnct$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$mf7k3qxw9n$k$, 'standfirst', $o$The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024–25 because it judged them invalid. Most were not fraud. But the figure sits beside a problem the MoD has yet to solve: it does not have a reliable estimate of how much money it actually loses to fraud. Its published estimate of £1.5 billion a year was described by the Permanent Secretary as "essentially an academic construct".$o$);
  UPDATE public.editorials SET standfirst = $n$The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024-25 because it judged them invalid. Most were not fraud. But the figure sits beside a problem the MoD has yet to solve: it does not have a reliable estimate of how much money it actually loses to fraud. Its published estimate of £1.5 billion a year was described by the Permanent Secretary as "essentially an academic construct".$n$ WHERE slug::text = $k$mf7k3qxw9n$k$ AND standfirst = $o$The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024–25 because it judged them invalid. Most were not fraud. But the figure sits beside a problem the MoD has yet to solve: it does not have a reliable estimate of how much money it actually loses to fraud. Its published estimate of £1.5 billion a year was described by the Permanent Secretary as "essentially an academic construct".$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$mf7k3qxw9n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$awsucrmvr1$k$, 'standfirst', $o$The average Band D council tax bill in England was £1,439 in 2010/11. For 2026/27 it is £2,392 — an increase of £953, or 66 per cent in cash terms. The difference between areas is even larger: Dorset charges £2,765 and Wandsworth £1,028. But that £1,737 gap cannot sensibly be read as £1,737 worth of difference in council performance.$o$);
  UPDATE public.editorials SET standfirst = $n$The average Band D council tax bill in England was £1,439 in 2010/11. For 2026/27 it is £2,392, an increase of £953, or 66 per cent in cash terms. The difference between areas is even larger: Dorset charges £2,765 and Wandsworth £1,028. But that £1,737 gap cannot sensibly be read as £1,737 worth of difference in council performance.$n$ WHERE slug::text = $k$awsucrmvr1$k$ AND standfirst = $o$The average Band D council tax bill in England was £1,439 in 2010/11. For 2026/27 it is £2,392 — an increase of £953, or 66 per cent in cash terms. The difference between areas is even larger: Dorset charges £2,765 and Wandsworth £1,028. But that £1,737 gap cannot sensibly be read as £1,737 worth of difference in council performance.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$awsucrmvr1$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$as6k2mwx9q$k$, 'standfirst', $o$The Home Office and Ministry of Justice spent around £4.9 billion on the asylum system in 2024/25. A Public Accounts Committee report published in June found that the Home Office still cannot say with confidence how many failed asylum seekers remain in Britain — it knew where "some" were, but could not establish with certainty who had left the country and who was still here.$o$);
  UPDATE public.editorials SET standfirst = $n$The Home Office and Ministry of Justice spent around £4.9 billion on the asylum system in 2024/25. A Public Accounts Committee report published in June found that the Home Office still cannot say with confidence how many failed asylum seekers remain in Britain. It knew where "some" were, but could not establish with certainty who had left the country and who was still here.$n$ WHERE slug::text = $k$as6k2mwx9q$k$ AND standfirst = $o$The Home Office and Ministry of Justice spent around £4.9 billion on the asylum system in 2024/25. A Public Accounts Committee report published in June found that the Home Office still cannot say with confidence how many failed asylum seekers remain in Britain — it knew where "some" were, but could not establish with certainty who had left the country and who was still here.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$as6k2mwx9q$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$whr8acs2gf$k$, 'standfirst', $o$Labour's 2024 manifesto said it would not increase National Insurance. Four months after the election, Rachel Reeves increased employer National Insurance. The OBR estimates that by 2026/27, 76 per cent of the long-run cost will ultimately be reflected in lower real wages. Labour's defence — that the promise referred to taxes paid directly by working people — was not what the manifesto said.$o$);
  UPDATE public.editorials SET standfirst = $n$Labour's 2024 manifesto said it would not increase National Insurance. Four months after the election, Rachel Reeves increased employer National Insurance. The OBR estimates that by 2026/27, 76 per cent of the long-run cost will ultimately be reflected in lower real wages. Labour's defence, that the promise referred to taxes paid directly by working people, was not what the manifesto said.$n$ WHERE slug::text = $k$whr8acs2gf$k$ AND standfirst = $o$Labour's 2024 manifesto said it would not increase National Insurance. Four months after the election, Rachel Reeves increased employer National Insurance. The OBR estimates that by 2026/27, 76 per cent of the long-run cost will ultimately be reflected in lower real wages. Labour's defence — that the promise referred to taxes paid directly by working people — was not what the manifesto said.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$whr8acs2gf$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$6vui3xxze9$k$, 'standfirst', $o$Andy Burnham has finished the parliamentary stage of Labour's leadership election with 379 MP nominations out of a possible 403. His only nominal rival received one. Unless he fails the affiliate stage, Labour members will not get a leadership ballot — he will instead be formally declared leader at a special conference on Friday.$o$);
  UPDATE public.editorials SET standfirst = $n$Andy Burnham has finished the parliamentary stage of Labour's leadership election with 379 MP nominations out of a possible 403. His only nominal rival received one. Unless he fails the affiliate stage, Labour members will not get a leadership ballot. He will instead be formally declared leader at a special conference on Friday.$n$ WHERE slug::text = $k$6vui3xxze9$k$ AND standfirst = $o$Andy Burnham has finished the parliamentary stage of Labour's leadership election with 379 MP nominations out of a possible 403. His only nominal rival received one. Unless he fails the affiliate stage, Labour members will not get a leadership ballot — he will instead be formally declared leader at a special conference on Friday.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$6vui3xxze9$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$tq6m4kx9w2$k$, 'standfirst', $o$The government has invested £1.6 billion in Britain's "sovereign AI capabilities" — £500 million for the Sovereign AI fund and £1.1 billion for an AI hardware plan. Three weeks later, the House of Commons Science, Innovation and Technology Committee said ministers had still not set out which technological capabilities Britain needs to control, which it can share with allies and which it is prepared to obtain from overseas.$o$);
  UPDATE public.editorials SET standfirst = $n$The government has invested £1.6 billion in Britain's "sovereign AI capabilities": £500 million for the Sovereign AI fund and £1.1 billion for an AI hardware plan. Three weeks later, the House of Commons Science, Innovation and Technology Committee said ministers had still not set out which technological capabilities Britain needs to control, which it can share with allies and which it is prepared to obtain from overseas.$n$ WHERE slug::text = $k$tq6m4kx9w2$k$ AND standfirst = $o$The government has invested £1.6 billion in Britain's "sovereign AI capabilities" — £500 million for the Sovereign AI fund and £1.1 billion for an AI hardware plan. Three weeks later, the House of Commons Science, Innovation and Technology Committee said ministers had still not set out which technological capabilities Britain needs to control, which it can share with allies and which it is prepared to obtain from overseas.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$tq6m4kx9w2$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$wq7m4kx2np$k$, 'standfirst', $o$The government's digital ID will be voluntary. That is not merely ministerial reassurance — the consultation document says so explicitly. But voluntary in law is not the same as voluntary in practice. Parliament's Home Affairs Committee has already warned about function creep and recommended that future expansions require statutory scrutiny. The government has not yet said which protections will end up in legislation.$o$);
  UPDATE public.editorials SET standfirst = $n$The government's digital ID will be voluntary. That is not merely ministerial reassurance. The consultation document says so explicitly. But voluntary in law is not the same as voluntary in practice. Parliament's Home Affairs Committee has already warned about function creep and recommended that future expansions require statutory scrutiny. The government has not yet said which protections will end up in legislation.$n$ WHERE slug::text = $k$wq7m4kx2np$k$ AND standfirst = $o$The government's digital ID will be voluntary. That is not merely ministerial reassurance — the consultation document says so explicitly. But voluntary in law is not the same as voluntary in practice. Parliament's Home Affairs Committee has already warned about function creep and recommended that future expansions require statutory scrutiny. The government has not yet said which protections will end up in legislation.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$wq7m4kx2np$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$p4w9k2xr7n$k$, 'standfirst', $o$Christopher Harborne gave Reform UK £3 million in November 2025. Three months earlier he had given it £9 million, then the largest single donation from a living person to a British political party. Add his earlier donations to Reform and the Brexit Party, a £1 million payment to Boris Johnson's office and a £5 million personal gift to Nigel Farage — still under parliamentary investigation — and his disclosed or subsequently revealed funding of British politics exceeds £30 million.$o$);
  UPDATE public.editorials SET standfirst = $n$Christopher Harborne gave Reform UK £3 million in November 2025. Three months earlier he had given it £9 million, then the largest single donation from a living person to a British political party. Add his earlier donations to Reform and the Brexit Party, a £1 million payment to Boris Johnson's office and a £5 million personal gift to Nigel Farage (still under parliamentary investigation) and his disclosed or subsequently revealed funding of British politics exceeds £30 million.$n$ WHERE slug::text = $k$p4w9k2xr7n$k$ AND standfirst = $o$Christopher Harborne gave Reform UK £3 million in November 2025. Three months earlier he had given it £9 million, then the largest single donation from a living person to a British political party. Add his earlier donations to Reform and the Brexit Party, a £1 million payment to Boris Johnson's office and a £5 million personal gift to Nigel Farage — still under parliamentary investigation — and his disclosed or subsequently revealed funding of British politics exceeds £30 million.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$p4w9k2xr7n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$the-revolving-door$k$, 'standfirst', $o$Former ministers are normally banned from lobbying the government for two years after leaving office. After two years, those restrictions expire. That limit mattered when David Cameron lobbied ministers and officials for Greensill Capital. The Commons Treasury Committee found he had not broken the rules — and directed its criticism at the rules themselves. Five years later, the government is reviewing them again.$o$);
  UPDATE public.editorials SET standfirst = $n$Former ministers are normally banned from lobbying the government for two years after leaving office. After two years, those restrictions expire. That limit mattered when David Cameron lobbied ministers and officials for Greensill Capital. The Commons Treasury Committee found he had not broken the rules, and directed its criticism at the rules themselves. Five years later, the government is reviewing them again.$n$ WHERE slug::text = $k$the-revolving-door$k$ AND standfirst = $o$Former ministers are normally banned from lobbying the government for two years after leaving office. After two years, those restrictions expire. That limit mattered when David Cameron lobbied ministers and officials for Greensill Capital. The Commons Treasury Committee found he had not broken the rules — and directed its criticism at the rules themselves. Five years later, the government is reviewing them again.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$the-revolving-door$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$britains-most-disgraced-politicians$k$, 'standfirst', $o$At Newry Crown Court on 22 June, a jury convicted Jeffrey Donaldson of 18 sexual offences. His case belongs in any account of political disgrace — but it does not fit the comforting old line that the cover-up is always worse than the original offence. Sometimes the original offence is worse.$o$);
  UPDATE public.editorials SET standfirst = $n$At Newry Crown Court on 22 June, a jury convicted Jeffrey Donaldson of 18 sexual offences. His case belongs in any account of political disgrace, but it does not fit the comforting old line that the cover-up is always worse than the original offence. Sometimes the original offence is worse.$n$ WHERE slug::text = $k$britains-most-disgraced-politicians$k$ AND standfirst = $o$At Newry Crown Court on 22 June, a jury convicted Jeffrey Donaldson of 18 sexual offences. His case belongs in any account of political disgrace — but it does not fit the comforting old line that the cover-up is always worse than the original offence. Sometimes the original offence is worse.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$britains-most-disgraced-politicians$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$se9k4m2xq7$k$, 'standfirst', $o$The House of Commons passed a bill appropriating more than £1.15 trillion of departmental resources for 2026/27. Its second and third readings on 1 July were completed without substantive debate. That is not an accidental shortcut — it is how Supply legislation works. But most departmental Estimates never received their own Commons debate before Parliament approved them.$o$);
  UPDATE public.editorials SET standfirst = $n$The House of Commons passed a bill appropriating more than £1.15 trillion of departmental resources for 2026/27. Its second and third readings on 1 July were completed without substantive debate. That is not an accidental shortcut. It is how Supply legislation works. But most departmental Estimates never received their own Commons debate before Parliament approved them.$n$ WHERE slug::text = $k$se9k4m2xq7$k$ AND standfirst = $o$The House of Commons passed a bill appropriating more than £1.15 trillion of departmental resources for 2026/27. Its second and third readings on 1 July were completed without substantive debate. That is not an accidental shortcut — it is how Supply legislation works. But most departmental Estimates never received their own Commons debate before Parliament approved them.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$se9k4m2xq7$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$hl7k2mx9w4$k$, 'standfirst', $o$Hundreds of children's shoes were laid in Parliament Square by families whose children had died. The protest was tied to Hugh's Law — a campaign for statutory paid leave for parents of seriously ill children. Britain already has bereavement leave. What it does not have is a dedicated statutory right to paid leave for the period when a family is trying to stop the death from happening.$o$);
  UPDATE public.editorials SET standfirst = $n$Hundreds of children's shoes were laid in Parliament Square by families whose children had died. The protest was tied to Hugh's Law, a campaign for statutory paid leave for parents of seriously ill children. Britain already has bereavement leave. What it does not have is a dedicated statutory right to paid leave for the period when a family is trying to stop the death from happening.$n$ WHERE slug::text = $k$hl7k2mx9w4$k$ AND standfirst = $o$Hundreds of children's shoes were laid in Parliament Square by families whose children had died. The protest was tied to Hugh's Law — a campaign for statutory paid leave for parents of seriously ill children. Britain already has bereavement leave. What it does not have is a dedicated statutory right to paid leave for the period when a family is trying to stop the death from happening.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$hl7k2mx9w4$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$jx4m9wk2q7$k$, 'standfirst', $o$The Crown Court ended March with 80,061 open cases — 37 fewer than three months earlier, but still 5 per cent higher than a year before. The more serious movement was inside that total: 22,124 cases had been open for at least a year, the highest number in the current series, up 24 per cent in twelve months. More than half involved violence or sexual offences.$o$);
  UPDATE public.editorials SET standfirst = $n$The Crown Court ended March with 80,061 open cases, 37 fewer than three months earlier, but still 5 per cent higher than a year before. The more serious movement was inside that total: 22,124 cases had been open for at least a year, the highest number in the current series, up 24 per cent in twelve months. More than half involved violence or sexual offences.$n$ WHERE slug::text = $k$jx4m9wk2q7$k$ AND standfirst = $o$The Crown Court ended March with 80,061 open cases — 37 fewer than three months earlier, but still 5 per cent higher than a year before. The more serious movement was inside that total: 22,124 cases had been open for at least a year, the highest number in the current series, up 24 per cent in twelve months. More than half involved violence or sexual offences.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.standfirst row % updated % rows', $k$jx4m9wk2q7$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$7pqvf1c0db$k$, 'body_text', $o$The Ministry of Defence has bought back more than 36,000 military homes for close to £6 billion after a 1996 sale-and-leaseback deal left the taxpayer an estimated £14.5 billion worse off, the National Audit Office has found.

The political responsibility for the original decision sits with the Conservative government led by John Major and, most directly, with Michael Portillo, then Defence Secretary, who personally defended the sale in the Commons before it went ahead.

The MoD sold 57,434 married quarters to Annington in 1996 for £1.7 billion, leasing back around 55,000 of them while keeping responsibility for managing and maintaining the properties. By 2024, it was paying around £230 million a year in rent — roughly £630,000 a day.

The MoD agreed the buyback in December 2024 and completed it on 9 January 2025, repurchasing 36,347 of those homes for £5.99 billion. The National Audit Office says the buyback itself represents value for money compared with continuing the lease arrangement. But by the time the repurchase was agreed, the department was £14.5 billion worse off than if it had never entered the 1996 deal.

That is the distinction that matters.

The current government did not create the loss.

It inherited it and has paid heavily to stop it getting worse.

The decision that created the exposure was taken nearly three decades earlier.

Portillo defended the sale before it happened — and promised a specific, modest return

In the Commons on 16 July 1996, Michael Portillo made the government's case directly: "The Ministry has not been good at owning houses. In too many cases, their quality has fallen below the standard that service families have a right to expect." He argued that giving up ownership would let the private sector manage the estate better, telling MPs: "The Ministry will do better and service families will benefit by our giving up ownership."

The benefit Portillo promised was specific and, in hindsight, strikingly small set against what followed: "The sale of married quarters will provide the Ministry with an extra £100 million, which it would not otherwise have had, to spend on extra refurbishment." The MoD's own 1997 audit of the sale recorded that around 12,000 of 64,000 quarters in England and Wales — 19% — were standing empty at the time, and cited a 1992 Housing Task Force finding that the estate was in poor condition and "not managed as efficiently as they could be." That was the problem the £100 million was meant to fix.

Three decades later, the government is committing roughly £9 billion to the same underlying problem — modernising or rebuilding around 43,000 homes by 2035 and the 1,000 worst-condition properties prioritised first. The gap between the £100 million refurbishment fund Portillo promised the sale would unlock and the £9 billion now required is itself a measure of how badly the deal under-delivered on its own stated terms.

The warnings were not purely hindsight

The sale was contested at the time, not just in retrospect. In the same July 1996 debate, the shadow defence secretary, Dr David Clark, told the Commons: "The speculators will call the tune, not military demands," and warned that "service families feel betrayed and deserted by the Government." He read into the record the Royal British Legion's own objection — that the proposals "pose a threat to the ethos of Service life and demonstrate ignorance of Service people's real needs" — and the Army Families Federation's warning that "irretrievable damage will be done to Service life if the Government sells off Service homes." Bruce George, then a member of the Defence Select Committee, told MPs: "The morale of service men, already low, will plummet even further. This is being done unnecessarily."

Portillo rejected those objections and pressed ahead.

That matters because the later failure cannot be treated simply as a risk nobody could have imagined. Service organisations and the opposition told Parliament, before the sale went through, broadly what eventually happened: a loss of control over the estate that cost service families and the taxpayer for decades. The government made a deliberate choice to trade long-term ownership for an immediate receipt and a leaseback arrangement, over those specific objections.

The NAO's conclusion is now stark: the transaction left taxpayers billions worse off.

The NAO now describes the result as a "cautionary tale about the risks to long-term value" inherent in sale-and-leaseback transactions.

The present government has done the financially rational thing

Responsibility for creating the problem should not be confused with responsibility for ending it.

The NAO found that the repurchase negotiated by the MoD was better value than continuing to rent the homes from Annington. It said the department used its commercial leverage effectively — including accounting rule changes (IFRS 16) and a court victory over lease-enfranchisement rights — to secure a favourable outcome compared with the available alternatives.

The buyback has therefore stopped further losses.

It has not recovered the money already lost.

That leaves two separate judgments.

The 1996 sale was poor long-term value.

The repurchase, agreed in December 2024 and completed in January 2025, was a rational way of ending it.

Blurring those together would let the original decision escape scrutiny.

The estate now needs another £9 billion

The government has committed around £9 billion over ten years to modernise military housing, with around 43,000 homes modernised or rebuilt by 2035 and the 1,000 worst-condition properties prioritised first. This sits alongside a separate, self-funding strand of the same strategy — a Defence Development Fund intended to release surplus defence land for more than 100,000 new homes for military and civilian use, reinvesting the proceeds rather than drawing on the £9 billion itself.

There is a clear case for the £9 billion renewal spending.

Service-family housing has suffered from years of underinvestment and poor conditions.

But it also underlines the scale of the original mistake.

Government first sold the estate.

Then rented it back.

Then paid nearly £6 billion to regain control.

Now it is spending roughly £9 billion more to repair and modernise it — ninety times the £100 million refurbishment fund the 1996 sale was supposed to provide.

At the Public Accounts Committee's hearing on 11 September 2026, the committee's own assessment was blunt: the repurchase "ended an expensive arrangement, but" did not undo "nearly three decades of poor value and weakened control over a vital part of the defence estate."

Accountability should not stop with one minister

Michael Portillo carries the clearest political responsibility because he was Defence Secretary when the sale was promoted and completed, and because he personally dismissed the contemporaneous warnings in Parliament.

But the failure was institutional as well as political.

The MoD designed and administered the transaction.

Successive governments then lived with the arrangement for decades.

The department did not seriously begin exploring a fundamental change until many years later. At the September hearing, committee member Chris Kane put the delay to the MoD's Permanent Secretary directly: "Why did it take so long — nearly 25 years?" Jeremy Pocklington's response was that it was "quite hard to judge" whether more could have been done sooner, pointing instead to the 2019 accounting rule change and the later court victory as what finally created the leverage to act.

So responsibility sits at several levels:

Michael Portillo and the Major government for taking and defending the original sale decision against warnings made at the time.

The Ministry of Defence for structuring and managing the arrangement.

Successive governments and MoD leadership for allowing an increasingly expensive model to continue for nearly 25 years before unwinding it.

The current government and current MoD leadership should be judged separately on whether the buyback and new housing strategy actually produce better value from this point forward.

That is the fair allocation of responsibility.

The wider lesson is about selling public assets for short-term cash

The PAC is now explicitly asking what lessons government has learned before departments sell other public assets.

That is where the story becomes current.

Sale-and-leaseback deals can look attractive because the upfront receipt is immediate and visible.

The cost of renting the asset for decades is somebody else's budget problem later.

Annington shows where that logic can end.

The government received £1.7 billion in 1996, against a promise of £100 million for refurbishment.

It later paid around £230 million a year in rent.

It eventually spent close to £6 billion buying most of the estate back.

The NAO puts the cumulative disadvantage at £14.5 billion.

The question is no longer whether the original policy worked.

It did not — and the people who said so at the time were not heeded.

The question is whether government has changed the rules and incentives that allowed it to happen in the first place.

The Major government made the decision.

Portillo defended it against the warnings.

The taxpayer spent the next three decades paying for it.

Sources: NAO — The repurchase of the service family accommodation estate, NAO PDF, June 2026; NAO, 1997 — The Sale of the Married Quarters Estate; Hansard, 16 July 1996 — Ministry of Defence Housing; House of Commons Library — Armed forces family housing and Annington Homes; PAC oral evidence, 11 September 2026; Construction Enquirer, Dec 2024; Defence Housing Strategy 2025 summary, GOV.UK; Wired-GOV — Defence Housing Strategy announcement$o$);
  UPDATE public.editorials SET body_text = $n$The Ministry of Defence has bought back more than 36,000 military homes for close to £6 billion after a 1996 sale-and-leaseback deal left the taxpayer an estimated £14.5 billion worse off, the National Audit Office has found.

The political responsibility for the original decision sits with the Conservative government led by John Major and, most directly, with Michael Portillo, then Defence Secretary, who personally defended the sale in the Commons before it went ahead.

The MoD sold 57,434 married quarters to Annington in 1996 for £1.7 billion, leasing back around 55,000 of them while keeping responsibility for managing and maintaining the properties. By 2024, it was paying around £230 million a year in rent, roughly £630,000 a day.

The MoD agreed the buyback in December 2024 and completed it on 9 January 2025, repurchasing 36,347 of those homes for £5.99 billion. The National Audit Office says the buyback itself represents value for money compared with continuing the lease arrangement. But by the time the repurchase was agreed, the department was £14.5 billion worse off than if it had never entered the 1996 deal.

That is the distinction that matters.

The current government did not create the loss.

It inherited it and has paid heavily to stop it getting worse.

The decision that created the exposure was taken nearly three decades earlier.

Portillo defended the sale before it happened, and promised a specific, modest return

In the Commons on 16 July 1996, Michael Portillo made the government's case directly: "The Ministry has not been good at owning houses. In too many cases, their quality has fallen below the standard that service families have a right to expect." He argued that giving up ownership would let the private sector manage the estate better, telling MPs: "The Ministry will do better and service families will benefit by our giving up ownership."

The benefit Portillo promised was specific and, in hindsight, strikingly small set against what followed: "The sale of married quarters will provide the Ministry with an extra £100 million, which it would not otherwise have had, to spend on extra refurbishment." The MoD's own 1997 audit of the sale recorded that around 12,000 of 64,000 quarters in England and Wales (19%) were standing empty at the time, and cited a 1992 Housing Task Force finding that the estate was in poor condition and "not managed as efficiently as they could be." That was the problem the £100 million was meant to fix.

Three decades later, the government is committing roughly £9 billion to the same underlying problem: modernising or rebuilding around 43,000 homes by 2035 and the 1,000 worst-condition properties prioritised first. The gap between the £100 million refurbishment fund Portillo promised the sale would unlock and the £9 billion now required is itself a measure of how badly the deal under-delivered on its own stated terms.

The warnings were not purely hindsight

The sale was contested at the time, not just in retrospect. In the same July 1996 debate, the shadow defence secretary, Dr David Clark, told the Commons: "The speculators will call the tune, not military demands," and warned that "service families feel betrayed and deserted by the Government." He read into the record the Royal British Legion's own objection, that the proposals "pose a threat to the ethos of Service life and demonstrate ignorance of Service people's real needs", and the Army Families Federation's warning that "irretrievable damage will be done to Service life if the Government sells off Service homes." Bruce George, then a member of the Defence Select Committee, told MPs: "The morale of service men, already low, will plummet even further. This is being done unnecessarily."

Portillo rejected those objections and pressed ahead.

That matters because the later failure cannot be treated simply as a risk nobody could have imagined. Service organisations and the opposition told Parliament, before the sale went through, broadly what eventually happened: a loss of control over the estate that cost service families and the taxpayer for decades. The government made a deliberate choice to trade long-term ownership for an immediate receipt and a leaseback arrangement, over those specific objections.

The NAO's conclusion is now stark: the transaction left taxpayers billions worse off.

The NAO now describes the result as a "cautionary tale about the risks to long-term value" inherent in sale-and-leaseback transactions.

The present government has done the financially rational thing

Responsibility for creating the problem should not be confused with responsibility for ending it.

The NAO found that the repurchase negotiated by the MoD was better value than continuing to rent the homes from Annington. It said the department used its commercial leverage effectively, including accounting rule changes (IFRS 16) and a court victory over lease-enfranchisement rights, to secure a favourable outcome compared with the available alternatives.

The buyback has therefore stopped further losses.

It has not recovered the money already lost.

That leaves two separate judgments.

The 1996 sale was poor long-term value.

The repurchase, agreed in December 2024 and completed in January 2025, was a rational way of ending it.

Blurring those together would let the original decision escape scrutiny.

The estate now needs another £9 billion

The government has committed around £9 billion over ten years to modernise military housing, with around 43,000 homes modernised or rebuilt by 2035 and the 1,000 worst-condition properties prioritised first. This sits alongside a separate, self-funding strand of the same strategy: a Defence Development Fund intended to release surplus defence land for more than 100,000 new homes for military and civilian use, reinvesting the proceeds rather than drawing on the £9 billion itself.

There is a clear case for the £9 billion renewal spending.

Service-family housing has suffered from years of underinvestment and poor conditions.

But it also underlines the scale of the original mistake.

Government first sold the estate.

Then rented it back.

Then paid nearly £6 billion to regain control.

Now it is spending roughly £9 billion more to repair and modernise it, ninety times the £100 million refurbishment fund the 1996 sale was supposed to provide.

At the Public Accounts Committee's hearing on 11 September 2026, the committee's own assessment was blunt: the repurchase "ended an expensive arrangement, but" did not undo "nearly three decades of poor value and weakened control over a vital part of the defence estate."

Accountability should not stop with one minister

Michael Portillo carries the clearest political responsibility because he was Defence Secretary when the sale was promoted and completed, and because he personally dismissed the contemporaneous warnings in Parliament.

But the failure was institutional as well as political.

The MoD designed and administered the transaction.

Successive governments then lived with the arrangement for decades.

The department did not seriously begin exploring a fundamental change until many years later. At the September hearing, committee member Chris Kane put the delay to the MoD's Permanent Secretary directly: "Why did it take so long, nearly 25 years?" Jeremy Pocklington's response was that it was "quite hard to judge" whether more could have been done sooner, pointing instead to the 2019 accounting rule change and the later court victory as what finally created the leverage to act.

So responsibility sits at several levels:

Michael Portillo and the Major government for taking and defending the original sale decision against warnings made at the time.

The Ministry of Defence for structuring and managing the arrangement.

Successive governments and MoD leadership for allowing an increasingly expensive model to continue for nearly 25 years before unwinding it.

The current government and current MoD leadership should be judged separately on whether the buyback and new housing strategy actually produce better value from this point forward.

That is the fair allocation of responsibility.

The wider lesson is about selling public assets for short-term cash

The PAC is now explicitly asking what lessons government has learned before departments sell other public assets.

That is where the story becomes current.

Sale-and-leaseback deals can look attractive because the upfront receipt is immediate and visible.

The cost of renting the asset for decades is somebody else's budget problem later.

Annington shows where that logic can end.

The government received £1.7 billion in 1996, against a promise of £100 million for refurbishment.

It later paid around £230 million a year in rent.

It eventually spent close to £6 billion buying most of the estate back.

The NAO puts the cumulative disadvantage at £14.5 billion.

The question is no longer whether the original policy worked.

It did not, and the people who said so at the time were not heeded.

The question is whether government has changed the rules and incentives that allowed it to happen in the first place.

The Major government made the decision.

Portillo defended it against the warnings.

The taxpayer spent the next three decades paying for it.

Sources: NAO, The repurchase of the service family accommodation estate, NAO PDF, June 2026; NAO, 1997: The Sale of the Married Quarters Estate; Hansard, 16 July 1996: Ministry of Defence Housing; House of Commons Library: Armed forces family housing and Annington Homes; PAC oral evidence, 11 September 2026; Construction Enquirer, Dec 2024; Defence Housing Strategy 2025 summary, GOV.UK; Wired-GOV: Defence Housing Strategy announcement$n$ WHERE slug::text = $k$7pqvf1c0db$k$ AND body_text = $o$The Ministry of Defence has bought back more than 36,000 military homes for close to £6 billion after a 1996 sale-and-leaseback deal left the taxpayer an estimated £14.5 billion worse off, the National Audit Office has found.

The political responsibility for the original decision sits with the Conservative government led by John Major and, most directly, with Michael Portillo, then Defence Secretary, who personally defended the sale in the Commons before it went ahead.

The MoD sold 57,434 married quarters to Annington in 1996 for £1.7 billion, leasing back around 55,000 of them while keeping responsibility for managing and maintaining the properties. By 2024, it was paying around £230 million a year in rent — roughly £630,000 a day.

The MoD agreed the buyback in December 2024 and completed it on 9 January 2025, repurchasing 36,347 of those homes for £5.99 billion. The National Audit Office says the buyback itself represents value for money compared with continuing the lease arrangement. But by the time the repurchase was agreed, the department was £14.5 billion worse off than if it had never entered the 1996 deal.

That is the distinction that matters.

The current government did not create the loss.

It inherited it and has paid heavily to stop it getting worse.

The decision that created the exposure was taken nearly three decades earlier.

Portillo defended the sale before it happened — and promised a specific, modest return

In the Commons on 16 July 1996, Michael Portillo made the government's case directly: "The Ministry has not been good at owning houses. In too many cases, their quality has fallen below the standard that service families have a right to expect." He argued that giving up ownership would let the private sector manage the estate better, telling MPs: "The Ministry will do better and service families will benefit by our giving up ownership."

The benefit Portillo promised was specific and, in hindsight, strikingly small set against what followed: "The sale of married quarters will provide the Ministry with an extra £100 million, which it would not otherwise have had, to spend on extra refurbishment." The MoD's own 1997 audit of the sale recorded that around 12,000 of 64,000 quarters in England and Wales — 19% — were standing empty at the time, and cited a 1992 Housing Task Force finding that the estate was in poor condition and "not managed as efficiently as they could be." That was the problem the £100 million was meant to fix.

Three decades later, the government is committing roughly £9 billion to the same underlying problem — modernising or rebuilding around 43,000 homes by 2035 and the 1,000 worst-condition properties prioritised first. The gap between the £100 million refurbishment fund Portillo promised the sale would unlock and the £9 billion now required is itself a measure of how badly the deal under-delivered on its own stated terms.

The warnings were not purely hindsight

The sale was contested at the time, not just in retrospect. In the same July 1996 debate, the shadow defence secretary, Dr David Clark, told the Commons: "The speculators will call the tune, not military demands," and warned that "service families feel betrayed and deserted by the Government." He read into the record the Royal British Legion's own objection — that the proposals "pose a threat to the ethos of Service life and demonstrate ignorance of Service people's real needs" — and the Army Families Federation's warning that "irretrievable damage will be done to Service life if the Government sells off Service homes." Bruce George, then a member of the Defence Select Committee, told MPs: "The morale of service men, already low, will plummet even further. This is being done unnecessarily."

Portillo rejected those objections and pressed ahead.

That matters because the later failure cannot be treated simply as a risk nobody could have imagined. Service organisations and the opposition told Parliament, before the sale went through, broadly what eventually happened: a loss of control over the estate that cost service families and the taxpayer for decades. The government made a deliberate choice to trade long-term ownership for an immediate receipt and a leaseback arrangement, over those specific objections.

The NAO's conclusion is now stark: the transaction left taxpayers billions worse off.

The NAO now describes the result as a "cautionary tale about the risks to long-term value" inherent in sale-and-leaseback transactions.

The present government has done the financially rational thing

Responsibility for creating the problem should not be confused with responsibility for ending it.

The NAO found that the repurchase negotiated by the MoD was better value than continuing to rent the homes from Annington. It said the department used its commercial leverage effectively — including accounting rule changes (IFRS 16) and a court victory over lease-enfranchisement rights — to secure a favourable outcome compared with the available alternatives.

The buyback has therefore stopped further losses.

It has not recovered the money already lost.

That leaves two separate judgments.

The 1996 sale was poor long-term value.

The repurchase, agreed in December 2024 and completed in January 2025, was a rational way of ending it.

Blurring those together would let the original decision escape scrutiny.

The estate now needs another £9 billion

The government has committed around £9 billion over ten years to modernise military housing, with around 43,000 homes modernised or rebuilt by 2035 and the 1,000 worst-condition properties prioritised first. This sits alongside a separate, self-funding strand of the same strategy — a Defence Development Fund intended to release surplus defence land for more than 100,000 new homes for military and civilian use, reinvesting the proceeds rather than drawing on the £9 billion itself.

There is a clear case for the £9 billion renewal spending.

Service-family housing has suffered from years of underinvestment and poor conditions.

But it also underlines the scale of the original mistake.

Government first sold the estate.

Then rented it back.

Then paid nearly £6 billion to regain control.

Now it is spending roughly £9 billion more to repair and modernise it — ninety times the £100 million refurbishment fund the 1996 sale was supposed to provide.

At the Public Accounts Committee's hearing on 11 September 2026, the committee's own assessment was blunt: the repurchase "ended an expensive arrangement, but" did not undo "nearly three decades of poor value and weakened control over a vital part of the defence estate."

Accountability should not stop with one minister

Michael Portillo carries the clearest political responsibility because he was Defence Secretary when the sale was promoted and completed, and because he personally dismissed the contemporaneous warnings in Parliament.

But the failure was institutional as well as political.

The MoD designed and administered the transaction.

Successive governments then lived with the arrangement for decades.

The department did not seriously begin exploring a fundamental change until many years later. At the September hearing, committee member Chris Kane put the delay to the MoD's Permanent Secretary directly: "Why did it take so long — nearly 25 years?" Jeremy Pocklington's response was that it was "quite hard to judge" whether more could have been done sooner, pointing instead to the 2019 accounting rule change and the later court victory as what finally created the leverage to act.

So responsibility sits at several levels:

Michael Portillo and the Major government for taking and defending the original sale decision against warnings made at the time.

The Ministry of Defence for structuring and managing the arrangement.

Successive governments and MoD leadership for allowing an increasingly expensive model to continue for nearly 25 years before unwinding it.

The current government and current MoD leadership should be judged separately on whether the buyback and new housing strategy actually produce better value from this point forward.

That is the fair allocation of responsibility.

The wider lesson is about selling public assets for short-term cash

The PAC is now explicitly asking what lessons government has learned before departments sell other public assets.

That is where the story becomes current.

Sale-and-leaseback deals can look attractive because the upfront receipt is immediate and visible.

The cost of renting the asset for decades is somebody else's budget problem later.

Annington shows where that logic can end.

The government received £1.7 billion in 1996, against a promise of £100 million for refurbishment.

It later paid around £230 million a year in rent.

It eventually spent close to £6 billion buying most of the estate back.

The NAO puts the cumulative disadvantage at £14.5 billion.

The question is no longer whether the original policy worked.

It did not — and the people who said so at the time were not heeded.

The question is whether government has changed the rules and incentives that allowed it to happen in the first place.

The Major government made the decision.

Portillo defended it against the warnings.

The taxpayer spent the next three decades paying for it.

Sources: NAO — The repurchase of the service family accommodation estate, NAO PDF, June 2026; NAO, 1997 — The Sale of the Married Quarters Estate; Hansard, 16 July 1996 — Ministry of Defence Housing; House of Commons Library — Armed forces family housing and Annington Homes; PAC oral evidence, 11 September 2026; Construction Enquirer, Dec 2024; Defence Housing Strategy 2025 summary, GOV.UK; Wired-GOV — Defence Housing Strategy announcement$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$7pqvf1c0db$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$pb4k9mxw7r$k$, 'body_text', $o$Home Secretary Shabana Mahmood announced on 15 September that the government will fund more than 500 additional enforcement specialists for economic crime, as part of a £550 million anti-money laundering and asset recovery strategy covering 2026 to 2029. "We are putting 500 more officers on the trail of dirty money, going after the criminal bosses behind organised crime and stripping them of the funds they use to fuel drug trafficking, people smuggling and other serious crime," she said.

Of the £550 million, £520 million comes from the Economic Crime Levy, paid by businesses already regulated under anti-money laundering rules. A further £30 million comes from a high-streets package announced at Budget 2025. The strategy's stated goals are recovering more criminal assets, dismantling more laundering networks and improving prosecutions, intelligence and supervision.

The strategy does not attach a number to any of those goals. It lists assets recovered as one of the indicators that will be monitored, but does not state how large an increase would count as success. A Theory of Change and outcomes framework, including indicators for the new measures, is still being developed and will be produced later, alongside promised mid-point and final progress reports.

The previous economic crime plan took a different approach. When Economic Crime Plan 2 launched in March 2023, the Home Office and HM Treasury announced £400 million — £200 million from government, £200 million from the levy — and an uplift of 475 financial-crime investigators, tied to a specific ten-year objective: recover an additional £1 billion in criminal assets.

The new strategy says 99 per cent of those 475 posts have now been recruited. The Home Office has not yet published a process evaluation of what that staffing uplift achieved; the strategy says the evaluation is due later in 2026. A progress report from September 2025 said the department was still exploring whether an impact evaluation could establish what measurable changes, if any, were caused by the additional staff. The government is adding a further 500 enforcement specialists before that question about the first 475 has been answered.

Asset recovery has risen in the period since the 2023 plan. Official statistics for 2025/26 show £345.3 million recovered through confiscation, forfeiture and civil recovery powers, 20 per cent more than the previous year and 29 per cent higher in real terms than in 2020/21.

That total is not evenly spread across the three powers. Forfeiture receipts rose 28 per cent to £155.9 million. Civil recovery rose from £7.5 million to £38.5 million. Confiscation receipts, the largest single category, fell 5 per cent to £150.9 million.

A further £1.1 billion of assets was denied to criminals during the year, including £677 million under restraint orders and £376.4 million seized or frozen under forfeiture powers. That money was not accessible to criminals while legal processes continued, but it is not the same as money recovered by the state, and the Home Office itself cautions against treating the two figures as interchangeable.

Victims received £26.1 million through confiscation-order proceeds in 2025/26, 45 per cent less than the previous year, though still above the six-year median. The figure covers only compensation paid through confiscation receipts, not every form of criminal-justice compensation.

The National Crime Agency assesses that it is a realistic possibility that more than £100 billion is laundered through or within the UK, or through UK-registered corporate structures, each year. A separate Home Office analysis published alongside the new strategy puts the identified proceeds of certain profit-driven crimes in England and Wales in 2023/24 at least £21.9 billion. The Home Office says explicitly that this second figure should not be used as a measure of anti-money laundering performance or treated as an estimate of assets available to be recovered, since criminal proceeds may already have been spent, moved overseas, concealed or otherwise placed beyond reach.

Part of the £550 million is funded through changes to the Economic Crime Levy that took effect in April 2026. Firms with UK revenues above £1 billion moved from a £500,000 to a £1 million annual charge. A new £500,000 band was introduced for businesses with revenues between £500 million and £1 billion. Treasury estimates these changes will raise an additional £110 million in 2027/28 and around £115 million a year after that — revenue from the rate change itself, not the total £520 million the strategy draws from the levy.

Some recovered money already returns to enforcement. In 2025/26, £129.6 million was distributed to Proceeds of Crime Act agencies through the Asset Recovery Incentivisation Scheme, with a further £12.8 million awarded to 18 projects through its central funding pot.

The strategy sets out detailed delivery milestones for individual reforms and says tracking will tighten once the outcomes framework is built, with a progress report at the programme's midpoint and another at its end. What it does not yet say is how much higher than £345.3 million the government expects annual recovery to be by 2029, or what scale of change in the 475-officer uplift's results would justify the judgment that a further 500 specialists are worth the money.$o$);
  UPDATE public.editorials SET body_text = $n$Home Secretary Shabana Mahmood announced on 15 September that the government will fund more than 500 additional enforcement specialists for economic crime, as part of a £550 million anti-money laundering and asset recovery strategy covering 2026 to 2029. "We are putting 500 more officers on the trail of dirty money, going after the criminal bosses behind organised crime and stripping them of the funds they use to fuel drug trafficking, people smuggling and other serious crime," she said.

Of the £550 million, £520 million comes from the Economic Crime Levy, paid by businesses already regulated under anti-money laundering rules. A further £30 million comes from a high-streets package announced at Budget 2025. The strategy's stated goals are recovering more criminal assets, dismantling more laundering networks and improving prosecutions, intelligence and supervision.

The strategy does not attach a number to any of those goals. It lists assets recovered as one of the indicators that will be monitored, but does not state how large an increase would count as success. A Theory of Change and outcomes framework, including indicators for the new measures, is still being developed and will be produced later, alongside promised mid-point and final progress reports.

The previous economic crime plan took a different approach. When Economic Crime Plan 2 launched in March 2023, the Home Office and HM Treasury announced £400 million (£200 million from government, £200 million from the levy) and an uplift of 475 financial-crime investigators, tied to a specific ten-year objective: recover an additional £1 billion in criminal assets.

The new strategy says 99 per cent of those 475 posts have now been recruited. The Home Office has not yet published a process evaluation of what that staffing uplift achieved; the strategy says the evaluation is due later in 2026. A progress report from September 2025 said the department was still exploring whether an impact evaluation could establish what measurable changes, if any, were caused by the additional staff. The government is adding a further 500 enforcement specialists before that question about the first 475 has been answered.

Asset recovery has risen in the period since the 2023 plan. Official statistics for 2025/26 show £345.3 million recovered through confiscation, forfeiture and civil recovery powers, 20 per cent more than the previous year and 29 per cent higher in real terms than in 2020/21.

That total is not evenly spread across the three powers. Forfeiture receipts rose 28 per cent to £155.9 million. Civil recovery rose from £7.5 million to £38.5 million. Confiscation receipts, the largest single category, fell 5 per cent to £150.9 million.

A further £1.1 billion of assets was denied to criminals during the year, including £677 million under restraint orders and £376.4 million seized or frozen under forfeiture powers. That money was not accessible to criminals while legal processes continued, but it is not the same as money recovered by the state, and the Home Office itself cautions against treating the two figures as interchangeable.

Victims received £26.1 million through confiscation-order proceeds in 2025/26, 45 per cent less than the previous year, though still above the six-year median. The figure covers only compensation paid through confiscation receipts, not every form of criminal-justice compensation.

The National Crime Agency assesses that it is a realistic possibility that more than £100 billion is laundered through or within the UK, or through UK-registered corporate structures, each year. A separate Home Office analysis published alongside the new strategy puts the identified proceeds of certain profit-driven crimes in England and Wales in 2023/24 at least £21.9 billion. The Home Office says explicitly that this second figure should not be used as a measure of anti-money laundering performance or treated as an estimate of assets available to be recovered, since criminal proceeds may already have been spent, moved overseas, concealed or otherwise placed beyond reach.

Part of the £550 million is funded through changes to the Economic Crime Levy that took effect in April 2026. Firms with UK revenues above £1 billion moved from a £500,000 to a £1 million annual charge. A new £500,000 band was introduced for businesses with revenues between £500 million and £1 billion. Treasury estimates these changes will raise an additional £110 million in 2027/28 and around £115 million a year after that. That is revenue from the rate change itself, not the total £520 million the strategy draws from the levy.

Some recovered money already returns to enforcement. In 2025/26, £129.6 million was distributed to Proceeds of Crime Act agencies through the Asset Recovery Incentivisation Scheme, with a further £12.8 million awarded to 18 projects through its central funding pot.

The strategy sets out detailed delivery milestones for individual reforms and says tracking will tighten once the outcomes framework is built, with a progress report at the programme's midpoint and another at its end. What it does not yet say is how much higher than £345.3 million the government expects annual recovery to be by 2029, or what scale of change in the 475-officer uplift's results would justify the judgment that a further 500 specialists are worth the money.$n$ WHERE slug::text = $k$pb4k9mxw7r$k$ AND body_text = $o$Home Secretary Shabana Mahmood announced on 15 September that the government will fund more than 500 additional enforcement specialists for economic crime, as part of a £550 million anti-money laundering and asset recovery strategy covering 2026 to 2029. "We are putting 500 more officers on the trail of dirty money, going after the criminal bosses behind organised crime and stripping them of the funds they use to fuel drug trafficking, people smuggling and other serious crime," she said.

Of the £550 million, £520 million comes from the Economic Crime Levy, paid by businesses already regulated under anti-money laundering rules. A further £30 million comes from a high-streets package announced at Budget 2025. The strategy's stated goals are recovering more criminal assets, dismantling more laundering networks and improving prosecutions, intelligence and supervision.

The strategy does not attach a number to any of those goals. It lists assets recovered as one of the indicators that will be monitored, but does not state how large an increase would count as success. A Theory of Change and outcomes framework, including indicators for the new measures, is still being developed and will be produced later, alongside promised mid-point and final progress reports.

The previous economic crime plan took a different approach. When Economic Crime Plan 2 launched in March 2023, the Home Office and HM Treasury announced £400 million — £200 million from government, £200 million from the levy — and an uplift of 475 financial-crime investigators, tied to a specific ten-year objective: recover an additional £1 billion in criminal assets.

The new strategy says 99 per cent of those 475 posts have now been recruited. The Home Office has not yet published a process evaluation of what that staffing uplift achieved; the strategy says the evaluation is due later in 2026. A progress report from September 2025 said the department was still exploring whether an impact evaluation could establish what measurable changes, if any, were caused by the additional staff. The government is adding a further 500 enforcement specialists before that question about the first 475 has been answered.

Asset recovery has risen in the period since the 2023 plan. Official statistics for 2025/26 show £345.3 million recovered through confiscation, forfeiture and civil recovery powers, 20 per cent more than the previous year and 29 per cent higher in real terms than in 2020/21.

That total is not evenly spread across the three powers. Forfeiture receipts rose 28 per cent to £155.9 million. Civil recovery rose from £7.5 million to £38.5 million. Confiscation receipts, the largest single category, fell 5 per cent to £150.9 million.

A further £1.1 billion of assets was denied to criminals during the year, including £677 million under restraint orders and £376.4 million seized or frozen under forfeiture powers. That money was not accessible to criminals while legal processes continued, but it is not the same as money recovered by the state, and the Home Office itself cautions against treating the two figures as interchangeable.

Victims received £26.1 million through confiscation-order proceeds in 2025/26, 45 per cent less than the previous year, though still above the six-year median. The figure covers only compensation paid through confiscation receipts, not every form of criminal-justice compensation.

The National Crime Agency assesses that it is a realistic possibility that more than £100 billion is laundered through or within the UK, or through UK-registered corporate structures, each year. A separate Home Office analysis published alongside the new strategy puts the identified proceeds of certain profit-driven crimes in England and Wales in 2023/24 at least £21.9 billion. The Home Office says explicitly that this second figure should not be used as a measure of anti-money laundering performance or treated as an estimate of assets available to be recovered, since criminal proceeds may already have been spent, moved overseas, concealed or otherwise placed beyond reach.

Part of the £550 million is funded through changes to the Economic Crime Levy that took effect in April 2026. Firms with UK revenues above £1 billion moved from a £500,000 to a £1 million annual charge. A new £500,000 band was introduced for businesses with revenues between £500 million and £1 billion. Treasury estimates these changes will raise an additional £110 million in 2027/28 and around £115 million a year after that — revenue from the rate change itself, not the total £520 million the strategy draws from the levy.

Some recovered money already returns to enforcement. In 2025/26, £129.6 million was distributed to Proceeds of Crime Act agencies through the Asset Recovery Incentivisation Scheme, with a further £12.8 million awarded to 18 projects through its central funding pot.

The strategy sets out detailed delivery milestones for individual reforms and says tracking will tighten once the outcomes framework is built, with a progress report at the programme's midpoint and another at its end. What it does not yet say is how much higher than £345.3 million the government expects annual recovery to be by 2029, or what scale of change in the 475-officer uplift's results would justify the judgment that a further 500 specialists are worth the money.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$pb4k9mxw7r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$rc8m4kqx7n$k$, 'body_text', $o$Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032–33.

The hospitals are Airedale General in West Yorkshire, Frimley Park in Surrey, Hinchingbrooke in Cambridgeshire, James Paget in Great Yarmouth, Leighton in Crewe, Queen Elizabeth in King's Lynn and West Suffolk Hospital in Bury St Edmunds.

The Public Accounts Committee said in April that a 2022 independent assessment had recommended replacing RAAC hospitals by 2030 at the latest. The Conservative government subsequently committed in May 2023 to rebuild all seven by the end of the decade.

That deadline is no longer being used.

The Labour government's January 2025 reset of the New Hospital Programme kept all seven RAAC replacements in its first main construction wave. Six are scheduled to begin construction in 2027–28 and Frimley Park in 2028–29. The National Audit Office says the final RAAC replacements are now expected to complete in 2032–33.

The reason the hospitals can remain open longer is not that the underlying RAAC risk has disappeared.

A new assessment commissioned by the Department of Health and Social Care and carried out by Mott MacDonald was published in December 2025. It concluded that extensive remediation had reduced most of the risk of RAAC plank collapse and that the seven hospitals could continue operating beyond 2030, provided maintenance, monitoring and further mitigation continued.

The report identified more than 80,000 RAAC roof planks across the seven hospitals.

Between 1 and 6 per cent of the planks at each site could not be accessed for remediation. Their locations are known and mitigation measures are in place, but Mott MacDonald said those untreated planks would continue to present a risk.

The assessment also depends on the buildings continuing to be maintained. Particular attention is required to keep RAAC dry because leaks and deterioration in mechanical infrastructure can increase the risk to the concrete.

Mott MacDonald said that, with continued management and maintenance, the panels may technically remain serviceable for as long as ten years beyond 2030. It also said costs and risks would increase the longer they remained in use.

The Public Accounts Committee therefore described the position more cautiously than simply saying the hospitals were safe until their replacements arrived. It said remediation had made continued operation possible but that significant risk and cost remained.

By 2025, more than £500 million had already been spent on maintenance and measures intended to protect patients and staff at RAAC hospitals. The committee was told that another £440 million would be provided while replacements were being built and described the combined cost as approaching £1 billion.

The government's formal response to the committee, published on 4 August, gives a more precise description of the second figure.

It says the seven trusts will continue receiving specific funding through NHS England's national RAAC programme for safety and mitigation work. Separately, they will collectively receive more than £440 million of operational capital over the next four years.

That capital is controlled locally by the trusts and can be used for priorities including maintaining their existing hospital estates. The government's response does not describe the entire £440 million as money ring-fenced solely for RAAC work. More than £500 million has already been spent specifically on maintenance and RAAC mitigation; the further £440 million is a separate operational allocation, not an addition to that dedicated spending.

The Department of Health and Social Care has overall responsibility for the New Hospital Programme, while NHS England is responsible for delivery. Health Secretary Wes Streeting approved the revised programme timetable in January 2025 after a government review. The department said the RAAC schemes had to remain a priority because of "substantive safety risks".

The department told the Public Accounts Committee in February that it would have preferred the RAAC hospitals to be replaced sooner, but said the pace was constrained by the construction industry's capacity to deliver several large hospitals at once. Officials said the seven schemes were still on track against the revised timetable.

The National Audit Office nevertheless identified signs of pressure. Its January report said West Suffolk was among RAAC schemes already appearing to face timetable and budgetary pressures. It warned more generally that the construction schedule was challenging and that delays in early projects could push pressure into later years.

The government's first New Hospital Programme annual report, published on 8 July, did not bring the timetable forward.

As of March, Airedale and Frimley Park were still going through strategic outline case assurance. Hinchingbrooke, James Paget, Leighton, Queen Elizabeth and West Suffolk were at outline business case development. The department said all seven would continue design and development work during 2026–27 towards the construction dates set out in the 2025 plan.

The Public Accounts Committee asked the department to report annually to Parliament on the seven replacements, including any further timetable slippage, additional costs and effects on patients and staff.

The government has accepted that recommendation. Its 4 August response says the annual report will include the timelines for the seven RAAC hospitals and will report impacts on patients and staff where timetable changes occur.$o$);
  UPDATE public.editorials SET body_text = $n$Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032-33.

The hospitals are Airedale General in West Yorkshire, Frimley Park in Surrey, Hinchingbrooke in Cambridgeshire, James Paget in Great Yarmouth, Leighton in Crewe, Queen Elizabeth in King's Lynn and West Suffolk Hospital in Bury St Edmunds.

The Public Accounts Committee said in April that a 2022 independent assessment had recommended replacing RAAC hospitals by 2030 at the latest. The Conservative government subsequently committed in May 2023 to rebuild all seven by the end of the decade.

That deadline is no longer being used.

The Labour government's January 2025 reset of the New Hospital Programme kept all seven RAAC replacements in its first main construction wave. Six are scheduled to begin construction in 2027-28 and Frimley Park in 2028-29. The National Audit Office says the final RAAC replacements are now expected to complete in 2032-33.

The reason the hospitals can remain open longer is not that the underlying RAAC risk has disappeared.

A new assessment commissioned by the Department of Health and Social Care and carried out by Mott MacDonald was published in December 2025. It concluded that extensive remediation had reduced most of the risk of RAAC plank collapse and that the seven hospitals could continue operating beyond 2030, provided maintenance, monitoring and further mitigation continued.

The report identified more than 80,000 RAAC roof planks across the seven hospitals.

Between 1 and 6 per cent of the planks at each site could not be accessed for remediation. Their locations are known and mitigation measures are in place, but Mott MacDonald said those untreated planks would continue to present a risk.

The assessment also depends on the buildings continuing to be maintained. Particular attention is required to keep RAAC dry because leaks and deterioration in mechanical infrastructure can increase the risk to the concrete.

Mott MacDonald said that, with continued management and maintenance, the panels may technically remain serviceable for as long as ten years beyond 2030. It also said costs and risks would increase the longer they remained in use.

The Public Accounts Committee therefore described the position more cautiously than simply saying the hospitals were safe until their replacements arrived. It said remediation had made continued operation possible but that significant risk and cost remained.

By 2025, more than £500 million had already been spent on maintenance and measures intended to protect patients and staff at RAAC hospitals. The committee was told that another £440 million would be provided while replacements were being built and described the combined cost as approaching £1 billion.

The government's formal response to the committee, published on 4 August, gives a more precise description of the second figure.

It says the seven trusts will continue receiving specific funding through NHS England's national RAAC programme for safety and mitigation work. Separately, they will collectively receive more than £440 million of operational capital over the next four years.

That capital is controlled locally by the trusts and can be used for priorities including maintaining their existing hospital estates. The government's response does not describe the entire £440 million as money ring-fenced solely for RAAC work. More than £500 million has already been spent specifically on maintenance and RAAC mitigation; the further £440 million is a separate operational allocation, not an addition to that dedicated spending.

The Department of Health and Social Care has overall responsibility for the New Hospital Programme, while NHS England is responsible for delivery. Health Secretary Wes Streeting approved the revised programme timetable in January 2025 after a government review. The department said the RAAC schemes had to remain a priority because of "substantive safety risks".

The department told the Public Accounts Committee in February that it would have preferred the RAAC hospitals to be replaced sooner, but said the pace was constrained by the construction industry's capacity to deliver several large hospitals at once. Officials said the seven schemes were still on track against the revised timetable.

The National Audit Office nevertheless identified signs of pressure. Its January report said West Suffolk was among RAAC schemes already appearing to face timetable and budgetary pressures. It warned more generally that the construction schedule was challenging and that delays in early projects could push pressure into later years.

The government's first New Hospital Programme annual report, published on 8 July, did not bring the timetable forward.

As of March, Airedale and Frimley Park were still going through strategic outline case assurance. Hinchingbrooke, James Paget, Leighton, Queen Elizabeth and West Suffolk were at outline business case development. The department said all seven would continue design and development work during 2026-27 towards the construction dates set out in the 2025 plan.

The Public Accounts Committee asked the department to report annually to Parliament on the seven replacements, including any further timetable slippage, additional costs and effects on patients and staff.

The government has accepted that recommendation. Its 4 August response says the annual report will include the timelines for the seven RAAC hospitals and will report impacts on patients and staff where timetable changes occur.$n$ WHERE slug::text = $k$rc8m4kqx7n$k$ AND body_text = $o$Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032–33.

The hospitals are Airedale General in West Yorkshire, Frimley Park in Surrey, Hinchingbrooke in Cambridgeshire, James Paget in Great Yarmouth, Leighton in Crewe, Queen Elizabeth in King's Lynn and West Suffolk Hospital in Bury St Edmunds.

The Public Accounts Committee said in April that a 2022 independent assessment had recommended replacing RAAC hospitals by 2030 at the latest. The Conservative government subsequently committed in May 2023 to rebuild all seven by the end of the decade.

That deadline is no longer being used.

The Labour government's January 2025 reset of the New Hospital Programme kept all seven RAAC replacements in its first main construction wave. Six are scheduled to begin construction in 2027–28 and Frimley Park in 2028–29. The National Audit Office says the final RAAC replacements are now expected to complete in 2032–33.

The reason the hospitals can remain open longer is not that the underlying RAAC risk has disappeared.

A new assessment commissioned by the Department of Health and Social Care and carried out by Mott MacDonald was published in December 2025. It concluded that extensive remediation had reduced most of the risk of RAAC plank collapse and that the seven hospitals could continue operating beyond 2030, provided maintenance, monitoring and further mitigation continued.

The report identified more than 80,000 RAAC roof planks across the seven hospitals.

Between 1 and 6 per cent of the planks at each site could not be accessed for remediation. Their locations are known and mitigation measures are in place, but Mott MacDonald said those untreated planks would continue to present a risk.

The assessment also depends on the buildings continuing to be maintained. Particular attention is required to keep RAAC dry because leaks and deterioration in mechanical infrastructure can increase the risk to the concrete.

Mott MacDonald said that, with continued management and maintenance, the panels may technically remain serviceable for as long as ten years beyond 2030. It also said costs and risks would increase the longer they remained in use.

The Public Accounts Committee therefore described the position more cautiously than simply saying the hospitals were safe until their replacements arrived. It said remediation had made continued operation possible but that significant risk and cost remained.

By 2025, more than £500 million had already been spent on maintenance and measures intended to protect patients and staff at RAAC hospitals. The committee was told that another £440 million would be provided while replacements were being built and described the combined cost as approaching £1 billion.

The government's formal response to the committee, published on 4 August, gives a more precise description of the second figure.

It says the seven trusts will continue receiving specific funding through NHS England's national RAAC programme for safety and mitigation work. Separately, they will collectively receive more than £440 million of operational capital over the next four years.

That capital is controlled locally by the trusts and can be used for priorities including maintaining their existing hospital estates. The government's response does not describe the entire £440 million as money ring-fenced solely for RAAC work. More than £500 million has already been spent specifically on maintenance and RAAC mitigation; the further £440 million is a separate operational allocation, not an addition to that dedicated spending.

The Department of Health and Social Care has overall responsibility for the New Hospital Programme, while NHS England is responsible for delivery. Health Secretary Wes Streeting approved the revised programme timetable in January 2025 after a government review. The department said the RAAC schemes had to remain a priority because of "substantive safety risks".

The department told the Public Accounts Committee in February that it would have preferred the RAAC hospitals to be replaced sooner, but said the pace was constrained by the construction industry's capacity to deliver several large hospitals at once. Officials said the seven schemes were still on track against the revised timetable.

The National Audit Office nevertheless identified signs of pressure. Its January report said West Suffolk was among RAAC schemes already appearing to face timetable and budgetary pressures. It warned more generally that the construction schedule was challenging and that delays in early projects could push pressure into later years.

The government's first New Hospital Programme annual report, published on 8 July, did not bring the timetable forward.

As of March, Airedale and Frimley Park were still going through strategic outline case assurance. Hinchingbrooke, James Paget, Leighton, Queen Elizabeth and West Suffolk were at outline business case development. The department said all seven would continue design and development work during 2026–27 towards the construction dates set out in the 2025 plan.

The Public Accounts Committee asked the department to report annually to Parliament on the seven replacements, including any further timetable slippage, additional costs and effects on patients and staff.

The government has accepted that recommendation. Its 4 August response says the annual report will include the timelines for the seven RAAC hospitals and will report impacts on patients and staff where timetable changes occur.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$rc8m4kqx7n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$fogrncq5oy$k$, 'body_text', $o$The government says Britain is being readied for winter with £24 billion for roads, £2.6 billion for rail resilience and £1.4 billion for flood defences.

Most of that money is not new.

The £24 billion road figure comes from the 2025 Spending Review and covers four years from 2026/27 to 2029/30. It is a broad roads settlement, not a winter emergency fund created this week.

The £1.4 billion flood programme is also an annual Environment Agency capital and maintenance budget, and its own published breakdown doesn't actually add up to the headline figure. The government's releases account for £830 million for new or replacement flood assets and £260 million for maintaining existing infrastructure — £1.09 billion between them, leaving roughly £310 million of the £1.4 billion unexplained in any of the documents announcing it.

The spending is real. The presentation is doing something else.

It takes long-term infrastructure budgets and uses them as evidence that communities are protected this winter, even where the work is still under way, intended to deliver benefits over several years, or not fully itemised to begin with.

That distinction matters.

The government is not announcing £28 billion of new winter protection.

It is pointing to existing transport and flood programmes and presenting them as proof of winter readiness.

There is some evidence in its favour. The Environment Agency ended 2025/26 with 93 per cent of its high-consequence flood assets in target condition, above its 92 per cent target, and 61,898 homes and businesses were better protected during the 2024-2026 programme — well past the programme's own target of 52,000.

That is measurable delivery, and it beat what the government set out to do.

The rail picture is less comfortable.

The government says £2.6 billion is being invested through Network Rail to make the railway more resilient to severe weather and climate change.

But the Office of Rail and Road found that Network Rail's asset strategies remain "largely short-term and reactive, rather than reflecting a long-term asset sustainability strategy," and that weather-resilience and climate-adaptation work planned for the year was not completed as intended in Wales & Western and North West & Central — delays the regulator linked, in Wales & Western's case, to contractor problems getting resilience sites built.

That does not mean the £2.6 billion is being wasted.

It means the existence of a spending programme is not the same thing as completed resilience.

The same caution applies to roads.

The National Audit Office has previously criticised the Department for Transport for not having a good enough understanding of local-road condition and for being unable to show clearly whether the money it distributed was improving the network.

The government has since moved towards longer-term settlements and stronger reporting requirements, which is a sensible response.

But the £24 billion headline still tells readers how much money has been committed, not how much winter resilience has actually been delivered.

There is another piece of presentation in the weather warning itself.

The Cabinet Office says a strong El Niño could make wetter and stormier conditions more likely.

That is possible.

But the government's own cross-departmental assessment, facilitated by the Government Office for Science, says the impacts of El Niño on the UK "are less certain and cannot be confidently predicted" — precisely because this could be the largest El Niño event on record, with effects that haven't been seen before.

So the government is justified in preparing for bad weather.

What it cannot do is turn uncertainty into evidence that existing budgets amount to a completed protective shield.

The stronger claim would be much narrower.

Government has money allocated for road maintenance, rail resilience and flood defences, and roughly £310 million of the flood figure isn't accounted for in anything it has published.

Some of those programmes are delivering measurable improvements, in the Environment Agency's case beating its own targets.

Others are still incomplete, and regulators continue to identify weaknesses in planning and execution.

The difference between those two positions is the difference between preparedness and presentation.

The government says communities are protected.

The underlying documents say parts of the system are still catching up, and in one case, the government hasn't even said where a fifth of the money is going.

Sources: Cabinet Office winter resilience announcement; Spending Review 2025; Environment Agency business plan 2026-27; Environment Agency corporate scorecard Q4 2025-26; £1.4bn flood investment announcement; ORR annual assessment of Network Rail, asset management; NAO — condition and maintenance of local roads in England; Impacts of El Niño on the UK$o$);
  UPDATE public.editorials SET body_text = $n$The government says Britain is being readied for winter with £24 billion for roads, £2.6 billion for rail resilience and £1.4 billion for flood defences.

Most of that money is not new.

The £24 billion road figure comes from the 2025 Spending Review and covers four years from 2026/27 to 2029/30. It is a broad roads settlement, not a winter emergency fund created this week.

The £1.4 billion flood programme is also an annual Environment Agency capital and maintenance budget, and its own published breakdown doesn't actually add up to the headline figure. The government's releases account for £830 million for new or replacement flood assets and £260 million for maintaining existing infrastructure, £1.09 billion between them, leaving roughly £310 million of the £1.4 billion unexplained in any of the documents announcing it.

The spending is real. The presentation is doing something else.

It takes long-term infrastructure budgets and uses them as evidence that communities are protected this winter, even where the work is still under way, intended to deliver benefits over several years, or not fully itemised to begin with.

That distinction matters.

The government is not announcing £28 billion of new winter protection.

It is pointing to existing transport and flood programmes and presenting them as proof of winter readiness.

There is some evidence in its favour. The Environment Agency ended 2025/26 with 93 per cent of its high-consequence flood assets in target condition, above its 92 per cent target, and 61,898 homes and businesses were better protected during the 2024-2026 programme, well past the programme's own target of 52,000.

That is measurable delivery, and it beat what the government set out to do.

The rail picture is less comfortable.

The government says £2.6 billion is being invested through Network Rail to make the railway more resilient to severe weather and climate change.

But the Office of Rail and Road found that Network Rail's asset strategies remain "largely short-term and reactive, rather than reflecting a long-term asset sustainability strategy," and that weather-resilience and climate-adaptation work planned for the year was not completed as intended in Wales & Western and North West & Central: delays the regulator linked, in Wales & Western's case, to contractor problems getting resilience sites built.

That does not mean the £2.6 billion is being wasted.

It means the existence of a spending programme is not the same thing as completed resilience.

The same caution applies to roads.

The National Audit Office has previously criticised the Department for Transport for not having a good enough understanding of local-road condition and for being unable to show clearly whether the money it distributed was improving the network.

The government has since moved towards longer-term settlements and stronger reporting requirements, which is a sensible response.

But the £24 billion headline still tells readers how much money has been committed, not how much winter resilience has actually been delivered.

There is another piece of presentation in the weather warning itself.

The Cabinet Office says a strong El Niño could make wetter and stormier conditions more likely.

That is possible.

But the government's own cross-departmental assessment, facilitated by the Government Office for Science, says the impacts of El Niño on the UK "are less certain and cannot be confidently predicted", precisely because this could be the largest El Niño event on record, with effects that haven't been seen before.

So the government is justified in preparing for bad weather.

What it cannot do is turn uncertainty into evidence that existing budgets amount to a completed protective shield.

The stronger claim would be much narrower.

Government has money allocated for road maintenance, rail resilience and flood defences, and roughly £310 million of the flood figure isn't accounted for in anything it has published.

Some of those programmes are delivering measurable improvements, in the Environment Agency's case beating its own targets.

Others are still incomplete, and regulators continue to identify weaknesses in planning and execution.

The difference between those two positions is the difference between preparedness and presentation.

The government says communities are protected.

The underlying documents say parts of the system are still catching up, and in one case, the government hasn't even said where a fifth of the money is going.

Sources: Cabinet Office winter resilience announcement; Spending Review 2025; Environment Agency business plan 2026-27; Environment Agency corporate scorecard Q4 2025-26; £1.4bn flood investment announcement; ORR annual assessment of Network Rail, asset management; NAO: condition and maintenance of local roads in England; Impacts of El Niño on the UK$n$ WHERE slug::text = $k$fogrncq5oy$k$ AND body_text = $o$The government says Britain is being readied for winter with £24 billion for roads, £2.6 billion for rail resilience and £1.4 billion for flood defences.

Most of that money is not new.

The £24 billion road figure comes from the 2025 Spending Review and covers four years from 2026/27 to 2029/30. It is a broad roads settlement, not a winter emergency fund created this week.

The £1.4 billion flood programme is also an annual Environment Agency capital and maintenance budget, and its own published breakdown doesn't actually add up to the headline figure. The government's releases account for £830 million for new or replacement flood assets and £260 million for maintaining existing infrastructure — £1.09 billion between them, leaving roughly £310 million of the £1.4 billion unexplained in any of the documents announcing it.

The spending is real. The presentation is doing something else.

It takes long-term infrastructure budgets and uses them as evidence that communities are protected this winter, even where the work is still under way, intended to deliver benefits over several years, or not fully itemised to begin with.

That distinction matters.

The government is not announcing £28 billion of new winter protection.

It is pointing to existing transport and flood programmes and presenting them as proof of winter readiness.

There is some evidence in its favour. The Environment Agency ended 2025/26 with 93 per cent of its high-consequence flood assets in target condition, above its 92 per cent target, and 61,898 homes and businesses were better protected during the 2024-2026 programme — well past the programme's own target of 52,000.

That is measurable delivery, and it beat what the government set out to do.

The rail picture is less comfortable.

The government says £2.6 billion is being invested through Network Rail to make the railway more resilient to severe weather and climate change.

But the Office of Rail and Road found that Network Rail's asset strategies remain "largely short-term and reactive, rather than reflecting a long-term asset sustainability strategy," and that weather-resilience and climate-adaptation work planned for the year was not completed as intended in Wales & Western and North West & Central — delays the regulator linked, in Wales & Western's case, to contractor problems getting resilience sites built.

That does not mean the £2.6 billion is being wasted.

It means the existence of a spending programme is not the same thing as completed resilience.

The same caution applies to roads.

The National Audit Office has previously criticised the Department for Transport for not having a good enough understanding of local-road condition and for being unable to show clearly whether the money it distributed was improving the network.

The government has since moved towards longer-term settlements and stronger reporting requirements, which is a sensible response.

But the £24 billion headline still tells readers how much money has been committed, not how much winter resilience has actually been delivered.

There is another piece of presentation in the weather warning itself.

The Cabinet Office says a strong El Niño could make wetter and stormier conditions more likely.

That is possible.

But the government's own cross-departmental assessment, facilitated by the Government Office for Science, says the impacts of El Niño on the UK "are less certain and cannot be confidently predicted" — precisely because this could be the largest El Niño event on record, with effects that haven't been seen before.

So the government is justified in preparing for bad weather.

What it cannot do is turn uncertainty into evidence that existing budgets amount to a completed protective shield.

The stronger claim would be much narrower.

Government has money allocated for road maintenance, rail resilience and flood defences, and roughly £310 million of the flood figure isn't accounted for in anything it has published.

Some of those programmes are delivering measurable improvements, in the Environment Agency's case beating its own targets.

Others are still incomplete, and regulators continue to identify weaknesses in planning and execution.

The difference between those two positions is the difference between preparedness and presentation.

The government says communities are protected.

The underlying documents say parts of the system are still catching up, and in one case, the government hasn't even said where a fifth of the money is going.

Sources: Cabinet Office winter resilience announcement; Spending Review 2025; Environment Agency business plan 2026-27; Environment Agency corporate scorecard Q4 2025-26; £1.4bn flood investment announcement; ORR annual assessment of Network Rail, asset management; NAO — condition and maintenance of local roads in England; Impacts of El Niño on the UK$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$fogrncq5oy$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$hg0gkukta5$k$, 'body_text', $o$Government press releases are not neutral summaries of public policy.

They are written to present a decision in its strongest possible light. That does not make them false. It does mean the reader is usually being shown the benefit before the cost, the intention before the result and the headline number before the assumptions underneath it.

The problem becomes obvious when old announcements are compared with what happened next.

A scheme launched to improve 600,000 homes reached about 47,500. A housing programme presented as helping people into home ownership was used by large numbers who could have bought anyway. A £37 billion testing system was justified partly as a way to avoid further lockdowns, but Britain went through two more. A high-speed railway announced with a £32.7 billion construction estimate and a 2026 opening date is now costed at up to £102.7 billion for a route cut to less than half its original size. A migration policy built around deterrence cost hundreds of millions of pounds without relocating a single asylum seeker under the compulsory scheme.

None of those examples proves that government announcements are routinely dishonest.

They show something more mundane and more important.

The announcement is often published long before government knows whether the claim it is making will survive contact with delivery.

Whitehall has known about this weakness for years.

A 2019 review by the Prime Minister's Implementation Unit found that only 8 per cent of £432 billion of spending on major projects had robust impact-evaluation plans in place. Around £276 billion, 64 per cent of the total, had no evaluation at all. The Public Accounts Committee later said departments were still failing to publish evaluation plans and findings consistently.

That number explains a great deal.

Government is very good at announcing what money is supposed to achieve.

It has historically been much less consistent at arranging, from the beginning, to prove whether it did.

The Green Homes Grant: 600,000 homes became 47,500

The Green Homes Grant is almost a laboratory experiment in how announcement language can outrun delivery.

In 2020, Boris Johnson's government promoted the scheme as part of a green economic recovery. The public was told it would improve more than 600,000 homes, support more than 100,000 jobs and help some households save up to £600 a year.

Those numbers were forecasts.

That distinction disappeared easily in the political presentation.

The National Audit Office later found that the voucher scheme was expected to upgrade only around 47,500 homes.

Government had originally expected as many as 600,000.

The department expected to spend about £314 million of the £1.5 billion available, including £50.5 million on programme management and administration. The NAO calculated that administration alone amounted to more than £1,000 for every home upgraded.

The NAO did not say the idea of improving home energy efficiency was wrong. It said the aim of achieving immediate economic stimulus meant the scheme was rushed, and that the tension between short-term stimulus and long-term decarbonisation was never properly reconciled, leading to an overly complex scheme that could not be delivered to a satisfactory standard in the time available. Officials and external assurance had warned about the risks of proceeding quickly before launch. The department accepted those risks anyway, which constrained procurement and made it hard for installers to mobilise.

The political responsibility sat with the Johnson government. Rishi Sunak, then Chancellor, and Business Secretary Alok Sharma were among the ministers attached to the launch.

The lesson is not that ambitious targets should never be announced.

It is that 600,000 homes was not delivery. It was the maximum the scheme was intended to reach if a chain of assumptions all worked.

They did not.

By the time the audit arrived, the announcement had done its job. The correction came later, in an NAO report read by a fraction of the people who saw the launch.

Help to Buy: success depended on what question you asked

Help to Buy is more interesting because it genuinely achieved some of what government claimed.

In July 2014, Housing Minister Brandon Lewis said Help to Buy was doing "exactly what it was designed to achieve", helping families buy while accelerating the supply of new homes.

The later evidence did not demolish that case.

It complicated it.

The National Audit Office found that Help to Buy did increase home ownership and housing supply. It estimated that the scheme had generated around 78,000 additional new-build sales by December 2018.

But the department's own research found 37 per cent of participants would not have been able to buy any property at all without the scheme.

That leaves roughly three-fifths who could have bought something without government help. Of those, almost a third of all buyers — around 65,000 households — could have bought the specific property they wanted without the scheme at all.

Both accounts are true.

Help to Buy helped households into home ownership and stimulated construction.

It also used public balance-sheet capacity to support purchases for tens of thousands of people who did not strictly need government help to buy.

That is what disappears when government turns a complicated intervention into a slogan.

The scheme was designed with deliberately broad eligibility. The NAO recorded the department's view that higher-income households benefiting from it were an acceptable consequence of making the scheme widely available.

A sceptical reporter looking only for failure could wrongly conclude Help to Buy did nothing useful.

A government press release looking only for success could omit how much support went to people who could already buy.

The accurate story sits between them.

Test and Trace: a huge programme with a promise nobody could properly measure

NHS Test and Trace was created in an emergency. Any fair assessment has to begin there.

Britain needed mass testing and contact tracing at extraordinary speed.

The trouble came when government attached broader political promises to the programme.

The Department of Health justified the scale of spending partly on the basis that an effective test-and-trace system would help avoid another national lockdown.

Its budget eventually reached £37 billion over two years.

Britain subsequently had two more national lockdowns.

By March 2021, the Public Accounts Committee said there was still no clear evidence of Test and Trace's overall effectiveness or whether its contribution to reducing infections justified the cost.

Seven months later, on 27 October 2021, the committee was harsher. It said "NHST&T has not achieved its main objective to help break chains of COVID-19 transmission and enable people to return towards a more normal way of life", and that the programme had "focused on delivering programmes but outcomes have been muddled and a number of its professed aims have been overstated or not achieved."

That does not mean £37 billion was literally wasted. Nor does the fact that lockdowns occurred prove Test and Trace had no effect.

The failure was partly one of claim design.

Government tied an enormous programme to an outcome, avoiding lockdown, that depended on public behaviour, virus prevalence, testing speed, adherence to isolation rules, vaccination, new variants and many other factors.

It then lacked a robust way to isolate what the programme itself had achieved.

The announcement was simpler than the evidence could ever be.

Levelling Up: "shovel-ready" projects that were not ready to shovel

The Levelling Up Fund was launched in 2021 as a £4.8 billion programme for local infrastructure, transport and regeneration. Government releases described the money as investment intended to boost growth across the UK.

The later delivery picture was slower.

The National Audit Office found that by March 2023, across the Levelling Up Fund, Towns Fund and UK Shared Prosperity Fund, government had distributed around £2 billion, while local areas had spent about £948 million of it.

Projects were behind schedule and original deadlines looked unlikely to be met. Half of the main construction contracts for Levelling Up Fund Round 1 projects due by March 2024 were unsigned. For Round 2 projects due by March 2025, that rose to 85 per cent.

Some delays were outside government's control. Inflation, labour shortages and construction problems all mattered.

Others were created by Whitehall.

The NAO found funding announcements and approvals were themselves late. Local authorities submitting UK Shared Prosperity Fund investment plans by 1 August 2022 did not get them approved until December, leaving three months of that financial year to spend their allocation instead of the twelve they'd expected.

Here the spin problem was subtle.

Money had genuinely been allocated.

Projects genuinely existed.

But allocating money was repeatedly presented as though the economic benefit attached to the project had already begun.

A press release can announce £20 million for a town in an afternoon.

Buying land, obtaining planning permission, tendering a contract and constructing the thing may take years.

The headline runs on announcement day.

The outcome arrives, if it arrives, much later.

HS2: the most expensive lesson in the difference between an estimate and a promise

Few British projects show the danger of early certainty better than HS2.

On 10 January 2012, Transport Secretary Justine Greening told Parliament the complete Y-shaped network linking London, Birmingham, Manchester and Leeds would cost £32.7 billion at 2011 prices.

London to the West Midlands was expected to open in 2026. The northern legs, plus a Heathrow connection, were expected in 2032-33.

Government modelling put the benefits at up to £47 billion, with up to £34 billion in fare revenues over 60 years.

By January 2020, the National Audit Office said HS2 was over budget and behind schedule because DfT, HS2 Ltd and wider government had underestimated its complexity and risk, and had not sufficiently grasped that it was a much larger and more challenging programme to deliver than other infrastructure projects. The estimated cost had risen to £65 billion to £88 billion in 2015 prices, with full services then forecast between 2036 and 2040 — three to seven years later than originally planned.

The project then got smaller as well as more expensive. In October 2023, Rishi Sunak cancelled the legs to Manchester and Leeds, cutting the network to a fraction of what Greening had described.

By May 2026, the Transport Secretary, Heidi Alexander, told Parliament the cost of what remained — London to Birmingham — now sat between £87.7 billion and £102.7 billion. Adjusted for inflation, Greening's original £32.7 billion is worth roughly £50 billion today. The project has therefore roughly doubled in real cost while shrinking to less than half its planned route.

The NAO had already warned in 2013 about the timetable and in 2016 that the 2026 opening date was at risk.

Responsibility cannot sensibly be pinned on one minister.

The Cameron government approved the project and made the early cost and timetable claims. DfT and HS2 Ltd underestimated complexity and risk. Successive governments continued, then cut, the project — and the costs kept rising even as the scope fell.

The lesson is not that infrastructure estimates are useless.

It is that the earlier in a megaproject's life an estimate is produced, the more uncertainty sits behind it.

Political communication tends to do the reverse. It gives the earliest number the cleanest presentation.

Rwanda: deterrence was the promised outcome, but government could not prove it

The Rwanda partnership was announced by Boris Johnson's government in April 2022 and signed by Home Secretary Priti Patel.

Its purpose was explicit: deter irregular entry and relocate some people arriving through irregular routes to Rwanda.

There was a problem from the beginning.

Home Office Permanent Secretary Matthew Rycroft sought a ministerial direction because he could not provide the normal assurance that the scheme represented value for money.

He wrote that "evidence of a deterrent effect is highly uncertain and cannot be quantified with sufficient certainty" to give him that assurance, and that he did not believe sufficient evidence could be obtained to show the policy would have a deterrent effect significant enough to make it value for money.

Priti Patel directed the department to proceed anyway.

The policy then became trapped in litigation and redesign.

The government's own later accounting showed that by June 2024, £715 million had been spent across the Rwanda partnership and implementation of the Illegal Migration Act.

During more than two years of operation, four volunteers and no asylum seekers were sent to Rwanda under the compulsory relocation policy.

That £715 million was not all a payment to Rwanda. £290 million went directly to the Rwandan government — £270 million into an Economic Transformation and Integration Fund and £20 million for advance operational costs — alongside detention and reception capacity, flights, escorts, staffing and other implementation costs here. Some of that infrastructure could subsequently be used for other purposes.

The National Audit Office declined to reach a value-for-money conclusion because value depended on whether the partnership actually deterred irregular journeys.

That is the crucial point.

The policy's central claimed benefit was deterrence.

The Permanent Secretary said before launch that government did not have enough evidence to demonstrate that deterrence would be large enough to make the scheme value for money.

The government proceeded because ministers believed it could work.

The cost was measurable.

The benefit remained uncertain.

Why this keeps happening

The common thread is not that politicians always lie.

It is that political communications and serious evaluation operate on completely different clocks.

A minister needs to explain a policy on the day it is announced.

A proper evaluation may need three years.

The communications team therefore reaches for whatever is available:

the maximum number of homes that could be improved;

the number of jobs a model says might be supported;

the total value of projects allocated funding;

the savings households could receive;

the economic benefits a model predicts over 60 years;

the behaviour a policy is expected to deter.

Those can all be legitimate numbers.

Trouble starts when the grammar changes.

"Could support" becomes "will create".

"Funding allocated" becomes "investment delivered".

"A modelled saving" becomes "money saved".

"A project approved" becomes "homes unlocked".

An objective becomes an achievement.

By the time auditors arrive, the vocabulary is different.

The NAO talks about attribution, counterfactuals, administrative costs, additionality, optimism bias and value for money.

Those words rarely make good launch-day headlines.

But they determine whether the headline was worth believing.

The problem is structural, not party-specific

Most of the historical examples here come from Conservative-led governments because they governed Britain for most of the period covered.

The incentives themselves are not uniquely Conservative.

Any government wants to show action.

Departments want to demonstrate delivery.

Press offices want a clean number.

The public gets the announcement long before it gets the audit.

That is why the correct response is not automatic disbelief.

It is verification.

How to read a government press release

When government says £1 billion invested, ask whether the money has been spent, allocated or merely announced.

When it says 10,000 jobs, find out whether those jobs exist or come from an economic model.

When it says £500 saved, check whether that is an average, a maximum or a lifetime forecast.

When it says new funding, compare it with the previous Spending Review.

When it says scheme works, look for an evaluation with a comparison group rather than a count of participants.

When it says homes unlocked, count starts and completions.

And when it announces a target, find out whether anyone has been commissioned to measure whether the target was caused by the policy at all.

That is not anti-government reporting.

It is the difference between covering an announcement and covering what government actually did.

The historical record shows why the distinction matters.

The Green Homes Grant did not reach 600,000 homes.

Help to Buy helped people who needed it, and many who did not.

Test and Trace built an enormous national testing operation without producing clear evidence that its wider claims matched its cost.

Levelling Up money arrived much faster in press releases than on construction sites.

HS2's early certainty didn't just collapse once — it kept collapsing, until the project cost more in real terms for less than half the railway.

The Rwanda deterrent was politically central even though the Home Office's own Permanent Secretary said the evidence needed to demonstrate its value for money was not there.

Each began with a confident announcement.

The evidence came later.

Government press releases are valuable documents.

They tell the public what ministers want a policy to achieve.

They should not be mistaken for proof that it has.

Sources: NAO — Green Homes Grant; NAO — Help to Buy: Equity Loan scheme progress review; PAC — Test and Trace update, 27 October 2021; NAO — Levelling up funding to local government; Written statement to Parliament, 10 January 2012; NAO — High Speed Two: A progress update; ITV — HS2 spiralling costs, May 2026; Letter from Matthew Rycroft to Priti Patel; Breakdown of Home Office costs — MEDP with Rwanda; PAC — Government has no evidence spending is working$o$);
  UPDATE public.editorials SET body_text = $n$Government press releases are not neutral summaries of public policy.

They are written to present a decision in its strongest possible light. That does not make them false. It does mean the reader is usually being shown the benefit before the cost, the intention before the result and the headline number before the assumptions underneath it.

The problem becomes obvious when old announcements are compared with what happened next.

A scheme launched to improve 600,000 homes reached about 47,500. A housing programme presented as helping people into home ownership was used by large numbers who could have bought anyway. A £37 billion testing system was justified partly as a way to avoid further lockdowns, but Britain went through two more. A high-speed railway announced with a £32.7 billion construction estimate and a 2026 opening date is now costed at up to £102.7 billion for a route cut to less than half its original size. A migration policy built around deterrence cost hundreds of millions of pounds without relocating a single asylum seeker under the compulsory scheme.

None of those examples proves that government announcements are routinely dishonest.

They show something more mundane and more important.

The announcement is often published long before government knows whether the claim it is making will survive contact with delivery.

Whitehall has known about this weakness for years.

A 2019 review by the Prime Minister's Implementation Unit found that only 8 per cent of £432 billion of spending on major projects had robust impact-evaluation plans in place. Around £276 billion, 64 per cent of the total, had no evaluation at all. The Public Accounts Committee later said departments were still failing to publish evaluation plans and findings consistently.

That number explains a great deal.

Government is very good at announcing what money is supposed to achieve.

It has historically been much less consistent at arranging, from the beginning, to prove whether it did.

The Green Homes Grant: 600,000 homes became 47,500

The Green Homes Grant is almost a laboratory experiment in how announcement language can outrun delivery.

In 2020, Boris Johnson's government promoted the scheme as part of a green economic recovery. The public was told it would improve more than 600,000 homes, support more than 100,000 jobs and help some households save up to £600 a year.

Those numbers were forecasts.

That distinction disappeared easily in the political presentation.

The National Audit Office later found that the voucher scheme was expected to upgrade only around 47,500 homes.

Government had originally expected as many as 600,000.

The department expected to spend about £314 million of the £1.5 billion available, including £50.5 million on programme management and administration. The NAO calculated that administration alone amounted to more than £1,000 for every home upgraded.

The NAO did not say the idea of improving home energy efficiency was wrong. It said the aim of achieving immediate economic stimulus meant the scheme was rushed, and that the tension between short-term stimulus and long-term decarbonisation was never properly reconciled, leading to an overly complex scheme that could not be delivered to a satisfactory standard in the time available. Officials and external assurance had warned about the risks of proceeding quickly before launch. The department accepted those risks anyway, which constrained procurement and made it hard for installers to mobilise.

The political responsibility sat with the Johnson government. Rishi Sunak, then Chancellor, and Business Secretary Alok Sharma were among the ministers attached to the launch.

The lesson is not that ambitious targets should never be announced.

It is that 600,000 homes was not delivery. It was the maximum the scheme was intended to reach if a chain of assumptions all worked.

They did not.

By the time the audit arrived, the announcement had done its job. The correction came later, in an NAO report read by a fraction of the people who saw the launch.

Help to Buy: success depended on what question you asked

Help to Buy is more interesting because it genuinely achieved some of what government claimed.

In July 2014, Housing Minister Brandon Lewis said Help to Buy was doing "exactly what it was designed to achieve", helping families buy while accelerating the supply of new homes.

The later evidence did not demolish that case.

It complicated it.

The National Audit Office found that Help to Buy did increase home ownership and housing supply. It estimated that the scheme had generated around 78,000 additional new-build sales by December 2018.

But the department's own research found 37 per cent of participants would not have been able to buy any property at all without the scheme.

That leaves roughly three-fifths who could have bought something without government help. Of those, almost a third of all buyers (around 65,000 households) could have bought the specific property they wanted without the scheme at all.

Both accounts are true.

Help to Buy helped households into home ownership and stimulated construction.

It also used public balance-sheet capacity to support purchases for tens of thousands of people who did not strictly need government help to buy.

That is what disappears when government turns a complicated intervention into a slogan.

The scheme was designed with deliberately broad eligibility. The NAO recorded the department's view that higher-income households benefiting from it were an acceptable consequence of making the scheme widely available.

A sceptical reporter looking only for failure could wrongly conclude Help to Buy did nothing useful.

A government press release looking only for success could omit how much support went to people who could already buy.

The accurate story sits between them.

Test and Trace: a huge programme with a promise nobody could properly measure

NHS Test and Trace was created in an emergency. Any fair assessment has to begin there.

Britain needed mass testing and contact tracing at extraordinary speed.

The trouble came when government attached broader political promises to the programme.

The Department of Health justified the scale of spending partly on the basis that an effective test-and-trace system would help avoid another national lockdown.

Its budget eventually reached £37 billion over two years.

Britain subsequently had two more national lockdowns.

By March 2021, the Public Accounts Committee said there was still no clear evidence of Test and Trace's overall effectiveness or whether its contribution to reducing infections justified the cost.

Seven months later, on 27 October 2021, the committee was harsher. It said "NHST&T has not achieved its main objective to help break chains of COVID-19 transmission and enable people to return towards a more normal way of life", and that the programme had "focused on delivering programmes but outcomes have been muddled and a number of its professed aims have been overstated or not achieved."

That does not mean £37 billion was literally wasted. Nor does the fact that lockdowns occurred prove Test and Trace had no effect.

The failure was partly one of claim design.

Government tied an enormous programme to an outcome, avoiding lockdown, that depended on public behaviour, virus prevalence, testing speed, adherence to isolation rules, vaccination, new variants and many other factors.

It then lacked a robust way to isolate what the programme itself had achieved.

The announcement was simpler than the evidence could ever be.

Levelling Up: "shovel-ready" projects that were not ready to shovel

The Levelling Up Fund was launched in 2021 as a £4.8 billion programme for local infrastructure, transport and regeneration. Government releases described the money as investment intended to boost growth across the UK.

The later delivery picture was slower.

The National Audit Office found that by March 2023, across the Levelling Up Fund, Towns Fund and UK Shared Prosperity Fund, government had distributed around £2 billion, while local areas had spent about £948 million of it.

Projects were behind schedule and original deadlines looked unlikely to be met. Half of the main construction contracts for Levelling Up Fund Round 1 projects due by March 2024 were unsigned. For Round 2 projects due by March 2025, that rose to 85 per cent.

Some delays were outside government's control. Inflation, labour shortages and construction problems all mattered.

Others were created by Whitehall.

The NAO found funding announcements and approvals were themselves late. Local authorities submitting UK Shared Prosperity Fund investment plans by 1 August 2022 did not get them approved until December, leaving three months of that financial year to spend their allocation instead of the twelve they'd expected.

Here the spin problem was subtle.

Money had genuinely been allocated.

Projects genuinely existed.

But allocating money was repeatedly presented as though the economic benefit attached to the project had already begun.

A press release can announce £20 million for a town in an afternoon.

Buying land, obtaining planning permission, tendering a contract and constructing the thing may take years.

The headline runs on announcement day.

The outcome arrives, if it arrives, much later.

HS2: the most expensive lesson in the difference between an estimate and a promise

Few British projects show the danger of early certainty better than HS2.

On 10 January 2012, Transport Secretary Justine Greening told Parliament the complete Y-shaped network linking London, Birmingham, Manchester and Leeds would cost £32.7 billion at 2011 prices.

London to the West Midlands was expected to open in 2026. The northern legs, plus a Heathrow connection, were expected in 2032-33.

Government modelling put the benefits at up to £47 billion, with up to £34 billion in fare revenues over 60 years.

By January 2020, the National Audit Office said HS2 was over budget and behind schedule because DfT, HS2 Ltd and wider government had underestimated its complexity and risk, and had not sufficiently grasped that it was a much larger and more challenging programme to deliver than other infrastructure projects. The estimated cost had risen to £65 billion to £88 billion in 2015 prices, with full services then forecast between 2036 and 2040, three to seven years later than originally planned.

The project then got smaller as well as more expensive. In October 2023, Rishi Sunak cancelled the legs to Manchester and Leeds, cutting the network to a fraction of what Greening had described.

By May 2026, the Transport Secretary, Heidi Alexander, told Parliament the cost of what remained, London to Birmingham, now sat between £87.7 billion and £102.7 billion. Adjusted for inflation, Greening's original £32.7 billion is worth roughly £50 billion today. The project has therefore roughly doubled in real cost while shrinking to less than half its planned route.

The NAO had already warned in 2013 about the timetable and in 2016 that the 2026 opening date was at risk.

Responsibility cannot sensibly be pinned on one minister.

The Cameron government approved the project and made the early cost and timetable claims. DfT and HS2 Ltd underestimated complexity and risk. Successive governments continued, then cut, the project, and the costs kept rising even as the scope fell.

The lesson is not that infrastructure estimates are useless.

It is that the earlier in a megaproject's life an estimate is produced, the more uncertainty sits behind it.

Political communication tends to do the reverse. It gives the earliest number the cleanest presentation.

Rwanda: deterrence was the promised outcome, but government could not prove it

The Rwanda partnership was announced by Boris Johnson's government in April 2022 and signed by Home Secretary Priti Patel.

Its purpose was explicit: deter irregular entry and relocate some people arriving through irregular routes to Rwanda.

There was a problem from the beginning.

Home Office Permanent Secretary Matthew Rycroft sought a ministerial direction because he could not provide the normal assurance that the scheme represented value for money.

He wrote that "evidence of a deterrent effect is highly uncertain and cannot be quantified with sufficient certainty" to give him that assurance, and that he did not believe sufficient evidence could be obtained to show the policy would have a deterrent effect significant enough to make it value for money.

Priti Patel directed the department to proceed anyway.

The policy then became trapped in litigation and redesign.

The government's own later accounting showed that by June 2024, £715 million had been spent across the Rwanda partnership and implementation of the Illegal Migration Act.

During more than two years of operation, four volunteers and no asylum seekers were sent to Rwanda under the compulsory relocation policy.

That £715 million was not all a payment to Rwanda. £290 million went directly to the Rwandan government (£270 million into an Economic Transformation and Integration Fund and £20 million for advance operational costs), alongside detention and reception capacity, flights, escorts, staffing and other implementation costs here. Some of that infrastructure could subsequently be used for other purposes.

The National Audit Office declined to reach a value-for-money conclusion because value depended on whether the partnership actually deterred irregular journeys.

That is the crucial point.

The policy's central claimed benefit was deterrence.

The Permanent Secretary said before launch that government did not have enough evidence to demonstrate that deterrence would be large enough to make the scheme value for money.

The government proceeded because ministers believed it could work.

The cost was measurable.

The benefit remained uncertain.

Why this keeps happening

The common thread is not that politicians always lie.

It is that political communications and serious evaluation operate on completely different clocks.

A minister needs to explain a policy on the day it is announced.

A proper evaluation may need three years.

The communications team therefore reaches for whatever is available:

the maximum number of homes that could be improved;

the number of jobs a model says might be supported;

the total value of projects allocated funding;

the savings households could receive;

the economic benefits a model predicts over 60 years;

the behaviour a policy is expected to deter.

Those can all be legitimate numbers.

Trouble starts when the grammar changes.

"Could support" becomes "will create".

"Funding allocated" becomes "investment delivered".

"A modelled saving" becomes "money saved".

"A project approved" becomes "homes unlocked".

An objective becomes an achievement.

By the time auditors arrive, the vocabulary is different.

The NAO talks about attribution, counterfactuals, administrative costs, additionality, optimism bias and value for money.

Those words rarely make good launch-day headlines.

But they determine whether the headline was worth believing.

The problem is structural, not party-specific

Most of the historical examples here come from Conservative-led governments because they governed Britain for most of the period covered.

The incentives themselves are not uniquely Conservative.

Any government wants to show action.

Departments want to demonstrate delivery.

Press offices want a clean number.

The public gets the announcement long before it gets the audit.

That is why the correct response is not automatic disbelief.

It is verification.

How to read a government press release

When government says £1 billion invested, ask whether the money has been spent, allocated or merely announced.

When it says 10,000 jobs, find out whether those jobs exist or come from an economic model.

When it says £500 saved, check whether that is an average, a maximum or a lifetime forecast.

When it says new funding, compare it with the previous Spending Review.

When it says scheme works, look for an evaluation with a comparison group rather than a count of participants.

When it says homes unlocked, count starts and completions.

And when it announces a target, find out whether anyone has been commissioned to measure whether the target was caused by the policy at all.

That is not anti-government reporting.

It is the difference between covering an announcement and covering what government actually did.

The historical record shows why the distinction matters.

The Green Homes Grant did not reach 600,000 homes.

Help to Buy helped people who needed it, and many who did not.

Test and Trace built an enormous national testing operation without producing clear evidence that its wider claims matched its cost.

Levelling Up money arrived much faster in press releases than on construction sites.

HS2's early certainty didn't just collapse once. It kept collapsing, until the project cost more in real terms for less than half the railway.

The Rwanda deterrent was politically central even though the Home Office's own Permanent Secretary said the evidence needed to demonstrate its value for money was not there.

Each began with a confident announcement.

The evidence came later.

Government press releases are valuable documents.

They tell the public what ministers want a policy to achieve.

They should not be mistaken for proof that it has.

Sources: NAO, Green Homes Grant; NAO, Help to Buy: Equity Loan scheme progress review; PAC, Test and Trace update, 27 October 2021; NAO, Levelling up funding to local government; Written statement to Parliament, 10 January 2012; NAO, High Speed Two: A progress update; ITV, HS2 spiralling costs, May 2026; Letter from Matthew Rycroft to Priti Patel; Breakdown of Home Office costs: MEDP with Rwanda; PAC, Government has no evidence spending is working$n$ WHERE slug::text = $k$hg0gkukta5$k$ AND body_text = $o$Government press releases are not neutral summaries of public policy.

They are written to present a decision in its strongest possible light. That does not make them false. It does mean the reader is usually being shown the benefit before the cost, the intention before the result and the headline number before the assumptions underneath it.

The problem becomes obvious when old announcements are compared with what happened next.

A scheme launched to improve 600,000 homes reached about 47,500. A housing programme presented as helping people into home ownership was used by large numbers who could have bought anyway. A £37 billion testing system was justified partly as a way to avoid further lockdowns, but Britain went through two more. A high-speed railway announced with a £32.7 billion construction estimate and a 2026 opening date is now costed at up to £102.7 billion for a route cut to less than half its original size. A migration policy built around deterrence cost hundreds of millions of pounds without relocating a single asylum seeker under the compulsory scheme.

None of those examples proves that government announcements are routinely dishonest.

They show something more mundane and more important.

The announcement is often published long before government knows whether the claim it is making will survive contact with delivery.

Whitehall has known about this weakness for years.

A 2019 review by the Prime Minister's Implementation Unit found that only 8 per cent of £432 billion of spending on major projects had robust impact-evaluation plans in place. Around £276 billion, 64 per cent of the total, had no evaluation at all. The Public Accounts Committee later said departments were still failing to publish evaluation plans and findings consistently.

That number explains a great deal.

Government is very good at announcing what money is supposed to achieve.

It has historically been much less consistent at arranging, from the beginning, to prove whether it did.

The Green Homes Grant: 600,000 homes became 47,500

The Green Homes Grant is almost a laboratory experiment in how announcement language can outrun delivery.

In 2020, Boris Johnson's government promoted the scheme as part of a green economic recovery. The public was told it would improve more than 600,000 homes, support more than 100,000 jobs and help some households save up to £600 a year.

Those numbers were forecasts.

That distinction disappeared easily in the political presentation.

The National Audit Office later found that the voucher scheme was expected to upgrade only around 47,500 homes.

Government had originally expected as many as 600,000.

The department expected to spend about £314 million of the £1.5 billion available, including £50.5 million on programme management and administration. The NAO calculated that administration alone amounted to more than £1,000 for every home upgraded.

The NAO did not say the idea of improving home energy efficiency was wrong. It said the aim of achieving immediate economic stimulus meant the scheme was rushed, and that the tension between short-term stimulus and long-term decarbonisation was never properly reconciled, leading to an overly complex scheme that could not be delivered to a satisfactory standard in the time available. Officials and external assurance had warned about the risks of proceeding quickly before launch. The department accepted those risks anyway, which constrained procurement and made it hard for installers to mobilise.

The political responsibility sat with the Johnson government. Rishi Sunak, then Chancellor, and Business Secretary Alok Sharma were among the ministers attached to the launch.

The lesson is not that ambitious targets should never be announced.

It is that 600,000 homes was not delivery. It was the maximum the scheme was intended to reach if a chain of assumptions all worked.

They did not.

By the time the audit arrived, the announcement had done its job. The correction came later, in an NAO report read by a fraction of the people who saw the launch.

Help to Buy: success depended on what question you asked

Help to Buy is more interesting because it genuinely achieved some of what government claimed.

In July 2014, Housing Minister Brandon Lewis said Help to Buy was doing "exactly what it was designed to achieve", helping families buy while accelerating the supply of new homes.

The later evidence did not demolish that case.

It complicated it.

The National Audit Office found that Help to Buy did increase home ownership and housing supply. It estimated that the scheme had generated around 78,000 additional new-build sales by December 2018.

But the department's own research found 37 per cent of participants would not have been able to buy any property at all without the scheme.

That leaves roughly three-fifths who could have bought something without government help. Of those, almost a third of all buyers — around 65,000 households — could have bought the specific property they wanted without the scheme at all.

Both accounts are true.

Help to Buy helped households into home ownership and stimulated construction.

It also used public balance-sheet capacity to support purchases for tens of thousands of people who did not strictly need government help to buy.

That is what disappears when government turns a complicated intervention into a slogan.

The scheme was designed with deliberately broad eligibility. The NAO recorded the department's view that higher-income households benefiting from it were an acceptable consequence of making the scheme widely available.

A sceptical reporter looking only for failure could wrongly conclude Help to Buy did nothing useful.

A government press release looking only for success could omit how much support went to people who could already buy.

The accurate story sits between them.

Test and Trace: a huge programme with a promise nobody could properly measure

NHS Test and Trace was created in an emergency. Any fair assessment has to begin there.

Britain needed mass testing and contact tracing at extraordinary speed.

The trouble came when government attached broader political promises to the programme.

The Department of Health justified the scale of spending partly on the basis that an effective test-and-trace system would help avoid another national lockdown.

Its budget eventually reached £37 billion over two years.

Britain subsequently had two more national lockdowns.

By March 2021, the Public Accounts Committee said there was still no clear evidence of Test and Trace's overall effectiveness or whether its contribution to reducing infections justified the cost.

Seven months later, on 27 October 2021, the committee was harsher. It said "NHST&T has not achieved its main objective to help break chains of COVID-19 transmission and enable people to return towards a more normal way of life", and that the programme had "focused on delivering programmes but outcomes have been muddled and a number of its professed aims have been overstated or not achieved."

That does not mean £37 billion was literally wasted. Nor does the fact that lockdowns occurred prove Test and Trace had no effect.

The failure was partly one of claim design.

Government tied an enormous programme to an outcome, avoiding lockdown, that depended on public behaviour, virus prevalence, testing speed, adherence to isolation rules, vaccination, new variants and many other factors.

It then lacked a robust way to isolate what the programme itself had achieved.

The announcement was simpler than the evidence could ever be.

Levelling Up: "shovel-ready" projects that were not ready to shovel

The Levelling Up Fund was launched in 2021 as a £4.8 billion programme for local infrastructure, transport and regeneration. Government releases described the money as investment intended to boost growth across the UK.

The later delivery picture was slower.

The National Audit Office found that by March 2023, across the Levelling Up Fund, Towns Fund and UK Shared Prosperity Fund, government had distributed around £2 billion, while local areas had spent about £948 million of it.

Projects were behind schedule and original deadlines looked unlikely to be met. Half of the main construction contracts for Levelling Up Fund Round 1 projects due by March 2024 were unsigned. For Round 2 projects due by March 2025, that rose to 85 per cent.

Some delays were outside government's control. Inflation, labour shortages and construction problems all mattered.

Others were created by Whitehall.

The NAO found funding announcements and approvals were themselves late. Local authorities submitting UK Shared Prosperity Fund investment plans by 1 August 2022 did not get them approved until December, leaving three months of that financial year to spend their allocation instead of the twelve they'd expected.

Here the spin problem was subtle.

Money had genuinely been allocated.

Projects genuinely existed.

But allocating money was repeatedly presented as though the economic benefit attached to the project had already begun.

A press release can announce £20 million for a town in an afternoon.

Buying land, obtaining planning permission, tendering a contract and constructing the thing may take years.

The headline runs on announcement day.

The outcome arrives, if it arrives, much later.

HS2: the most expensive lesson in the difference between an estimate and a promise

Few British projects show the danger of early certainty better than HS2.

On 10 January 2012, Transport Secretary Justine Greening told Parliament the complete Y-shaped network linking London, Birmingham, Manchester and Leeds would cost £32.7 billion at 2011 prices.

London to the West Midlands was expected to open in 2026. The northern legs, plus a Heathrow connection, were expected in 2032-33.

Government modelling put the benefits at up to £47 billion, with up to £34 billion in fare revenues over 60 years.

By January 2020, the National Audit Office said HS2 was over budget and behind schedule because DfT, HS2 Ltd and wider government had underestimated its complexity and risk, and had not sufficiently grasped that it was a much larger and more challenging programme to deliver than other infrastructure projects. The estimated cost had risen to £65 billion to £88 billion in 2015 prices, with full services then forecast between 2036 and 2040 — three to seven years later than originally planned.

The project then got smaller as well as more expensive. In October 2023, Rishi Sunak cancelled the legs to Manchester and Leeds, cutting the network to a fraction of what Greening had described.

By May 2026, the Transport Secretary, Heidi Alexander, told Parliament the cost of what remained — London to Birmingham — now sat between £87.7 billion and £102.7 billion. Adjusted for inflation, Greening's original £32.7 billion is worth roughly £50 billion today. The project has therefore roughly doubled in real cost while shrinking to less than half its planned route.

The NAO had already warned in 2013 about the timetable and in 2016 that the 2026 opening date was at risk.

Responsibility cannot sensibly be pinned on one minister.

The Cameron government approved the project and made the early cost and timetable claims. DfT and HS2 Ltd underestimated complexity and risk. Successive governments continued, then cut, the project — and the costs kept rising even as the scope fell.

The lesson is not that infrastructure estimates are useless.

It is that the earlier in a megaproject's life an estimate is produced, the more uncertainty sits behind it.

Political communication tends to do the reverse. It gives the earliest number the cleanest presentation.

Rwanda: deterrence was the promised outcome, but government could not prove it

The Rwanda partnership was announced by Boris Johnson's government in April 2022 and signed by Home Secretary Priti Patel.

Its purpose was explicit: deter irregular entry and relocate some people arriving through irregular routes to Rwanda.

There was a problem from the beginning.

Home Office Permanent Secretary Matthew Rycroft sought a ministerial direction because he could not provide the normal assurance that the scheme represented value for money.

He wrote that "evidence of a deterrent effect is highly uncertain and cannot be quantified with sufficient certainty" to give him that assurance, and that he did not believe sufficient evidence could be obtained to show the policy would have a deterrent effect significant enough to make it value for money.

Priti Patel directed the department to proceed anyway.

The policy then became trapped in litigation and redesign.

The government's own later accounting showed that by June 2024, £715 million had been spent across the Rwanda partnership and implementation of the Illegal Migration Act.

During more than two years of operation, four volunteers and no asylum seekers were sent to Rwanda under the compulsory relocation policy.

That £715 million was not all a payment to Rwanda. £290 million went directly to the Rwandan government — £270 million into an Economic Transformation and Integration Fund and £20 million for advance operational costs — alongside detention and reception capacity, flights, escorts, staffing and other implementation costs here. Some of that infrastructure could subsequently be used for other purposes.

The National Audit Office declined to reach a value-for-money conclusion because value depended on whether the partnership actually deterred irregular journeys.

That is the crucial point.

The policy's central claimed benefit was deterrence.

The Permanent Secretary said before launch that government did not have enough evidence to demonstrate that deterrence would be large enough to make the scheme value for money.

The government proceeded because ministers believed it could work.

The cost was measurable.

The benefit remained uncertain.

Why this keeps happening

The common thread is not that politicians always lie.

It is that political communications and serious evaluation operate on completely different clocks.

A minister needs to explain a policy on the day it is announced.

A proper evaluation may need three years.

The communications team therefore reaches for whatever is available:

the maximum number of homes that could be improved;

the number of jobs a model says might be supported;

the total value of projects allocated funding;

the savings households could receive;

the economic benefits a model predicts over 60 years;

the behaviour a policy is expected to deter.

Those can all be legitimate numbers.

Trouble starts when the grammar changes.

"Could support" becomes "will create".

"Funding allocated" becomes "investment delivered".

"A modelled saving" becomes "money saved".

"A project approved" becomes "homes unlocked".

An objective becomes an achievement.

By the time auditors arrive, the vocabulary is different.

The NAO talks about attribution, counterfactuals, administrative costs, additionality, optimism bias and value for money.

Those words rarely make good launch-day headlines.

But they determine whether the headline was worth believing.

The problem is structural, not party-specific

Most of the historical examples here come from Conservative-led governments because they governed Britain for most of the period covered.

The incentives themselves are not uniquely Conservative.

Any government wants to show action.

Departments want to demonstrate delivery.

Press offices want a clean number.

The public gets the announcement long before it gets the audit.

That is why the correct response is not automatic disbelief.

It is verification.

How to read a government press release

When government says £1 billion invested, ask whether the money has been spent, allocated or merely announced.

When it says 10,000 jobs, find out whether those jobs exist or come from an economic model.

When it says £500 saved, check whether that is an average, a maximum or a lifetime forecast.

When it says new funding, compare it with the previous Spending Review.

When it says scheme works, look for an evaluation with a comparison group rather than a count of participants.

When it says homes unlocked, count starts and completions.

And when it announces a target, find out whether anyone has been commissioned to measure whether the target was caused by the policy at all.

That is not anti-government reporting.

It is the difference between covering an announcement and covering what government actually did.

The historical record shows why the distinction matters.

The Green Homes Grant did not reach 600,000 homes.

Help to Buy helped people who needed it, and many who did not.

Test and Trace built an enormous national testing operation without producing clear evidence that its wider claims matched its cost.

Levelling Up money arrived much faster in press releases than on construction sites.

HS2's early certainty didn't just collapse once — it kept collapsing, until the project cost more in real terms for less than half the railway.

The Rwanda deterrent was politically central even though the Home Office's own Permanent Secretary said the evidence needed to demonstrate its value for money was not there.

Each began with a confident announcement.

The evidence came later.

Government press releases are valuable documents.

They tell the public what ministers want a policy to achieve.

They should not be mistaken for proof that it has.

Sources: NAO — Green Homes Grant; NAO — Help to Buy: Equity Loan scheme progress review; PAC — Test and Trace update, 27 October 2021; NAO — Levelling up funding to local government; Written statement to Parliament, 10 January 2012; NAO — High Speed Two: A progress update; ITV — HS2 spiralling costs, May 2026; Letter from Matthew Rycroft to Priti Patel; Breakdown of Home Office costs — MEDP with Rwanda; PAC — Government has no evidence spending is working$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$hg0gkukta5$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$eoi32xxnct$k$, 'body_text', $o$That leaves Whitehall in an odd position.

Government is presenting a central savings figure for a programme that the centre of government cannot fully control.

The £4.3 billion figure needs translating. In evidence sent to the Public Accounts Committee, the Cabinet Office said it represented estimated benefits from all five clusters over 15 years, and that the strategy had saved £168 million so far. The National Audit Office's own calculation was much smaller: about £1 billion of net lifetime benefits, counting only the three clusters that secured ring-fenced Spending Review funding. The Cabinet Office says the gap exists because its own figure also includes the Defence and Overseas clusters, which the NAO left out of its assessment.

The figures are not necessarily contradictory. They cover different parts of the programme.

But they illustrate how easy it is for a large headline number to outrun what has actually been delivered.

£4.3 billion is not money Whitehall has already saved.

It is an estimate of what five programmes may eventually deliver over a decade and a half if implementation works broadly as planned.

The confirmed saving to date is £168 million.

That distinction should sit much closer to the headline.

One of the five, Matrix, covers the Cabinet Office and the Department for Culture, Media and Sport. It was supposed to start onboarding its first departments in July 2026. The PAC's own report says that date has since slipped to December 2026, "without explanation." Five months is not a small delay for a programme this size, and the committee's complaint isn't really about the length of it — it's that nobody has said why.

Another of the five, Synergy, is being described very differently depending on who's doing the describing. DWP, which leads it, calls it a once-in-a-generation attempt to transform back-office services for almost half the Civil Service, bringing together DWP, the Home Office, the Ministry of Justice and Defra, plus 98 arm's-length bodies — 102 organisations in total. What that framing leaves out is what Synergy actually just did: award an outsourcing contract worth around £700 million to Capita, to run HR and payroll for more than a quarter of a million civil servants.

That matters for two reasons.

The first is that it isn't new. The departments inside Synergy have already had this work outsourced for a decade. The PAC report notes that continuing to outsource could reasonably be judged value for money on that basis alone. So the "transformation" is, at least for this cluster, a bigger and longer contract with a private provider, not government taking the function back in-house.

The second is who got the contract. The Public and Commercial Services Union raised concerns about handing this work to Capita given its record administering the Civil Service Pension Scheme — not a reassuring precedent for a company about to run pay and HR for 250,000 people. And there are reports that Capita's winning bid came in around 40 per cent below the government's own "should-cost" estimate of what the contract should reasonably cost to deliver. A bid that far under the government's own model is not obviously good news for the taxpayer. It's at least as often a warning sign — the kind of gap that tends to resurface later as a renegotiation, a service-quality problem, or both.

None of that makes the ambition behind Synergy wrong. Replacing finance, payroll and HR systems and arrangements across some of Whitehall's largest departments is not a conventional IT upgrade. If migration slips or data doesn't transfer cleanly, departments cannot simply stop paying staff or processing invoices while the problem is fixed. That is precisely why the detail of how it's being delivered — through a very large outsourcing contract, to a provider with a mixed record, on a bid well below the government's own cost estimate — deserves to be part of the public account of the programme, not a footnote to it.

The Public Accounts Committee has been here before.

Government has been trying to centralise shared services since 2004. When the committee looked at the current strategy in 2023, it warned that delays were already increasing costs to taxpayers. The National Audit Office returned to the programme on 6 March 2026 and identified a lack of centralised oversight and leadership putting delivery on time and within budget at risk.

That history should make ministers cautious about presenting the latest benefit estimate as though success is merely a matter of implementation.

This is not Whitehall's first attempt.

The Cabinet Office argues that the present strategy is better structured and says savings have already started to materialise. That is relevant. £168 million is not nothing, and common systems can produce genuine benefits if departments finally complete the transition.

But the programme should be judged against the savings it actually produces after implementation costs, not against its most optimistic lifetime headline — and it should be judged with the Capita contract and the unexplained Matrix delay both in view, not described in terms general enough to leave them out.

The Cabinet Office itself has had to explain to MPs why its £4.3 billion estimate differs from the NAO's £1 billion figure.

That is precisely the sort of distinction government announcements tend to flatten.

One number describes potential benefits across all five clusters over 15 years.

The other describes net lifetime benefits from three funded clusters, because the NAO didn't count Defence or Overseas.

Neither is £4.3 billion sitting in the Treasury.

The PAC's concern is that government could spend heavily replacing systems before discovering that departments have not standardised enough processes, committed enough resources or surrendered enough control to make the shared model work.

If that happens, taxpayers pay twice: once for the old systems that have to be kept alive and again for the replacement programme struggling to take over.

The Cabinet Office now has a fairly simple test ahead of it.

Publish the full cost of each cluster, including what Capita is actually being paid against its own bid and the government's cost model.

Publish the benefits actually realised each year.

Show which departments have formally committed.

Explain, in public, why Matrix slipped five months — the committee asked, and as of its report, hadn't been told.

And reconcile the £4.3 billion headline against the smaller NAO estimate in a way the public can follow.

The case for modernising Whitehall's back office is strong.

The case that it will save £4.3 billion is still a forecast, built in part on a contract whose price has already raised questions before a single payroll has moved.

Sources: PAC — Government shared services report; PAC inquiry page — Shared Services; Cabinet Office evidence to PAC; DWP — Synergy Programme Accounting Officer Assessment, April 2026; DWP — Synergy Programme summary business case; Written evidence to PAC inquiry$o$);
  UPDATE public.editorials SET body_text = $n$That leaves Whitehall in an odd position.

Government is presenting a central savings figure for a programme that the centre of government cannot fully control.

The £4.3 billion figure needs translating. In evidence sent to the Public Accounts Committee, the Cabinet Office said it represented estimated benefits from all five clusters over 15 years, and that the strategy had saved £168 million so far. The National Audit Office's own calculation was much smaller: about £1 billion of net lifetime benefits, counting only the three clusters that secured ring-fenced Spending Review funding. The Cabinet Office says the gap exists because its own figure also includes the Defence and Overseas clusters, which the NAO left out of its assessment.

The figures are not necessarily contradictory. They cover different parts of the programme.

But they illustrate how easy it is for a large headline number to outrun what has actually been delivered.

£4.3 billion is not money Whitehall has already saved.

It is an estimate of what five programmes may eventually deliver over a decade and a half if implementation works broadly as planned.

The confirmed saving to date is £168 million.

That distinction should sit much closer to the headline.

One of the five, Matrix, covers the Cabinet Office and the Department for Culture, Media and Sport. It was supposed to start onboarding its first departments in July 2026. The PAC's own report says that date has since slipped to December 2026, "without explanation." Five months is not a small delay for a programme this size, and the committee's complaint isn't really about the length of it. It's that nobody has said why.

Another of the five, Synergy, is being described very differently depending on who's doing the describing. DWP, which leads it, calls it a once-in-a-generation attempt to transform back-office services for almost half the Civil Service, bringing together DWP, the Home Office, the Ministry of Justice and Defra, plus 98 arm's-length bodies: 102 organisations in total. What that framing leaves out is what Synergy actually just did: award an outsourcing contract worth around £700 million to Capita, to run HR and payroll for more than a quarter of a million civil servants.

That matters for two reasons.

The first is that it isn't new. The departments inside Synergy have already had this work outsourced for a decade. The PAC report notes that continuing to outsource could reasonably be judged value for money on that basis alone. So the "transformation" is, at least for this cluster, a bigger and longer contract with a private provider, not government taking the function back in-house.

The second is who got the contract. The Public and Commercial Services Union raised concerns about handing this work to Capita given its record administering the Civil Service Pension Scheme, not a reassuring precedent for a company about to run pay and HR for 250,000 people. And there are reports that Capita's winning bid came in around 40 per cent below the government's own "should-cost" estimate of what the contract should reasonably cost to deliver. A bid that far under the government's own model is not obviously good news for the taxpayer. It's at least as often a warning sign, the kind of gap that tends to resurface later as a renegotiation, a service-quality problem, or both.

None of that makes the ambition behind Synergy wrong. Replacing finance, payroll and HR systems and arrangements across some of Whitehall's largest departments is not a conventional IT upgrade. If migration slips or data doesn't transfer cleanly, departments cannot simply stop paying staff or processing invoices while the problem is fixed. That is precisely why the detail of how it's being delivered (through a very large outsourcing contract, to a provider with a mixed record, on a bid well below the government's own cost estimate) deserves to be part of the public account of the programme, not a footnote to it.

The Public Accounts Committee has been here before.

Government has been trying to centralise shared services since 2004. When the committee looked at the current strategy in 2023, it warned that delays were already increasing costs to taxpayers. The National Audit Office returned to the programme on 6 March 2026 and identified a lack of centralised oversight and leadership putting delivery on time and within budget at risk.

That history should make ministers cautious about presenting the latest benefit estimate as though success is merely a matter of implementation.

This is not Whitehall's first attempt.

The Cabinet Office argues that the present strategy is better structured and says savings have already started to materialise. That is relevant. £168 million is not nothing, and common systems can produce genuine benefits if departments finally complete the transition.

But the programme should be judged against the savings it actually produces after implementation costs, not against its most optimistic lifetime headline, and it should be judged with the Capita contract and the unexplained Matrix delay both in view, not described in terms general enough to leave them out.

The Cabinet Office itself has had to explain to MPs why its £4.3 billion estimate differs from the NAO's £1 billion figure.

That is precisely the sort of distinction government announcements tend to flatten.

One number describes potential benefits across all five clusters over 15 years.

The other describes net lifetime benefits from three funded clusters, because the NAO didn't count Defence or Overseas.

Neither is £4.3 billion sitting in the Treasury.

The PAC's concern is that government could spend heavily replacing systems before discovering that departments have not standardised enough processes, committed enough resources or surrendered enough control to make the shared model work.

If that happens, taxpayers pay twice: once for the old systems that have to be kept alive and again for the replacement programme struggling to take over.

The Cabinet Office now has a fairly simple test ahead of it.

Publish the full cost of each cluster, including what Capita is actually being paid against its own bid and the government's cost model.

Publish the benefits actually realised each year.

Show which departments have formally committed.

Explain, in public, why Matrix slipped five months. The committee asked, and as of its report, hadn't been told.

And reconcile the £4.3 billion headline against the smaller NAO estimate in a way the public can follow.

The case for modernising Whitehall's back office is strong.

The case that it will save £4.3 billion is still a forecast, built in part on a contract whose price has already raised questions before a single payroll has moved.

Sources: PAC, Government shared services report; PAC inquiry page, Shared Services; Cabinet Office evidence to PAC; DWP, Synergy Programme Accounting Officer Assessment, April 2026; DWP, Synergy Programme summary business case; Written evidence to PAC inquiry$n$ WHERE slug::text = $k$eoi32xxnct$k$ AND body_text = $o$That leaves Whitehall in an odd position.

Government is presenting a central savings figure for a programme that the centre of government cannot fully control.

The £4.3 billion figure needs translating. In evidence sent to the Public Accounts Committee, the Cabinet Office said it represented estimated benefits from all five clusters over 15 years, and that the strategy had saved £168 million so far. The National Audit Office's own calculation was much smaller: about £1 billion of net lifetime benefits, counting only the three clusters that secured ring-fenced Spending Review funding. The Cabinet Office says the gap exists because its own figure also includes the Defence and Overseas clusters, which the NAO left out of its assessment.

The figures are not necessarily contradictory. They cover different parts of the programme.

But they illustrate how easy it is for a large headline number to outrun what has actually been delivered.

£4.3 billion is not money Whitehall has already saved.

It is an estimate of what five programmes may eventually deliver over a decade and a half if implementation works broadly as planned.

The confirmed saving to date is £168 million.

That distinction should sit much closer to the headline.

One of the five, Matrix, covers the Cabinet Office and the Department for Culture, Media and Sport. It was supposed to start onboarding its first departments in July 2026. The PAC's own report says that date has since slipped to December 2026, "without explanation." Five months is not a small delay for a programme this size, and the committee's complaint isn't really about the length of it — it's that nobody has said why.

Another of the five, Synergy, is being described very differently depending on who's doing the describing. DWP, which leads it, calls it a once-in-a-generation attempt to transform back-office services for almost half the Civil Service, bringing together DWP, the Home Office, the Ministry of Justice and Defra, plus 98 arm's-length bodies — 102 organisations in total. What that framing leaves out is what Synergy actually just did: award an outsourcing contract worth around £700 million to Capita, to run HR and payroll for more than a quarter of a million civil servants.

That matters for two reasons.

The first is that it isn't new. The departments inside Synergy have already had this work outsourced for a decade. The PAC report notes that continuing to outsource could reasonably be judged value for money on that basis alone. So the "transformation" is, at least for this cluster, a bigger and longer contract with a private provider, not government taking the function back in-house.

The second is who got the contract. The Public and Commercial Services Union raised concerns about handing this work to Capita given its record administering the Civil Service Pension Scheme — not a reassuring precedent for a company about to run pay and HR for 250,000 people. And there are reports that Capita's winning bid came in around 40 per cent below the government's own "should-cost" estimate of what the contract should reasonably cost to deliver. A bid that far under the government's own model is not obviously good news for the taxpayer. It's at least as often a warning sign — the kind of gap that tends to resurface later as a renegotiation, a service-quality problem, or both.

None of that makes the ambition behind Synergy wrong. Replacing finance, payroll and HR systems and arrangements across some of Whitehall's largest departments is not a conventional IT upgrade. If migration slips or data doesn't transfer cleanly, departments cannot simply stop paying staff or processing invoices while the problem is fixed. That is precisely why the detail of how it's being delivered — through a very large outsourcing contract, to a provider with a mixed record, on a bid well below the government's own cost estimate — deserves to be part of the public account of the programme, not a footnote to it.

The Public Accounts Committee has been here before.

Government has been trying to centralise shared services since 2004. When the committee looked at the current strategy in 2023, it warned that delays were already increasing costs to taxpayers. The National Audit Office returned to the programme on 6 March 2026 and identified a lack of centralised oversight and leadership putting delivery on time and within budget at risk.

That history should make ministers cautious about presenting the latest benefit estimate as though success is merely a matter of implementation.

This is not Whitehall's first attempt.

The Cabinet Office argues that the present strategy is better structured and says savings have already started to materialise. That is relevant. £168 million is not nothing, and common systems can produce genuine benefits if departments finally complete the transition.

But the programme should be judged against the savings it actually produces after implementation costs, not against its most optimistic lifetime headline — and it should be judged with the Capita contract and the unexplained Matrix delay both in view, not described in terms general enough to leave them out.

The Cabinet Office itself has had to explain to MPs why its £4.3 billion estimate differs from the NAO's £1 billion figure.

That is precisely the sort of distinction government announcements tend to flatten.

One number describes potential benefits across all five clusters over 15 years.

The other describes net lifetime benefits from three funded clusters, because the NAO didn't count Defence or Overseas.

Neither is £4.3 billion sitting in the Treasury.

The PAC's concern is that government could spend heavily replacing systems before discovering that departments have not standardised enough processes, committed enough resources or surrendered enough control to make the shared model work.

If that happens, taxpayers pay twice: once for the old systems that have to be kept alive and again for the replacement programme struggling to take over.

The Cabinet Office now has a fairly simple test ahead of it.

Publish the full cost of each cluster, including what Capita is actually being paid against its own bid and the government's cost model.

Publish the benefits actually realised each year.

Show which departments have formally committed.

Explain, in public, why Matrix slipped five months — the committee asked, and as of its report, hadn't been told.

And reconcile the £4.3 billion headline against the smaller NAO estimate in a way the public can follow.

The case for modernising Whitehall's back office is strong.

The case that it will save £4.3 billion is still a forecast, built in part on a contract whose price has already raised questions before a single payroll has moved.

Sources: PAC — Government shared services report; PAC inquiry page — Shared Services; Cabinet Office evidence to PAC; DWP — Synergy Programme Accounting Officer Assessment, April 2026; DWP — Synergy Programme summary business case; Written evidence to PAC inquiry$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$eoi32xxnct$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$gw4k9mxn7r$k$, 'body_text', $o$The government has announced what it calls a "pathway to stronger public control" of England's water industry.

For now, however, no water company is being taken into public ownership.

The change announced this week is considerably narrower.

Ministers intend to repeal rules dating from the privatisation of the industry that restrict government shareholdings in England's major water and sewerage companies to between 1 and 3 per cent, with the exact limit varying by company.

Removing those restrictions would give a future government considerably more freedom to intervene in a water company.

It does not itself constitute an intervention.

No shares are being bought. No company is being nationalised. No amount of money has been allocated for acquisitions.

And the government has not said what proportion of a water company it would actually be prepared to own.

The distinction matters.

The Department for Environment, Food and Rural Affairs said the change would give government "flexibility to consider a wide range of possible future interventions, including on ownership models".

That is a possibility rather than a policy.

The announcement also makes clear that ministers expect private capital to remain central to the system, saying that securing the long-term future of the sector "relies on continued private sector investment".

That leaves a much bigger question unanswered.

If a major water company fails financially, how far is the government actually prepared to go?

A restriction, not a ban on nationalisation

The existing rules originate in the privatisation settlement created by the Water Act 1989 and the Water (Target Investment Limit) Order 1990.

They restrict government shareholdings in the privatised water companies to between 1 and 3 per cent, with the precise limit differing between companies.

But those rules have not made nationalisation legally impossible.

In May, the government told Parliament that the current legislation limited government holdings to around 3 per cent, and that bringing a water company into public ownership would require new primary legislation and compensation for existing owners.

The forthcoming legislation will make that process easier by removing the shareholding restrictions, but ministers would still need to decide to use those powers and determine how any acquisition was financed.

The government was taking a markedly different position only months ago.

In April it told Parliament that it had "no intention to nationalise the water industry" and therefore had "no current plans to assess the financial or non-financial costs" of comparing private and public ownership.

That position now looks considerably less absolute.

Prime Minister Andy Burnham, speaking to the Commons for the first time since taking office, has since described Britain's water industry as "a leaking monument to that approach — a country run in the private rather than public interest".

Yet the latest announcement still stops well short of committing his government to public ownership.

The £100 billion problem

The obvious obstacle is cost.

There is no agreed figure for buying England's water companies.

Defra estimated in September 2025 that nationalising the sector could cost about £100 billion, using the industry's regulatory capital value as a proxy.

The House of Commons Library records that Ofwat's regulatory capital value for the industry is now just over £117 billion.

An analysis commissioned by Thames Water creditors and produced by Frontier Economics in July 2026 put the potential figure at £144 billion by 2030, accounting for planned capital investment over the current price control period.

A fourth figure complicates matters further. The Office for Budget Responsibility has calculated the question differently again: it put water companies' debts and other liabilities at £91 billion against £12 billion in financial assets and £94 billion in non-financial assets, concluding that moving the sector onto the public balance sheet could increase public sector net financial liabilities by around £78 billion, a measure of the impact on the government's books, not an acquisition price.

Those figures should be treated cautiously.

Regulatory capital value was created to help determine the returns companies can earn and the bills customers pay. It is not necessarily the price a government would have to pay shareholders.

Different legal structures, distressed companies, individual acquisitions and even the accounting basis used to frame the question could each produce very different numbers.

But the scale explains why removing a legal restriction is much easier than announcing wholesale nationalisation.

Thames Water changes the calculation

The more significant possibility is therefore not the government buying every water company.

It is selective intervention.

Thames Water has become the obvious test case.

The Independent Water Commission, in its final report, found no clear evidence of a causal link between ownership models and environmental or operational performance. Sir Jon Cunliffe, who chaired the commission, said: "on the data and comparable metrics available, the truth is that we did not see evidence of a causal link between ownership models and a range of environmental and other performance indicators."

But in an earlier address on the commission's plans, Cunliffe had already identified financial resilience as a separate problem, warning that "decisions by a number of companies about structure and debt historically have left them more exposed — as we have seen in the extreme example of Thames Water."

His conclusion in the final report was significant. What mattered, he said, was not simply whether ownership was public or private, but "the business model of the owners, the level of return they seek on their investment, their time horizon for that return, their preference for dividends or capital gain and their willingness to invest further in their company for a fair return."

That distinction may explain the government's emerging position.

Rather than committing billions of pounds to nationalising the entire industry, ministers could acquire stakes in individual companies when financial failure, poor performance or restructuring creates an opportunity.

The legislation announced this week would remove one of the obstacles to doing so.

The unanswered questions

The announcement therefore matters.

But "stronger public control" remains undefined.

The government has not said whether it would buy minority stakes, controlling stakes or entire companies.

It has not said how acquisitions would be valued.

It has not said whether taxpayers would receive dividends if public money was invested.

It has not said whether government investment would come ahead of existing shareholders or creditors when a company was restructured.

And its announcement does not name Thames Water, or any other company, as a candidate for these powers.

Until those questions are answered, the government has not announced public ownership of England's water industry.

It has removed a lock from the door.

Whether ministers ever open it is another matter.$o$);
  UPDATE public.editorials SET body_text = $n$The government has announced what it calls a "pathway to stronger public control" of England's water industry.

For now, however, no water company is being taken into public ownership.

The change announced this week is considerably narrower.

Ministers intend to repeal rules dating from the privatisation of the industry that restrict government shareholdings in England's major water and sewerage companies to between 1 and 3 per cent, with the exact limit varying by company.

Removing those restrictions would give a future government considerably more freedom to intervene in a water company.

It does not itself constitute an intervention.

No shares are being bought. No company is being nationalised. No amount of money has been allocated for acquisitions.

And the government has not said what proportion of a water company it would actually be prepared to own.

The distinction matters.

The Department for Environment, Food and Rural Affairs said the change would give government "flexibility to consider a wide range of possible future interventions, including on ownership models".

That is a possibility rather than a policy.

The announcement also makes clear that ministers expect private capital to remain central to the system, saying that securing the long-term future of the sector "relies on continued private sector investment".

That leaves a much bigger question unanswered.

If a major water company fails financially, how far is the government actually prepared to go?

A restriction, not a ban on nationalisation

The existing rules originate in the privatisation settlement created by the Water Act 1989 and the Water (Target Investment Limit) Order 1990.

They restrict government shareholdings in the privatised water companies to between 1 and 3 per cent, with the precise limit differing between companies.

But those rules have not made nationalisation legally impossible.

In May, the government told Parliament that the current legislation limited government holdings to around 3 per cent, and that bringing a water company into public ownership would require new primary legislation and compensation for existing owners.

The forthcoming legislation will make that process easier by removing the shareholding restrictions, but ministers would still need to decide to use those powers and determine how any acquisition was financed.

The government was taking a markedly different position only months ago.

In April it told Parliament that it had "no intention to nationalise the water industry" and therefore had "no current plans to assess the financial or non-financial costs" of comparing private and public ownership.

That position now looks considerably less absolute.

Prime Minister Andy Burnham, speaking to the Commons for the first time since taking office, has since described Britain's water industry as "a leaking monument to that approach, a country run in the private rather than public interest".

Yet the latest announcement still stops well short of committing his government to public ownership.

The £100 billion problem

The obvious obstacle is cost.

There is no agreed figure for buying England's water companies.

Defra estimated in September 2025 that nationalising the sector could cost about £100 billion, using the industry's regulatory capital value as a proxy.

The House of Commons Library records that Ofwat's regulatory capital value for the industry is now just over £117 billion.

An analysis commissioned by Thames Water creditors and produced by Frontier Economics in July 2026 put the potential figure at £144 billion by 2030, accounting for planned capital investment over the current price control period.

A fourth figure complicates matters further. The Office for Budget Responsibility has calculated the question differently again: it put water companies' debts and other liabilities at £91 billion against £12 billion in financial assets and £94 billion in non-financial assets, concluding that moving the sector onto the public balance sheet could increase public sector net financial liabilities by around £78 billion, a measure of the impact on the government's books, not an acquisition price.

Those figures should be treated cautiously.

Regulatory capital value was created to help determine the returns companies can earn and the bills customers pay. It is not necessarily the price a government would have to pay shareholders.

Different legal structures, distressed companies, individual acquisitions and even the accounting basis used to frame the question could each produce very different numbers.

But the scale explains why removing a legal restriction is much easier than announcing wholesale nationalisation.

Thames Water changes the calculation

The more significant possibility is therefore not the government buying every water company.

It is selective intervention.

Thames Water has become the obvious test case.

The Independent Water Commission, in its final report, found no clear evidence of a causal link between ownership models and environmental or operational performance. Sir Jon Cunliffe, who chaired the commission, said: "on the data and comparable metrics available, the truth is that we did not see evidence of a causal link between ownership models and a range of environmental and other performance indicators."

But in an earlier address on the commission's plans, Cunliffe had already identified financial resilience as a separate problem, warning that "decisions by a number of companies about structure and debt historically have left them more exposed, as we have seen in the extreme example of Thames Water."

His conclusion in the final report was significant. What mattered, he said, was not simply whether ownership was public or private, but "the business model of the owners, the level of return they seek on their investment, their time horizon for that return, their preference for dividends or capital gain and their willingness to invest further in their company for a fair return."

That distinction may explain the government's emerging position.

Rather than committing billions of pounds to nationalising the entire industry, ministers could acquire stakes in individual companies when financial failure, poor performance or restructuring creates an opportunity.

The legislation announced this week would remove one of the obstacles to doing so.

The unanswered questions

The announcement therefore matters.

But "stronger public control" remains undefined.

The government has not said whether it would buy minority stakes, controlling stakes or entire companies.

It has not said how acquisitions would be valued.

It has not said whether taxpayers would receive dividends if public money was invested.

It has not said whether government investment would come ahead of existing shareholders or creditors when a company was restructured.

And its announcement does not name Thames Water, or any other company, as a candidate for these powers.

Until those questions are answered, the government has not announced public ownership of England's water industry.

It has removed a lock from the door.

Whether ministers ever open it is another matter.$n$ WHERE slug::text = $k$gw4k9mxn7r$k$ AND body_text = $o$The government has announced what it calls a "pathway to stronger public control" of England's water industry.

For now, however, no water company is being taken into public ownership.

The change announced this week is considerably narrower.

Ministers intend to repeal rules dating from the privatisation of the industry that restrict government shareholdings in England's major water and sewerage companies to between 1 and 3 per cent, with the exact limit varying by company.

Removing those restrictions would give a future government considerably more freedom to intervene in a water company.

It does not itself constitute an intervention.

No shares are being bought. No company is being nationalised. No amount of money has been allocated for acquisitions.

And the government has not said what proportion of a water company it would actually be prepared to own.

The distinction matters.

The Department for Environment, Food and Rural Affairs said the change would give government "flexibility to consider a wide range of possible future interventions, including on ownership models".

That is a possibility rather than a policy.

The announcement also makes clear that ministers expect private capital to remain central to the system, saying that securing the long-term future of the sector "relies on continued private sector investment".

That leaves a much bigger question unanswered.

If a major water company fails financially, how far is the government actually prepared to go?

A restriction, not a ban on nationalisation

The existing rules originate in the privatisation settlement created by the Water Act 1989 and the Water (Target Investment Limit) Order 1990.

They restrict government shareholdings in the privatised water companies to between 1 and 3 per cent, with the precise limit differing between companies.

But those rules have not made nationalisation legally impossible.

In May, the government told Parliament that the current legislation limited government holdings to around 3 per cent, and that bringing a water company into public ownership would require new primary legislation and compensation for existing owners.

The forthcoming legislation will make that process easier by removing the shareholding restrictions, but ministers would still need to decide to use those powers and determine how any acquisition was financed.

The government was taking a markedly different position only months ago.

In April it told Parliament that it had "no intention to nationalise the water industry" and therefore had "no current plans to assess the financial or non-financial costs" of comparing private and public ownership.

That position now looks considerably less absolute.

Prime Minister Andy Burnham, speaking to the Commons for the first time since taking office, has since described Britain's water industry as "a leaking monument to that approach — a country run in the private rather than public interest".

Yet the latest announcement still stops well short of committing his government to public ownership.

The £100 billion problem

The obvious obstacle is cost.

There is no agreed figure for buying England's water companies.

Defra estimated in September 2025 that nationalising the sector could cost about £100 billion, using the industry's regulatory capital value as a proxy.

The House of Commons Library records that Ofwat's regulatory capital value for the industry is now just over £117 billion.

An analysis commissioned by Thames Water creditors and produced by Frontier Economics in July 2026 put the potential figure at £144 billion by 2030, accounting for planned capital investment over the current price control period.

A fourth figure complicates matters further. The Office for Budget Responsibility has calculated the question differently again: it put water companies' debts and other liabilities at £91 billion against £12 billion in financial assets and £94 billion in non-financial assets, concluding that moving the sector onto the public balance sheet could increase public sector net financial liabilities by around £78 billion, a measure of the impact on the government's books, not an acquisition price.

Those figures should be treated cautiously.

Regulatory capital value was created to help determine the returns companies can earn and the bills customers pay. It is not necessarily the price a government would have to pay shareholders.

Different legal structures, distressed companies, individual acquisitions and even the accounting basis used to frame the question could each produce very different numbers.

But the scale explains why removing a legal restriction is much easier than announcing wholesale nationalisation.

Thames Water changes the calculation

The more significant possibility is therefore not the government buying every water company.

It is selective intervention.

Thames Water has become the obvious test case.

The Independent Water Commission, in its final report, found no clear evidence of a causal link between ownership models and environmental or operational performance. Sir Jon Cunliffe, who chaired the commission, said: "on the data and comparable metrics available, the truth is that we did not see evidence of a causal link between ownership models and a range of environmental and other performance indicators."

But in an earlier address on the commission's plans, Cunliffe had already identified financial resilience as a separate problem, warning that "decisions by a number of companies about structure and debt historically have left them more exposed — as we have seen in the extreme example of Thames Water."

His conclusion in the final report was significant. What mattered, he said, was not simply whether ownership was public or private, but "the business model of the owners, the level of return they seek on their investment, their time horizon for that return, their preference for dividends or capital gain and their willingness to invest further in their company for a fair return."

That distinction may explain the government's emerging position.

Rather than committing billions of pounds to nationalising the entire industry, ministers could acquire stakes in individual companies when financial failure, poor performance or restructuring creates an opportunity.

The legislation announced this week would remove one of the obstacles to doing so.

The unanswered questions

The announcement therefore matters.

But "stronger public control" remains undefined.

The government has not said whether it would buy minority stakes, controlling stakes or entire companies.

It has not said how acquisitions would be valued.

It has not said whether taxpayers would receive dividends if public money was invested.

It has not said whether government investment would come ahead of existing shareholders or creditors when a company was restructured.

And its announcement does not name Thames Water, or any other company, as a candidate for these powers.

Until those questions are answered, the government has not announced public ownership of England's water industry.

It has removed a lock from the door.

Whether ministers ever open it is another matter.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$gw4k9mxn7r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$mf7k3qxw9n$k$, 'body_text', $o$The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024–25 because it judged them invalid.

Most were not fraud. The department says contractor error was the most common reason. Other invoices lacked valid purchase orders or exceeded contractual limits, and rejection of an invoice does not mean a supplier acted dishonestly.

But the figure sits beside a problem the MoD has yet to solve. It does not have a reliable estimate of how much money it actually loses to fraud.

Its published estimate has reached £1.5 billion a year, mostly from procurement. Permanent Secretary Jeremy Pocklington told the Public Accounts Committee in March that the number was "essentially an academic construct". It was derived from external benchmarks rather than fraud measured across the department's own spending.

The government's response to the committee, published on 4 August, accepts that a better estimate is needed. The MoD will publish a phased plan in a new counter-fraud strategy this autumn, but says procurement fraud will be particularly difficult to quantify.

The £1.5 billion figure should not therefore be reported as £1.5 billion of fraud known to have occurred.

The National Audit Office found that the MoD constructed its maximum estimate by applying external fraud rates to parts of its expenditure. It used a benchmark of 4.57 per cent for procurement and 1.7 per cent for payroll. Those rates came from research that was not specific to the Ministry of Defence. The estimate also did not take account of the effect of the department's existing controls.

The NAO said the real loss could be significantly higher or lower.

The MoD had historically applied its calculation to £28.5 billion of selected expenditure. The NAO reported that using roughly £40 billion of total procurement expenditure instead would produce an unmitigated maximum estimate of about £2 billion. That would still be a modelled exposure, not evidence that £2 billion had been stolen or fraudulently claimed.

The department is trying to replace that method with an assessment built more closely from its own risks and controls, though that work has some distance to go.

Fraud Defence created 130 risk registers across the MoD and combined them into a central view. By August 2025 the register contained 1,468 active risks. Forty-seven per cent were rated as having a severe or critical potential impact after mitigation, but the department had not attached financial values to them. Some severe or critical risks had not been updated for as long as five years, and the NAO found no assessment of how effectively some existing controls were working.

The government now says the register has been replaced by a new enterprise version organised around procurement, personnel controls, misuse of Defence assets and cyber and AI deception. It is working with the Public Sector Fraud Authority, NHS Counter Fraud Authority and other specialists to calculate the exposure behind those categories.

The MoD expected the exercise to take about a year, with initial assessments of less complex fraud categories by the end of 2026. Procurement, already the department's largest identified fraud-risk area, could take longer and may still require some benchmarking.

The department currently spends around £40 billion a year on procurement. How much that figure will rise is less clear.

The Public Accounts Committee says Defence procurement is expected to exceed £70 billion a year by 2028–29. But the source it cites for that claim does not say that.

Paragraph 2.6 of the National Audit Office report says total Ministry of Defence spending is planned to rise from £53.9 billion in 2023–24 to £73.5 billion in 2028–29. Elsewhere, the NAO puts current procurement spending at around £40 billion. It does not publish a projection showing procurement itself reaching £70 billion.

The distinction is substantial. A procurement budget of more than £70 billion would mean almost all of the department's projected £73.5 billion expenditure was procurement.

Open Govt also checked the Public Accounts Committee's evidence session with senior MoD officials and the department's subsequent written evidence. Permanent Secretary Jeremy Pocklington confirmed that roughly £40 billion is currently spent on procurement but did not give a £70 billion projection.

During the hearing, committee member Rupert Lowe said spending was likely to rise to £75 billion, but that figure was put to officials rather than supplied or confirmed by them.

The committee may hold other evidence for its projection, but the primary material it cites publicly does not establish it. The safer conclusion is that procurement spending is expected to increase as the defence budget rises. On the evidence published with this inquiry, the size of that increase cannot be verified.

The £400 million of supplier costs stopped in 2024–25 shows both the scale of the commercial checking already taking place and why it cannot simply be added to the department's fraud figures.

MoD officials told MPs that its Cost Assurance and Analysis Service had disallowed around £400 million of potential supplier costs. Payments can be stopped automatically when an invoice fails a three-way check against the purchase order and confirmation that goods or services were received. Invoices which cannot readily be corrected can then be formally rejected.

Those controls may prevent fraudulent payments as well as ordinary mistakes, but the department does not know how much of the £400 million falls into either category. It also does not count those wider commercial controls in the counter-fraud savings it reports to the Public Sector Fraud Authority, which is worth bearing in mind alongside another figure highlighted by MPs: the poor recorded return on the MoD's dedicated counter-fraud spending.

Between 2021–22 and 2024–25, the MoD reported average counter-fraud spending of £5.7 million a year and average prevention and recoveries of £2.8 million, split roughly equally between fraud and error. That produced a reported return of 48p for every £1 spent, compared with a government expectation of £3.

The return improved to £1.34 in 2024–25.

Part of that improvement came from a review of what the department calls "commercial leakage". The exercise identified £17.5 million of potentially recoverable overpayments in digital procurement contracts. It did not recover £17.5 million that year. The NAO says £3.8 million recovered from the exercise contributed to the 2024–25 result.

The review itself cost £5 million, mostly to develop data-analysis technology, and that cost was not included in the counter-fraud expenditure used to calculate the £1.34 return.

The MoD says its recorded return may understate the value of work being done elsewhere in the department. The NAO agreed that commercial and financial controls can prevent losses without those savings appearing in the central counter-fraud numbers. It also found that the MoD had difficulty consistently identifying what it spent on counter-fraud work, making the return figure an incomplete measure in both directions.

The department nevertheless remains well below the government's £3 target on its own reported measure. Its 4 August response says it expects recoveries to improve significantly in 2025–26 and intends to reach the target by 2028 at the latest. A detailed plan is due to the Public Accounts Committee in November.

The NAO also found weaknesses in what happened after suspicions arose.

Fraud investigations are divided between Fraud Defence, the Ministry of Defence Police and the separate service police forces, alongside finance, commercial and other teams. Earlier reviews had found duplication, siloed working and mistrust between parts of that system. The NAO found that several case-management systems were being used and that the MoD lacked a single view of how investigations were progressing and ending.

There was also no common monetary threshold for deciding when a suspected case should be investigated, and different teams were not always clear about the criteria used elsewhere in the department. If police decided that a case did not meet the criminal threshold, the NAO found there was no consistently applied mechanism ensuring it returned to another part of the MoD for possible non-criminal action.

The government says some of this has changed. A Defence Policing Board and Defence Police Chiefs' Council were created in 2025. Fraud Defence is adopting a case-management system intended to work more easily with policing bodies, and the MoD is developing an integrated investigation model with shared triage and better information exchange. The target date for implementing the committee's recommendation is April 2027.

Pocklington told MPs that commercial staff regularly have to distinguish between what he called "sharp commercial practice" and conduct involving fraudulent intent. The Public Accounts Committee concluded that the department lacked clarity over when contractual disputes should be passed to police or counter-fraud investigators.

The government has accepted a recommendation for a commercial fraud playbook. It is supposed to explain the warning signs, controls, responsibilities and steps staff should take when fraud is suspected. Procurement red-flag guidance has already been added to training for new commercial staff. The full playbook is due by April 2027.

For single-source defence contracts worth more than £5 million, the department points to an existing safeguard. Regulations give it access to open-book information on pricing and costs claimed during contracts. The government says that provides both scrutiny and a deterrent against fraudulent claims.

Responsibility for counter-fraud has also been tightened. Director General Finance Aneen Blackmore has been given greater authority over the function and senior sponsors have been assigned across the main parts of Defence. A new two-star Director Assurance is to focus predominantly on fraud and error.

The department has accepted all of the Public Accounts Committee's recommendations. It is expanding analytics, reviewing procurement controls and developing a replacement finance system capable of continuously checking transactions for possible fraud, error and policy breaches. That system is expected to go live in 2028, by which point the MoD also expects to have reached the government's £3 return target.

Its more immediate problem is more basic. It has built more than 100 risk registers and rejected around £400 million of supplier costs in a single year, yet it still cannot put a reliable figure on how much fraud is actually costing it.$o$);
  UPDATE public.editorials SET body_text = $n$The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024-25 because it judged them invalid.

Most were not fraud. The department says contractor error was the most common reason. Other invoices lacked valid purchase orders or exceeded contractual limits, and rejection of an invoice does not mean a supplier acted dishonestly.

But the figure sits beside a problem the MoD has yet to solve. It does not have a reliable estimate of how much money it actually loses to fraud.

Its published estimate has reached £1.5 billion a year, mostly from procurement. Permanent Secretary Jeremy Pocklington told the Public Accounts Committee in March that the number was "essentially an academic construct". It was derived from external benchmarks rather than fraud measured across the department's own spending.

The government's response to the committee, published on 4 August, accepts that a better estimate is needed. The MoD will publish a phased plan in a new counter-fraud strategy this autumn, but says procurement fraud will be particularly difficult to quantify.

The £1.5 billion figure should not therefore be reported as £1.5 billion of fraud known to have occurred.

The National Audit Office found that the MoD constructed its maximum estimate by applying external fraud rates to parts of its expenditure. It used a benchmark of 4.57 per cent for procurement and 1.7 per cent for payroll. Those rates came from research that was not specific to the Ministry of Defence. The estimate also did not take account of the effect of the department's existing controls.

The NAO said the real loss could be significantly higher or lower.

The MoD had historically applied its calculation to £28.5 billion of selected expenditure. The NAO reported that using roughly £40 billion of total procurement expenditure instead would produce an unmitigated maximum estimate of about £2 billion. That would still be a modelled exposure, not evidence that £2 billion had been stolen or fraudulently claimed.

The department is trying to replace that method with an assessment built more closely from its own risks and controls, though that work has some distance to go.

Fraud Defence created 130 risk registers across the MoD and combined them into a central view. By August 2025 the register contained 1,468 active risks. Forty-seven per cent were rated as having a severe or critical potential impact after mitigation, but the department had not attached financial values to them. Some severe or critical risks had not been updated for as long as five years, and the NAO found no assessment of how effectively some existing controls were working.

The government now says the register has been replaced by a new enterprise version organised around procurement, personnel controls, misuse of Defence assets and cyber and AI deception. It is working with the Public Sector Fraud Authority, NHS Counter Fraud Authority and other specialists to calculate the exposure behind those categories.

The MoD expected the exercise to take about a year, with initial assessments of less complex fraud categories by the end of 2026. Procurement, already the department's largest identified fraud-risk area, could take longer and may still require some benchmarking.

The department currently spends around £40 billion a year on procurement. How much that figure will rise is less clear.

The Public Accounts Committee says Defence procurement is expected to exceed £70 billion a year by 2028-29. But the source it cites for that claim does not say that.

Paragraph 2.6 of the National Audit Office report says total Ministry of Defence spending is planned to rise from £53.9 billion in 2023-24 to £73.5 billion in 2028-29. Elsewhere, the NAO puts current procurement spending at around £40 billion. It does not publish a projection showing procurement itself reaching £70 billion.

The distinction is substantial. A procurement budget of more than £70 billion would mean almost all of the department's projected £73.5 billion expenditure was procurement.

Open Govt also checked the Public Accounts Committee's evidence session with senior MoD officials and the department's subsequent written evidence. Permanent Secretary Jeremy Pocklington confirmed that roughly £40 billion is currently spent on procurement but did not give a £70 billion projection.

During the hearing, committee member Rupert Lowe said spending was likely to rise to £75 billion, but that figure was put to officials rather than supplied or confirmed by them.

The committee may hold other evidence for its projection, but the primary material it cites publicly does not establish it. The safer conclusion is that procurement spending is expected to increase as the defence budget rises. On the evidence published with this inquiry, the size of that increase cannot be verified.

The £400 million of supplier costs stopped in 2024-25 shows both the scale of the commercial checking already taking place and why it cannot simply be added to the department's fraud figures.

MoD officials told MPs that its Cost Assurance and Analysis Service had disallowed around £400 million of potential supplier costs. Payments can be stopped automatically when an invoice fails a three-way check against the purchase order and confirmation that goods or services were received. Invoices which cannot readily be corrected can then be formally rejected.

Those controls may prevent fraudulent payments as well as ordinary mistakes, but the department does not know how much of the £400 million falls into either category. It also does not count those wider commercial controls in the counter-fraud savings it reports to the Public Sector Fraud Authority, which is worth bearing in mind alongside another figure highlighted by MPs: the poor recorded return on the MoD's dedicated counter-fraud spending.

Between 2021-22 and 2024-25, the MoD reported average counter-fraud spending of £5.7 million a year and average prevention and recoveries of £2.8 million, split roughly equally between fraud and error. That produced a reported return of 48p for every £1 spent, compared with a government expectation of £3.

The return improved to £1.34 in 2024-25.

Part of that improvement came from a review of what the department calls "commercial leakage". The exercise identified £17.5 million of potentially recoverable overpayments in digital procurement contracts. It did not recover £17.5 million that year. The NAO says £3.8 million recovered from the exercise contributed to the 2024-25 result.

The review itself cost £5 million, mostly to develop data-analysis technology, and that cost was not included in the counter-fraud expenditure used to calculate the £1.34 return.

The MoD says its recorded return may understate the value of work being done elsewhere in the department. The NAO agreed that commercial and financial controls can prevent losses without those savings appearing in the central counter-fraud numbers. It also found that the MoD had difficulty consistently identifying what it spent on counter-fraud work, making the return figure an incomplete measure in both directions.

The department nevertheless remains well below the government's £3 target on its own reported measure. Its 4 August response says it expects recoveries to improve significantly in 2025-26 and intends to reach the target by 2028 at the latest. A detailed plan is due to the Public Accounts Committee in November.

The NAO also found weaknesses in what happened after suspicions arose.

Fraud investigations are divided between Fraud Defence, the Ministry of Defence Police and the separate service police forces, alongside finance, commercial and other teams. Earlier reviews had found duplication, siloed working and mistrust between parts of that system. The NAO found that several case-management systems were being used and that the MoD lacked a single view of how investigations were progressing and ending.

There was also no common monetary threshold for deciding when a suspected case should be investigated, and different teams were not always clear about the criteria used elsewhere in the department. If police decided that a case did not meet the criminal threshold, the NAO found there was no consistently applied mechanism ensuring it returned to another part of the MoD for possible non-criminal action.

The government says some of this has changed. A Defence Policing Board and Defence Police Chiefs' Council were created in 2025. Fraud Defence is adopting a case-management system intended to work more easily with policing bodies, and the MoD is developing an integrated investigation model with shared triage and better information exchange. The target date for implementing the committee's recommendation is April 2027.

Pocklington told MPs that commercial staff regularly have to distinguish between what he called "sharp commercial practice" and conduct involving fraudulent intent. The Public Accounts Committee concluded that the department lacked clarity over when contractual disputes should be passed to police or counter-fraud investigators.

The government has accepted a recommendation for a commercial fraud playbook. It is supposed to explain the warning signs, controls, responsibilities and steps staff should take when fraud is suspected. Procurement red-flag guidance has already been added to training for new commercial staff. The full playbook is due by April 2027.

For single-source defence contracts worth more than £5 million, the department points to an existing safeguard. Regulations give it access to open-book information on pricing and costs claimed during contracts. The government says that provides both scrutiny and a deterrent against fraudulent claims.

Responsibility for counter-fraud has also been tightened. Director General Finance Aneen Blackmore has been given greater authority over the function and senior sponsors have been assigned across the main parts of Defence. A new two-star Director Assurance is to focus predominantly on fraud and error.

The department has accepted all of the Public Accounts Committee's recommendations. It is expanding analytics, reviewing procurement controls and developing a replacement finance system capable of continuously checking transactions for possible fraud, error and policy breaches. That system is expected to go live in 2028, by which point the MoD also expects to have reached the government's £3 return target.

Its more immediate problem is more basic. It has built more than 100 risk registers and rejected around £400 million of supplier costs in a single year, yet it still cannot put a reliable figure on how much fraud is actually costing it.$n$ WHERE slug::text = $k$mf7k3qxw9n$k$ AND body_text = $o$The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024–25 because it judged them invalid.

Most were not fraud. The department says contractor error was the most common reason. Other invoices lacked valid purchase orders or exceeded contractual limits, and rejection of an invoice does not mean a supplier acted dishonestly.

But the figure sits beside a problem the MoD has yet to solve. It does not have a reliable estimate of how much money it actually loses to fraud.

Its published estimate has reached £1.5 billion a year, mostly from procurement. Permanent Secretary Jeremy Pocklington told the Public Accounts Committee in March that the number was "essentially an academic construct". It was derived from external benchmarks rather than fraud measured across the department's own spending.

The government's response to the committee, published on 4 August, accepts that a better estimate is needed. The MoD will publish a phased plan in a new counter-fraud strategy this autumn, but says procurement fraud will be particularly difficult to quantify.

The £1.5 billion figure should not therefore be reported as £1.5 billion of fraud known to have occurred.

The National Audit Office found that the MoD constructed its maximum estimate by applying external fraud rates to parts of its expenditure. It used a benchmark of 4.57 per cent for procurement and 1.7 per cent for payroll. Those rates came from research that was not specific to the Ministry of Defence. The estimate also did not take account of the effect of the department's existing controls.

The NAO said the real loss could be significantly higher or lower.

The MoD had historically applied its calculation to £28.5 billion of selected expenditure. The NAO reported that using roughly £40 billion of total procurement expenditure instead would produce an unmitigated maximum estimate of about £2 billion. That would still be a modelled exposure, not evidence that £2 billion had been stolen or fraudulently claimed.

The department is trying to replace that method with an assessment built more closely from its own risks and controls, though that work has some distance to go.

Fraud Defence created 130 risk registers across the MoD and combined them into a central view. By August 2025 the register contained 1,468 active risks. Forty-seven per cent were rated as having a severe or critical potential impact after mitigation, but the department had not attached financial values to them. Some severe or critical risks had not been updated for as long as five years, and the NAO found no assessment of how effectively some existing controls were working.

The government now says the register has been replaced by a new enterprise version organised around procurement, personnel controls, misuse of Defence assets and cyber and AI deception. It is working with the Public Sector Fraud Authority, NHS Counter Fraud Authority and other specialists to calculate the exposure behind those categories.

The MoD expected the exercise to take about a year, with initial assessments of less complex fraud categories by the end of 2026. Procurement, already the department's largest identified fraud-risk area, could take longer and may still require some benchmarking.

The department currently spends around £40 billion a year on procurement. How much that figure will rise is less clear.

The Public Accounts Committee says Defence procurement is expected to exceed £70 billion a year by 2028–29. But the source it cites for that claim does not say that.

Paragraph 2.6 of the National Audit Office report says total Ministry of Defence spending is planned to rise from £53.9 billion in 2023–24 to £73.5 billion in 2028–29. Elsewhere, the NAO puts current procurement spending at around £40 billion. It does not publish a projection showing procurement itself reaching £70 billion.

The distinction is substantial. A procurement budget of more than £70 billion would mean almost all of the department's projected £73.5 billion expenditure was procurement.

Open Govt also checked the Public Accounts Committee's evidence session with senior MoD officials and the department's subsequent written evidence. Permanent Secretary Jeremy Pocklington confirmed that roughly £40 billion is currently spent on procurement but did not give a £70 billion projection.

During the hearing, committee member Rupert Lowe said spending was likely to rise to £75 billion, but that figure was put to officials rather than supplied or confirmed by them.

The committee may hold other evidence for its projection, but the primary material it cites publicly does not establish it. The safer conclusion is that procurement spending is expected to increase as the defence budget rises. On the evidence published with this inquiry, the size of that increase cannot be verified.

The £400 million of supplier costs stopped in 2024–25 shows both the scale of the commercial checking already taking place and why it cannot simply be added to the department's fraud figures.

MoD officials told MPs that its Cost Assurance and Analysis Service had disallowed around £400 million of potential supplier costs. Payments can be stopped automatically when an invoice fails a three-way check against the purchase order and confirmation that goods or services were received. Invoices which cannot readily be corrected can then be formally rejected.

Those controls may prevent fraudulent payments as well as ordinary mistakes, but the department does not know how much of the £400 million falls into either category. It also does not count those wider commercial controls in the counter-fraud savings it reports to the Public Sector Fraud Authority, which is worth bearing in mind alongside another figure highlighted by MPs: the poor recorded return on the MoD's dedicated counter-fraud spending.

Between 2021–22 and 2024–25, the MoD reported average counter-fraud spending of £5.7 million a year and average prevention and recoveries of £2.8 million, split roughly equally between fraud and error. That produced a reported return of 48p for every £1 spent, compared with a government expectation of £3.

The return improved to £1.34 in 2024–25.

Part of that improvement came from a review of what the department calls "commercial leakage". The exercise identified £17.5 million of potentially recoverable overpayments in digital procurement contracts. It did not recover £17.5 million that year. The NAO says £3.8 million recovered from the exercise contributed to the 2024–25 result.

The review itself cost £5 million, mostly to develop data-analysis technology, and that cost was not included in the counter-fraud expenditure used to calculate the £1.34 return.

The MoD says its recorded return may understate the value of work being done elsewhere in the department. The NAO agreed that commercial and financial controls can prevent losses without those savings appearing in the central counter-fraud numbers. It also found that the MoD had difficulty consistently identifying what it spent on counter-fraud work, making the return figure an incomplete measure in both directions.

The department nevertheless remains well below the government's £3 target on its own reported measure. Its 4 August response says it expects recoveries to improve significantly in 2025–26 and intends to reach the target by 2028 at the latest. A detailed plan is due to the Public Accounts Committee in November.

The NAO also found weaknesses in what happened after suspicions arose.

Fraud investigations are divided between Fraud Defence, the Ministry of Defence Police and the separate service police forces, alongside finance, commercial and other teams. Earlier reviews had found duplication, siloed working and mistrust between parts of that system. The NAO found that several case-management systems were being used and that the MoD lacked a single view of how investigations were progressing and ending.

There was also no common monetary threshold for deciding when a suspected case should be investigated, and different teams were not always clear about the criteria used elsewhere in the department. If police decided that a case did not meet the criminal threshold, the NAO found there was no consistently applied mechanism ensuring it returned to another part of the MoD for possible non-criminal action.

The government says some of this has changed. A Defence Policing Board and Defence Police Chiefs' Council were created in 2025. Fraud Defence is adopting a case-management system intended to work more easily with policing bodies, and the MoD is developing an integrated investigation model with shared triage and better information exchange. The target date for implementing the committee's recommendation is April 2027.

Pocklington told MPs that commercial staff regularly have to distinguish between what he called "sharp commercial practice" and conduct involving fraudulent intent. The Public Accounts Committee concluded that the department lacked clarity over when contractual disputes should be passed to police or counter-fraud investigators.

The government has accepted a recommendation for a commercial fraud playbook. It is supposed to explain the warning signs, controls, responsibilities and steps staff should take when fraud is suspected. Procurement red-flag guidance has already been added to training for new commercial staff. The full playbook is due by April 2027.

For single-source defence contracts worth more than £5 million, the department points to an existing safeguard. Regulations give it access to open-book information on pricing and costs claimed during contracts. The government says that provides both scrutiny and a deterrent against fraudulent claims.

Responsibility for counter-fraud has also been tightened. Director General Finance Aneen Blackmore has been given greater authority over the function and senior sponsors have been assigned across the main parts of Defence. A new two-star Director Assurance is to focus predominantly on fraud and error.

The department has accepted all of the Public Accounts Committee's recommendations. It is expanding analytics, reviewing procurement controls and developing a replacement finance system capable of continuously checking transactions for possible fraud, error and policy breaches. That system is expected to go live in 2028, by which point the MoD also expects to have reached the government's £3 return target.

Its more immediate problem is more basic. It has built more than 100 risk registers and rejected around £400 million of supplier costs in a single year, yet it still cannot put a reliable figure on how much fraud is actually costing it.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$mf7k3qxw9n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$ag7k4mxq9w$k$, 'body_text', $o$Six people prosecuted over threats against parliamentarians should have received five-year bans from standing for elected office, according to the Speaker's Conference examining the security of politicians.

None did.

The courts gave no recorded reasons for omitting the orders. Crown Prosecution Service records do not show whether the orders were considered. Four of the six defendants received restraining orders instead.

The penalty has existed since November 2023.

Under the Elections Act 2022, an adult convicted of specified offences can be disqualified from standing for, being elected to or holding most elected offices for five years where the court is satisfied that the offence was aggravated by hostility towards a candidate, elected office-holder or campaigner.

Once those conditions are met, the court must impose the order unless particular circumstances would make it unjust. If it decides not to impose one for that reason, it must explain why in open court.

The Speaker's Conference was told by the then Solicitor General, Lucy Rigby KC, about six recent cases in which an order should have been imposed. In a follow-up letter dated 8 August 2025, Rigby said the Director of Public Prosecutions had confirmed all six defendants met the legislative requirements for a disqualification order. None was made.

The Conference said no reasons had been given by the courts and the CPS's records did not establish whether disqualification had even been considered.

One CPS regional unit subsequently reminded prosecutors about the orders after a court failed to impose one in a case involving criminal damage to an MP's office.

The problem is particularly unusual because prosecutors are not normally required to apply for the sanction.

Current CPS guidance says that where the statutory conditions are satisfied the court must make the order unless doing so would be unjust. Prosecutors are nevertheless told to be alert to qualifying cases and to help the court with the evidence required.

The Conference concluded that the six cases suggested courts might be omitting the orders more widely.

It recommended that prosecutors should specifically draw them to courts' attention and that sentencing guidance should be amended so judges and magistrates know when they apply.

By March, the government had not established how often the orders were being used.

It said it was working with HM Courts and Tribunals Service to obtain the data and would decide how to publish it once that work was complete. It would then consider whether further guidance was needed for prosecutors, judges and magistrates.

The missing election bans sit inside a wider problem identified by the Speaker's Conference.

Britain has become considerably better at recording crimes reported against MPs than at showing what happens to those cases across the criminal justice system.

Later Freedom of Information disclosures from the National Police Chiefs' Council record 984 alleged crimes involving MPs in 2025, up from 905 in 2024, with a further 258 recorded between 1 January and 30 April 2026.

More than half of the 2025 total, 527, were recorded as malicious communications. There were 150 harassment offences and 53 reports classified as threats to kill. The figures cover alleged offences across all recorded classifications, not only threats, and are drawn from the Mercury and ECINS systems used by the Parliamentary Liaison and Investigation Team.

Those numbers describe reports to police. They do not show how many resulted in charges, convictions or particular sentences.

There is evidence that cases dealt with through Operation Bridger, the national policing system for protecting MPs away from Parliament, can produce better results than ordinary cases.

The Metropolitan Police told the Conference, in written evidence submitted separately from the Speaker's Conference's own report, that investment in Bridger had produced "better conviction rates in comparison with the general population".

For 2023–24 it also reported a higher rate of charge or summons outcomes, more cautions and other resolutions for malicious communications and harassment, fewer cases ending because of evidential difficulties and fewer in which the victim stopped supporting the investigation.

The Met did not publish the comparative conviction percentages in that evidence.

Its submission also acknowledged that the response to threats remained inconsistent across Britain's police forces. Different officers and forces could apply different thresholds when deciding whether conduct should be recorded as a crime or how it should be dealt with.

The Speaker's Conference reached the same conclusion.

It found significant inconsistency both between forces and within them. These offences are serious but relatively uncommon for individual officers, meaning someone investigating a threat against an MP may have little previous experience of a politically motivated case.

The problem continues when cases reach prosecutors.

Most criminal cases involving MPs are handled by the CPS's 14 regional teams. Chief Crown Prosecutors have to approve cases involving MPs personally, and reports are sent each month to senior CPS management. Particularly complex cases can be moved to central specialist lawyers.

The CPS told the Conference that this senior oversight was sufficient to produce consistent decisions.

The Conference could not establish whether that was true.

Although cases involving MPs are reported internally each month, the CPS does not collect structured data based on the victim's profession. It therefore cannot produce a national dataset showing all offences targeting politicians and what happened to them.

Justice minister Sarah Sackman KC accepted the problem during the inquiry.

She said the system needed to be able to track conviction rates, sentences and other outcomes.

The Conference recommended building what it called "full picture" data, following cases targeting elected officials from referral to the CPS through charging and sentencing, including the use of protective orders.

It also challenged the CPS's reliance on senior oversight.

"Consistent decision making is a function of expertise, not seniority," the report concluded.

It recommended a small specialist prosecution team dealing regularly with anti-democratic crimes and electoral law rather than leaving most cases to regional prosecutors who may encounter them rarely.

The government only partly accepted the recommendation on national data.

Its response in March said CPS management information existed for cases referred for charging decisions, but was compiled manually and depended upon individual prosecutors telling the central team that the victim was an elected official.

The government said that made the data insufficiently reliable for assessing the problem nationally and promised to consider other ways of building the dataset.

There has been more movement on the police side.

In March, Deputy Chief Constable Chris Balmer of Cambridgeshire Police was appointed as the National Police Chiefs' Council lead for defending democracy.

Every force now has a superintendent responsible for Operation Bridger. A further network of 66 Home Office-funded advisers operates through Operation Ford, which covers locally elected representatives as well as MPs.

A national Threat Assessment Centre has also been established to bring together intelligence about threats against local politicians.

Those changes may improve the police response without solving the problem further along the justice system.

In June, the Home Office was asked how many Operation Ford cases had resulted in investigations, arrests and charges.

It said it did not hold that information.

A second parliamentary answer that month asked how many offences the national operation had handled during the 2026 local elections.

Again, the Home Office said it did not collect the figure.

The difference between the two parts of the system is now unusually clear.

Police data can show that 984 alleged crimes involving MPs were recorded in 2025. It can show that 53 were classified as threats to kill and 527 as malicious communications.

The Met can say that Operation Bridger cases produce better charging and conviction outcomes than ordinary cases.

What the government still cannot publish is a national series showing how many of those cases were referred to prosecutors, how many were charged, how many ended in conviction, what sentences were imposed and whether the special sanctions Parliament created for political intimidation were used.

The six missing disqualification orders are one result of that gap.

The law required courts to impose the five-year sanction in qualifying cases unless doing so would be unjust, in which case reasons should have been given.

The Speaker's Conference was told of six cases where an order should have been imposed.

As of the government's March response, it was still trying to obtain the data needed to establish how often courts were using them.$o$);
  UPDATE public.editorials SET body_text = $n$Six people prosecuted over threats against parliamentarians should have received five-year bans from standing for elected office, according to the Speaker's Conference examining the security of politicians.

None did.

The courts gave no recorded reasons for omitting the orders. Crown Prosecution Service records do not show whether the orders were considered. Four of the six defendants received restraining orders instead.

The penalty has existed since November 2023.

Under the Elections Act 2022, an adult convicted of specified offences can be disqualified from standing for, being elected to or holding most elected offices for five years where the court is satisfied that the offence was aggravated by hostility towards a candidate, elected office-holder or campaigner.

Once those conditions are met, the court must impose the order unless particular circumstances would make it unjust. If it decides not to impose one for that reason, it must explain why in open court.

The Speaker's Conference was told by the then Solicitor General, Lucy Rigby KC, about six recent cases in which an order should have been imposed. In a follow-up letter dated 8 August 2025, Rigby said the Director of Public Prosecutions had confirmed all six defendants met the legislative requirements for a disqualification order. None was made.

The Conference said no reasons had been given by the courts and the CPS's records did not establish whether disqualification had even been considered.

One CPS regional unit subsequently reminded prosecutors about the orders after a court failed to impose one in a case involving criminal damage to an MP's office.

The problem is particularly unusual because prosecutors are not normally required to apply for the sanction.

Current CPS guidance says that where the statutory conditions are satisfied the court must make the order unless doing so would be unjust. Prosecutors are nevertheless told to be alert to qualifying cases and to help the court with the evidence required.

The Conference concluded that the six cases suggested courts might be omitting the orders more widely.

It recommended that prosecutors should specifically draw them to courts' attention and that sentencing guidance should be amended so judges and magistrates know when they apply.

By March, the government had not established how often the orders were being used.

It said it was working with HM Courts and Tribunals Service to obtain the data and would decide how to publish it once that work was complete. It would then consider whether further guidance was needed for prosecutors, judges and magistrates.

The missing election bans sit inside a wider problem identified by the Speaker's Conference.

Britain has become considerably better at recording crimes reported against MPs than at showing what happens to those cases across the criminal justice system.

Later Freedom of Information disclosures from the National Police Chiefs' Council record 984 alleged crimes involving MPs in 2025, up from 905 in 2024, with a further 258 recorded between 1 January and 30 April 2026.

More than half of the 2025 total, 527, were recorded as malicious communications. There were 150 harassment offences and 53 reports classified as threats to kill. The figures cover alleged offences across all recorded classifications, not only threats, and are drawn from the Mercury and ECINS systems used by the Parliamentary Liaison and Investigation Team.

Those numbers describe reports to police. They do not show how many resulted in charges, convictions or particular sentences.

There is evidence that cases dealt with through Operation Bridger, the national policing system for protecting MPs away from Parliament, can produce better results than ordinary cases.

The Metropolitan Police told the Conference, in written evidence submitted separately from the Speaker's Conference's own report, that investment in Bridger had produced "better conviction rates in comparison with the general population".

For 2023-24 it also reported a higher rate of charge or summons outcomes, more cautions and other resolutions for malicious communications and harassment, fewer cases ending because of evidential difficulties and fewer in which the victim stopped supporting the investigation.

The Met did not publish the comparative conviction percentages in that evidence.

Its submission also acknowledged that the response to threats remained inconsistent across Britain's police forces. Different officers and forces could apply different thresholds when deciding whether conduct should be recorded as a crime or how it should be dealt with.

The Speaker's Conference reached the same conclusion.

It found significant inconsistency both between forces and within them. These offences are serious but relatively uncommon for individual officers, meaning someone investigating a threat against an MP may have little previous experience of a politically motivated case.

The problem continues when cases reach prosecutors.

Most criminal cases involving MPs are handled by the CPS's 14 regional teams. Chief Crown Prosecutors have to approve cases involving MPs personally, and reports are sent each month to senior CPS management. Particularly complex cases can be moved to central specialist lawyers.

The CPS told the Conference that this senior oversight was sufficient to produce consistent decisions.

The Conference could not establish whether that was true.

Although cases involving MPs are reported internally each month, the CPS does not collect structured data based on the victim's profession. It therefore cannot produce a national dataset showing all offences targeting politicians and what happened to them.

Justice minister Sarah Sackman KC accepted the problem during the inquiry.

She said the system needed to be able to track conviction rates, sentences and other outcomes.

The Conference recommended building what it called "full picture" data, following cases targeting elected officials from referral to the CPS through charging and sentencing, including the use of protective orders.

It also challenged the CPS's reliance on senior oversight.

"Consistent decision making is a function of expertise, not seniority," the report concluded.

It recommended a small specialist prosecution team dealing regularly with anti-democratic crimes and electoral law rather than leaving most cases to regional prosecutors who may encounter them rarely.

The government only partly accepted the recommendation on national data.

Its response in March said CPS management information existed for cases referred for charging decisions, but was compiled manually and depended upon individual prosecutors telling the central team that the victim was an elected official.

The government said that made the data insufficiently reliable for assessing the problem nationally and promised to consider other ways of building the dataset.

There has been more movement on the police side.

In March, Deputy Chief Constable Chris Balmer of Cambridgeshire Police was appointed as the National Police Chiefs' Council lead for defending democracy.

Every force now has a superintendent responsible for Operation Bridger. A further network of 66 Home Office-funded advisers operates through Operation Ford, which covers locally elected representatives as well as MPs.

A national Threat Assessment Centre has also been established to bring together intelligence about threats against local politicians.

Those changes may improve the police response without solving the problem further along the justice system.

In June, the Home Office was asked how many Operation Ford cases had resulted in investigations, arrests and charges.

It said it did not hold that information.

A second parliamentary answer that month asked how many offences the national operation had handled during the 2026 local elections.

Again, the Home Office said it did not collect the figure.

The difference between the two parts of the system is now unusually clear.

Police data can show that 984 alleged crimes involving MPs were recorded in 2025. It can show that 53 were classified as threats to kill and 527 as malicious communications.

The Met can say that Operation Bridger cases produce better charging and conviction outcomes than ordinary cases.

What the government still cannot publish is a national series showing how many of those cases were referred to prosecutors, how many were charged, how many ended in conviction, what sentences were imposed and whether the special sanctions Parliament created for political intimidation were used.

The six missing disqualification orders are one result of that gap.

The law required courts to impose the five-year sanction in qualifying cases unless doing so would be unjust, in which case reasons should have been given.

The Speaker's Conference was told of six cases where an order should have been imposed.

As of the government's March response, it was still trying to obtain the data needed to establish how often courts were using them.$n$ WHERE slug::text = $k$ag7k4mxq9w$k$ AND body_text = $o$Six people prosecuted over threats against parliamentarians should have received five-year bans from standing for elected office, according to the Speaker's Conference examining the security of politicians.

None did.

The courts gave no recorded reasons for omitting the orders. Crown Prosecution Service records do not show whether the orders were considered. Four of the six defendants received restraining orders instead.

The penalty has existed since November 2023.

Under the Elections Act 2022, an adult convicted of specified offences can be disqualified from standing for, being elected to or holding most elected offices for five years where the court is satisfied that the offence was aggravated by hostility towards a candidate, elected office-holder or campaigner.

Once those conditions are met, the court must impose the order unless particular circumstances would make it unjust. If it decides not to impose one for that reason, it must explain why in open court.

The Speaker's Conference was told by the then Solicitor General, Lucy Rigby KC, about six recent cases in which an order should have been imposed. In a follow-up letter dated 8 August 2025, Rigby said the Director of Public Prosecutions had confirmed all six defendants met the legislative requirements for a disqualification order. None was made.

The Conference said no reasons had been given by the courts and the CPS's records did not establish whether disqualification had even been considered.

One CPS regional unit subsequently reminded prosecutors about the orders after a court failed to impose one in a case involving criminal damage to an MP's office.

The problem is particularly unusual because prosecutors are not normally required to apply for the sanction.

Current CPS guidance says that where the statutory conditions are satisfied the court must make the order unless doing so would be unjust. Prosecutors are nevertheless told to be alert to qualifying cases and to help the court with the evidence required.

The Conference concluded that the six cases suggested courts might be omitting the orders more widely.

It recommended that prosecutors should specifically draw them to courts' attention and that sentencing guidance should be amended so judges and magistrates know when they apply.

By March, the government had not established how often the orders were being used.

It said it was working with HM Courts and Tribunals Service to obtain the data and would decide how to publish it once that work was complete. It would then consider whether further guidance was needed for prosecutors, judges and magistrates.

The missing election bans sit inside a wider problem identified by the Speaker's Conference.

Britain has become considerably better at recording crimes reported against MPs than at showing what happens to those cases across the criminal justice system.

Later Freedom of Information disclosures from the National Police Chiefs' Council record 984 alleged crimes involving MPs in 2025, up from 905 in 2024, with a further 258 recorded between 1 January and 30 April 2026.

More than half of the 2025 total, 527, were recorded as malicious communications. There were 150 harassment offences and 53 reports classified as threats to kill. The figures cover alleged offences across all recorded classifications, not only threats, and are drawn from the Mercury and ECINS systems used by the Parliamentary Liaison and Investigation Team.

Those numbers describe reports to police. They do not show how many resulted in charges, convictions or particular sentences.

There is evidence that cases dealt with through Operation Bridger, the national policing system for protecting MPs away from Parliament, can produce better results than ordinary cases.

The Metropolitan Police told the Conference, in written evidence submitted separately from the Speaker's Conference's own report, that investment in Bridger had produced "better conviction rates in comparison with the general population".

For 2023–24 it also reported a higher rate of charge or summons outcomes, more cautions and other resolutions for malicious communications and harassment, fewer cases ending because of evidential difficulties and fewer in which the victim stopped supporting the investigation.

The Met did not publish the comparative conviction percentages in that evidence.

Its submission also acknowledged that the response to threats remained inconsistent across Britain's police forces. Different officers and forces could apply different thresholds when deciding whether conduct should be recorded as a crime or how it should be dealt with.

The Speaker's Conference reached the same conclusion.

It found significant inconsistency both between forces and within them. These offences are serious but relatively uncommon for individual officers, meaning someone investigating a threat against an MP may have little previous experience of a politically motivated case.

The problem continues when cases reach prosecutors.

Most criminal cases involving MPs are handled by the CPS's 14 regional teams. Chief Crown Prosecutors have to approve cases involving MPs personally, and reports are sent each month to senior CPS management. Particularly complex cases can be moved to central specialist lawyers.

The CPS told the Conference that this senior oversight was sufficient to produce consistent decisions.

The Conference could not establish whether that was true.

Although cases involving MPs are reported internally each month, the CPS does not collect structured data based on the victim's profession. It therefore cannot produce a national dataset showing all offences targeting politicians and what happened to them.

Justice minister Sarah Sackman KC accepted the problem during the inquiry.

She said the system needed to be able to track conviction rates, sentences and other outcomes.

The Conference recommended building what it called "full picture" data, following cases targeting elected officials from referral to the CPS through charging and sentencing, including the use of protective orders.

It also challenged the CPS's reliance on senior oversight.

"Consistent decision making is a function of expertise, not seniority," the report concluded.

It recommended a small specialist prosecution team dealing regularly with anti-democratic crimes and electoral law rather than leaving most cases to regional prosecutors who may encounter them rarely.

The government only partly accepted the recommendation on national data.

Its response in March said CPS management information existed for cases referred for charging decisions, but was compiled manually and depended upon individual prosecutors telling the central team that the victim was an elected official.

The government said that made the data insufficiently reliable for assessing the problem nationally and promised to consider other ways of building the dataset.

There has been more movement on the police side.

In March, Deputy Chief Constable Chris Balmer of Cambridgeshire Police was appointed as the National Police Chiefs' Council lead for defending democracy.

Every force now has a superintendent responsible for Operation Bridger. A further network of 66 Home Office-funded advisers operates through Operation Ford, which covers locally elected representatives as well as MPs.

A national Threat Assessment Centre has also been established to bring together intelligence about threats against local politicians.

Those changes may improve the police response without solving the problem further along the justice system.

In June, the Home Office was asked how many Operation Ford cases had resulted in investigations, arrests and charges.

It said it did not hold that information.

A second parliamentary answer that month asked how many offences the national operation had handled during the 2026 local elections.

Again, the Home Office said it did not collect the figure.

The difference between the two parts of the system is now unusually clear.

Police data can show that 984 alleged crimes involving MPs were recorded in 2025. It can show that 53 were classified as threats to kill and 527 as malicious communications.

The Met can say that Operation Bridger cases produce better charging and conviction outcomes than ordinary cases.

What the government still cannot publish is a national series showing how many of those cases were referred to prosecutors, how many were charged, how many ended in conviction, what sentences were imposed and whether the special sanctions Parliament created for political intimidation were used.

The six missing disqualification orders are one result of that gap.

The law required courts to impose the five-year sanction in qualifying cases unless doing so would be unjust, in which case reasons should have been given.

The Speaker's Conference was told of six cases where an order should have been imposed.

As of the government's March response, it was still trying to obtain the data needed to establish how often courts were using them.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$ag7k4mxq9w$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$pn8k4qxw2r$k$, 'body_text', $o$Around 5,000 prisoners are expected to have their release dates brought forward under revised sentencing rules beginning in October, after the government excluded rape, serious child-sex and grooming offences from the changes.

Justice Secretary Alex Norris said the 5,000 would be released in stages over ten months. The figure is not the total number of prisoners who will leave custody during that period. Thousands are released in the normal course of their sentences each month. It refers to prisoners whose time in custody will be reduced under the new progression model.

The government says it cannot make substantially wider exclusions without risking the prison system reaching capacity. Adult male prisons are currently operating at about 98 per cent of their available capacity, according to the Ministry of Justice.

There is detailed government modelling behind the wider sentencing reforms. What has not been published alongside today's decision is an updated version showing the effect of the new exclusions.

The Ministry of Justice's latest annual capacity statement was published in January, before the government decided to remove further categories of offenders from the progression model.

That assessment projected 89,300 usable places across the adult prison estate in November 2026. After allowing for the Sentencing Act reforms, it estimated demand at 87,900 under its central scenario and 88,900 under its high-demand scenario.

The high scenario therefore left a modelled margin of about 400 places.

Without the Sentencing Act measures, the same model put November demand at 91,800 under the central scenario and 92,900 under the high scenario, both above projected supply. The department estimated that the whole package of sentencing reforms would reduce the prison population by about 7,500 by February 2028.

Those figures provide a clear explanation for why ministers regard sentencing reform as necessary. They do not show how much capacity remains after today's changes.

The January model incorporated the Sentencing Act package as it then stood. The government has now removed rape, serious child-sex and grooming offences from the new release arrangements and delayed their introduction from September until October.

No revised supply-and-demand table or published calculation accompanied the announcement showing how many prison places those decisions consume, or how many further offenders could be excluded before projected demand exceeds available capacity.

The 5,000 figure cannot simply be deducted from the January capacity numbers to calculate that margin. It describes people expected to have release dates brought forward over ten months, while the capacity model measures the prison population at particular points in time. The policies within the Sentencing Act also interact with one another, something the government's own impact assessment warns against treating as a collection of figures that can simply be added or subtracted.

The published evidence backs the government's broader claim that prisons have little spare capacity, without quantifying the narrower claim that today's exclusions mark the exact limit of what the system can accommodate.

The progression model changes the amount of a determinate sentence normally served in prison, rather than cancelling the remainder of the sentence.

For standard determinate sentences currently carrying release after 40 or 50 per cent, the earliest release point will generally become one third. For a group currently released after two thirds, the new minimum will generally be one half. Prisoners released remain on licence in the community and can be recalled. Additional days can also be imposed for serious breaches of prison rules, delaying release.

More than 18,000 prisoners serving life sentences, extended determinate sentences and other more serious sentence types were already outside the progression model. Today's decision adds rape, specified child-sex offences and grooming offences to the exclusions.

Manslaughter was not excluded on 4 August.

That left Albert Bowers and Jessie Cole, convicted of the manslaughter of PC Andrew Harper, within the group potentially affected by the changes. Both received 13-year sentences after PC Harper was killed while responding to a quad-bike theft in Berkshire in 2019. Henry Long, who received a longer extended sentence, was not affected in the same way.

Norris apologised to PC Harper's family and said the government had wanted to include manslaughter among the exclusions but could not widen them further without adding to the capacity problem.

The latest prison population statistics show why the capacity argument needs some care.

There were 85,858 prisoners in England and Wales on 30 June, not the 87,342 recorded at the end of March. The total was about 1,500 lower than a year earlier.

The fall was not evidence that the underlying capacity problem had disappeared.

At the end of March, changes to fixed-term recall led to releases of prisoners who had spent more than 56 days back in custody following recall. The Ministry of Justice says that probably contributed to a fall of about 1,600 prisoners between March and April. The population then remained between roughly 85,700 and 86,000 through April, May and June.

The government's statement that adult male prisons are 98 per cent full is also not directly comparable with the total prison population figure. One measures occupancy against usable places in the adult male estate. The other counts prisoners across the system. Both can therefore be true at the same time.

The position on remand has improved.

There were 15,386 prisoners on remand at the end of June, down from 16,025 at the end of March and 13 per cent below June 2025. The Ministry of Justice says the fall is likely to be partly associated with increased magistrates' sentencing powers, additional Crown Court sitting days and extra court funding.

The earlier rise in remand prisoners had been one contributor to pressure on the estate, so its reversal eases one part of the problem without resolving the rest. The sentenced population stood at 70,003 in June, 1 per cent higher than a year earlier, with increases concentrated among several longer sentence bands.

The shortage of places was already well established before the present government took office.

The previous government expanded its prison-building commitment to 20,000 additional places, originally intended for delivery by the middle of the decade. By September 2024, 6,518 had been delivered. The National Audit Office found that 278 of those places came from allowing additional crowding at four privately run prisons rather than from new accommodation.

The current commitment to deliver 14,000 places by 2031 is largely the unfinished part of that programme, not a separate 14,000 places on top of the original 20,000.

HMPPS describes it as the "remaining 14,000 of the 20,000 prison places". By March 2025, about 6,500 of the original total had been delivered. The January 2026 capacity statement subsequently said around 2,900 additional places had been delivered since July 2024 and around 5,000 more were under construction by the end of 2025.

The National Audit Office concluded in 2024 that the expansion programme had been unrealistic and insufficiently prioritised and that delays had worsened the capacity crisis. It also pointed to policy choices which increased demand for places, including longer sentences and increased police numbers, while maintenance problems reduced the estate's ability to absorb that demand.

The Ministry of Justice's January 2026 assessment is considerably less pessimistic than projections made before the Sentencing Act was included.

Its central case now says prison supply can keep pace with demand if the sentencing reforms work broadly as modelled and new capacity arrives on schedule. But the department expressly warns that the projections are uncertain. Police and prosecutorial activity, court capacity, sentencing decisions, offender behaviour and delays to prison construction can all change the result.

Its November 2026 high-demand scenario is particularly tight: 88,900 prisoners against 89,300 projected places.

The supply figure already contains an operating margin intended to recognise that a nominally empty cell is not necessarily usable for whichever prisoner needs it. Women's prisons, high-security prisons and establishments holding particular categories of offender are not interchangeable. The forecast also does not attempt to predict major shocks such as temporary cell losses following disorder.

Moving prisoners out of custody sooner also transfers work elsewhere.

The progression model places people on licence for the remainder of the relevant part of their sentence. The government has announced up to £700 million of additional funding for probation and community services by 2028–29 and plans to recruit more probation officers and expand electronic monitoring.

The same January capacity statement recorded 5,559 full-time-equivalent probation officers against a target of 7,114 in September 2025, a staffing level of 78 per cent. The Ministry of Justice estimated a wider sentence-management staffing gap of 3,150 full-time-equivalent posts for 2026–27 and said a deficit was likely to remain even as recruitment increased.

The choice facing ministers is therefore not simply between keeping prisoners inside and releasing them. The prison-building programme is still catching up with a target first set years ago. The Sentencing Act is being used to reduce projected demand at the same time. The government's own January model says removing the Act's effects altogether would push demand above supply this year.

Today's announcement changes part of the package on which that forecast was based.

The government says it has now reached the point beyond which further exclusions would risk the prison system reaching capacity. Its published capacity statement shows why that is plausible under the high-demand scenario, even though the statement predates today's exclusions and so cannot say where that point now lies.

The latest public model gives the adult estate 400 places of headroom under the high-demand scenario in November. The government has since changed which prisoners will be released and when, but did not publish revised capacity figures with the 4 August decision.$o$);
  UPDATE public.editorials SET body_text = $n$Around 5,000 prisoners are expected to have their release dates brought forward under revised sentencing rules beginning in October, after the government excluded rape, serious child-sex and grooming offences from the changes.

Justice Secretary Alex Norris said the 5,000 would be released in stages over ten months. The figure is not the total number of prisoners who will leave custody during that period. Thousands are released in the normal course of their sentences each month. It refers to prisoners whose time in custody will be reduced under the new progression model.

The government says it cannot make substantially wider exclusions without risking the prison system reaching capacity. Adult male prisons are currently operating at about 98 per cent of their available capacity, according to the Ministry of Justice.

There is detailed government modelling behind the wider sentencing reforms. What has not been published alongside today's decision is an updated version showing the effect of the new exclusions.

The Ministry of Justice's latest annual capacity statement was published in January, before the government decided to remove further categories of offenders from the progression model.

That assessment projected 89,300 usable places across the adult prison estate in November 2026. After allowing for the Sentencing Act reforms, it estimated demand at 87,900 under its central scenario and 88,900 under its high-demand scenario.

The high scenario therefore left a modelled margin of about 400 places.

Without the Sentencing Act measures, the same model put November demand at 91,800 under the central scenario and 92,900 under the high scenario, both above projected supply. The department estimated that the whole package of sentencing reforms would reduce the prison population by about 7,500 by February 2028.

Those figures provide a clear explanation for why ministers regard sentencing reform as necessary. They do not show how much capacity remains after today's changes.

The January model incorporated the Sentencing Act package as it then stood. The government has now removed rape, serious child-sex and grooming offences from the new release arrangements and delayed their introduction from September until October.

No revised supply-and-demand table or published calculation accompanied the announcement showing how many prison places those decisions consume, or how many further offenders could be excluded before projected demand exceeds available capacity.

The 5,000 figure cannot simply be deducted from the January capacity numbers to calculate that margin. It describes people expected to have release dates brought forward over ten months, while the capacity model measures the prison population at particular points in time. The policies within the Sentencing Act also interact with one another, something the government's own impact assessment warns against treating as a collection of figures that can simply be added or subtracted.

The published evidence backs the government's broader claim that prisons have little spare capacity, without quantifying the narrower claim that today's exclusions mark the exact limit of what the system can accommodate.

The progression model changes the amount of a determinate sentence normally served in prison, rather than cancelling the remainder of the sentence.

For standard determinate sentences currently carrying release after 40 or 50 per cent, the earliest release point will generally become one third. For a group currently released after two thirds, the new minimum will generally be one half. Prisoners released remain on licence in the community and can be recalled. Additional days can also be imposed for serious breaches of prison rules, delaying release.

More than 18,000 prisoners serving life sentences, extended determinate sentences and other more serious sentence types were already outside the progression model. Today's decision adds rape, specified child-sex offences and grooming offences to the exclusions.

Manslaughter was not excluded on 4 August.

That left Albert Bowers and Jessie Cole, convicted of the manslaughter of PC Andrew Harper, within the group potentially affected by the changes. Both received 13-year sentences after PC Harper was killed while responding to a quad-bike theft in Berkshire in 2019. Henry Long, who received a longer extended sentence, was not affected in the same way.

Norris apologised to PC Harper's family and said the government had wanted to include manslaughter among the exclusions but could not widen them further without adding to the capacity problem.

The latest prison population statistics show why the capacity argument needs some care.

There were 85,858 prisoners in England and Wales on 30 June, not the 87,342 recorded at the end of March. The total was about 1,500 lower than a year earlier.

The fall was not evidence that the underlying capacity problem had disappeared.

At the end of March, changes to fixed-term recall led to releases of prisoners who had spent more than 56 days back in custody following recall. The Ministry of Justice says that probably contributed to a fall of about 1,600 prisoners between March and April. The population then remained between roughly 85,700 and 86,000 through April, May and June.

The government's statement that adult male prisons are 98 per cent full is also not directly comparable with the total prison population figure. One measures occupancy against usable places in the adult male estate. The other counts prisoners across the system. Both can therefore be true at the same time.

The position on remand has improved.

There were 15,386 prisoners on remand at the end of June, down from 16,025 at the end of March and 13 per cent below June 2025. The Ministry of Justice says the fall is likely to be partly associated with increased magistrates' sentencing powers, additional Crown Court sitting days and extra court funding.

The earlier rise in remand prisoners had been one contributor to pressure on the estate, so its reversal eases one part of the problem without resolving the rest. The sentenced population stood at 70,003 in June, 1 per cent higher than a year earlier, with increases concentrated among several longer sentence bands.

The shortage of places was already well established before the present government took office.

The previous government expanded its prison-building commitment to 20,000 additional places, originally intended for delivery by the middle of the decade. By September 2024, 6,518 had been delivered. The National Audit Office found that 278 of those places came from allowing additional crowding at four privately run prisons rather than from new accommodation.

The current commitment to deliver 14,000 places by 2031 is largely the unfinished part of that programme, not a separate 14,000 places on top of the original 20,000.

HMPPS describes it as the "remaining 14,000 of the 20,000 prison places". By March 2025, about 6,500 of the original total had been delivered. The January 2026 capacity statement subsequently said around 2,900 additional places had been delivered since July 2024 and around 5,000 more were under construction by the end of 2025.

The National Audit Office concluded in 2024 that the expansion programme had been unrealistic and insufficiently prioritised and that delays had worsened the capacity crisis. It also pointed to policy choices which increased demand for places, including longer sentences and increased police numbers, while maintenance problems reduced the estate's ability to absorb that demand.

The Ministry of Justice's January 2026 assessment is considerably less pessimistic than projections made before the Sentencing Act was included.

Its central case now says prison supply can keep pace with demand if the sentencing reforms work broadly as modelled and new capacity arrives on schedule. But the department expressly warns that the projections are uncertain. Police and prosecutorial activity, court capacity, sentencing decisions, offender behaviour and delays to prison construction can all change the result.

Its November 2026 high-demand scenario is particularly tight: 88,900 prisoners against 89,300 projected places.

The supply figure already contains an operating margin intended to recognise that a nominally empty cell is not necessarily usable for whichever prisoner needs it. Women's prisons, high-security prisons and establishments holding particular categories of offender are not interchangeable. The forecast also does not attempt to predict major shocks such as temporary cell losses following disorder.

Moving prisoners out of custody sooner also transfers work elsewhere.

The progression model places people on licence for the remainder of the relevant part of their sentence. The government has announced up to £700 million of additional funding for probation and community services by 2028-29 and plans to recruit more probation officers and expand electronic monitoring.

The same January capacity statement recorded 5,559 full-time-equivalent probation officers against a target of 7,114 in September 2025, a staffing level of 78 per cent. The Ministry of Justice estimated a wider sentence-management staffing gap of 3,150 full-time-equivalent posts for 2026-27 and said a deficit was likely to remain even as recruitment increased.

The choice facing ministers is therefore not simply between keeping prisoners inside and releasing them. The prison-building programme is still catching up with a target first set years ago. The Sentencing Act is being used to reduce projected demand at the same time. The government's own January model says removing the Act's effects altogether would push demand above supply this year.

Today's announcement changes part of the package on which that forecast was based.

The government says it has now reached the point beyond which further exclusions would risk the prison system reaching capacity. Its published capacity statement shows why that is plausible under the high-demand scenario, even though the statement predates today's exclusions and so cannot say where that point now lies.

The latest public model gives the adult estate 400 places of headroom under the high-demand scenario in November. The government has since changed which prisoners will be released and when, but did not publish revised capacity figures with the 4 August decision.$n$ WHERE slug::text = $k$pn8k4qxw2r$k$ AND body_text = $o$Around 5,000 prisoners are expected to have their release dates brought forward under revised sentencing rules beginning in October, after the government excluded rape, serious child-sex and grooming offences from the changes.

Justice Secretary Alex Norris said the 5,000 would be released in stages over ten months. The figure is not the total number of prisoners who will leave custody during that period. Thousands are released in the normal course of their sentences each month. It refers to prisoners whose time in custody will be reduced under the new progression model.

The government says it cannot make substantially wider exclusions without risking the prison system reaching capacity. Adult male prisons are currently operating at about 98 per cent of their available capacity, according to the Ministry of Justice.

There is detailed government modelling behind the wider sentencing reforms. What has not been published alongside today's decision is an updated version showing the effect of the new exclusions.

The Ministry of Justice's latest annual capacity statement was published in January, before the government decided to remove further categories of offenders from the progression model.

That assessment projected 89,300 usable places across the adult prison estate in November 2026. After allowing for the Sentencing Act reforms, it estimated demand at 87,900 under its central scenario and 88,900 under its high-demand scenario.

The high scenario therefore left a modelled margin of about 400 places.

Without the Sentencing Act measures, the same model put November demand at 91,800 under the central scenario and 92,900 under the high scenario, both above projected supply. The department estimated that the whole package of sentencing reforms would reduce the prison population by about 7,500 by February 2028.

Those figures provide a clear explanation for why ministers regard sentencing reform as necessary. They do not show how much capacity remains after today's changes.

The January model incorporated the Sentencing Act package as it then stood. The government has now removed rape, serious child-sex and grooming offences from the new release arrangements and delayed their introduction from September until October.

No revised supply-and-demand table or published calculation accompanied the announcement showing how many prison places those decisions consume, or how many further offenders could be excluded before projected demand exceeds available capacity.

The 5,000 figure cannot simply be deducted from the January capacity numbers to calculate that margin. It describes people expected to have release dates brought forward over ten months, while the capacity model measures the prison population at particular points in time. The policies within the Sentencing Act also interact with one another, something the government's own impact assessment warns against treating as a collection of figures that can simply be added or subtracted.

The published evidence backs the government's broader claim that prisons have little spare capacity, without quantifying the narrower claim that today's exclusions mark the exact limit of what the system can accommodate.

The progression model changes the amount of a determinate sentence normally served in prison, rather than cancelling the remainder of the sentence.

For standard determinate sentences currently carrying release after 40 or 50 per cent, the earliest release point will generally become one third. For a group currently released after two thirds, the new minimum will generally be one half. Prisoners released remain on licence in the community and can be recalled. Additional days can also be imposed for serious breaches of prison rules, delaying release.

More than 18,000 prisoners serving life sentences, extended determinate sentences and other more serious sentence types were already outside the progression model. Today's decision adds rape, specified child-sex offences and grooming offences to the exclusions.

Manslaughter was not excluded on 4 August.

That left Albert Bowers and Jessie Cole, convicted of the manslaughter of PC Andrew Harper, within the group potentially affected by the changes. Both received 13-year sentences after PC Harper was killed while responding to a quad-bike theft in Berkshire in 2019. Henry Long, who received a longer extended sentence, was not affected in the same way.

Norris apologised to PC Harper's family and said the government had wanted to include manslaughter among the exclusions but could not widen them further without adding to the capacity problem.

The latest prison population statistics show why the capacity argument needs some care.

There were 85,858 prisoners in England and Wales on 30 June, not the 87,342 recorded at the end of March. The total was about 1,500 lower than a year earlier.

The fall was not evidence that the underlying capacity problem had disappeared.

At the end of March, changes to fixed-term recall led to releases of prisoners who had spent more than 56 days back in custody following recall. The Ministry of Justice says that probably contributed to a fall of about 1,600 prisoners between March and April. The population then remained between roughly 85,700 and 86,000 through April, May and June.

The government's statement that adult male prisons are 98 per cent full is also not directly comparable with the total prison population figure. One measures occupancy against usable places in the adult male estate. The other counts prisoners across the system. Both can therefore be true at the same time.

The position on remand has improved.

There were 15,386 prisoners on remand at the end of June, down from 16,025 at the end of March and 13 per cent below June 2025. The Ministry of Justice says the fall is likely to be partly associated with increased magistrates' sentencing powers, additional Crown Court sitting days and extra court funding.

The earlier rise in remand prisoners had been one contributor to pressure on the estate, so its reversal eases one part of the problem without resolving the rest. The sentenced population stood at 70,003 in June, 1 per cent higher than a year earlier, with increases concentrated among several longer sentence bands.

The shortage of places was already well established before the present government took office.

The previous government expanded its prison-building commitment to 20,000 additional places, originally intended for delivery by the middle of the decade. By September 2024, 6,518 had been delivered. The National Audit Office found that 278 of those places came from allowing additional crowding at four privately run prisons rather than from new accommodation.

The current commitment to deliver 14,000 places by 2031 is largely the unfinished part of that programme, not a separate 14,000 places on top of the original 20,000.

HMPPS describes it as the "remaining 14,000 of the 20,000 prison places". By March 2025, about 6,500 of the original total had been delivered. The January 2026 capacity statement subsequently said around 2,900 additional places had been delivered since July 2024 and around 5,000 more were under construction by the end of 2025.

The National Audit Office concluded in 2024 that the expansion programme had been unrealistic and insufficiently prioritised and that delays had worsened the capacity crisis. It also pointed to policy choices which increased demand for places, including longer sentences and increased police numbers, while maintenance problems reduced the estate's ability to absorb that demand.

The Ministry of Justice's January 2026 assessment is considerably less pessimistic than projections made before the Sentencing Act was included.

Its central case now says prison supply can keep pace with demand if the sentencing reforms work broadly as modelled and new capacity arrives on schedule. But the department expressly warns that the projections are uncertain. Police and prosecutorial activity, court capacity, sentencing decisions, offender behaviour and delays to prison construction can all change the result.

Its November 2026 high-demand scenario is particularly tight: 88,900 prisoners against 89,300 projected places.

The supply figure already contains an operating margin intended to recognise that a nominally empty cell is not necessarily usable for whichever prisoner needs it. Women's prisons, high-security prisons and establishments holding particular categories of offender are not interchangeable. The forecast also does not attempt to predict major shocks such as temporary cell losses following disorder.

Moving prisoners out of custody sooner also transfers work elsewhere.

The progression model places people on licence for the remainder of the relevant part of their sentence. The government has announced up to £700 million of additional funding for probation and community services by 2028–29 and plans to recruit more probation officers and expand electronic monitoring.

The same January capacity statement recorded 5,559 full-time-equivalent probation officers against a target of 7,114 in September 2025, a staffing level of 78 per cent. The Ministry of Justice estimated a wider sentence-management staffing gap of 3,150 full-time-equivalent posts for 2026–27 and said a deficit was likely to remain even as recruitment increased.

The choice facing ministers is therefore not simply between keeping prisoners inside and releasing them. The prison-building programme is still catching up with a target first set years ago. The Sentencing Act is being used to reduce projected demand at the same time. The government's own January model says removing the Act's effects altogether would push demand above supply this year.

Today's announcement changes part of the package on which that forecast was based.

The government says it has now reached the point beyond which further exclusions would risk the prison system reaching capacity. Its published capacity statement shows why that is plausible under the high-demand scenario, even though the statement predates today's exclusions and so cannot say where that point now lies.

The latest public model gives the adult estate 400 places of headroom under the high-demand scenario in November. The government has since changed which prisoners will be released and when, but did not publish revised capacity figures with the 4 August decision.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$pn8k4qxw2r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$m2v9k7qx4r$k$, 'body_text', $o$Lisa Nandy is considering intervening in Paramount Skydance's proposed takeover of Warner Bros Discovery because of its potential effect on media plurality in Britain.

Her statement to Parliament on 30 June identified a problem in the law she would use to do it.

The Enterprise Act already contains public-interest tests covering news plurality and concentration of control over traditional media enterprises.

It does not currently put on-demand programme services inside the same ownership-plurality test.

Nandy told Parliament that if she intervenes on that ground, she will use powers in the Act to add a new public-interest consideration covering streaming and video-on-demand services.

That is narrower than saying Britain lacks the legal machinery to examine the merger.

The Enterprise Act anticipated that circumstances could arise which its original list of public-interest considerations did not cover. Section 42 allows a Culture Secretary to issue an intervention notice on a consideration that is not yet specified in section 58 if, in the Secretary of State's opinion, it ought to be. The government must then move to have that consideration formally added.

The gap is therefore in the standing media-plurality test, not in the government's ability to respond to an unforeseen type of merger.

Nandy's proposed wording would require consideration of whether there is sufficient plurality of people controlling "media enterprises, or the enterprises providing on-demand programme services or both" serving a UK audience. She said the existing legislation was written when viewing was predominantly through linear broadcasting and does not capture the full effect of mergers involving streaming services.

The transaction is large enough to expose that distinction.

Paramount agreed in February to buy Warner Bros Discovery in a deal valuing WBD at $81 billion in equity and $110 billion including debt. The companies said they expected the transaction to close in the third quarter of 2026, subject to regulatory approvals.

The combined group would bring together Paramount+ and HBO Max, CBS and CBS News with CNN, Nickelodeon with Cartoon Network, and Paramount Pictures with Warner Bros.

In Britain, Nandy specifically named Channel 5, TNT Sports, Cartoon Network, Nickelodeon and CNN International, along with Paramount+ and HBO Max, when explaining why she believed the merger could affect UK audiences.

TNT Sports needs a qualification. As of 2 July 2026, Companies House still listed both British Telecommunications plc and the Warner Bros Discovery-linked entity Dni Foreign Holdings Limited as active persons with significant control of TNT Sports Broadcasting Ltd, with no cessation recorded for either — consistent with BT's own reporting that its UK and Ireland sports business remained a 50:50 joint venture, with Warner Bros Discovery holding an option to acquire BT's half that had not been reported as exercised.

Britain had already tried to update its media-merger rules for changing viewing habits.

Nandy opened a consultation in November 2024 after Ofcom recommended broadening a regime designed around newspapers and broadcasters. The government said at the time that the law had not kept pace with technology.

The reform that followed concentrated principally on news.

In May 2025, the government decided to bring online news publications and periodical news magazines into the regime and broaden the existing news public-interest tests. It rejected a much wider approach that could have captured any entity creating news, saying that could impose disproportionate burdens.

The resulting secondary legislation came into force in July 2025.

It changed section 58 so that tests concerning accurate news, freedom of opinion and plurality of views applied to "news media", defined as newspapers and broadcast news programmes. It also broadened the ownership-plurality provision across newspaper and broadcasting enterprises.

It did not add general video-on-demand services to that ownership test.

Less than a year later, Paramount-Warner has brought exactly that omission into a live merger decision.

This does not mean the 2025 reform failed at what it was designed to do. It was primarily aimed at bringing online journalism into rules written for print and broadcasting.

But the government described that exercise as modernising the media-merger regime for the digital age. The Paramount transaction has shown that one increasingly important part of that digital market remained outside the specified ownership-plurality test.

The Competition and Markets Authority is examining a different question.

It formally opened its merger inquiry on 9 June to assess competition in the UK. Nandy's proposed intervention would add examination of wider public-interest issues, with Ofcom reporting on media plurality if she issues the intervention notice.

The two tests should not be confused.

A merger can pass competition scrutiny while still raising questions about concentration of media ownership, editorial independence or the number of separate organisations controlling services consumed by the public.

The US Department of Justice reached its competition decision on 12 June. It closed its antitrust investigation after concluding that the merger was unlikely to harm American consumers in streaming, linear television or film production. It went further on streaming, saying the combined business could provide stronger competition to larger subscription services.

That finding does not answer Nandy's media-plurality question, and it does not amount to worldwide regulatory clearance of the transaction.

Nor had the transaction cleared every US regulatory process by 2 July. Paramount had separately asked the Federal Communications Commission to permit the level of foreign investment expected in the combined company. A US national-security review of that request had begun in June.

Nandy had also used the existing British media public-interest regime earlier in the year.

In February she issued an intervention notice over Daily Mail and General Trust's proposed purchase of the Telegraph, relying on the existing tests covering plurality of views in news media and plurality of people controlling media enterprises.

Paramount-Warner requires something additional because part of the audience Nandy wants Ofcom to consider receives content through services the existing ownership test does not expressly cover.

The parties have until 6 July to respond to her concerns.

Nandy has not yet issued an intervention notice. If she does, Ofcom would examine the media-public-interest considerations and the CMA would report on jurisdiction and competition before she decided whether a more detailed investigation was required.

The Secretary of State's role in these cases has historically been treated as quasi-judicial, with ministers expected to follow a fair and impartial process. There is no evidence that the timetable was chosen for political reasons or to constrain whoever succeeds Starmer.

The documented problem is simpler.

Britain modernised its media-merger rules in 2025 because audiences had moved online.

The reform brought online news into the system.

It did not bring general streaming services into the standing test for concentration of media ownership.

A year later, one of the world's largest media mergers has forced the Culture Secretary to use the Enterprise Act's catch-all mechanism to propose doing precisely that.$o$);
  UPDATE public.editorials SET body_text = $n$Lisa Nandy is considering intervening in Paramount Skydance's proposed takeover of Warner Bros Discovery because of its potential effect on media plurality in Britain.

Her statement to Parliament on 30 June identified a problem in the law she would use to do it.

The Enterprise Act already contains public-interest tests covering news plurality and concentration of control over traditional media enterprises.

It does not currently put on-demand programme services inside the same ownership-plurality test.

Nandy told Parliament that if she intervenes on that ground, she will use powers in the Act to add a new public-interest consideration covering streaming and video-on-demand services.

That is narrower than saying Britain lacks the legal machinery to examine the merger.

The Enterprise Act anticipated that circumstances could arise which its original list of public-interest considerations did not cover. Section 42 allows a Culture Secretary to issue an intervention notice on a consideration that is not yet specified in section 58 if, in the Secretary of State's opinion, it ought to be. The government must then move to have that consideration formally added.

The gap is therefore in the standing media-plurality test, not in the government's ability to respond to an unforeseen type of merger.

Nandy's proposed wording would require consideration of whether there is sufficient plurality of people controlling "media enterprises, or the enterprises providing on-demand programme services or both" serving a UK audience. She said the existing legislation was written when viewing was predominantly through linear broadcasting and does not capture the full effect of mergers involving streaming services.

The transaction is large enough to expose that distinction.

Paramount agreed in February to buy Warner Bros Discovery in a deal valuing WBD at $81 billion in equity and $110 billion including debt. The companies said they expected the transaction to close in the third quarter of 2026, subject to regulatory approvals.

The combined group would bring together Paramount+ and HBO Max, CBS and CBS News with CNN, Nickelodeon with Cartoon Network, and Paramount Pictures with Warner Bros.

In Britain, Nandy specifically named Channel 5, TNT Sports, Cartoon Network, Nickelodeon and CNN International, along with Paramount+ and HBO Max, when explaining why she believed the merger could affect UK audiences.

TNT Sports needs a qualification. As of 2 July 2026, Companies House still listed both British Telecommunications plc and the Warner Bros Discovery-linked entity Dni Foreign Holdings Limited as active persons with significant control of TNT Sports Broadcasting Ltd, with no cessation recorded for either, consistent with BT's own reporting that its UK and Ireland sports business remained a 50:50 joint venture, with Warner Bros Discovery holding an option to acquire BT's half that had not been reported as exercised.

Britain had already tried to update its media-merger rules for changing viewing habits.

Nandy opened a consultation in November 2024 after Ofcom recommended broadening a regime designed around newspapers and broadcasters. The government said at the time that the law had not kept pace with technology.

The reform that followed concentrated principally on news.

In May 2025, the government decided to bring online news publications and periodical news magazines into the regime and broaden the existing news public-interest tests. It rejected a much wider approach that could have captured any entity creating news, saying that could impose disproportionate burdens.

The resulting secondary legislation came into force in July 2025.

It changed section 58 so that tests concerning accurate news, freedom of opinion and plurality of views applied to "news media", defined as newspapers and broadcast news programmes. It also broadened the ownership-plurality provision across newspaper and broadcasting enterprises.

It did not add general video-on-demand services to that ownership test.

Less than a year later, Paramount-Warner has brought exactly that omission into a live merger decision.

This does not mean the 2025 reform failed at what it was designed to do. It was primarily aimed at bringing online journalism into rules written for print and broadcasting.

But the government described that exercise as modernising the media-merger regime for the digital age. The Paramount transaction has shown that one increasingly important part of that digital market remained outside the specified ownership-plurality test.

The Competition and Markets Authority is examining a different question.

It formally opened its merger inquiry on 9 June to assess competition in the UK. Nandy's proposed intervention would add examination of wider public-interest issues, with Ofcom reporting on media plurality if she issues the intervention notice.

The two tests should not be confused.

A merger can pass competition scrutiny while still raising questions about concentration of media ownership, editorial independence or the number of separate organisations controlling services consumed by the public.

The US Department of Justice reached its competition decision on 12 June. It closed its antitrust investigation after concluding that the merger was unlikely to harm American consumers in streaming, linear television or film production. It went further on streaming, saying the combined business could provide stronger competition to larger subscription services.

That finding does not answer Nandy's media-plurality question, and it does not amount to worldwide regulatory clearance of the transaction.

Nor had the transaction cleared every US regulatory process by 2 July. Paramount had separately asked the Federal Communications Commission to permit the level of foreign investment expected in the combined company. A US national-security review of that request had begun in June.

Nandy had also used the existing British media public-interest regime earlier in the year.

In February she issued an intervention notice over Daily Mail and General Trust's proposed purchase of the Telegraph, relying on the existing tests covering plurality of views in news media and plurality of people controlling media enterprises.

Paramount-Warner requires something additional because part of the audience Nandy wants Ofcom to consider receives content through services the existing ownership test does not expressly cover.

The parties have until 6 July to respond to her concerns.

Nandy has not yet issued an intervention notice. If she does, Ofcom would examine the media-public-interest considerations and the CMA would report on jurisdiction and competition before she decided whether a more detailed investigation was required.

The Secretary of State's role in these cases has historically been treated as quasi-judicial, with ministers expected to follow a fair and impartial process. There is no evidence that the timetable was chosen for political reasons or to constrain whoever succeeds Starmer.

The documented problem is simpler.

Britain modernised its media-merger rules in 2025 because audiences had moved online.

The reform brought online news into the system.

It did not bring general streaming services into the standing test for concentration of media ownership.

A year later, one of the world's largest media mergers has forced the Culture Secretary to use the Enterprise Act's catch-all mechanism to propose doing precisely that.$n$ WHERE slug::text = $k$m2v9k7qx4r$k$ AND body_text = $o$Lisa Nandy is considering intervening in Paramount Skydance's proposed takeover of Warner Bros Discovery because of its potential effect on media plurality in Britain.

Her statement to Parliament on 30 June identified a problem in the law she would use to do it.

The Enterprise Act already contains public-interest tests covering news plurality and concentration of control over traditional media enterprises.

It does not currently put on-demand programme services inside the same ownership-plurality test.

Nandy told Parliament that if she intervenes on that ground, she will use powers in the Act to add a new public-interest consideration covering streaming and video-on-demand services.

That is narrower than saying Britain lacks the legal machinery to examine the merger.

The Enterprise Act anticipated that circumstances could arise which its original list of public-interest considerations did not cover. Section 42 allows a Culture Secretary to issue an intervention notice on a consideration that is not yet specified in section 58 if, in the Secretary of State's opinion, it ought to be. The government must then move to have that consideration formally added.

The gap is therefore in the standing media-plurality test, not in the government's ability to respond to an unforeseen type of merger.

Nandy's proposed wording would require consideration of whether there is sufficient plurality of people controlling "media enterprises, or the enterprises providing on-demand programme services or both" serving a UK audience. She said the existing legislation was written when viewing was predominantly through linear broadcasting and does not capture the full effect of mergers involving streaming services.

The transaction is large enough to expose that distinction.

Paramount agreed in February to buy Warner Bros Discovery in a deal valuing WBD at $81 billion in equity and $110 billion including debt. The companies said they expected the transaction to close in the third quarter of 2026, subject to regulatory approvals.

The combined group would bring together Paramount+ and HBO Max, CBS and CBS News with CNN, Nickelodeon with Cartoon Network, and Paramount Pictures with Warner Bros.

In Britain, Nandy specifically named Channel 5, TNT Sports, Cartoon Network, Nickelodeon and CNN International, along with Paramount+ and HBO Max, when explaining why she believed the merger could affect UK audiences.

TNT Sports needs a qualification. As of 2 July 2026, Companies House still listed both British Telecommunications plc and the Warner Bros Discovery-linked entity Dni Foreign Holdings Limited as active persons with significant control of TNT Sports Broadcasting Ltd, with no cessation recorded for either — consistent with BT's own reporting that its UK and Ireland sports business remained a 50:50 joint venture, with Warner Bros Discovery holding an option to acquire BT's half that had not been reported as exercised.

Britain had already tried to update its media-merger rules for changing viewing habits.

Nandy opened a consultation in November 2024 after Ofcom recommended broadening a regime designed around newspapers and broadcasters. The government said at the time that the law had not kept pace with technology.

The reform that followed concentrated principally on news.

In May 2025, the government decided to bring online news publications and periodical news magazines into the regime and broaden the existing news public-interest tests. It rejected a much wider approach that could have captured any entity creating news, saying that could impose disproportionate burdens.

The resulting secondary legislation came into force in July 2025.

It changed section 58 so that tests concerning accurate news, freedom of opinion and plurality of views applied to "news media", defined as newspapers and broadcast news programmes. It also broadened the ownership-plurality provision across newspaper and broadcasting enterprises.

It did not add general video-on-demand services to that ownership test.

Less than a year later, Paramount-Warner has brought exactly that omission into a live merger decision.

This does not mean the 2025 reform failed at what it was designed to do. It was primarily aimed at bringing online journalism into rules written for print and broadcasting.

But the government described that exercise as modernising the media-merger regime for the digital age. The Paramount transaction has shown that one increasingly important part of that digital market remained outside the specified ownership-plurality test.

The Competition and Markets Authority is examining a different question.

It formally opened its merger inquiry on 9 June to assess competition in the UK. Nandy's proposed intervention would add examination of wider public-interest issues, with Ofcom reporting on media plurality if she issues the intervention notice.

The two tests should not be confused.

A merger can pass competition scrutiny while still raising questions about concentration of media ownership, editorial independence or the number of separate organisations controlling services consumed by the public.

The US Department of Justice reached its competition decision on 12 June. It closed its antitrust investigation after concluding that the merger was unlikely to harm American consumers in streaming, linear television or film production. It went further on streaming, saying the combined business could provide stronger competition to larger subscription services.

That finding does not answer Nandy's media-plurality question, and it does not amount to worldwide regulatory clearance of the transaction.

Nor had the transaction cleared every US regulatory process by 2 July. Paramount had separately asked the Federal Communications Commission to permit the level of foreign investment expected in the combined company. A US national-security review of that request had begun in June.

Nandy had also used the existing British media public-interest regime earlier in the year.

In February she issued an intervention notice over Daily Mail and General Trust's proposed purchase of the Telegraph, relying on the existing tests covering plurality of views in news media and plurality of people controlling media enterprises.

Paramount-Warner requires something additional because part of the audience Nandy wants Ofcom to consider receives content through services the existing ownership test does not expressly cover.

The parties have until 6 July to respond to her concerns.

Nandy has not yet issued an intervention notice. If she does, Ofcom would examine the media-public-interest considerations and the CMA would report on jurisdiction and competition before she decided whether a more detailed investigation was required.

The Secretary of State's role in these cases has historically been treated as quasi-judicial, with ministers expected to follow a fair and impartial process. There is no evidence that the timetable was chosen for political reasons or to constrain whoever succeeds Starmer.

The documented problem is simpler.

Britain modernised its media-merger rules in 2025 because audiences had moved online.

The reform brought online news into the system.

It did not bring general streaming services into the standing test for concentration of media ownership.

A year later, one of the world's largest media mergers has forced the Culture Secretary to use the Enterprise Act's catch-all mechanism to propose doing precisely that.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$m2v9k7qx4r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$vt6k9mxw3n$k$, 'body_text', $o$Andy Burnham's government has announced a £850 million cut to VAT on electricity bills, funded in part by scrapping the digital ID programme. The savings from that cancellation have not yet been published.

The VAT cut, unveiled on 21 July, reduces the rate charged on domestic electricity from 20 per cent to 5 per cent for the remainder of this parliament. The Treasury says the measure will cost £850 million in 2026/27.

The OBR's November 2025 Economic and Fiscal Outlook had set out the digital ID programme's cost over the Spending Review period at £1.8 billion, made up of roughly £500 million in set-up costs and £1.3 billion in running costs across the forecast period.

The OBR put the provisional cost of digital ID at £600 million a year over the Spending Review period.

The VAT cut is expected to cost £850 million in 2026/27.

On those published figures, the new policy costs roughly £250 million more this year than the annual spending pressure the OBR had allowed for digital ID.

That does not necessarily mean there is a £250 million hole. The digital ID estimate was provisional and the government had not created a dedicated £600 million annual budget for the programme. Darren Jones told MPs in March that ministers did not yet know what the final scheme would cost because its design had not been settled.

But the comparison does leave something for Burnham's government to explain.

The OBR had treated digital ID as an unfunded spending pressure of £600 million a year. It said departments were expected to absorb the cost from existing budgets, although no specific savings had been identified.

Burnham has now cancelled that programme and says those departmental savings will instead pay for an £850 million VAT cut.

The government has not published the departmental arithmetic showing how £600 million of annual digital ID pressure becomes £850 million available for the VAT measure in 2026/27.

Nor has it said which existing budgets will be reprioritised, what spending will be reduced or delayed, or how much each department is expected to contribute.

Cancelling digital ID removes a genuine future spending pressure. It does not, by itself, identify £850 million of cash savings.

That is the distinction Darren Jones's criticism gets partly right. Digital ID had no separately funded pot waiting to be transferred. But the OBR had already allowed for its cost in the fiscal forecast.

Burnham has changed what the proposed departmental savings are supposed to pay for. Ministers have yet to publish how the full £850 million will be found.

When the Commons Science, Innovation and Technology Committee pressed Darren Jones on this in March, he told MPs the £1.8 billion figure was the OBR's own estimate, which the government had disputed, and that ministers did not yet know what the finished scheme would ultimately cost. Ian Murray, now responsible for the digital ID brief, has not published a revised costing since the programme's cancellation.

The £45 figure that has circulated in coverage of the cut is an annualised estimate based on the current Ofgem price cap, not a guaranteed saving for any individual household. Actual bills vary with usage, and the price cap itself is reviewed quarterly, so the real-terms benefit will shift as wholesale prices move.

Martin Lewis's analysis for MoneySavingExpert found that a 15-percentage-point VAT cut would be expected to reduce a typical bill by around 4.8 per cent in cash terms once standing charges and non-VAT-rated elements are accounted for, meaning the headline annualised saving significantly overstates what most households will actually notice. He also noted that if the price cap itself rises in the same period, as had been separately forecast, much of the VAT cut's benefit would be absorbed by that increase before bills are compared year-on-year — effectively eating into the saving before it reaches the consumer.

The government has not published a date by which it intends to set out the departmental savings underpinning the measure, or confirm whether any will fall on budgets unrelated to digital ID.$o$);
  UPDATE public.editorials SET body_text = $n$Andy Burnham's government has announced a £850 million cut to VAT on electricity bills, funded in part by scrapping the digital ID programme. The savings from that cancellation have not yet been published.

The VAT cut, unveiled on 21 July, reduces the rate charged on domestic electricity from 20 per cent to 5 per cent for the remainder of this parliament. The Treasury says the measure will cost £850 million in 2026/27.

The OBR's November 2025 Economic and Fiscal Outlook had set out the digital ID programme's cost over the Spending Review period at £1.8 billion, made up of roughly £500 million in set-up costs and £1.3 billion in running costs across the forecast period.

The OBR put the provisional cost of digital ID at £600 million a year over the Spending Review period.

The VAT cut is expected to cost £850 million in 2026/27.

On those published figures, the new policy costs roughly £250 million more this year than the annual spending pressure the OBR had allowed for digital ID.

That does not necessarily mean there is a £250 million hole. The digital ID estimate was provisional and the government had not created a dedicated £600 million annual budget for the programme. Darren Jones told MPs in March that ministers did not yet know what the final scheme would cost because its design had not been settled.

But the comparison does leave something for Burnham's government to explain.

The OBR had treated digital ID as an unfunded spending pressure of £600 million a year. It said departments were expected to absorb the cost from existing budgets, although no specific savings had been identified.

Burnham has now cancelled that programme and says those departmental savings will instead pay for an £850 million VAT cut.

The government has not published the departmental arithmetic showing how £600 million of annual digital ID pressure becomes £850 million available for the VAT measure in 2026/27.

Nor has it said which existing budgets will be reprioritised, what spending will be reduced or delayed, or how much each department is expected to contribute.

Cancelling digital ID removes a genuine future spending pressure. It does not, by itself, identify £850 million of cash savings.

That is the distinction Darren Jones's criticism gets partly right. Digital ID had no separately funded pot waiting to be transferred. But the OBR had already allowed for its cost in the fiscal forecast.

Burnham has changed what the proposed departmental savings are supposed to pay for. Ministers have yet to publish how the full £850 million will be found.

When the Commons Science, Innovation and Technology Committee pressed Darren Jones on this in March, he told MPs the £1.8 billion figure was the OBR's own estimate, which the government had disputed, and that ministers did not yet know what the finished scheme would ultimately cost. Ian Murray, now responsible for the digital ID brief, has not published a revised costing since the programme's cancellation.

The £45 figure that has circulated in coverage of the cut is an annualised estimate based on the current Ofgem price cap, not a guaranteed saving for any individual household. Actual bills vary with usage, and the price cap itself is reviewed quarterly, so the real-terms benefit will shift as wholesale prices move.

Martin Lewis's analysis for MoneySavingExpert found that a 15-percentage-point VAT cut would be expected to reduce a typical bill by around 4.8 per cent in cash terms once standing charges and non-VAT-rated elements are accounted for, meaning the headline annualised saving significantly overstates what most households will actually notice. He also noted that if the price cap itself rises in the same period, as had been separately forecast, much of the VAT cut's benefit would be absorbed by that increase before bills are compared year-on-year, effectively eating into the saving before it reaches the consumer.

The government has not published a date by which it intends to set out the departmental savings underpinning the measure, or confirm whether any will fall on budgets unrelated to digital ID.$n$ WHERE slug::text = $k$vt6k9mxw3n$k$ AND body_text = $o$Andy Burnham's government has announced a £850 million cut to VAT on electricity bills, funded in part by scrapping the digital ID programme. The savings from that cancellation have not yet been published.

The VAT cut, unveiled on 21 July, reduces the rate charged on domestic electricity from 20 per cent to 5 per cent for the remainder of this parliament. The Treasury says the measure will cost £850 million in 2026/27.

The OBR's November 2025 Economic and Fiscal Outlook had set out the digital ID programme's cost over the Spending Review period at £1.8 billion, made up of roughly £500 million in set-up costs and £1.3 billion in running costs across the forecast period.

The OBR put the provisional cost of digital ID at £600 million a year over the Spending Review period.

The VAT cut is expected to cost £850 million in 2026/27.

On those published figures, the new policy costs roughly £250 million more this year than the annual spending pressure the OBR had allowed for digital ID.

That does not necessarily mean there is a £250 million hole. The digital ID estimate was provisional and the government had not created a dedicated £600 million annual budget for the programme. Darren Jones told MPs in March that ministers did not yet know what the final scheme would cost because its design had not been settled.

But the comparison does leave something for Burnham's government to explain.

The OBR had treated digital ID as an unfunded spending pressure of £600 million a year. It said departments were expected to absorb the cost from existing budgets, although no specific savings had been identified.

Burnham has now cancelled that programme and says those departmental savings will instead pay for an £850 million VAT cut.

The government has not published the departmental arithmetic showing how £600 million of annual digital ID pressure becomes £850 million available for the VAT measure in 2026/27.

Nor has it said which existing budgets will be reprioritised, what spending will be reduced or delayed, or how much each department is expected to contribute.

Cancelling digital ID removes a genuine future spending pressure. It does not, by itself, identify £850 million of cash savings.

That is the distinction Darren Jones's criticism gets partly right. Digital ID had no separately funded pot waiting to be transferred. But the OBR had already allowed for its cost in the fiscal forecast.

Burnham has changed what the proposed departmental savings are supposed to pay for. Ministers have yet to publish how the full £850 million will be found.

When the Commons Science, Innovation and Technology Committee pressed Darren Jones on this in March, he told MPs the £1.8 billion figure was the OBR's own estimate, which the government had disputed, and that ministers did not yet know what the finished scheme would ultimately cost. Ian Murray, now responsible for the digital ID brief, has not published a revised costing since the programme's cancellation.

The £45 figure that has circulated in coverage of the cut is an annualised estimate based on the current Ofgem price cap, not a guaranteed saving for any individual household. Actual bills vary with usage, and the price cap itself is reviewed quarterly, so the real-terms benefit will shift as wholesale prices move.

Martin Lewis's analysis for MoneySavingExpert found that a 15-percentage-point VAT cut would be expected to reduce a typical bill by around 4.8 per cent in cash terms once standing charges and non-VAT-rated elements are accounted for, meaning the headline annualised saving significantly overstates what most households will actually notice. He also noted that if the price cap itself rises in the same period, as had been separately forecast, much of the VAT cut's benefit would be absorbed by that increase before bills are compared year-on-year — effectively eating into the saving before it reaches the consumer.

The government has not published a date by which it intends to set out the departmental savings underpinning the measure, or confirm whether any will fall on budgets unrelated to digital ID.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$vt6k9mxw3n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$ck8m2wq7x3$k$, 'body_text', $o$GMB's published regional data record 992,536 council tax court actions in England in 2024/25, although the union's figures contain an unresolved discrepancy that prevents a clean national total.

GMB sent Freedom of Information requests to councils across Great Britain responsible for collecting council tax. Almost 200 replied within the statutory deadline. Its published table records entries in a "Court 24/25" column for each region. Summing the nine English regional entries gives 992,536. Councils that did not respond are absent from the exercise altogether.

There is also a discrepancy in GMB's own national figures.

The text accompanying its investigation says 1,430,726 people were summoned to court across Great Britain. The regional table on the same page totals 1,505,126 court entries, a difference of 74,400. GMB variously describes the figures as people, summonses and court cases.

Neither of those totals reconciles cleanly with the regional breakdown either. Adding the English, Scottish and Welsh regional entries together gives 1,272,272 — some 232,854 short of the table's own printed total of 1,505,126. GMB has not published an explanation for the gap.

The defensible finding is therefore not a single precise national total. It is that responding councils reported court enforcement on a scale running into nearly a million cases in England alone, with the true national total unavailable from the published exercise.

The same responses recorded 4,593,838 council tax accounts in arrears, more than 3.2 million accounts subject to debt-management proceedings and just over £4.6 billion outstanding across Great Britain.

England is now changing the rules governing how quickly a missed council tax payment can escalate.

Ministers have already decided that households should have substantially longer before they lose the right to continue paying by instalments. Under reforms announced in April, that period will extend to at least 63 days after the first missed payment. Councils will also have to follow statutory steps before formal enforcement, and the costs they can add for seeking a liability order will be capped at £100.

Those protections will not begin until April 2027.

The current regulations give councils considerably more scope to move quickly.

They do not prescribe a minimum period between an instalment being missed and a reminder being sent. The government's latest consultation says practices therefore vary between councils. If the arrears remain unpaid, the existing system can ultimately make the remaining annual balance payable before a council seeks a liability order from the magistrates' court.

The replacement is much more prescriptive.

Under proposals published on 1 July, a final notice could not be issued earlier than 41 days after the missed instalment, or until at least 14 days after the most recent reminder. The household would then have 21 days to pay the amount demanded. If it remained unpaid, the rest of the year's bill could become due on day 63.

The government also wants reminder notices to direct households towards debt advice, payment plans, discounts and other support rather than immediately emphasising the most severe enforcement powers.

Ministers have not concluded that councils should stop pursuing unpaid council tax.

Council tax is a major source of local government income, and the government says councils must retain the ability to enforce debts against people who can pay but deliberately do not. Councils have warned that slowing the process could affect in-year collection rates and cash flow. The government is seeking evidence on those costs before the new rules are finalised.

The average Band D council tax bill in England is £2,392 in 2026/27, up £111, or 4.9 per cent, in a year. Of 384 authorities subject to referendum principles, 274 used the maximum increase available without a referendum and another 50 came close.

There is already a direct precedent for the 63-day rule.

Wales introduced essentially the same minimum period on 1 April 2026. Welsh councils must now give households at least 63 days from a missed payment before applying for a liability order on the unpaid annual balance, with a reminder and final notice required first.

England's own government response explicitly says its reform is aligned with the change in Wales.

It is too early to say what the Welsh change has done to collection rates or court action. The official Welsh collection statistics covering April 2026 to March 2027 are not due until June 2027.

That leaves an unusual position in England.

The government has already decided that households need more time before council tax arrears can escalate towards court enforcement. It has settled on a 63-day minimum, a model already operating in Wales, and is now consulting on the detailed notices councils must issue.

For the rest of the current financial year, English councils will continue using the existing statutory timetable.$o$);
  UPDATE public.editorials SET body_text = $n$GMB's published regional data record 992,536 council tax court actions in England in 2024/25, although the union's figures contain an unresolved discrepancy that prevents a clean national total.

GMB sent Freedom of Information requests to councils across Great Britain responsible for collecting council tax. Almost 200 replied within the statutory deadline. Its published table records entries in a "Court 24/25" column for each region. Summing the nine English regional entries gives 992,536. Councils that did not respond are absent from the exercise altogether.

There is also a discrepancy in GMB's own national figures.

The text accompanying its investigation says 1,430,726 people were summoned to court across Great Britain. The regional table on the same page totals 1,505,126 court entries, a difference of 74,400. GMB variously describes the figures as people, summonses and court cases.

Neither of those totals reconciles cleanly with the regional breakdown either. Adding the English, Scottish and Welsh regional entries together gives 1,272,272, some 232,854 short of the table's own printed total of 1,505,126. GMB has not published an explanation for the gap.

The defensible finding is therefore not a single precise national total. It is that responding councils reported court enforcement on a scale running into nearly a million cases in England alone, with the true national total unavailable from the published exercise.

The same responses recorded 4,593,838 council tax accounts in arrears, more than 3.2 million accounts subject to debt-management proceedings and just over £4.6 billion outstanding across Great Britain.

England is now changing the rules governing how quickly a missed council tax payment can escalate.

Ministers have already decided that households should have substantially longer before they lose the right to continue paying by instalments. Under reforms announced in April, that period will extend to at least 63 days after the first missed payment. Councils will also have to follow statutory steps before formal enforcement, and the costs they can add for seeking a liability order will be capped at £100.

Those protections will not begin until April 2027.

The current regulations give councils considerably more scope to move quickly.

They do not prescribe a minimum period between an instalment being missed and a reminder being sent. The government's latest consultation says practices therefore vary between councils. If the arrears remain unpaid, the existing system can ultimately make the remaining annual balance payable before a council seeks a liability order from the magistrates' court.

The replacement is much more prescriptive.

Under proposals published on 1 July, a final notice could not be issued earlier than 41 days after the missed instalment, or until at least 14 days after the most recent reminder. The household would then have 21 days to pay the amount demanded. If it remained unpaid, the rest of the year's bill could become due on day 63.

The government also wants reminder notices to direct households towards debt advice, payment plans, discounts and other support rather than immediately emphasising the most severe enforcement powers.

Ministers have not concluded that councils should stop pursuing unpaid council tax.

Council tax is a major source of local government income, and the government says councils must retain the ability to enforce debts against people who can pay but deliberately do not. Councils have warned that slowing the process could affect in-year collection rates and cash flow. The government is seeking evidence on those costs before the new rules are finalised.

The average Band D council tax bill in England is £2,392 in 2026/27, up £111, or 4.9 per cent, in a year. Of 384 authorities subject to referendum principles, 274 used the maximum increase available without a referendum and another 50 came close.

There is already a direct precedent for the 63-day rule.

Wales introduced essentially the same minimum period on 1 April 2026. Welsh councils must now give households at least 63 days from a missed payment before applying for a liability order on the unpaid annual balance, with a reminder and final notice required first.

England's own government response explicitly says its reform is aligned with the change in Wales.

It is too early to say what the Welsh change has done to collection rates or court action. The official Welsh collection statistics covering April 2026 to March 2027 are not due until June 2027.

That leaves an unusual position in England.

The government has already decided that households need more time before council tax arrears can escalate towards court enforcement. It has settled on a 63-day minimum, a model already operating in Wales, and is now consulting on the detailed notices councils must issue.

For the rest of the current financial year, English councils will continue using the existing statutory timetable.$n$ WHERE slug::text = $k$ck8m2wq7x3$k$ AND body_text = $o$GMB's published regional data record 992,536 council tax court actions in England in 2024/25, although the union's figures contain an unresolved discrepancy that prevents a clean national total.

GMB sent Freedom of Information requests to councils across Great Britain responsible for collecting council tax. Almost 200 replied within the statutory deadline. Its published table records entries in a "Court 24/25" column for each region. Summing the nine English regional entries gives 992,536. Councils that did not respond are absent from the exercise altogether.

There is also a discrepancy in GMB's own national figures.

The text accompanying its investigation says 1,430,726 people were summoned to court across Great Britain. The regional table on the same page totals 1,505,126 court entries, a difference of 74,400. GMB variously describes the figures as people, summonses and court cases.

Neither of those totals reconciles cleanly with the regional breakdown either. Adding the English, Scottish and Welsh regional entries together gives 1,272,272 — some 232,854 short of the table's own printed total of 1,505,126. GMB has not published an explanation for the gap.

The defensible finding is therefore not a single precise national total. It is that responding councils reported court enforcement on a scale running into nearly a million cases in England alone, with the true national total unavailable from the published exercise.

The same responses recorded 4,593,838 council tax accounts in arrears, more than 3.2 million accounts subject to debt-management proceedings and just over £4.6 billion outstanding across Great Britain.

England is now changing the rules governing how quickly a missed council tax payment can escalate.

Ministers have already decided that households should have substantially longer before they lose the right to continue paying by instalments. Under reforms announced in April, that period will extend to at least 63 days after the first missed payment. Councils will also have to follow statutory steps before formal enforcement, and the costs they can add for seeking a liability order will be capped at £100.

Those protections will not begin until April 2027.

The current regulations give councils considerably more scope to move quickly.

They do not prescribe a minimum period between an instalment being missed and a reminder being sent. The government's latest consultation says practices therefore vary between councils. If the arrears remain unpaid, the existing system can ultimately make the remaining annual balance payable before a council seeks a liability order from the magistrates' court.

The replacement is much more prescriptive.

Under proposals published on 1 July, a final notice could not be issued earlier than 41 days after the missed instalment, or until at least 14 days after the most recent reminder. The household would then have 21 days to pay the amount demanded. If it remained unpaid, the rest of the year's bill could become due on day 63.

The government also wants reminder notices to direct households towards debt advice, payment plans, discounts and other support rather than immediately emphasising the most severe enforcement powers.

Ministers have not concluded that councils should stop pursuing unpaid council tax.

Council tax is a major source of local government income, and the government says councils must retain the ability to enforce debts against people who can pay but deliberately do not. Councils have warned that slowing the process could affect in-year collection rates and cash flow. The government is seeking evidence on those costs before the new rules are finalised.

The average Band D council tax bill in England is £2,392 in 2026/27, up £111, or 4.9 per cent, in a year. Of 384 authorities subject to referendum principles, 274 used the maximum increase available without a referendum and another 50 came close.

There is already a direct precedent for the 63-day rule.

Wales introduced essentially the same minimum period on 1 April 2026. Welsh councils must now give households at least 63 days from a missed payment before applying for a liability order on the unpaid annual balance, with a reminder and final notice required first.

England's own government response explicitly says its reform is aligned with the change in Wales.

It is too early to say what the Welsh change has done to collection rates or court action. The official Welsh collection statistics covering April 2026 to March 2027 are not due until June 2027.

That leaves an unusual position in England.

The government has already decided that households need more time before council tax arrears can escalate towards court enforcement. It has settled on a 63-day minimum, a model already operating in Wales, and is now consulting on the detailed notices councils must issue.

For the rest of the current financial year, English councils will continue using the existing statutory timetable.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_text row % updated % rows', $k$ck8m2wq7x3$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$pb4k9mxw7r$k$, 'body_json', $o$[{"text": "Home Secretary Shabana Mahmood announced on 15 September that the government will fund more than 500 additional enforcement specialists for economic crime, as part of a £550 million anti-money laundering and asset recovery strategy covering 2026 to 2029. \"We are putting 500 more officers on the trail of dirty money, going after the criminal bosses behind organised crime and stripping them of the funds they use to fuel drug trafficking, people smuggling and other serious crime,\" she said.", "type": "paragraph"}, {"text": "Of the £550 million, £520 million comes from the Economic Crime Levy, paid by businesses already regulated under anti-money laundering rules. A further £30 million comes from a high-streets package announced at Budget 2025. The strategy's stated goals are recovering more criminal assets, dismantling more laundering networks and improving prosecutions, intelligence and supervision.", "type": "paragraph"}, {"text": "The strategy does not attach a number to any of those goals. It lists assets recovered as one of the indicators that will be monitored, but does not state how large an increase would count as success. A Theory of Change and outcomes framework, including indicators for the new measures, is still being developed and will be produced later, alongside promised mid-point and final progress reports.", "type": "paragraph"}, {"text": "The previous economic crime plan took a different approach. When Economic Crime Plan 2 launched in March 2023, the Home Office and HM Treasury announced £400 million — £200 million from government, £200 million from the levy — and an uplift of 475 financial-crime investigators, tied to a specific ten-year objective: recover an additional £1 billion in criminal assets.", "type": "paragraph"}, {"text": "The new strategy says 99 per cent of those 475 posts have now been recruited. The Home Office has not yet published a process evaluation of what that staffing uplift achieved; the strategy says the evaluation is due later in 2026. A progress report from September 2025 said the department was still exploring whether an impact evaluation could establish what measurable changes, if any, were caused by the additional staff. The government is adding a further 500 enforcement specialists before that question about the first 475 has been answered.", "type": "paragraph"}, {"text": "Asset recovery has risen in the period since the 2023 plan. Official statistics for 2025/26 show £345.3 million recovered through confiscation, forfeiture and civil recovery powers, 20 per cent more than the previous year and 29 per cent higher in real terms than in 2020/21.", "type": "paragraph"}, {"text": "That total is not evenly spread across the three powers. Forfeiture receipts rose 28 per cent to £155.9 million. Civil recovery rose from £7.5 million to £38.5 million. Confiscation receipts, the largest single category, fell 5 per cent to £150.9 million.", "type": "paragraph"}, {"text": "A further £1.1 billion of assets was denied to criminals during the year, including £677 million under restraint orders and £376.4 million seized or frozen under forfeiture powers. That money was not accessible to criminals while legal processes continued, but it is not the same as money recovered by the state, and the Home Office itself cautions against treating the two figures as interchangeable.", "type": "paragraph"}, {"text": "Victims received £26.1 million through confiscation-order proceeds in 2025/26, 45 per cent less than the previous year, though still above the six-year median. The figure covers only compensation paid through confiscation receipts, not every form of criminal-justice compensation.", "type": "paragraph"}, {"text": "The National Crime Agency assesses that it is a realistic possibility that more than £100 billion is laundered through or within the UK, or through UK-registered corporate structures, each year. A separate Home Office analysis published alongside the new strategy puts the identified proceeds of certain profit-driven crimes in England and Wales in 2023/24 at least £21.9 billion. The Home Office says explicitly that this second figure should not be used as a measure of anti-money laundering performance or treated as an estimate of assets available to be recovered, since criminal proceeds may already have been spent, moved overseas, concealed or otherwise placed beyond reach.", "type": "paragraph"}, {"text": "Part of the £550 million is funded through changes to the Economic Crime Levy that took effect in April 2026. Firms with UK revenues above £1 billion moved from a £500,000 to a £1 million annual charge. A new £500,000 band was introduced for businesses with revenues between £500 million and £1 billion. Treasury estimates these changes will raise an additional £110 million in 2027/28 and around £115 million a year after that — revenue from the rate change itself, not the total £520 million the strategy draws from the levy.", "type": "paragraph"}, {"text": "Some recovered money already returns to enforcement. In 2025/26, £129.6 million was distributed to Proceeds of Crime Act agencies through the Asset Recovery Incentivisation Scheme, with a further £12.8 million awarded to 18 projects through its central funding pot.", "type": "paragraph"}, {"text": "The strategy sets out detailed delivery milestones for individual reforms and says tracking will tighten once the outcomes framework is built, with a progress report at the programme's midpoint and another at its end. What it does not yet say is how much higher than £345.3 million the government expects annual recovery to be by 2029, or what scale of change in the 475-officer uplift's results would justify the judgment that a further 500 specialists are worth the money.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "Home Secretary Shabana Mahmood announced on 15 September that the government will fund more than 500 additional enforcement specialists for economic crime, as part of a £550 million anti-money laundering and asset recovery strategy covering 2026 to 2029. \"We are putting 500 more officers on the trail of dirty money, going after the criminal bosses behind organised crime and stripping them of the funds they use to fuel drug trafficking, people smuggling and other serious crime,\" she said.", "type": "paragraph"}, {"text": "Of the £550 million, £520 million comes from the Economic Crime Levy, paid by businesses already regulated under anti-money laundering rules. A further £30 million comes from a high-streets package announced at Budget 2025. The strategy's stated goals are recovering more criminal assets, dismantling more laundering networks and improving prosecutions, intelligence and supervision.", "type": "paragraph"}, {"text": "The strategy does not attach a number to any of those goals. It lists assets recovered as one of the indicators that will be monitored, but does not state how large an increase would count as success. A Theory of Change and outcomes framework, including indicators for the new measures, is still being developed and will be produced later, alongside promised mid-point and final progress reports.", "type": "paragraph"}, {"text": "The previous economic crime plan took a different approach. When Economic Crime Plan 2 launched in March 2023, the Home Office and HM Treasury announced £400 million (£200 million from government, £200 million from the levy) and an uplift of 475 financial-crime investigators, tied to a specific ten-year objective: recover an additional £1 billion in criminal assets.", "type": "paragraph"}, {"text": "The new strategy says 99 per cent of those 475 posts have now been recruited. The Home Office has not yet published a process evaluation of what that staffing uplift achieved; the strategy says the evaluation is due later in 2026. A progress report from September 2025 said the department was still exploring whether an impact evaluation could establish what measurable changes, if any, were caused by the additional staff. The government is adding a further 500 enforcement specialists before that question about the first 475 has been answered.", "type": "paragraph"}, {"text": "Asset recovery has risen in the period since the 2023 plan. Official statistics for 2025/26 show £345.3 million recovered through confiscation, forfeiture and civil recovery powers, 20 per cent more than the previous year and 29 per cent higher in real terms than in 2020/21.", "type": "paragraph"}, {"text": "That total is not evenly spread across the three powers. Forfeiture receipts rose 28 per cent to £155.9 million. Civil recovery rose from £7.5 million to £38.5 million. Confiscation receipts, the largest single category, fell 5 per cent to £150.9 million.", "type": "paragraph"}, {"text": "A further £1.1 billion of assets was denied to criminals during the year, including £677 million under restraint orders and £376.4 million seized or frozen under forfeiture powers. That money was not accessible to criminals while legal processes continued, but it is not the same as money recovered by the state, and the Home Office itself cautions against treating the two figures as interchangeable.", "type": "paragraph"}, {"text": "Victims received £26.1 million through confiscation-order proceeds in 2025/26, 45 per cent less than the previous year, though still above the six-year median. The figure covers only compensation paid through confiscation receipts, not every form of criminal-justice compensation.", "type": "paragraph"}, {"text": "The National Crime Agency assesses that it is a realistic possibility that more than £100 billion is laundered through or within the UK, or through UK-registered corporate structures, each year. A separate Home Office analysis published alongside the new strategy puts the identified proceeds of certain profit-driven crimes in England and Wales in 2023/24 at least £21.9 billion. The Home Office says explicitly that this second figure should not be used as a measure of anti-money laundering performance or treated as an estimate of assets available to be recovered, since criminal proceeds may already have been spent, moved overseas, concealed or otherwise placed beyond reach.", "type": "paragraph"}, {"text": "Part of the £550 million is funded through changes to the Economic Crime Levy that took effect in April 2026. Firms with UK revenues above £1 billion moved from a £500,000 to a £1 million annual charge. A new £500,000 band was introduced for businesses with revenues between £500 million and £1 billion. Treasury estimates these changes will raise an additional £110 million in 2027/28 and around £115 million a year after that. That is revenue from the rate change itself, not the total £520 million the strategy draws from the levy.", "type": "paragraph"}, {"text": "Some recovered money already returns to enforcement. In 2025/26, £129.6 million was distributed to Proceeds of Crime Act agencies through the Asset Recovery Incentivisation Scheme, with a further £12.8 million awarded to 18 projects through its central funding pot.", "type": "paragraph"}, {"text": "The strategy sets out detailed delivery milestones for individual reforms and says tracking will tighten once the outcomes framework is built, with a progress report at the programme's midpoint and another at its end. What it does not yet say is how much higher than £345.3 million the government expects annual recovery to be by 2029, or what scale of change in the 475-officer uplift's results would justify the judgment that a further 500 specialists are worth the money.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$pb4k9mxw7r$k$ AND body_json = $o$[{"text": "Home Secretary Shabana Mahmood announced on 15 September that the government will fund more than 500 additional enforcement specialists for economic crime, as part of a £550 million anti-money laundering and asset recovery strategy covering 2026 to 2029. \"We are putting 500 more officers on the trail of dirty money, going after the criminal bosses behind organised crime and stripping them of the funds they use to fuel drug trafficking, people smuggling and other serious crime,\" she said.", "type": "paragraph"}, {"text": "Of the £550 million, £520 million comes from the Economic Crime Levy, paid by businesses already regulated under anti-money laundering rules. A further £30 million comes from a high-streets package announced at Budget 2025. The strategy's stated goals are recovering more criminal assets, dismantling more laundering networks and improving prosecutions, intelligence and supervision.", "type": "paragraph"}, {"text": "The strategy does not attach a number to any of those goals. It lists assets recovered as one of the indicators that will be monitored, but does not state how large an increase would count as success. A Theory of Change and outcomes framework, including indicators for the new measures, is still being developed and will be produced later, alongside promised mid-point and final progress reports.", "type": "paragraph"}, {"text": "The previous economic crime plan took a different approach. When Economic Crime Plan 2 launched in March 2023, the Home Office and HM Treasury announced £400 million — £200 million from government, £200 million from the levy — and an uplift of 475 financial-crime investigators, tied to a specific ten-year objective: recover an additional £1 billion in criminal assets.", "type": "paragraph"}, {"text": "The new strategy says 99 per cent of those 475 posts have now been recruited. The Home Office has not yet published a process evaluation of what that staffing uplift achieved; the strategy says the evaluation is due later in 2026. A progress report from September 2025 said the department was still exploring whether an impact evaluation could establish what measurable changes, if any, were caused by the additional staff. The government is adding a further 500 enforcement specialists before that question about the first 475 has been answered.", "type": "paragraph"}, {"text": "Asset recovery has risen in the period since the 2023 plan. Official statistics for 2025/26 show £345.3 million recovered through confiscation, forfeiture and civil recovery powers, 20 per cent more than the previous year and 29 per cent higher in real terms than in 2020/21.", "type": "paragraph"}, {"text": "That total is not evenly spread across the three powers. Forfeiture receipts rose 28 per cent to £155.9 million. Civil recovery rose from £7.5 million to £38.5 million. Confiscation receipts, the largest single category, fell 5 per cent to £150.9 million.", "type": "paragraph"}, {"text": "A further £1.1 billion of assets was denied to criminals during the year, including £677 million under restraint orders and £376.4 million seized or frozen under forfeiture powers. That money was not accessible to criminals while legal processes continued, but it is not the same as money recovered by the state, and the Home Office itself cautions against treating the two figures as interchangeable.", "type": "paragraph"}, {"text": "Victims received £26.1 million through confiscation-order proceeds in 2025/26, 45 per cent less than the previous year, though still above the six-year median. The figure covers only compensation paid through confiscation receipts, not every form of criminal-justice compensation.", "type": "paragraph"}, {"text": "The National Crime Agency assesses that it is a realistic possibility that more than £100 billion is laundered through or within the UK, or through UK-registered corporate structures, each year. A separate Home Office analysis published alongside the new strategy puts the identified proceeds of certain profit-driven crimes in England and Wales in 2023/24 at least £21.9 billion. The Home Office says explicitly that this second figure should not be used as a measure of anti-money laundering performance or treated as an estimate of assets available to be recovered, since criminal proceeds may already have been spent, moved overseas, concealed or otherwise placed beyond reach.", "type": "paragraph"}, {"text": "Part of the £550 million is funded through changes to the Economic Crime Levy that took effect in April 2026. Firms with UK revenues above £1 billion moved from a £500,000 to a £1 million annual charge. A new £500,000 band was introduced for businesses with revenues between £500 million and £1 billion. Treasury estimates these changes will raise an additional £110 million in 2027/28 and around £115 million a year after that — revenue from the rate change itself, not the total £520 million the strategy draws from the levy.", "type": "paragraph"}, {"text": "Some recovered money already returns to enforcement. In 2025/26, £129.6 million was distributed to Proceeds of Crime Act agencies through the Asset Recovery Incentivisation Scheme, with a further £12.8 million awarded to 18 projects through its central funding pot.", "type": "paragraph"}, {"text": "The strategy sets out detailed delivery milestones for individual reforms and says tracking will tighten once the outcomes framework is built, with a progress report at the programme's midpoint and another at its end. What it does not yet say is how much higher than £345.3 million the government expects annual recovery to be by 2029, or what scale of change in the 475-officer uplift's results would justify the judgment that a further 500 specialists are worth the money.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$pb4k9mxw7r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$rc8m4kqx7n$k$, 'body_json', $o$[{"text": "Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032–33.", "type": "paragraph"}, {"text": "The hospitals are Airedale General in West Yorkshire, Frimley Park in Surrey, Hinchingbrooke in Cambridgeshire, James Paget in Great Yarmouth, Leighton in Crewe, Queen Elizabeth in King's Lynn and West Suffolk Hospital in Bury St Edmunds.", "type": "paragraph"}, {"text": "The Public Accounts Committee said in April that a 2022 independent assessment had recommended replacing RAAC hospitals by 2030 at the latest. The Conservative government subsequently committed in May 2023 to rebuild all seven by the end of the decade.", "type": "paragraph"}, {"text": "That deadline is no longer being used.", "type": "paragraph"}, {"text": "The Labour government's January 2025 reset of the New Hospital Programme kept all seven RAAC replacements in its first main construction wave. Six are scheduled to begin construction in 2027–28 and Frimley Park in 2028–29. The National Audit Office says the final RAAC replacements are now expected to complete in 2032–33.", "type": "paragraph"}, {"text": "The reason the hospitals can remain open longer is not that the underlying RAAC risk has disappeared.", "type": "paragraph"}, {"text": "A new assessment commissioned by the Department of Health and Social Care and carried out by Mott MacDonald was published in December 2025. It concluded that extensive remediation had reduced most of the risk of RAAC plank collapse and that the seven hospitals could continue operating beyond 2030, provided maintenance, monitoring and further mitigation continued.", "type": "paragraph"}, {"text": "The report identified more than 80,000 RAAC roof planks across the seven hospitals.", "type": "paragraph"}, {"text": "Between 1 and 6 per cent of the planks at each site could not be accessed for remediation. Their locations are known and mitigation measures are in place, but Mott MacDonald said those untreated planks would continue to present a risk.", "type": "paragraph"}, {"text": "The assessment also depends on the buildings continuing to be maintained. Particular attention is required to keep RAAC dry because leaks and deterioration in mechanical infrastructure can increase the risk to the concrete.", "type": "paragraph"}, {"text": "Mott MacDonald said that, with continued management and maintenance, the panels may technically remain serviceable for as long as ten years beyond 2030. It also said costs and risks would increase the longer they remained in use.", "type": "paragraph"}, {"text": "The Public Accounts Committee therefore described the position more cautiously than simply saying the hospitals were safe until their replacements arrived. It said remediation had made continued operation possible but that significant risk and cost remained.", "type": "paragraph"}, {"text": "By 2025, more than £500 million had already been spent on maintenance and measures intended to protect patients and staff at RAAC hospitals. The committee was told that another £440 million would be provided while replacements were being built and described the combined cost as approaching £1 billion.", "type": "paragraph"}, {"text": "The government's formal response to the committee, published on 4 August, gives a more precise description of the second figure.", "type": "paragraph"}, {"text": "It says the seven trusts will continue receiving specific funding through NHS England's national RAAC programme for safety and mitigation work. Separately, they will collectively receive more than £440 million of operational capital over the next four years.", "type": "paragraph"}, {"text": "That capital is controlled locally by the trusts and can be used for priorities including maintaining their existing hospital estates. The government's response does not describe the entire £440 million as money ring-fenced solely for RAAC work. More than £500 million has already been spent specifically on maintenance and RAAC mitigation; the further £440 million is a separate operational allocation, not an addition to that dedicated spending.", "type": "paragraph"}, {"text": "The Department of Health and Social Care has overall responsibility for the New Hospital Programme, while NHS England is responsible for delivery. Health Secretary Wes Streeting approved the revised programme timetable in January 2025 after a government review. The department said the RAAC schemes had to remain a priority because of \"substantive safety risks\".", "type": "paragraph"}, {"text": "The department told the Public Accounts Committee in February that it would have preferred the RAAC hospitals to be replaced sooner, but said the pace was constrained by the construction industry's capacity to deliver several large hospitals at once. Officials said the seven schemes were still on track against the revised timetable.", "type": "paragraph"}, {"text": "The National Audit Office nevertheless identified signs of pressure. Its January report said West Suffolk was among RAAC schemes already appearing to face timetable and budgetary pressures. It warned more generally that the construction schedule was challenging and that delays in early projects could push pressure into later years.", "type": "paragraph"}, {"text": "The government's first New Hospital Programme annual report, published on 8 July, did not bring the timetable forward.", "type": "paragraph"}, {"text": "As of March, Airedale and Frimley Park were still going through strategic outline case assurance. Hinchingbrooke, James Paget, Leighton, Queen Elizabeth and West Suffolk were at outline business case development. The department said all seven would continue design and development work during 2026–27 towards the construction dates set out in the 2025 plan.", "type": "paragraph"}, {"text": "The Public Accounts Committee asked the department to report annually to Parliament on the seven replacements, including any further timetable slippage, additional costs and effects on patients and staff.", "type": "paragraph"}, {"text": "The government has accepted that recommendation. Its 4 August response says the annual report will include the timelines for the seven RAAC hospitals and will report impacts on patients and staff where timetable changes occur.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032-33.", "type": "paragraph"}, {"text": "The hospitals are Airedale General in West Yorkshire, Frimley Park in Surrey, Hinchingbrooke in Cambridgeshire, James Paget in Great Yarmouth, Leighton in Crewe, Queen Elizabeth in King's Lynn and West Suffolk Hospital in Bury St Edmunds.", "type": "paragraph"}, {"text": "The Public Accounts Committee said in April that a 2022 independent assessment had recommended replacing RAAC hospitals by 2030 at the latest. The Conservative government subsequently committed in May 2023 to rebuild all seven by the end of the decade.", "type": "paragraph"}, {"text": "That deadline is no longer being used.", "type": "paragraph"}, {"text": "The Labour government's January 2025 reset of the New Hospital Programme kept all seven RAAC replacements in its first main construction wave. Six are scheduled to begin construction in 2027-28 and Frimley Park in 2028-29. The National Audit Office says the final RAAC replacements are now expected to complete in 2032-33.", "type": "paragraph"}, {"text": "The reason the hospitals can remain open longer is not that the underlying RAAC risk has disappeared.", "type": "paragraph"}, {"text": "A new assessment commissioned by the Department of Health and Social Care and carried out by Mott MacDonald was published in December 2025. It concluded that extensive remediation had reduced most of the risk of RAAC plank collapse and that the seven hospitals could continue operating beyond 2030, provided maintenance, monitoring and further mitigation continued.", "type": "paragraph"}, {"text": "The report identified more than 80,000 RAAC roof planks across the seven hospitals.", "type": "paragraph"}, {"text": "Between 1 and 6 per cent of the planks at each site could not be accessed for remediation. Their locations are known and mitigation measures are in place, but Mott MacDonald said those untreated planks would continue to present a risk.", "type": "paragraph"}, {"text": "The assessment also depends on the buildings continuing to be maintained. Particular attention is required to keep RAAC dry because leaks and deterioration in mechanical infrastructure can increase the risk to the concrete.", "type": "paragraph"}, {"text": "Mott MacDonald said that, with continued management and maintenance, the panels may technically remain serviceable for as long as ten years beyond 2030. It also said costs and risks would increase the longer they remained in use.", "type": "paragraph"}, {"text": "The Public Accounts Committee therefore described the position more cautiously than simply saying the hospitals were safe until their replacements arrived. It said remediation had made continued operation possible but that significant risk and cost remained.", "type": "paragraph"}, {"text": "By 2025, more than £500 million had already been spent on maintenance and measures intended to protect patients and staff at RAAC hospitals. The committee was told that another £440 million would be provided while replacements were being built and described the combined cost as approaching £1 billion.", "type": "paragraph"}, {"text": "The government's formal response to the committee, published on 4 August, gives a more precise description of the second figure.", "type": "paragraph"}, {"text": "It says the seven trusts will continue receiving specific funding through NHS England's national RAAC programme for safety and mitigation work. Separately, they will collectively receive more than £440 million of operational capital over the next four years.", "type": "paragraph"}, {"text": "That capital is controlled locally by the trusts and can be used for priorities including maintaining their existing hospital estates. The government's response does not describe the entire £440 million as money ring-fenced solely for RAAC work. More than £500 million has already been spent specifically on maintenance and RAAC mitigation; the further £440 million is a separate operational allocation, not an addition to that dedicated spending.", "type": "paragraph"}, {"text": "The Department of Health and Social Care has overall responsibility for the New Hospital Programme, while NHS England is responsible for delivery. Health Secretary Wes Streeting approved the revised programme timetable in January 2025 after a government review. The department said the RAAC schemes had to remain a priority because of \"substantive safety risks\".", "type": "paragraph"}, {"text": "The department told the Public Accounts Committee in February that it would have preferred the RAAC hospitals to be replaced sooner, but said the pace was constrained by the construction industry's capacity to deliver several large hospitals at once. Officials said the seven schemes were still on track against the revised timetable.", "type": "paragraph"}, {"text": "The National Audit Office nevertheless identified signs of pressure. Its January report said West Suffolk was among RAAC schemes already appearing to face timetable and budgetary pressures. It warned more generally that the construction schedule was challenging and that delays in early projects could push pressure into later years.", "type": "paragraph"}, {"text": "The government's first New Hospital Programme annual report, published on 8 July, did not bring the timetable forward.", "type": "paragraph"}, {"text": "As of March, Airedale and Frimley Park were still going through strategic outline case assurance. Hinchingbrooke, James Paget, Leighton, Queen Elizabeth and West Suffolk were at outline business case development. The department said all seven would continue design and development work during 2026-27 towards the construction dates set out in the 2025 plan.", "type": "paragraph"}, {"text": "The Public Accounts Committee asked the department to report annually to Parliament on the seven replacements, including any further timetable slippage, additional costs and effects on patients and staff.", "type": "paragraph"}, {"text": "The government has accepted that recommendation. Its 4 August response says the annual report will include the timelines for the seven RAAC hospitals and will report impacts on patients and staff where timetable changes occur.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$rc8m4kqx7n$k$ AND body_json = $o$[{"text": "Seven hospitals built predominantly from reinforced autoclaved aerated concrete will remain in use beyond 2030, with the last replacements now expected to be completed in 2032–33.", "type": "paragraph"}, {"text": "The hospitals are Airedale General in West Yorkshire, Frimley Park in Surrey, Hinchingbrooke in Cambridgeshire, James Paget in Great Yarmouth, Leighton in Crewe, Queen Elizabeth in King's Lynn and West Suffolk Hospital in Bury St Edmunds.", "type": "paragraph"}, {"text": "The Public Accounts Committee said in April that a 2022 independent assessment had recommended replacing RAAC hospitals by 2030 at the latest. The Conservative government subsequently committed in May 2023 to rebuild all seven by the end of the decade.", "type": "paragraph"}, {"text": "That deadline is no longer being used.", "type": "paragraph"}, {"text": "The Labour government's January 2025 reset of the New Hospital Programme kept all seven RAAC replacements in its first main construction wave. Six are scheduled to begin construction in 2027–28 and Frimley Park in 2028–29. The National Audit Office says the final RAAC replacements are now expected to complete in 2032–33.", "type": "paragraph"}, {"text": "The reason the hospitals can remain open longer is not that the underlying RAAC risk has disappeared.", "type": "paragraph"}, {"text": "A new assessment commissioned by the Department of Health and Social Care and carried out by Mott MacDonald was published in December 2025. It concluded that extensive remediation had reduced most of the risk of RAAC plank collapse and that the seven hospitals could continue operating beyond 2030, provided maintenance, monitoring and further mitigation continued.", "type": "paragraph"}, {"text": "The report identified more than 80,000 RAAC roof planks across the seven hospitals.", "type": "paragraph"}, {"text": "Between 1 and 6 per cent of the planks at each site could not be accessed for remediation. Their locations are known and mitigation measures are in place, but Mott MacDonald said those untreated planks would continue to present a risk.", "type": "paragraph"}, {"text": "The assessment also depends on the buildings continuing to be maintained. Particular attention is required to keep RAAC dry because leaks and deterioration in mechanical infrastructure can increase the risk to the concrete.", "type": "paragraph"}, {"text": "Mott MacDonald said that, with continued management and maintenance, the panels may technically remain serviceable for as long as ten years beyond 2030. It also said costs and risks would increase the longer they remained in use.", "type": "paragraph"}, {"text": "The Public Accounts Committee therefore described the position more cautiously than simply saying the hospitals were safe until their replacements arrived. It said remediation had made continued operation possible but that significant risk and cost remained.", "type": "paragraph"}, {"text": "By 2025, more than £500 million had already been spent on maintenance and measures intended to protect patients and staff at RAAC hospitals. The committee was told that another £440 million would be provided while replacements were being built and described the combined cost as approaching £1 billion.", "type": "paragraph"}, {"text": "The government's formal response to the committee, published on 4 August, gives a more precise description of the second figure.", "type": "paragraph"}, {"text": "It says the seven trusts will continue receiving specific funding through NHS England's national RAAC programme for safety and mitigation work. Separately, they will collectively receive more than £440 million of operational capital over the next four years.", "type": "paragraph"}, {"text": "That capital is controlled locally by the trusts and can be used for priorities including maintaining their existing hospital estates. The government's response does not describe the entire £440 million as money ring-fenced solely for RAAC work. More than £500 million has already been spent specifically on maintenance and RAAC mitigation; the further £440 million is a separate operational allocation, not an addition to that dedicated spending.", "type": "paragraph"}, {"text": "The Department of Health and Social Care has overall responsibility for the New Hospital Programme, while NHS England is responsible for delivery. Health Secretary Wes Streeting approved the revised programme timetable in January 2025 after a government review. The department said the RAAC schemes had to remain a priority because of \"substantive safety risks\".", "type": "paragraph"}, {"text": "The department told the Public Accounts Committee in February that it would have preferred the RAAC hospitals to be replaced sooner, but said the pace was constrained by the construction industry's capacity to deliver several large hospitals at once. Officials said the seven schemes were still on track against the revised timetable.", "type": "paragraph"}, {"text": "The National Audit Office nevertheless identified signs of pressure. Its January report said West Suffolk was among RAAC schemes already appearing to face timetable and budgetary pressures. It warned more generally that the construction schedule was challenging and that delays in early projects could push pressure into later years.", "type": "paragraph"}, {"text": "The government's first New Hospital Programme annual report, published on 8 July, did not bring the timetable forward.", "type": "paragraph"}, {"text": "As of March, Airedale and Frimley Park were still going through strategic outline case assurance. Hinchingbrooke, James Paget, Leighton, Queen Elizabeth and West Suffolk were at outline business case development. The department said all seven would continue design and development work during 2026–27 towards the construction dates set out in the 2025 plan.", "type": "paragraph"}, {"text": "The Public Accounts Committee asked the department to report annually to Parliament on the seven replacements, including any further timetable slippage, additional costs and effects on patients and staff.", "type": "paragraph"}, {"text": "The government has accepted that recommendation. Its 4 August response says the annual report will include the timelines for the seven RAAC hospitals and will report impacts on patients and staff where timetable changes occur.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$rc8m4kqx7n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$gw4k9mxn7r$k$, 'body_json', $o$[{"text": "The government has announced what it calls a \"pathway to stronger public control\" of England's water industry.", "type": "paragraph"}, {"text": "For now, however, no water company is being taken into public ownership.", "type": "paragraph"}, {"text": "The change announced this week is considerably narrower.", "type": "paragraph"}, {"text": "Ministers intend to repeal rules dating from the privatisation of the industry that restrict government shareholdings in England's major water and sewerage companies to between 1 and 3 per cent, with the exact limit varying by company.", "type": "paragraph"}, {"text": "Removing those restrictions would give a future government considerably more freedom to intervene in a water company.", "type": "paragraph"}, {"text": "It does not itself constitute an intervention.", "type": "paragraph"}, {"text": "No shares are being bought. No company is being nationalised. No amount of money has been allocated for acquisitions.", "type": "paragraph"}, {"text": "And the government has not said what proportion of a water company it would actually be prepared to own.", "type": "paragraph"}, {"text": "The distinction matters.", "type": "paragraph"}, {"text": "The Department for Environment, Food and Rural Affairs said the change would give government \"flexibility to consider a wide range of possible future interventions, including on ownership models\".", "type": "paragraph"}, {"text": "That is a possibility rather than a policy.", "type": "paragraph"}, {"text": "The announcement also makes clear that ministers expect private capital to remain central to the system, saying that securing the long-term future of the sector \"relies on continued private sector investment\".", "type": "paragraph"}, {"text": "That leaves a much bigger question unanswered.", "type": "paragraph"}, {"text": "If a major water company fails financially, how far is the government actually prepared to go?", "type": "paragraph"}, {"text": "A restriction, not a ban on nationalisation", "type": "heading", "level": 2}, {"text": "The existing rules originate in the privatisation settlement created by the Water Act 1989 and the Water (Target Investment Limit) Order 1990.", "type": "paragraph"}, {"text": "They restrict government shareholdings in the privatised water companies to between 1 and 3 per cent, with the precise limit differing between companies.", "type": "paragraph"}, {"text": "But those rules have not made nationalisation legally impossible.", "type": "paragraph"}, {"text": "In May, the government told Parliament that the current legislation limited government holdings to around 3 per cent, and that bringing a water company into public ownership would require new primary legislation and compensation for existing owners.", "type": "paragraph"}, {"text": "The forthcoming legislation will make that process easier by removing the shareholding restrictions, but ministers would still need to decide to use those powers and determine how any acquisition was financed.", "type": "paragraph"}, {"text": "The government was taking a markedly different position only months ago.", "type": "paragraph"}, {"text": "In April it told Parliament that it had \"no intention to nationalise the water industry\" and therefore had \"no current plans to assess the financial or non-financial costs\" of comparing private and public ownership.", "type": "paragraph"}, {"text": "That position now looks considerably less absolute.", "type": "paragraph"}, {"text": "Prime Minister Andy Burnham, speaking to the Commons for the first time since taking office, has since described Britain's water industry as \"a leaking monument to that approach — a country run in the private rather than public interest\".", "type": "paragraph"}, {"text": "Yet the latest announcement still stops well short of committing his government to public ownership.", "type": "paragraph"}, {"text": "The £100 billion problem", "type": "heading", "level": 2}, {"text": "The obvious obstacle is cost.", "type": "paragraph"}, {"text": "There is no agreed figure for buying England's water companies.", "type": "paragraph"}, {"text": "Defra estimated in September 2025 that nationalising the sector could cost about £100 billion, using the industry's regulatory capital value as a proxy.", "type": "paragraph"}, {"text": "The House of Commons Library records that Ofwat's regulatory capital value for the industry is now just over £117 billion.", "type": "paragraph"}, {"text": "An analysis commissioned by Thames Water creditors and produced by Frontier Economics in July 2026 put the potential figure at £144 billion by 2030, accounting for planned capital investment over the current price control period.", "type": "paragraph"}, {"text": "A fourth figure complicates matters further. The Office for Budget Responsibility has calculated the question differently again: it put water companies' debts and other liabilities at £91 billion against £12 billion in financial assets and £94 billion in non-financial assets, concluding that moving the sector onto the public balance sheet could increase public sector net financial liabilities by around £78 billion, a measure of the impact on the government's books, not an acquisition price.", "type": "paragraph"}, {"text": "Those figures should be treated cautiously.", "type": "paragraph"}, {"text": "Regulatory capital value was created to help determine the returns companies can earn and the bills customers pay. It is not necessarily the price a government would have to pay shareholders.", "type": "paragraph"}, {"text": "Different legal structures, distressed companies, individual acquisitions and even the accounting basis used to frame the question could each produce very different numbers.", "type": "paragraph"}, {"text": "But the scale explains why removing a legal restriction is much easier than announcing wholesale nationalisation.", "type": "paragraph"}, {"text": "Thames Water changes the calculation", "type": "heading", "level": 2}, {"text": "The more significant possibility is therefore not the government buying every water company.", "type": "paragraph"}, {"text": "It is selective intervention.", "type": "paragraph"}, {"text": "Thames Water has become the obvious test case.", "type": "paragraph"}, {"text": "The Independent Water Commission, in its final report, found no clear evidence of a causal link between ownership models and environmental or operational performance. Sir Jon Cunliffe, who chaired the commission, said: \"on the data and comparable metrics available, the truth is that we did not see evidence of a causal link between ownership models and a range of environmental and other performance indicators.\"", "type": "paragraph"}, {"text": "But in an earlier address on the commission's plans, Cunliffe had already identified financial resilience as a separate problem, warning that \"decisions by a number of companies about structure and debt historically have left them more exposed — as we have seen in the extreme example of Thames Water.\"", "type": "paragraph"}, {"text": "His conclusion in the final report was significant. What mattered, he said, was not simply whether ownership was public or private, but \"the business model of the owners, the level of return they seek on their investment, their time horizon for that return, their preference for dividends or capital gain and their willingness to invest further in their company for a fair return.\"", "type": "paragraph"}, {"text": "That distinction may explain the government's emerging position.", "type": "paragraph"}, {"text": "Rather than committing billions of pounds to nationalising the entire industry, ministers could acquire stakes in individual companies when financial failure, poor performance or restructuring creates an opportunity.", "type": "paragraph"}, {"text": "The legislation announced this week would remove one of the obstacles to doing so.", "type": "paragraph"}, {"text": "The unanswered questions", "type": "heading", "level": 2}, {"text": "The announcement therefore matters.", "type": "paragraph"}, {"text": "But \"stronger public control\" remains undefined.", "type": "paragraph"}, {"text": "The government has not said whether it would buy minority stakes, controlling stakes or entire companies.", "type": "paragraph"}, {"text": "It has not said how acquisitions would be valued.", "type": "paragraph"}, {"text": "It has not said whether taxpayers would receive dividends if public money was invested.", "type": "paragraph"}, {"text": "It has not said whether government investment would come ahead of existing shareholders or creditors when a company was restructured.", "type": "paragraph"}, {"text": "And its announcement does not name Thames Water, or any other company, as a candidate for these powers.", "type": "paragraph"}, {"text": "Until those questions are answered, the government has not announced public ownership of England's water industry.", "type": "paragraph"}, {"text": "It has removed a lock from the door.", "type": "paragraph"}, {"text": "Whether ministers ever open it is another matter.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "The government has announced what it calls a \"pathway to stronger public control\" of England's water industry.", "type": "paragraph"}, {"text": "For now, however, no water company is being taken into public ownership.", "type": "paragraph"}, {"text": "The change announced this week is considerably narrower.", "type": "paragraph"}, {"text": "Ministers intend to repeal rules dating from the privatisation of the industry that restrict government shareholdings in England's major water and sewerage companies to between 1 and 3 per cent, with the exact limit varying by company.", "type": "paragraph"}, {"text": "Removing those restrictions would give a future government considerably more freedom to intervene in a water company.", "type": "paragraph"}, {"text": "It does not itself constitute an intervention.", "type": "paragraph"}, {"text": "No shares are being bought. No company is being nationalised. No amount of money has been allocated for acquisitions.", "type": "paragraph"}, {"text": "And the government has not said what proportion of a water company it would actually be prepared to own.", "type": "paragraph"}, {"text": "The distinction matters.", "type": "paragraph"}, {"text": "The Department for Environment, Food and Rural Affairs said the change would give government \"flexibility to consider a wide range of possible future interventions, including on ownership models\".", "type": "paragraph"}, {"text": "That is a possibility rather than a policy.", "type": "paragraph"}, {"text": "The announcement also makes clear that ministers expect private capital to remain central to the system, saying that securing the long-term future of the sector \"relies on continued private sector investment\".", "type": "paragraph"}, {"text": "That leaves a much bigger question unanswered.", "type": "paragraph"}, {"text": "If a major water company fails financially, how far is the government actually prepared to go?", "type": "paragraph"}, {"text": "A restriction, not a ban on nationalisation", "type": "heading", "level": 2}, {"text": "The existing rules originate in the privatisation settlement created by the Water Act 1989 and the Water (Target Investment Limit) Order 1990.", "type": "paragraph"}, {"text": "They restrict government shareholdings in the privatised water companies to between 1 and 3 per cent, with the precise limit differing between companies.", "type": "paragraph"}, {"text": "But those rules have not made nationalisation legally impossible.", "type": "paragraph"}, {"text": "In May, the government told Parliament that the current legislation limited government holdings to around 3 per cent, and that bringing a water company into public ownership would require new primary legislation and compensation for existing owners.", "type": "paragraph"}, {"text": "The forthcoming legislation will make that process easier by removing the shareholding restrictions, but ministers would still need to decide to use those powers and determine how any acquisition was financed.", "type": "paragraph"}, {"text": "The government was taking a markedly different position only months ago.", "type": "paragraph"}, {"text": "In April it told Parliament that it had \"no intention to nationalise the water industry\" and therefore had \"no current plans to assess the financial or non-financial costs\" of comparing private and public ownership.", "type": "paragraph"}, {"text": "That position now looks considerably less absolute.", "type": "paragraph"}, {"text": "Prime Minister Andy Burnham, speaking to the Commons for the first time since taking office, has since described Britain's water industry as \"a leaking monument to that approach, a country run in the private rather than public interest\".", "type": "paragraph"}, {"text": "Yet the latest announcement still stops well short of committing his government to public ownership.", "type": "paragraph"}, {"text": "The £100 billion problem", "type": "heading", "level": 2}, {"text": "The obvious obstacle is cost.", "type": "paragraph"}, {"text": "There is no agreed figure for buying England's water companies.", "type": "paragraph"}, {"text": "Defra estimated in September 2025 that nationalising the sector could cost about £100 billion, using the industry's regulatory capital value as a proxy.", "type": "paragraph"}, {"text": "The House of Commons Library records that Ofwat's regulatory capital value for the industry is now just over £117 billion.", "type": "paragraph"}, {"text": "An analysis commissioned by Thames Water creditors and produced by Frontier Economics in July 2026 put the potential figure at £144 billion by 2030, accounting for planned capital investment over the current price control period.", "type": "paragraph"}, {"text": "A fourth figure complicates matters further. The Office for Budget Responsibility has calculated the question differently again: it put water companies' debts and other liabilities at £91 billion against £12 billion in financial assets and £94 billion in non-financial assets, concluding that moving the sector onto the public balance sheet could increase public sector net financial liabilities by around £78 billion, a measure of the impact on the government's books, not an acquisition price.", "type": "paragraph"}, {"text": "Those figures should be treated cautiously.", "type": "paragraph"}, {"text": "Regulatory capital value was created to help determine the returns companies can earn and the bills customers pay. It is not necessarily the price a government would have to pay shareholders.", "type": "paragraph"}, {"text": "Different legal structures, distressed companies, individual acquisitions and even the accounting basis used to frame the question could each produce very different numbers.", "type": "paragraph"}, {"text": "But the scale explains why removing a legal restriction is much easier than announcing wholesale nationalisation.", "type": "paragraph"}, {"text": "Thames Water changes the calculation", "type": "heading", "level": 2}, {"text": "The more significant possibility is therefore not the government buying every water company.", "type": "paragraph"}, {"text": "It is selective intervention.", "type": "paragraph"}, {"text": "Thames Water has become the obvious test case.", "type": "paragraph"}, {"text": "The Independent Water Commission, in its final report, found no clear evidence of a causal link between ownership models and environmental or operational performance. Sir Jon Cunliffe, who chaired the commission, said: \"on the data and comparable metrics available, the truth is that we did not see evidence of a causal link between ownership models and a range of environmental and other performance indicators.\"", "type": "paragraph"}, {"text": "But in an earlier address on the commission's plans, Cunliffe had already identified financial resilience as a separate problem, warning that \"decisions by a number of companies about structure and debt historically have left them more exposed, as we have seen in the extreme example of Thames Water.\"", "type": "paragraph"}, {"text": "His conclusion in the final report was significant. What mattered, he said, was not simply whether ownership was public or private, but \"the business model of the owners, the level of return they seek on their investment, their time horizon for that return, their preference for dividends or capital gain and their willingness to invest further in their company for a fair return.\"", "type": "paragraph"}, {"text": "That distinction may explain the government's emerging position.", "type": "paragraph"}, {"text": "Rather than committing billions of pounds to nationalising the entire industry, ministers could acquire stakes in individual companies when financial failure, poor performance or restructuring creates an opportunity.", "type": "paragraph"}, {"text": "The legislation announced this week would remove one of the obstacles to doing so.", "type": "paragraph"}, {"text": "The unanswered questions", "type": "heading", "level": 2}, {"text": "The announcement therefore matters.", "type": "paragraph"}, {"text": "But \"stronger public control\" remains undefined.", "type": "paragraph"}, {"text": "The government has not said whether it would buy minority stakes, controlling stakes or entire companies.", "type": "paragraph"}, {"text": "It has not said how acquisitions would be valued.", "type": "paragraph"}, {"text": "It has not said whether taxpayers would receive dividends if public money was invested.", "type": "paragraph"}, {"text": "It has not said whether government investment would come ahead of existing shareholders or creditors when a company was restructured.", "type": "paragraph"}, {"text": "And its announcement does not name Thames Water, or any other company, as a candidate for these powers.", "type": "paragraph"}, {"text": "Until those questions are answered, the government has not announced public ownership of England's water industry.", "type": "paragraph"}, {"text": "It has removed a lock from the door.", "type": "paragraph"}, {"text": "Whether ministers ever open it is another matter.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$gw4k9mxn7r$k$ AND body_json = $o$[{"text": "The government has announced what it calls a \"pathway to stronger public control\" of England's water industry.", "type": "paragraph"}, {"text": "For now, however, no water company is being taken into public ownership.", "type": "paragraph"}, {"text": "The change announced this week is considerably narrower.", "type": "paragraph"}, {"text": "Ministers intend to repeal rules dating from the privatisation of the industry that restrict government shareholdings in England's major water and sewerage companies to between 1 and 3 per cent, with the exact limit varying by company.", "type": "paragraph"}, {"text": "Removing those restrictions would give a future government considerably more freedom to intervene in a water company.", "type": "paragraph"}, {"text": "It does not itself constitute an intervention.", "type": "paragraph"}, {"text": "No shares are being bought. No company is being nationalised. No amount of money has been allocated for acquisitions.", "type": "paragraph"}, {"text": "And the government has not said what proportion of a water company it would actually be prepared to own.", "type": "paragraph"}, {"text": "The distinction matters.", "type": "paragraph"}, {"text": "The Department for Environment, Food and Rural Affairs said the change would give government \"flexibility to consider a wide range of possible future interventions, including on ownership models\".", "type": "paragraph"}, {"text": "That is a possibility rather than a policy.", "type": "paragraph"}, {"text": "The announcement also makes clear that ministers expect private capital to remain central to the system, saying that securing the long-term future of the sector \"relies on continued private sector investment\".", "type": "paragraph"}, {"text": "That leaves a much bigger question unanswered.", "type": "paragraph"}, {"text": "If a major water company fails financially, how far is the government actually prepared to go?", "type": "paragraph"}, {"text": "A restriction, not a ban on nationalisation", "type": "heading", "level": 2}, {"text": "The existing rules originate in the privatisation settlement created by the Water Act 1989 and the Water (Target Investment Limit) Order 1990.", "type": "paragraph"}, {"text": "They restrict government shareholdings in the privatised water companies to between 1 and 3 per cent, with the precise limit differing between companies.", "type": "paragraph"}, {"text": "But those rules have not made nationalisation legally impossible.", "type": "paragraph"}, {"text": "In May, the government told Parliament that the current legislation limited government holdings to around 3 per cent, and that bringing a water company into public ownership would require new primary legislation and compensation for existing owners.", "type": "paragraph"}, {"text": "The forthcoming legislation will make that process easier by removing the shareholding restrictions, but ministers would still need to decide to use those powers and determine how any acquisition was financed.", "type": "paragraph"}, {"text": "The government was taking a markedly different position only months ago.", "type": "paragraph"}, {"text": "In April it told Parliament that it had \"no intention to nationalise the water industry\" and therefore had \"no current plans to assess the financial or non-financial costs\" of comparing private and public ownership.", "type": "paragraph"}, {"text": "That position now looks considerably less absolute.", "type": "paragraph"}, {"text": "Prime Minister Andy Burnham, speaking to the Commons for the first time since taking office, has since described Britain's water industry as \"a leaking monument to that approach — a country run in the private rather than public interest\".", "type": "paragraph"}, {"text": "Yet the latest announcement still stops well short of committing his government to public ownership.", "type": "paragraph"}, {"text": "The £100 billion problem", "type": "heading", "level": 2}, {"text": "The obvious obstacle is cost.", "type": "paragraph"}, {"text": "There is no agreed figure for buying England's water companies.", "type": "paragraph"}, {"text": "Defra estimated in September 2025 that nationalising the sector could cost about £100 billion, using the industry's regulatory capital value as a proxy.", "type": "paragraph"}, {"text": "The House of Commons Library records that Ofwat's regulatory capital value for the industry is now just over £117 billion.", "type": "paragraph"}, {"text": "An analysis commissioned by Thames Water creditors and produced by Frontier Economics in July 2026 put the potential figure at £144 billion by 2030, accounting for planned capital investment over the current price control period.", "type": "paragraph"}, {"text": "A fourth figure complicates matters further. The Office for Budget Responsibility has calculated the question differently again: it put water companies' debts and other liabilities at £91 billion against £12 billion in financial assets and £94 billion in non-financial assets, concluding that moving the sector onto the public balance sheet could increase public sector net financial liabilities by around £78 billion, a measure of the impact on the government's books, not an acquisition price.", "type": "paragraph"}, {"text": "Those figures should be treated cautiously.", "type": "paragraph"}, {"text": "Regulatory capital value was created to help determine the returns companies can earn and the bills customers pay. It is not necessarily the price a government would have to pay shareholders.", "type": "paragraph"}, {"text": "Different legal structures, distressed companies, individual acquisitions and even the accounting basis used to frame the question could each produce very different numbers.", "type": "paragraph"}, {"text": "But the scale explains why removing a legal restriction is much easier than announcing wholesale nationalisation.", "type": "paragraph"}, {"text": "Thames Water changes the calculation", "type": "heading", "level": 2}, {"text": "The more significant possibility is therefore not the government buying every water company.", "type": "paragraph"}, {"text": "It is selective intervention.", "type": "paragraph"}, {"text": "Thames Water has become the obvious test case.", "type": "paragraph"}, {"text": "The Independent Water Commission, in its final report, found no clear evidence of a causal link between ownership models and environmental or operational performance. Sir Jon Cunliffe, who chaired the commission, said: \"on the data and comparable metrics available, the truth is that we did not see evidence of a causal link between ownership models and a range of environmental and other performance indicators.\"", "type": "paragraph"}, {"text": "But in an earlier address on the commission's plans, Cunliffe had already identified financial resilience as a separate problem, warning that \"decisions by a number of companies about structure and debt historically have left them more exposed — as we have seen in the extreme example of Thames Water.\"", "type": "paragraph"}, {"text": "His conclusion in the final report was significant. What mattered, he said, was not simply whether ownership was public or private, but \"the business model of the owners, the level of return they seek on their investment, their time horizon for that return, their preference for dividends or capital gain and their willingness to invest further in their company for a fair return.\"", "type": "paragraph"}, {"text": "That distinction may explain the government's emerging position.", "type": "paragraph"}, {"text": "Rather than committing billions of pounds to nationalising the entire industry, ministers could acquire stakes in individual companies when financial failure, poor performance or restructuring creates an opportunity.", "type": "paragraph"}, {"text": "The legislation announced this week would remove one of the obstacles to doing so.", "type": "paragraph"}, {"text": "The unanswered questions", "type": "heading", "level": 2}, {"text": "The announcement therefore matters.", "type": "paragraph"}, {"text": "But \"stronger public control\" remains undefined.", "type": "paragraph"}, {"text": "The government has not said whether it would buy minority stakes, controlling stakes or entire companies.", "type": "paragraph"}, {"text": "It has not said how acquisitions would be valued.", "type": "paragraph"}, {"text": "It has not said whether taxpayers would receive dividends if public money was invested.", "type": "paragraph"}, {"text": "It has not said whether government investment would come ahead of existing shareholders or creditors when a company was restructured.", "type": "paragraph"}, {"text": "And its announcement does not name Thames Water, or any other company, as a candidate for these powers.", "type": "paragraph"}, {"text": "Until those questions are answered, the government has not announced public ownership of England's water industry.", "type": "paragraph"}, {"text": "It has removed a lock from the door.", "type": "paragraph"}, {"text": "Whether ministers ever open it is another matter.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$gw4k9mxn7r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$mf7k3qxw9n$k$, 'body_json', $o$[{"text": "The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024–25 because it judged them invalid.", "type": "paragraph"}, {"text": "Most were not fraud. The department says contractor error was the most common reason. Other invoices lacked valid purchase orders or exceeded contractual limits, and rejection of an invoice does not mean a supplier acted dishonestly.", "type": "paragraph"}, {"text": "But the figure sits beside a problem the MoD has yet to solve. It does not have a reliable estimate of how much money it actually loses to fraud.", "type": "paragraph"}, {"text": "Its published estimate has reached £1.5 billion a year, mostly from procurement. Permanent Secretary Jeremy Pocklington told the Public Accounts Committee in March that the number was \"essentially an academic construct\". It was derived from external benchmarks rather than fraud measured across the department's own spending.", "type": "paragraph"}, {"text": "The government's response to the committee, published on 4 August, accepts that a better estimate is needed. The MoD will publish a phased plan in a new counter-fraud strategy this autumn, but says procurement fraud will be particularly difficult to quantify.", "type": "paragraph"}, {"text": "The £1.5 billion figure should not therefore be reported as £1.5 billion of fraud known to have occurred.", "type": "paragraph"}, {"text": "The National Audit Office found that the MoD constructed its maximum estimate by applying external fraud rates to parts of its expenditure. It used a benchmark of 4.57 per cent for procurement and 1.7 per cent for payroll. Those rates came from research that was not specific to the Ministry of Defence. The estimate also did not take account of the effect of the department's existing controls.", "type": "paragraph"}, {"text": "The NAO said the real loss could be significantly higher or lower.", "type": "paragraph"}, {"text": "The MoD had historically applied its calculation to £28.5 billion of selected expenditure. The NAO reported that using roughly £40 billion of total procurement expenditure instead would produce an unmitigated maximum estimate of about £2 billion. That would still be a modelled exposure, not evidence that £2 billion had been stolen or fraudulently claimed.", "type": "paragraph"}, {"text": "The department is trying to replace that method with an assessment built more closely from its own risks and controls, though that work has some distance to go.", "type": "paragraph"}, {"text": "Fraud Defence created 130 risk registers across the MoD and combined them into a central view. By August 2025 the register contained 1,468 active risks. Forty-seven per cent were rated as having a severe or critical potential impact after mitigation, but the department had not attached financial values to them. Some severe or critical risks had not been updated for as long as five years, and the NAO found no assessment of how effectively some existing controls were working.", "type": "paragraph"}, {"text": "The government now says the register has been replaced by a new enterprise version organised around procurement, personnel controls, misuse of Defence assets and cyber and AI deception. It is working with the Public Sector Fraud Authority, NHS Counter Fraud Authority and other specialists to calculate the exposure behind those categories.", "type": "paragraph"}, {"text": "The MoD expected the exercise to take about a year, with initial assessments of less complex fraud categories by the end of 2026. Procurement, already the department's largest identified fraud-risk area, could take longer and may still require some benchmarking.", "type": "paragraph"}, {"text": "The department currently spends around £40 billion a year on procurement. How much that figure will rise is less clear.", "type": "paragraph"}, {"text": "The Public Accounts Committee says Defence procurement is expected to exceed £70 billion a year by 2028–29. But the source it cites for that claim does not say that.", "type": "paragraph"}, {"text": "Paragraph 2.6 of the National Audit Office report says total Ministry of Defence spending is planned to rise from £53.9 billion in 2023–24 to £73.5 billion in 2028–29. Elsewhere, the NAO puts current procurement spending at around £40 billion. It does not publish a projection showing procurement itself reaching £70 billion.", "type": "paragraph"}, {"text": "The distinction is substantial. A procurement budget of more than £70 billion would mean almost all of the department's projected £73.5 billion expenditure was procurement.", "type": "paragraph"}, {"text": "Open Govt also checked the Public Accounts Committee's evidence session with senior MoD officials and the department's subsequent written evidence. Permanent Secretary Jeremy Pocklington confirmed that roughly £40 billion is currently spent on procurement but did not give a £70 billion projection.", "type": "paragraph"}, {"text": "During the hearing, committee member Rupert Lowe said spending was likely to rise to £75 billion, but that figure was put to officials rather than supplied or confirmed by them.", "type": "paragraph"}, {"text": "The committee may hold other evidence for its projection, but the primary material it cites publicly does not establish it. The safer conclusion is that procurement spending is expected to increase as the defence budget rises. On the evidence published with this inquiry, the size of that increase cannot be verified.", "type": "paragraph"}, {"text": "The £400 million of supplier costs stopped in 2024–25 shows both the scale of the commercial checking already taking place and why it cannot simply be added to the department's fraud figures.", "type": "paragraph"}, {"text": "MoD officials told MPs that its Cost Assurance and Analysis Service had disallowed around £400 million of potential supplier costs. Payments can be stopped automatically when an invoice fails a three-way check against the purchase order and confirmation that goods or services were received. Invoices which cannot readily be corrected can then be formally rejected.", "type": "paragraph"}, {"text": "Those controls may prevent fraudulent payments as well as ordinary mistakes, but the department does not know how much of the £400 million falls into either category. It also does not count those wider commercial controls in the counter-fraud savings it reports to the Public Sector Fraud Authority, which is worth bearing in mind alongside another figure highlighted by MPs: the poor recorded return on the MoD's dedicated counter-fraud spending.", "type": "paragraph"}, {"text": "Between 2021–22 and 2024–25, the MoD reported average counter-fraud spending of £5.7 million a year and average prevention and recoveries of £2.8 million, split roughly equally between fraud and error. That produced a reported return of 48p for every £1 spent, compared with a government expectation of £3.", "type": "paragraph"}, {"text": "The return improved to £1.34 in 2024–25.", "type": "paragraph"}, {"text": "Part of that improvement came from a review of what the department calls \"commercial leakage\". The exercise identified £17.5 million of potentially recoverable overpayments in digital procurement contracts. It did not recover £17.5 million that year. The NAO says £3.8 million recovered from the exercise contributed to the 2024–25 result.", "type": "paragraph"}, {"text": "The review itself cost £5 million, mostly to develop data-analysis technology, and that cost was not included in the counter-fraud expenditure used to calculate the £1.34 return.", "type": "paragraph"}, {"text": "The MoD says its recorded return may understate the value of work being done elsewhere in the department. The NAO agreed that commercial and financial controls can prevent losses without those savings appearing in the central counter-fraud numbers. It also found that the MoD had difficulty consistently identifying what it spent on counter-fraud work, making the return figure an incomplete measure in both directions.", "type": "paragraph"}, {"text": "The department nevertheless remains well below the government's £3 target on its own reported measure. Its 4 August response says it expects recoveries to improve significantly in 2025–26 and intends to reach the target by 2028 at the latest. A detailed plan is due to the Public Accounts Committee in November.", "type": "paragraph"}, {"text": "The NAO also found weaknesses in what happened after suspicions arose.", "type": "paragraph"}, {"text": "Fraud investigations are divided between Fraud Defence, the Ministry of Defence Police and the separate service police forces, alongside finance, commercial and other teams. Earlier reviews had found duplication, siloed working and mistrust between parts of that system. The NAO found that several case-management systems were being used and that the MoD lacked a single view of how investigations were progressing and ending.", "type": "paragraph"}, {"text": "There was also no common monetary threshold for deciding when a suspected case should be investigated, and different teams were not always clear about the criteria used elsewhere in the department. If police decided that a case did not meet the criminal threshold, the NAO found there was no consistently applied mechanism ensuring it returned to another part of the MoD for possible non-criminal action.", "type": "paragraph"}, {"text": "The government says some of this has changed. A Defence Policing Board and Defence Police Chiefs' Council were created in 2025. Fraud Defence is adopting a case-management system intended to work more easily with policing bodies, and the MoD is developing an integrated investigation model with shared triage and better information exchange. The target date for implementing the committee's recommendation is April 2027.", "type": "paragraph"}, {"text": "Pocklington told MPs that commercial staff regularly have to distinguish between what he called \"sharp commercial practice\" and conduct involving fraudulent intent. The Public Accounts Committee concluded that the department lacked clarity over when contractual disputes should be passed to police or counter-fraud investigators.", "type": "paragraph"}, {"text": "The government has accepted a recommendation for a commercial fraud playbook. It is supposed to explain the warning signs, controls, responsibilities and steps staff should take when fraud is suspected. Procurement red-flag guidance has already been added to training for new commercial staff. The full playbook is due by April 2027.", "type": "paragraph"}, {"text": "For single-source defence contracts worth more than £5 million, the department points to an existing safeguard. Regulations give it access to open-book information on pricing and costs claimed during contracts. The government says that provides both scrutiny and a deterrent against fraudulent claims.", "type": "paragraph"}, {"text": "Responsibility for counter-fraud has also been tightened. Director General Finance Aneen Blackmore has been given greater authority over the function and senior sponsors have been assigned across the main parts of Defence. A new two-star Director Assurance is to focus predominantly on fraud and error.", "type": "paragraph"}, {"text": "The department has accepted all of the Public Accounts Committee's recommendations. It is expanding analytics, reviewing procurement controls and developing a replacement finance system capable of continuously checking transactions for possible fraud, error and policy breaches. That system is expected to go live in 2028, by which point the MoD also expects to have reached the government's £3 return target.", "type": "paragraph"}, {"text": "Its more immediate problem is more basic. It has built more than 100 risk registers and rejected around £400 million of supplier costs in a single year, yet it still cannot put a reliable figure on how much fraud is actually costing it.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024-25 because it judged them invalid.", "type": "paragraph"}, {"text": "Most were not fraud. The department says contractor error was the most common reason. Other invoices lacked valid purchase orders or exceeded contractual limits, and rejection of an invoice does not mean a supplier acted dishonestly.", "type": "paragraph"}, {"text": "But the figure sits beside a problem the MoD has yet to solve. It does not have a reliable estimate of how much money it actually loses to fraud.", "type": "paragraph"}, {"text": "Its published estimate has reached £1.5 billion a year, mostly from procurement. Permanent Secretary Jeremy Pocklington told the Public Accounts Committee in March that the number was \"essentially an academic construct\". It was derived from external benchmarks rather than fraud measured across the department's own spending.", "type": "paragraph"}, {"text": "The government's response to the committee, published on 4 August, accepts that a better estimate is needed. The MoD will publish a phased plan in a new counter-fraud strategy this autumn, but says procurement fraud will be particularly difficult to quantify.", "type": "paragraph"}, {"text": "The £1.5 billion figure should not therefore be reported as £1.5 billion of fraud known to have occurred.", "type": "paragraph"}, {"text": "The National Audit Office found that the MoD constructed its maximum estimate by applying external fraud rates to parts of its expenditure. It used a benchmark of 4.57 per cent for procurement and 1.7 per cent for payroll. Those rates came from research that was not specific to the Ministry of Defence. The estimate also did not take account of the effect of the department's existing controls.", "type": "paragraph"}, {"text": "The NAO said the real loss could be significantly higher or lower.", "type": "paragraph"}, {"text": "The MoD had historically applied its calculation to £28.5 billion of selected expenditure. The NAO reported that using roughly £40 billion of total procurement expenditure instead would produce an unmitigated maximum estimate of about £2 billion. That would still be a modelled exposure, not evidence that £2 billion had been stolen or fraudulently claimed.", "type": "paragraph"}, {"text": "The department is trying to replace that method with an assessment built more closely from its own risks and controls, though that work has some distance to go.", "type": "paragraph"}, {"text": "Fraud Defence created 130 risk registers across the MoD and combined them into a central view. By August 2025 the register contained 1,468 active risks. Forty-seven per cent were rated as having a severe or critical potential impact after mitigation, but the department had not attached financial values to them. Some severe or critical risks had not been updated for as long as five years, and the NAO found no assessment of how effectively some existing controls were working.", "type": "paragraph"}, {"text": "The government now says the register has been replaced by a new enterprise version organised around procurement, personnel controls, misuse of Defence assets and cyber and AI deception. It is working with the Public Sector Fraud Authority, NHS Counter Fraud Authority and other specialists to calculate the exposure behind those categories.", "type": "paragraph"}, {"text": "The MoD expected the exercise to take about a year, with initial assessments of less complex fraud categories by the end of 2026. Procurement, already the department's largest identified fraud-risk area, could take longer and may still require some benchmarking.", "type": "paragraph"}, {"text": "The department currently spends around £40 billion a year on procurement. How much that figure will rise is less clear.", "type": "paragraph"}, {"text": "The Public Accounts Committee says Defence procurement is expected to exceed £70 billion a year by 2028-29. But the source it cites for that claim does not say that.", "type": "paragraph"}, {"text": "Paragraph 2.6 of the National Audit Office report says total Ministry of Defence spending is planned to rise from £53.9 billion in 2023-24 to £73.5 billion in 2028-29. Elsewhere, the NAO puts current procurement spending at around £40 billion. It does not publish a projection showing procurement itself reaching £70 billion.", "type": "paragraph"}, {"text": "The distinction is substantial. A procurement budget of more than £70 billion would mean almost all of the department's projected £73.5 billion expenditure was procurement.", "type": "paragraph"}, {"text": "Open Govt also checked the Public Accounts Committee's evidence session with senior MoD officials and the department's subsequent written evidence. Permanent Secretary Jeremy Pocklington confirmed that roughly £40 billion is currently spent on procurement but did not give a £70 billion projection.", "type": "paragraph"}, {"text": "During the hearing, committee member Rupert Lowe said spending was likely to rise to £75 billion, but that figure was put to officials rather than supplied or confirmed by them.", "type": "paragraph"}, {"text": "The committee may hold other evidence for its projection, but the primary material it cites publicly does not establish it. The safer conclusion is that procurement spending is expected to increase as the defence budget rises. On the evidence published with this inquiry, the size of that increase cannot be verified.", "type": "paragraph"}, {"text": "The £400 million of supplier costs stopped in 2024-25 shows both the scale of the commercial checking already taking place and why it cannot simply be added to the department's fraud figures.", "type": "paragraph"}, {"text": "MoD officials told MPs that its Cost Assurance and Analysis Service had disallowed around £400 million of potential supplier costs. Payments can be stopped automatically when an invoice fails a three-way check against the purchase order and confirmation that goods or services were received. Invoices which cannot readily be corrected can then be formally rejected.", "type": "paragraph"}, {"text": "Those controls may prevent fraudulent payments as well as ordinary mistakes, but the department does not know how much of the £400 million falls into either category. It also does not count those wider commercial controls in the counter-fraud savings it reports to the Public Sector Fraud Authority, which is worth bearing in mind alongside another figure highlighted by MPs: the poor recorded return on the MoD's dedicated counter-fraud spending.", "type": "paragraph"}, {"text": "Between 2021-22 and 2024-25, the MoD reported average counter-fraud spending of £5.7 million a year and average prevention and recoveries of £2.8 million, split roughly equally between fraud and error. That produced a reported return of 48p for every £1 spent, compared with a government expectation of £3.", "type": "paragraph"}, {"text": "The return improved to £1.34 in 2024-25.", "type": "paragraph"}, {"text": "Part of that improvement came from a review of what the department calls \"commercial leakage\". The exercise identified £17.5 million of potentially recoverable overpayments in digital procurement contracts. It did not recover £17.5 million that year. The NAO says £3.8 million recovered from the exercise contributed to the 2024-25 result.", "type": "paragraph"}, {"text": "The review itself cost £5 million, mostly to develop data-analysis technology, and that cost was not included in the counter-fraud expenditure used to calculate the £1.34 return.", "type": "paragraph"}, {"text": "The MoD says its recorded return may understate the value of work being done elsewhere in the department. The NAO agreed that commercial and financial controls can prevent losses without those savings appearing in the central counter-fraud numbers. It also found that the MoD had difficulty consistently identifying what it spent on counter-fraud work, making the return figure an incomplete measure in both directions.", "type": "paragraph"}, {"text": "The department nevertheless remains well below the government's £3 target on its own reported measure. Its 4 August response says it expects recoveries to improve significantly in 2025-26 and intends to reach the target by 2028 at the latest. A detailed plan is due to the Public Accounts Committee in November.", "type": "paragraph"}, {"text": "The NAO also found weaknesses in what happened after suspicions arose.", "type": "paragraph"}, {"text": "Fraud investigations are divided between Fraud Defence, the Ministry of Defence Police and the separate service police forces, alongside finance, commercial and other teams. Earlier reviews had found duplication, siloed working and mistrust between parts of that system. The NAO found that several case-management systems were being used and that the MoD lacked a single view of how investigations were progressing and ending.", "type": "paragraph"}, {"text": "There was also no common monetary threshold for deciding when a suspected case should be investigated, and different teams were not always clear about the criteria used elsewhere in the department. If police decided that a case did not meet the criminal threshold, the NAO found there was no consistently applied mechanism ensuring it returned to another part of the MoD for possible non-criminal action.", "type": "paragraph"}, {"text": "The government says some of this has changed. A Defence Policing Board and Defence Police Chiefs' Council were created in 2025. Fraud Defence is adopting a case-management system intended to work more easily with policing bodies, and the MoD is developing an integrated investigation model with shared triage and better information exchange. The target date for implementing the committee's recommendation is April 2027.", "type": "paragraph"}, {"text": "Pocklington told MPs that commercial staff regularly have to distinguish between what he called \"sharp commercial practice\" and conduct involving fraudulent intent. The Public Accounts Committee concluded that the department lacked clarity over when contractual disputes should be passed to police or counter-fraud investigators.", "type": "paragraph"}, {"text": "The government has accepted a recommendation for a commercial fraud playbook. It is supposed to explain the warning signs, controls, responsibilities and steps staff should take when fraud is suspected. Procurement red-flag guidance has already been added to training for new commercial staff. The full playbook is due by April 2027.", "type": "paragraph"}, {"text": "For single-source defence contracts worth more than £5 million, the department points to an existing safeguard. Regulations give it access to open-book information on pricing and costs claimed during contracts. The government says that provides both scrutiny and a deterrent against fraudulent claims.", "type": "paragraph"}, {"text": "Responsibility for counter-fraud has also been tightened. Director General Finance Aneen Blackmore has been given greater authority over the function and senior sponsors have been assigned across the main parts of Defence. A new two-star Director Assurance is to focus predominantly on fraud and error.", "type": "paragraph"}, {"text": "The department has accepted all of the Public Accounts Committee's recommendations. It is expanding analytics, reviewing procurement controls and developing a replacement finance system capable of continuously checking transactions for possible fraud, error and policy breaches. That system is expected to go live in 2028, by which point the MoD also expects to have reached the government's £3 return target.", "type": "paragraph"}, {"text": "Its more immediate problem is more basic. It has built more than 100 risk registers and rejected around £400 million of supplier costs in a single year, yet it still cannot put a reliable figure on how much fraud is actually costing it.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$mf7k3qxw9n$k$ AND body_json = $o$[{"text": "The Ministry of Defence stopped around £400 million of costs claimed by suppliers in 2024–25 because it judged them invalid.", "type": "paragraph"}, {"text": "Most were not fraud. The department says contractor error was the most common reason. Other invoices lacked valid purchase orders or exceeded contractual limits, and rejection of an invoice does not mean a supplier acted dishonestly.", "type": "paragraph"}, {"text": "But the figure sits beside a problem the MoD has yet to solve. It does not have a reliable estimate of how much money it actually loses to fraud.", "type": "paragraph"}, {"text": "Its published estimate has reached £1.5 billion a year, mostly from procurement. Permanent Secretary Jeremy Pocklington told the Public Accounts Committee in March that the number was \"essentially an academic construct\". It was derived from external benchmarks rather than fraud measured across the department's own spending.", "type": "paragraph"}, {"text": "The government's response to the committee, published on 4 August, accepts that a better estimate is needed. The MoD will publish a phased plan in a new counter-fraud strategy this autumn, but says procurement fraud will be particularly difficult to quantify.", "type": "paragraph"}, {"text": "The £1.5 billion figure should not therefore be reported as £1.5 billion of fraud known to have occurred.", "type": "paragraph"}, {"text": "The National Audit Office found that the MoD constructed its maximum estimate by applying external fraud rates to parts of its expenditure. It used a benchmark of 4.57 per cent for procurement and 1.7 per cent for payroll. Those rates came from research that was not specific to the Ministry of Defence. The estimate also did not take account of the effect of the department's existing controls.", "type": "paragraph"}, {"text": "The NAO said the real loss could be significantly higher or lower.", "type": "paragraph"}, {"text": "The MoD had historically applied its calculation to £28.5 billion of selected expenditure. The NAO reported that using roughly £40 billion of total procurement expenditure instead would produce an unmitigated maximum estimate of about £2 billion. That would still be a modelled exposure, not evidence that £2 billion had been stolen or fraudulently claimed.", "type": "paragraph"}, {"text": "The department is trying to replace that method with an assessment built more closely from its own risks and controls, though that work has some distance to go.", "type": "paragraph"}, {"text": "Fraud Defence created 130 risk registers across the MoD and combined them into a central view. By August 2025 the register contained 1,468 active risks. Forty-seven per cent were rated as having a severe or critical potential impact after mitigation, but the department had not attached financial values to them. Some severe or critical risks had not been updated for as long as five years, and the NAO found no assessment of how effectively some existing controls were working.", "type": "paragraph"}, {"text": "The government now says the register has been replaced by a new enterprise version organised around procurement, personnel controls, misuse of Defence assets and cyber and AI deception. It is working with the Public Sector Fraud Authority, NHS Counter Fraud Authority and other specialists to calculate the exposure behind those categories.", "type": "paragraph"}, {"text": "The MoD expected the exercise to take about a year, with initial assessments of less complex fraud categories by the end of 2026. Procurement, already the department's largest identified fraud-risk area, could take longer and may still require some benchmarking.", "type": "paragraph"}, {"text": "The department currently spends around £40 billion a year on procurement. How much that figure will rise is less clear.", "type": "paragraph"}, {"text": "The Public Accounts Committee says Defence procurement is expected to exceed £70 billion a year by 2028–29. But the source it cites for that claim does not say that.", "type": "paragraph"}, {"text": "Paragraph 2.6 of the National Audit Office report says total Ministry of Defence spending is planned to rise from £53.9 billion in 2023–24 to £73.5 billion in 2028–29. Elsewhere, the NAO puts current procurement spending at around £40 billion. It does not publish a projection showing procurement itself reaching £70 billion.", "type": "paragraph"}, {"text": "The distinction is substantial. A procurement budget of more than £70 billion would mean almost all of the department's projected £73.5 billion expenditure was procurement.", "type": "paragraph"}, {"text": "Open Govt also checked the Public Accounts Committee's evidence session with senior MoD officials and the department's subsequent written evidence. Permanent Secretary Jeremy Pocklington confirmed that roughly £40 billion is currently spent on procurement but did not give a £70 billion projection.", "type": "paragraph"}, {"text": "During the hearing, committee member Rupert Lowe said spending was likely to rise to £75 billion, but that figure was put to officials rather than supplied or confirmed by them.", "type": "paragraph"}, {"text": "The committee may hold other evidence for its projection, but the primary material it cites publicly does not establish it. The safer conclusion is that procurement spending is expected to increase as the defence budget rises. On the evidence published with this inquiry, the size of that increase cannot be verified.", "type": "paragraph"}, {"text": "The £400 million of supplier costs stopped in 2024–25 shows both the scale of the commercial checking already taking place and why it cannot simply be added to the department's fraud figures.", "type": "paragraph"}, {"text": "MoD officials told MPs that its Cost Assurance and Analysis Service had disallowed around £400 million of potential supplier costs. Payments can be stopped automatically when an invoice fails a three-way check against the purchase order and confirmation that goods or services were received. Invoices which cannot readily be corrected can then be formally rejected.", "type": "paragraph"}, {"text": "Those controls may prevent fraudulent payments as well as ordinary mistakes, but the department does not know how much of the £400 million falls into either category. It also does not count those wider commercial controls in the counter-fraud savings it reports to the Public Sector Fraud Authority, which is worth bearing in mind alongside another figure highlighted by MPs: the poor recorded return on the MoD's dedicated counter-fraud spending.", "type": "paragraph"}, {"text": "Between 2021–22 and 2024–25, the MoD reported average counter-fraud spending of £5.7 million a year and average prevention and recoveries of £2.8 million, split roughly equally between fraud and error. That produced a reported return of 48p for every £1 spent, compared with a government expectation of £3.", "type": "paragraph"}, {"text": "The return improved to £1.34 in 2024–25.", "type": "paragraph"}, {"text": "Part of that improvement came from a review of what the department calls \"commercial leakage\". The exercise identified £17.5 million of potentially recoverable overpayments in digital procurement contracts. It did not recover £17.5 million that year. The NAO says £3.8 million recovered from the exercise contributed to the 2024–25 result.", "type": "paragraph"}, {"text": "The review itself cost £5 million, mostly to develop data-analysis technology, and that cost was not included in the counter-fraud expenditure used to calculate the £1.34 return.", "type": "paragraph"}, {"text": "The MoD says its recorded return may understate the value of work being done elsewhere in the department. The NAO agreed that commercial and financial controls can prevent losses without those savings appearing in the central counter-fraud numbers. It also found that the MoD had difficulty consistently identifying what it spent on counter-fraud work, making the return figure an incomplete measure in both directions.", "type": "paragraph"}, {"text": "The department nevertheless remains well below the government's £3 target on its own reported measure. Its 4 August response says it expects recoveries to improve significantly in 2025–26 and intends to reach the target by 2028 at the latest. A detailed plan is due to the Public Accounts Committee in November.", "type": "paragraph"}, {"text": "The NAO also found weaknesses in what happened after suspicions arose.", "type": "paragraph"}, {"text": "Fraud investigations are divided between Fraud Defence, the Ministry of Defence Police and the separate service police forces, alongside finance, commercial and other teams. Earlier reviews had found duplication, siloed working and mistrust between parts of that system. The NAO found that several case-management systems were being used and that the MoD lacked a single view of how investigations were progressing and ending.", "type": "paragraph"}, {"text": "There was also no common monetary threshold for deciding when a suspected case should be investigated, and different teams were not always clear about the criteria used elsewhere in the department. If police decided that a case did not meet the criminal threshold, the NAO found there was no consistently applied mechanism ensuring it returned to another part of the MoD for possible non-criminal action.", "type": "paragraph"}, {"text": "The government says some of this has changed. A Defence Policing Board and Defence Police Chiefs' Council were created in 2025. Fraud Defence is adopting a case-management system intended to work more easily with policing bodies, and the MoD is developing an integrated investigation model with shared triage and better information exchange. The target date for implementing the committee's recommendation is April 2027.", "type": "paragraph"}, {"text": "Pocklington told MPs that commercial staff regularly have to distinguish between what he called \"sharp commercial practice\" and conduct involving fraudulent intent. The Public Accounts Committee concluded that the department lacked clarity over when contractual disputes should be passed to police or counter-fraud investigators.", "type": "paragraph"}, {"text": "The government has accepted a recommendation for a commercial fraud playbook. It is supposed to explain the warning signs, controls, responsibilities and steps staff should take when fraud is suspected. Procurement red-flag guidance has already been added to training for new commercial staff. The full playbook is due by April 2027.", "type": "paragraph"}, {"text": "For single-source defence contracts worth more than £5 million, the department points to an existing safeguard. Regulations give it access to open-book information on pricing and costs claimed during contracts. The government says that provides both scrutiny and a deterrent against fraudulent claims.", "type": "paragraph"}, {"text": "Responsibility for counter-fraud has also been tightened. Director General Finance Aneen Blackmore has been given greater authority over the function and senior sponsors have been assigned across the main parts of Defence. A new two-star Director Assurance is to focus predominantly on fraud and error.", "type": "paragraph"}, {"text": "The department has accepted all of the Public Accounts Committee's recommendations. It is expanding analytics, reviewing procurement controls and developing a replacement finance system capable of continuously checking transactions for possible fraud, error and policy breaches. That system is expected to go live in 2028, by which point the MoD also expects to have reached the government's £3 return target.", "type": "paragraph"}, {"text": "Its more immediate problem is more basic. It has built more than 100 risk registers and rejected around £400 million of supplier costs in a single year, yet it still cannot put a reliable figure on how much fraud is actually costing it.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$mf7k3qxw9n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$ag7k4mxq9w$k$, 'body_json', $o$[{"text": "Six people prosecuted over threats against parliamentarians should have received five-year bans from standing for elected office, according to the Speaker's Conference examining the security of politicians.", "type": "paragraph"}, {"text": "None did.", "type": "paragraph"}, {"text": "The courts gave no recorded reasons for omitting the orders. Crown Prosecution Service records do not show whether the orders were considered. Four of the six defendants received restraining orders instead.", "type": "paragraph"}, {"text": "The penalty has existed since November 2023.", "type": "paragraph"}, {"text": "Under the Elections Act 2022, an adult convicted of specified offences can be disqualified from standing for, being elected to or holding most elected offices for five years where the court is satisfied that the offence was aggravated by hostility towards a candidate, elected office-holder or campaigner.", "type": "paragraph"}, {"text": "Once those conditions are met, the court must impose the order unless particular circumstances would make it unjust. If it decides not to impose one for that reason, it must explain why in open court.", "type": "paragraph"}, {"text": "The Speaker's Conference was told by the then Solicitor General, Lucy Rigby KC, about six recent cases in which an order should have been imposed. In a follow-up letter dated 8 August 2025, Rigby said the Director of Public Prosecutions had confirmed all six defendants met the legislative requirements for a disqualification order. None was made.", "type": "paragraph"}, {"text": "The Conference said no reasons had been given by the courts and the CPS's records did not establish whether disqualification had even been considered.", "type": "paragraph"}, {"text": "One CPS regional unit subsequently reminded prosecutors about the orders after a court failed to impose one in a case involving criminal damage to an MP's office.", "type": "paragraph"}, {"text": "The problem is particularly unusual because prosecutors are not normally required to apply for the sanction.", "type": "paragraph"}, {"text": "Current CPS guidance says that where the statutory conditions are satisfied the court must make the order unless doing so would be unjust. Prosecutors are nevertheless told to be alert to qualifying cases and to help the court with the evidence required.", "type": "paragraph"}, {"text": "The Conference concluded that the six cases suggested courts might be omitting the orders more widely.", "type": "paragraph"}, {"text": "It recommended that prosecutors should specifically draw them to courts' attention and that sentencing guidance should be amended so judges and magistrates know when they apply.", "type": "paragraph"}, {"text": "By March, the government had not established how often the orders were being used.", "type": "paragraph"}, {"text": "It said it was working with HM Courts and Tribunals Service to obtain the data and would decide how to publish it once that work was complete. It would then consider whether further guidance was needed for prosecutors, judges and magistrates.", "type": "paragraph"}, {"text": "The missing election bans sit inside a wider problem identified by the Speaker's Conference.", "type": "paragraph"}, {"text": "Britain has become considerably better at recording crimes reported against MPs than at showing what happens to those cases across the criminal justice system.", "type": "paragraph"}, {"text": "Later Freedom of Information disclosures from the National Police Chiefs' Council record 984 alleged crimes involving MPs in 2025, up from 905 in 2024, with a further 258 recorded between 1 January and 30 April 2026.", "type": "paragraph"}, {"text": "More than half of the 2025 total, 527, were recorded as malicious communications. There were 150 harassment offences and 53 reports classified as threats to kill. The figures cover alleged offences across all recorded classifications, not only threats, and are drawn from the Mercury and ECINS systems used by the Parliamentary Liaison and Investigation Team.", "type": "paragraph"}, {"text": "Those numbers describe reports to police. They do not show how many resulted in charges, convictions or particular sentences.", "type": "paragraph"}, {"text": "There is evidence that cases dealt with through Operation Bridger, the national policing system for protecting MPs away from Parliament, can produce better results than ordinary cases.", "type": "paragraph"}, {"text": "The Metropolitan Police told the Conference, in written evidence submitted separately from the Speaker's Conference's own report, that investment in Bridger had produced \"better conviction rates in comparison with the general population\".", "type": "paragraph"}, {"text": "For 2023–24 it also reported a higher rate of charge or summons outcomes, more cautions and other resolutions for malicious communications and harassment, fewer cases ending because of evidential difficulties and fewer in which the victim stopped supporting the investigation.", "type": "paragraph"}, {"text": "The Met did not publish the comparative conviction percentages in that evidence.", "type": "paragraph"}, {"text": "Its submission also acknowledged that the response to threats remained inconsistent across Britain's police forces. Different officers and forces could apply different thresholds when deciding whether conduct should be recorded as a crime or how it should be dealt with.", "type": "paragraph"}, {"text": "The Speaker's Conference reached the same conclusion.", "type": "paragraph"}, {"text": "It found significant inconsistency both between forces and within them. These offences are serious but relatively uncommon for individual officers, meaning someone investigating a threat against an MP may have little previous experience of a politically motivated case.", "type": "paragraph"}, {"text": "The problem continues when cases reach prosecutors.", "type": "paragraph"}, {"text": "Most criminal cases involving MPs are handled by the CPS's 14 regional teams. Chief Crown Prosecutors have to approve cases involving MPs personally, and reports are sent each month to senior CPS management. Particularly complex cases can be moved to central specialist lawyers.", "type": "paragraph"}, {"text": "The CPS told the Conference that this senior oversight was sufficient to produce consistent decisions.", "type": "paragraph"}, {"text": "The Conference could not establish whether that was true.", "type": "paragraph"}, {"text": "Although cases involving MPs are reported internally each month, the CPS does not collect structured data based on the victim's profession. It therefore cannot produce a national dataset showing all offences targeting politicians and what happened to them.", "type": "paragraph"}, {"text": "Justice minister Sarah Sackman KC accepted the problem during the inquiry.", "type": "paragraph"}, {"text": "She said the system needed to be able to track conviction rates, sentences and other outcomes.", "type": "paragraph"}, {"text": "The Conference recommended building what it called \"full picture\" data, following cases targeting elected officials from referral to the CPS through charging and sentencing, including the use of protective orders.", "type": "paragraph"}, {"text": "It also challenged the CPS's reliance on senior oversight.", "type": "paragraph"}, {"text": "\"Consistent decision making is a function of expertise, not seniority,\" the report concluded.", "type": "paragraph"}, {"text": "It recommended a small specialist prosecution team dealing regularly with anti-democratic crimes and electoral law rather than leaving most cases to regional prosecutors who may encounter them rarely.", "type": "paragraph"}, {"text": "The government only partly accepted the recommendation on national data.", "type": "paragraph"}, {"text": "Its response in March said CPS management information existed for cases referred for charging decisions, but was compiled manually and depended upon individual prosecutors telling the central team that the victim was an elected official.", "type": "paragraph"}, {"text": "The government said that made the data insufficiently reliable for assessing the problem nationally and promised to consider other ways of building the dataset.", "type": "paragraph"}, {"text": "There has been more movement on the police side.", "type": "paragraph"}, {"text": "In March, Deputy Chief Constable Chris Balmer of Cambridgeshire Police was appointed as the National Police Chiefs' Council lead for defending democracy.", "type": "paragraph"}, {"text": "Every force now has a superintendent responsible for Operation Bridger. A further network of 66 Home Office-funded advisers operates through Operation Ford, which covers locally elected representatives as well as MPs.", "type": "paragraph"}, {"text": "A national Threat Assessment Centre has also been established to bring together intelligence about threats against local politicians.", "type": "paragraph"}, {"text": "Those changes may improve the police response without solving the problem further along the justice system.", "type": "paragraph"}, {"text": "In June, the Home Office was asked how many Operation Ford cases had resulted in investigations, arrests and charges.", "type": "paragraph"}, {"text": "It said it did not hold that information.", "type": "paragraph"}, {"text": "A second parliamentary answer that month asked how many offences the national operation had handled during the 2026 local elections.", "type": "paragraph"}, {"text": "Again, the Home Office said it did not collect the figure.", "type": "paragraph"}, {"text": "The difference between the two parts of the system is now unusually clear.", "type": "paragraph"}, {"text": "Police data can show that 984 alleged crimes involving MPs were recorded in 2025. It can show that 53 were classified as threats to kill and 527 as malicious communications.", "type": "paragraph"}, {"text": "The Met can say that Operation Bridger cases produce better charging and conviction outcomes than ordinary cases.", "type": "paragraph"}, {"text": "What the government still cannot publish is a national series showing how many of those cases were referred to prosecutors, how many were charged, how many ended in conviction, what sentences were imposed and whether the special sanctions Parliament created for political intimidation were used.", "type": "paragraph"}, {"text": "The six missing disqualification orders are one result of that gap.", "type": "paragraph"}, {"text": "The law required courts to impose the five-year sanction in qualifying cases unless doing so would be unjust, in which case reasons should have been given.", "type": "paragraph"}, {"text": "The Speaker's Conference was told of six cases where an order should have been imposed.", "type": "paragraph"}, {"text": "As of the government's March response, it was still trying to obtain the data needed to establish how often courts were using them.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "Six people prosecuted over threats against parliamentarians should have received five-year bans from standing for elected office, according to the Speaker's Conference examining the security of politicians.", "type": "paragraph"}, {"text": "None did.", "type": "paragraph"}, {"text": "The courts gave no recorded reasons for omitting the orders. Crown Prosecution Service records do not show whether the orders were considered. Four of the six defendants received restraining orders instead.", "type": "paragraph"}, {"text": "The penalty has existed since November 2023.", "type": "paragraph"}, {"text": "Under the Elections Act 2022, an adult convicted of specified offences can be disqualified from standing for, being elected to or holding most elected offices for five years where the court is satisfied that the offence was aggravated by hostility towards a candidate, elected office-holder or campaigner.", "type": "paragraph"}, {"text": "Once those conditions are met, the court must impose the order unless particular circumstances would make it unjust. If it decides not to impose one for that reason, it must explain why in open court.", "type": "paragraph"}, {"text": "The Speaker's Conference was told by the then Solicitor General, Lucy Rigby KC, about six recent cases in which an order should have been imposed. In a follow-up letter dated 8 August 2025, Rigby said the Director of Public Prosecutions had confirmed all six defendants met the legislative requirements for a disqualification order. None was made.", "type": "paragraph"}, {"text": "The Conference said no reasons had been given by the courts and the CPS's records did not establish whether disqualification had even been considered.", "type": "paragraph"}, {"text": "One CPS regional unit subsequently reminded prosecutors about the orders after a court failed to impose one in a case involving criminal damage to an MP's office.", "type": "paragraph"}, {"text": "The problem is particularly unusual because prosecutors are not normally required to apply for the sanction.", "type": "paragraph"}, {"text": "Current CPS guidance says that where the statutory conditions are satisfied the court must make the order unless doing so would be unjust. Prosecutors are nevertheless told to be alert to qualifying cases and to help the court with the evidence required.", "type": "paragraph"}, {"text": "The Conference concluded that the six cases suggested courts might be omitting the orders more widely.", "type": "paragraph"}, {"text": "It recommended that prosecutors should specifically draw them to courts' attention and that sentencing guidance should be amended so judges and magistrates know when they apply.", "type": "paragraph"}, {"text": "By March, the government had not established how often the orders were being used.", "type": "paragraph"}, {"text": "It said it was working with HM Courts and Tribunals Service to obtain the data and would decide how to publish it once that work was complete. It would then consider whether further guidance was needed for prosecutors, judges and magistrates.", "type": "paragraph"}, {"text": "The missing election bans sit inside a wider problem identified by the Speaker's Conference.", "type": "paragraph"}, {"text": "Britain has become considerably better at recording crimes reported against MPs than at showing what happens to those cases across the criminal justice system.", "type": "paragraph"}, {"text": "Later Freedom of Information disclosures from the National Police Chiefs' Council record 984 alleged crimes involving MPs in 2025, up from 905 in 2024, with a further 258 recorded between 1 January and 30 April 2026.", "type": "paragraph"}, {"text": "More than half of the 2025 total, 527, were recorded as malicious communications. There were 150 harassment offences and 53 reports classified as threats to kill. The figures cover alleged offences across all recorded classifications, not only threats, and are drawn from the Mercury and ECINS systems used by the Parliamentary Liaison and Investigation Team.", "type": "paragraph"}, {"text": "Those numbers describe reports to police. They do not show how many resulted in charges, convictions or particular sentences.", "type": "paragraph"}, {"text": "There is evidence that cases dealt with through Operation Bridger, the national policing system for protecting MPs away from Parliament, can produce better results than ordinary cases.", "type": "paragraph"}, {"text": "The Metropolitan Police told the Conference, in written evidence submitted separately from the Speaker's Conference's own report, that investment in Bridger had produced \"better conviction rates in comparison with the general population\".", "type": "paragraph"}, {"text": "For 2023-24 it also reported a higher rate of charge or summons outcomes, more cautions and other resolutions for malicious communications and harassment, fewer cases ending because of evidential difficulties and fewer in which the victim stopped supporting the investigation.", "type": "paragraph"}, {"text": "The Met did not publish the comparative conviction percentages in that evidence.", "type": "paragraph"}, {"text": "Its submission also acknowledged that the response to threats remained inconsistent across Britain's police forces. Different officers and forces could apply different thresholds when deciding whether conduct should be recorded as a crime or how it should be dealt with.", "type": "paragraph"}, {"text": "The Speaker's Conference reached the same conclusion.", "type": "paragraph"}, {"text": "It found significant inconsistency both between forces and within them. These offences are serious but relatively uncommon for individual officers, meaning someone investigating a threat against an MP may have little previous experience of a politically motivated case.", "type": "paragraph"}, {"text": "The problem continues when cases reach prosecutors.", "type": "paragraph"}, {"text": "Most criminal cases involving MPs are handled by the CPS's 14 regional teams. Chief Crown Prosecutors have to approve cases involving MPs personally, and reports are sent each month to senior CPS management. Particularly complex cases can be moved to central specialist lawyers.", "type": "paragraph"}, {"text": "The CPS told the Conference that this senior oversight was sufficient to produce consistent decisions.", "type": "paragraph"}, {"text": "The Conference could not establish whether that was true.", "type": "paragraph"}, {"text": "Although cases involving MPs are reported internally each month, the CPS does not collect structured data based on the victim's profession. It therefore cannot produce a national dataset showing all offences targeting politicians and what happened to them.", "type": "paragraph"}, {"text": "Justice minister Sarah Sackman KC accepted the problem during the inquiry.", "type": "paragraph"}, {"text": "She said the system needed to be able to track conviction rates, sentences and other outcomes.", "type": "paragraph"}, {"text": "The Conference recommended building what it called \"full picture\" data, following cases targeting elected officials from referral to the CPS through charging and sentencing, including the use of protective orders.", "type": "paragraph"}, {"text": "It also challenged the CPS's reliance on senior oversight.", "type": "paragraph"}, {"text": "\"Consistent decision making is a function of expertise, not seniority,\" the report concluded.", "type": "paragraph"}, {"text": "It recommended a small specialist prosecution team dealing regularly with anti-democratic crimes and electoral law rather than leaving most cases to regional prosecutors who may encounter them rarely.", "type": "paragraph"}, {"text": "The government only partly accepted the recommendation on national data.", "type": "paragraph"}, {"text": "Its response in March said CPS management information existed for cases referred for charging decisions, but was compiled manually and depended upon individual prosecutors telling the central team that the victim was an elected official.", "type": "paragraph"}, {"text": "The government said that made the data insufficiently reliable for assessing the problem nationally and promised to consider other ways of building the dataset.", "type": "paragraph"}, {"text": "There has been more movement on the police side.", "type": "paragraph"}, {"text": "In March, Deputy Chief Constable Chris Balmer of Cambridgeshire Police was appointed as the National Police Chiefs' Council lead for defending democracy.", "type": "paragraph"}, {"text": "Every force now has a superintendent responsible for Operation Bridger. A further network of 66 Home Office-funded advisers operates through Operation Ford, which covers locally elected representatives as well as MPs.", "type": "paragraph"}, {"text": "A national Threat Assessment Centre has also been established to bring together intelligence about threats against local politicians.", "type": "paragraph"}, {"text": "Those changes may improve the police response without solving the problem further along the justice system.", "type": "paragraph"}, {"text": "In June, the Home Office was asked how many Operation Ford cases had resulted in investigations, arrests and charges.", "type": "paragraph"}, {"text": "It said it did not hold that information.", "type": "paragraph"}, {"text": "A second parliamentary answer that month asked how many offences the national operation had handled during the 2026 local elections.", "type": "paragraph"}, {"text": "Again, the Home Office said it did not collect the figure.", "type": "paragraph"}, {"text": "The difference between the two parts of the system is now unusually clear.", "type": "paragraph"}, {"text": "Police data can show that 984 alleged crimes involving MPs were recorded in 2025. It can show that 53 were classified as threats to kill and 527 as malicious communications.", "type": "paragraph"}, {"text": "The Met can say that Operation Bridger cases produce better charging and conviction outcomes than ordinary cases.", "type": "paragraph"}, {"text": "What the government still cannot publish is a national series showing how many of those cases were referred to prosecutors, how many were charged, how many ended in conviction, what sentences were imposed and whether the special sanctions Parliament created for political intimidation were used.", "type": "paragraph"}, {"text": "The six missing disqualification orders are one result of that gap.", "type": "paragraph"}, {"text": "The law required courts to impose the five-year sanction in qualifying cases unless doing so would be unjust, in which case reasons should have been given.", "type": "paragraph"}, {"text": "The Speaker's Conference was told of six cases where an order should have been imposed.", "type": "paragraph"}, {"text": "As of the government's March response, it was still trying to obtain the data needed to establish how often courts were using them.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$ag7k4mxq9w$k$ AND body_json = $o$[{"text": "Six people prosecuted over threats against parliamentarians should have received five-year bans from standing for elected office, according to the Speaker's Conference examining the security of politicians.", "type": "paragraph"}, {"text": "None did.", "type": "paragraph"}, {"text": "The courts gave no recorded reasons for omitting the orders. Crown Prosecution Service records do not show whether the orders were considered. Four of the six defendants received restraining orders instead.", "type": "paragraph"}, {"text": "The penalty has existed since November 2023.", "type": "paragraph"}, {"text": "Under the Elections Act 2022, an adult convicted of specified offences can be disqualified from standing for, being elected to or holding most elected offices for five years where the court is satisfied that the offence was aggravated by hostility towards a candidate, elected office-holder or campaigner.", "type": "paragraph"}, {"text": "Once those conditions are met, the court must impose the order unless particular circumstances would make it unjust. If it decides not to impose one for that reason, it must explain why in open court.", "type": "paragraph"}, {"text": "The Speaker's Conference was told by the then Solicitor General, Lucy Rigby KC, about six recent cases in which an order should have been imposed. In a follow-up letter dated 8 August 2025, Rigby said the Director of Public Prosecutions had confirmed all six defendants met the legislative requirements for a disqualification order. None was made.", "type": "paragraph"}, {"text": "The Conference said no reasons had been given by the courts and the CPS's records did not establish whether disqualification had even been considered.", "type": "paragraph"}, {"text": "One CPS regional unit subsequently reminded prosecutors about the orders after a court failed to impose one in a case involving criminal damage to an MP's office.", "type": "paragraph"}, {"text": "The problem is particularly unusual because prosecutors are not normally required to apply for the sanction.", "type": "paragraph"}, {"text": "Current CPS guidance says that where the statutory conditions are satisfied the court must make the order unless doing so would be unjust. Prosecutors are nevertheless told to be alert to qualifying cases and to help the court with the evidence required.", "type": "paragraph"}, {"text": "The Conference concluded that the six cases suggested courts might be omitting the orders more widely.", "type": "paragraph"}, {"text": "It recommended that prosecutors should specifically draw them to courts' attention and that sentencing guidance should be amended so judges and magistrates know when they apply.", "type": "paragraph"}, {"text": "By March, the government had not established how often the orders were being used.", "type": "paragraph"}, {"text": "It said it was working with HM Courts and Tribunals Service to obtain the data and would decide how to publish it once that work was complete. It would then consider whether further guidance was needed for prosecutors, judges and magistrates.", "type": "paragraph"}, {"text": "The missing election bans sit inside a wider problem identified by the Speaker's Conference.", "type": "paragraph"}, {"text": "Britain has become considerably better at recording crimes reported against MPs than at showing what happens to those cases across the criminal justice system.", "type": "paragraph"}, {"text": "Later Freedom of Information disclosures from the National Police Chiefs' Council record 984 alleged crimes involving MPs in 2025, up from 905 in 2024, with a further 258 recorded between 1 January and 30 April 2026.", "type": "paragraph"}, {"text": "More than half of the 2025 total, 527, were recorded as malicious communications. There were 150 harassment offences and 53 reports classified as threats to kill. The figures cover alleged offences across all recorded classifications, not only threats, and are drawn from the Mercury and ECINS systems used by the Parliamentary Liaison and Investigation Team.", "type": "paragraph"}, {"text": "Those numbers describe reports to police. They do not show how many resulted in charges, convictions or particular sentences.", "type": "paragraph"}, {"text": "There is evidence that cases dealt with through Operation Bridger, the national policing system for protecting MPs away from Parliament, can produce better results than ordinary cases.", "type": "paragraph"}, {"text": "The Metropolitan Police told the Conference, in written evidence submitted separately from the Speaker's Conference's own report, that investment in Bridger had produced \"better conviction rates in comparison with the general population\".", "type": "paragraph"}, {"text": "For 2023–24 it also reported a higher rate of charge or summons outcomes, more cautions and other resolutions for malicious communications and harassment, fewer cases ending because of evidential difficulties and fewer in which the victim stopped supporting the investigation.", "type": "paragraph"}, {"text": "The Met did not publish the comparative conviction percentages in that evidence.", "type": "paragraph"}, {"text": "Its submission also acknowledged that the response to threats remained inconsistent across Britain's police forces. Different officers and forces could apply different thresholds when deciding whether conduct should be recorded as a crime or how it should be dealt with.", "type": "paragraph"}, {"text": "The Speaker's Conference reached the same conclusion.", "type": "paragraph"}, {"text": "It found significant inconsistency both between forces and within them. These offences are serious but relatively uncommon for individual officers, meaning someone investigating a threat against an MP may have little previous experience of a politically motivated case.", "type": "paragraph"}, {"text": "The problem continues when cases reach prosecutors.", "type": "paragraph"}, {"text": "Most criminal cases involving MPs are handled by the CPS's 14 regional teams. Chief Crown Prosecutors have to approve cases involving MPs personally, and reports are sent each month to senior CPS management. Particularly complex cases can be moved to central specialist lawyers.", "type": "paragraph"}, {"text": "The CPS told the Conference that this senior oversight was sufficient to produce consistent decisions.", "type": "paragraph"}, {"text": "The Conference could not establish whether that was true.", "type": "paragraph"}, {"text": "Although cases involving MPs are reported internally each month, the CPS does not collect structured data based on the victim's profession. It therefore cannot produce a national dataset showing all offences targeting politicians and what happened to them.", "type": "paragraph"}, {"text": "Justice minister Sarah Sackman KC accepted the problem during the inquiry.", "type": "paragraph"}, {"text": "She said the system needed to be able to track conviction rates, sentences and other outcomes.", "type": "paragraph"}, {"text": "The Conference recommended building what it called \"full picture\" data, following cases targeting elected officials from referral to the CPS through charging and sentencing, including the use of protective orders.", "type": "paragraph"}, {"text": "It also challenged the CPS's reliance on senior oversight.", "type": "paragraph"}, {"text": "\"Consistent decision making is a function of expertise, not seniority,\" the report concluded.", "type": "paragraph"}, {"text": "It recommended a small specialist prosecution team dealing regularly with anti-democratic crimes and electoral law rather than leaving most cases to regional prosecutors who may encounter them rarely.", "type": "paragraph"}, {"text": "The government only partly accepted the recommendation on national data.", "type": "paragraph"}, {"text": "Its response in March said CPS management information existed for cases referred for charging decisions, but was compiled manually and depended upon individual prosecutors telling the central team that the victim was an elected official.", "type": "paragraph"}, {"text": "The government said that made the data insufficiently reliable for assessing the problem nationally and promised to consider other ways of building the dataset.", "type": "paragraph"}, {"text": "There has been more movement on the police side.", "type": "paragraph"}, {"text": "In March, Deputy Chief Constable Chris Balmer of Cambridgeshire Police was appointed as the National Police Chiefs' Council lead for defending democracy.", "type": "paragraph"}, {"text": "Every force now has a superintendent responsible for Operation Bridger. A further network of 66 Home Office-funded advisers operates through Operation Ford, which covers locally elected representatives as well as MPs.", "type": "paragraph"}, {"text": "A national Threat Assessment Centre has also been established to bring together intelligence about threats against local politicians.", "type": "paragraph"}, {"text": "Those changes may improve the police response without solving the problem further along the justice system.", "type": "paragraph"}, {"text": "In June, the Home Office was asked how many Operation Ford cases had resulted in investigations, arrests and charges.", "type": "paragraph"}, {"text": "It said it did not hold that information.", "type": "paragraph"}, {"text": "A second parliamentary answer that month asked how many offences the national operation had handled during the 2026 local elections.", "type": "paragraph"}, {"text": "Again, the Home Office said it did not collect the figure.", "type": "paragraph"}, {"text": "The difference between the two parts of the system is now unusually clear.", "type": "paragraph"}, {"text": "Police data can show that 984 alleged crimes involving MPs were recorded in 2025. It can show that 53 were classified as threats to kill and 527 as malicious communications.", "type": "paragraph"}, {"text": "The Met can say that Operation Bridger cases produce better charging and conviction outcomes than ordinary cases.", "type": "paragraph"}, {"text": "What the government still cannot publish is a national series showing how many of those cases were referred to prosecutors, how many were charged, how many ended in conviction, what sentences were imposed and whether the special sanctions Parliament created for political intimidation were used.", "type": "paragraph"}, {"text": "The six missing disqualification orders are one result of that gap.", "type": "paragraph"}, {"text": "The law required courts to impose the five-year sanction in qualifying cases unless doing so would be unjust, in which case reasons should have been given.", "type": "paragraph"}, {"text": "The Speaker's Conference was told of six cases where an order should have been imposed.", "type": "paragraph"}, {"text": "As of the government's March response, it was still trying to obtain the data needed to establish how often courts were using them.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$ag7k4mxq9w$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$pn8k4qxw2r$k$, 'body_json', $o$[{"text": "Around 5,000 prisoners are expected to have their release dates brought forward under revised sentencing rules beginning in October, after the government excluded rape, serious child-sex and grooming offences from the changes.", "type": "paragraph"}, {"text": "Justice Secretary Alex Norris said the 5,000 would be released in stages over ten months. The figure is not the total number of prisoners who will leave custody during that period. Thousands are released in the normal course of their sentences each month. It refers to prisoners whose time in custody will be reduced under the new progression model.", "type": "paragraph"}, {"text": "The government says it cannot make substantially wider exclusions without risking the prison system reaching capacity. Adult male prisons are currently operating at about 98 per cent of their available capacity, according to the Ministry of Justice.", "type": "paragraph"}, {"text": "There is detailed government modelling behind the wider sentencing reforms. What has not been published alongside today's decision is an updated version showing the effect of the new exclusions.", "type": "paragraph"}, {"text": "The Ministry of Justice's latest annual capacity statement was published in January, before the government decided to remove further categories of offenders from the progression model.", "type": "paragraph"}, {"text": "That assessment projected 89,300 usable places across the adult prison estate in November 2026. After allowing for the Sentencing Act reforms, it estimated demand at 87,900 under its central scenario and 88,900 under its high-demand scenario.", "type": "paragraph"}, {"text": "The high scenario therefore left a modelled margin of about 400 places.", "type": "paragraph"}, {"text": "Without the Sentencing Act measures, the same model put November demand at 91,800 under the central scenario and 92,900 under the high scenario, both above projected supply. The department estimated that the whole package of sentencing reforms would reduce the prison population by about 7,500 by February 2028.", "type": "paragraph"}, {"text": "Those figures provide a clear explanation for why ministers regard sentencing reform as necessary. They do not show how much capacity remains after today's changes.", "type": "paragraph"}, {"text": "The January model incorporated the Sentencing Act package as it then stood. The government has now removed rape, serious child-sex and grooming offences from the new release arrangements and delayed their introduction from September until October.", "type": "paragraph"}, {"text": "No revised supply-and-demand table or published calculation accompanied the announcement showing how many prison places those decisions consume, or how many further offenders could be excluded before projected demand exceeds available capacity.", "type": "paragraph"}, {"text": "The 5,000 figure cannot simply be deducted from the January capacity numbers to calculate that margin. It describes people expected to have release dates brought forward over ten months, while the capacity model measures the prison population at particular points in time. The policies within the Sentencing Act also interact with one another, something the government's own impact assessment warns against treating as a collection of figures that can simply be added or subtracted.", "type": "paragraph"}, {"text": "The published evidence backs the government's broader claim that prisons have little spare capacity, without quantifying the narrower claim that today's exclusions mark the exact limit of what the system can accommodate.", "type": "paragraph"}, {"text": "The progression model changes the amount of a determinate sentence normally served in prison, rather than cancelling the remainder of the sentence.", "type": "paragraph"}, {"text": "For standard determinate sentences currently carrying release after 40 or 50 per cent, the earliest release point will generally become one third. For a group currently released after two thirds, the new minimum will generally be one half. Prisoners released remain on licence in the community and can be recalled. Additional days can also be imposed for serious breaches of prison rules, delaying release.", "type": "paragraph"}, {"text": "More than 18,000 prisoners serving life sentences, extended determinate sentences and other more serious sentence types were already outside the progression model. Today's decision adds rape, specified child-sex offences and grooming offences to the exclusions.", "type": "paragraph"}, {"text": "Manslaughter was not excluded on 4 August.", "type": "paragraph"}, {"text": "That left Albert Bowers and Jessie Cole, convicted of the manslaughter of PC Andrew Harper, within the group potentially affected by the changes. Both received 13-year sentences after PC Harper was killed while responding to a quad-bike theft in Berkshire in 2019. Henry Long, who received a longer extended sentence, was not affected in the same way.", "type": "paragraph"}, {"text": "Norris apologised to PC Harper's family and said the government had wanted to include manslaughter among the exclusions but could not widen them further without adding to the capacity problem.", "type": "paragraph"}, {"text": "The latest prison population statistics show why the capacity argument needs some care.", "type": "paragraph"}, {"text": "There were 85,858 prisoners in England and Wales on 30 June, not the 87,342 recorded at the end of March. The total was about 1,500 lower than a year earlier.", "type": "paragraph"}, {"text": "The fall was not evidence that the underlying capacity problem had disappeared.", "type": "paragraph"}, {"text": "At the end of March, changes to fixed-term recall led to releases of prisoners who had spent more than 56 days back in custody following recall. The Ministry of Justice says that probably contributed to a fall of about 1,600 prisoners between March and April. The population then remained between roughly 85,700 and 86,000 through April, May and June.", "type": "paragraph"}, {"text": "The government's statement that adult male prisons are 98 per cent full is also not directly comparable with the total prison population figure. One measures occupancy against usable places in the adult male estate. The other counts prisoners across the system. Both can therefore be true at the same time.", "type": "paragraph"}, {"text": "The position on remand has improved.", "type": "paragraph"}, {"text": "There were 15,386 prisoners on remand at the end of June, down from 16,025 at the end of March and 13 per cent below June 2025. The Ministry of Justice says the fall is likely to be partly associated with increased magistrates' sentencing powers, additional Crown Court sitting days and extra court funding.", "type": "paragraph"}, {"text": "The earlier rise in remand prisoners had been one contributor to pressure on the estate, so its reversal eases one part of the problem without resolving the rest. The sentenced population stood at 70,003 in June, 1 per cent higher than a year earlier, with increases concentrated among several longer sentence bands.", "type": "paragraph"}, {"text": "The shortage of places was already well established before the present government took office.", "type": "paragraph"}, {"text": "The previous government expanded its prison-building commitment to 20,000 additional places, originally intended for delivery by the middle of the decade. By September 2024, 6,518 had been delivered. The National Audit Office found that 278 of those places came from allowing additional crowding at four privately run prisons rather than from new accommodation.", "type": "paragraph"}, {"text": "The current commitment to deliver 14,000 places by 2031 is largely the unfinished part of that programme, not a separate 14,000 places on top of the original 20,000.", "type": "paragraph"}, {"text": "HMPPS describes it as the \"remaining 14,000 of the 20,000 prison places\". By March 2025, about 6,500 of the original total had been delivered. The January 2026 capacity statement subsequently said around 2,900 additional places had been delivered since July 2024 and around 5,000 more were under construction by the end of 2025.", "type": "paragraph"}, {"text": "The National Audit Office concluded in 2024 that the expansion programme had been unrealistic and insufficiently prioritised and that delays had worsened the capacity crisis. It also pointed to policy choices which increased demand for places, including longer sentences and increased police numbers, while maintenance problems reduced the estate's ability to absorb that demand.", "type": "paragraph"}, {"text": "The Ministry of Justice's January 2026 assessment is considerably less pessimistic than projections made before the Sentencing Act was included.", "type": "paragraph"}, {"text": "Its central case now says prison supply can keep pace with demand if the sentencing reforms work broadly as modelled and new capacity arrives on schedule. But the department expressly warns that the projections are uncertain. Police and prosecutorial activity, court capacity, sentencing decisions, offender behaviour and delays to prison construction can all change the result.", "type": "paragraph"}, {"text": "Its November 2026 high-demand scenario is particularly tight: 88,900 prisoners against 89,300 projected places.", "type": "paragraph"}, {"text": "The supply figure already contains an operating margin intended to recognise that a nominally empty cell is not necessarily usable for whichever prisoner needs it. Women's prisons, high-security prisons and establishments holding particular categories of offender are not interchangeable. The forecast also does not attempt to predict major shocks such as temporary cell losses following disorder.", "type": "paragraph"}, {"text": "Moving prisoners out of custody sooner also transfers work elsewhere.", "type": "paragraph"}, {"text": "The progression model places people on licence for the remainder of the relevant part of their sentence. The government has announced up to £700 million of additional funding for probation and community services by 2028–29 and plans to recruit more probation officers and expand electronic monitoring.", "type": "paragraph"}, {"text": "The same January capacity statement recorded 5,559 full-time-equivalent probation officers against a target of 7,114 in September 2025, a staffing level of 78 per cent. The Ministry of Justice estimated a wider sentence-management staffing gap of 3,150 full-time-equivalent posts for 2026–27 and said a deficit was likely to remain even as recruitment increased.", "type": "paragraph"}, {"text": "The choice facing ministers is therefore not simply between keeping prisoners inside and releasing them. The prison-building programme is still catching up with a target first set years ago. The Sentencing Act is being used to reduce projected demand at the same time. The government's own January model says removing the Act's effects altogether would push demand above supply this year.", "type": "paragraph"}, {"text": "Today's announcement changes part of the package on which that forecast was based.", "type": "paragraph"}, {"text": "The government says it has now reached the point beyond which further exclusions would risk the prison system reaching capacity. Its published capacity statement shows why that is plausible under the high-demand scenario, even though the statement predates today's exclusions and so cannot say where that point now lies.", "type": "paragraph"}, {"text": "The latest public model gives the adult estate 400 places of headroom under the high-demand scenario in November. The government has since changed which prisoners will be released and when, but did not publish revised capacity figures with the 4 August decision.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "Around 5,000 prisoners are expected to have their release dates brought forward under revised sentencing rules beginning in October, after the government excluded rape, serious child-sex and grooming offences from the changes.", "type": "paragraph"}, {"text": "Justice Secretary Alex Norris said the 5,000 would be released in stages over ten months. The figure is not the total number of prisoners who will leave custody during that period. Thousands are released in the normal course of their sentences each month. It refers to prisoners whose time in custody will be reduced under the new progression model.", "type": "paragraph"}, {"text": "The government says it cannot make substantially wider exclusions without risking the prison system reaching capacity. Adult male prisons are currently operating at about 98 per cent of their available capacity, according to the Ministry of Justice.", "type": "paragraph"}, {"text": "There is detailed government modelling behind the wider sentencing reforms. What has not been published alongside today's decision is an updated version showing the effect of the new exclusions.", "type": "paragraph"}, {"text": "The Ministry of Justice's latest annual capacity statement was published in January, before the government decided to remove further categories of offenders from the progression model.", "type": "paragraph"}, {"text": "That assessment projected 89,300 usable places across the adult prison estate in November 2026. After allowing for the Sentencing Act reforms, it estimated demand at 87,900 under its central scenario and 88,900 under its high-demand scenario.", "type": "paragraph"}, {"text": "The high scenario therefore left a modelled margin of about 400 places.", "type": "paragraph"}, {"text": "Without the Sentencing Act measures, the same model put November demand at 91,800 under the central scenario and 92,900 under the high scenario, both above projected supply. The department estimated that the whole package of sentencing reforms would reduce the prison population by about 7,500 by February 2028.", "type": "paragraph"}, {"text": "Those figures provide a clear explanation for why ministers regard sentencing reform as necessary. They do not show how much capacity remains after today's changes.", "type": "paragraph"}, {"text": "The January model incorporated the Sentencing Act package as it then stood. The government has now removed rape, serious child-sex and grooming offences from the new release arrangements and delayed their introduction from September until October.", "type": "paragraph"}, {"text": "No revised supply-and-demand table or published calculation accompanied the announcement showing how many prison places those decisions consume, or how many further offenders could be excluded before projected demand exceeds available capacity.", "type": "paragraph"}, {"text": "The 5,000 figure cannot simply be deducted from the January capacity numbers to calculate that margin. It describes people expected to have release dates brought forward over ten months, while the capacity model measures the prison population at particular points in time. The policies within the Sentencing Act also interact with one another, something the government's own impact assessment warns against treating as a collection of figures that can simply be added or subtracted.", "type": "paragraph"}, {"text": "The published evidence backs the government's broader claim that prisons have little spare capacity, without quantifying the narrower claim that today's exclusions mark the exact limit of what the system can accommodate.", "type": "paragraph"}, {"text": "The progression model changes the amount of a determinate sentence normally served in prison, rather than cancelling the remainder of the sentence.", "type": "paragraph"}, {"text": "For standard determinate sentences currently carrying release after 40 or 50 per cent, the earliest release point will generally become one third. For a group currently released after two thirds, the new minimum will generally be one half. Prisoners released remain on licence in the community and can be recalled. Additional days can also be imposed for serious breaches of prison rules, delaying release.", "type": "paragraph"}, {"text": "More than 18,000 prisoners serving life sentences, extended determinate sentences and other more serious sentence types were already outside the progression model. Today's decision adds rape, specified child-sex offences and grooming offences to the exclusions.", "type": "paragraph"}, {"text": "Manslaughter was not excluded on 4 August.", "type": "paragraph"}, {"text": "That left Albert Bowers and Jessie Cole, convicted of the manslaughter of PC Andrew Harper, within the group potentially affected by the changes. Both received 13-year sentences after PC Harper was killed while responding to a quad-bike theft in Berkshire in 2019. Henry Long, who received a longer extended sentence, was not affected in the same way.", "type": "paragraph"}, {"text": "Norris apologised to PC Harper's family and said the government had wanted to include manslaughter among the exclusions but could not widen them further without adding to the capacity problem.", "type": "paragraph"}, {"text": "The latest prison population statistics show why the capacity argument needs some care.", "type": "paragraph"}, {"text": "There were 85,858 prisoners in England and Wales on 30 June, not the 87,342 recorded at the end of March. The total was about 1,500 lower than a year earlier.", "type": "paragraph"}, {"text": "The fall was not evidence that the underlying capacity problem had disappeared.", "type": "paragraph"}, {"text": "At the end of March, changes to fixed-term recall led to releases of prisoners who had spent more than 56 days back in custody following recall. The Ministry of Justice says that probably contributed to a fall of about 1,600 prisoners between March and April. The population then remained between roughly 85,700 and 86,000 through April, May and June.", "type": "paragraph"}, {"text": "The government's statement that adult male prisons are 98 per cent full is also not directly comparable with the total prison population figure. One measures occupancy against usable places in the adult male estate. The other counts prisoners across the system. Both can therefore be true at the same time.", "type": "paragraph"}, {"text": "The position on remand has improved.", "type": "paragraph"}, {"text": "There were 15,386 prisoners on remand at the end of June, down from 16,025 at the end of March and 13 per cent below June 2025. The Ministry of Justice says the fall is likely to be partly associated with increased magistrates' sentencing powers, additional Crown Court sitting days and extra court funding.", "type": "paragraph"}, {"text": "The earlier rise in remand prisoners had been one contributor to pressure on the estate, so its reversal eases one part of the problem without resolving the rest. The sentenced population stood at 70,003 in June, 1 per cent higher than a year earlier, with increases concentrated among several longer sentence bands.", "type": "paragraph"}, {"text": "The shortage of places was already well established before the present government took office.", "type": "paragraph"}, {"text": "The previous government expanded its prison-building commitment to 20,000 additional places, originally intended for delivery by the middle of the decade. By September 2024, 6,518 had been delivered. The National Audit Office found that 278 of those places came from allowing additional crowding at four privately run prisons rather than from new accommodation.", "type": "paragraph"}, {"text": "The current commitment to deliver 14,000 places by 2031 is largely the unfinished part of that programme, not a separate 14,000 places on top of the original 20,000.", "type": "paragraph"}, {"text": "HMPPS describes it as the \"remaining 14,000 of the 20,000 prison places\". By March 2025, about 6,500 of the original total had been delivered. The January 2026 capacity statement subsequently said around 2,900 additional places had been delivered since July 2024 and around 5,000 more were under construction by the end of 2025.", "type": "paragraph"}, {"text": "The National Audit Office concluded in 2024 that the expansion programme had been unrealistic and insufficiently prioritised and that delays had worsened the capacity crisis. It also pointed to policy choices which increased demand for places, including longer sentences and increased police numbers, while maintenance problems reduced the estate's ability to absorb that demand.", "type": "paragraph"}, {"text": "The Ministry of Justice's January 2026 assessment is considerably less pessimistic than projections made before the Sentencing Act was included.", "type": "paragraph"}, {"text": "Its central case now says prison supply can keep pace with demand if the sentencing reforms work broadly as modelled and new capacity arrives on schedule. But the department expressly warns that the projections are uncertain. Police and prosecutorial activity, court capacity, sentencing decisions, offender behaviour and delays to prison construction can all change the result.", "type": "paragraph"}, {"text": "Its November 2026 high-demand scenario is particularly tight: 88,900 prisoners against 89,300 projected places.", "type": "paragraph"}, {"text": "The supply figure already contains an operating margin intended to recognise that a nominally empty cell is not necessarily usable for whichever prisoner needs it. Women's prisons, high-security prisons and establishments holding particular categories of offender are not interchangeable. The forecast also does not attempt to predict major shocks such as temporary cell losses following disorder.", "type": "paragraph"}, {"text": "Moving prisoners out of custody sooner also transfers work elsewhere.", "type": "paragraph"}, {"text": "The progression model places people on licence for the remainder of the relevant part of their sentence. The government has announced up to £700 million of additional funding for probation and community services by 2028-29 and plans to recruit more probation officers and expand electronic monitoring.", "type": "paragraph"}, {"text": "The same January capacity statement recorded 5,559 full-time-equivalent probation officers against a target of 7,114 in September 2025, a staffing level of 78 per cent. The Ministry of Justice estimated a wider sentence-management staffing gap of 3,150 full-time-equivalent posts for 2026-27 and said a deficit was likely to remain even as recruitment increased.", "type": "paragraph"}, {"text": "The choice facing ministers is therefore not simply between keeping prisoners inside and releasing them. The prison-building programme is still catching up with a target first set years ago. The Sentencing Act is being used to reduce projected demand at the same time. The government's own January model says removing the Act's effects altogether would push demand above supply this year.", "type": "paragraph"}, {"text": "Today's announcement changes part of the package on which that forecast was based.", "type": "paragraph"}, {"text": "The government says it has now reached the point beyond which further exclusions would risk the prison system reaching capacity. Its published capacity statement shows why that is plausible under the high-demand scenario, even though the statement predates today's exclusions and so cannot say where that point now lies.", "type": "paragraph"}, {"text": "The latest public model gives the adult estate 400 places of headroom under the high-demand scenario in November. The government has since changed which prisoners will be released and when, but did not publish revised capacity figures with the 4 August decision.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$pn8k4qxw2r$k$ AND body_json = $o$[{"text": "Around 5,000 prisoners are expected to have their release dates brought forward under revised sentencing rules beginning in October, after the government excluded rape, serious child-sex and grooming offences from the changes.", "type": "paragraph"}, {"text": "Justice Secretary Alex Norris said the 5,000 would be released in stages over ten months. The figure is not the total number of prisoners who will leave custody during that period. Thousands are released in the normal course of their sentences each month. It refers to prisoners whose time in custody will be reduced under the new progression model.", "type": "paragraph"}, {"text": "The government says it cannot make substantially wider exclusions without risking the prison system reaching capacity. Adult male prisons are currently operating at about 98 per cent of their available capacity, according to the Ministry of Justice.", "type": "paragraph"}, {"text": "There is detailed government modelling behind the wider sentencing reforms. What has not been published alongside today's decision is an updated version showing the effect of the new exclusions.", "type": "paragraph"}, {"text": "The Ministry of Justice's latest annual capacity statement was published in January, before the government decided to remove further categories of offenders from the progression model.", "type": "paragraph"}, {"text": "That assessment projected 89,300 usable places across the adult prison estate in November 2026. After allowing for the Sentencing Act reforms, it estimated demand at 87,900 under its central scenario and 88,900 under its high-demand scenario.", "type": "paragraph"}, {"text": "The high scenario therefore left a modelled margin of about 400 places.", "type": "paragraph"}, {"text": "Without the Sentencing Act measures, the same model put November demand at 91,800 under the central scenario and 92,900 under the high scenario, both above projected supply. The department estimated that the whole package of sentencing reforms would reduce the prison population by about 7,500 by February 2028.", "type": "paragraph"}, {"text": "Those figures provide a clear explanation for why ministers regard sentencing reform as necessary. They do not show how much capacity remains after today's changes.", "type": "paragraph"}, {"text": "The January model incorporated the Sentencing Act package as it then stood. The government has now removed rape, serious child-sex and grooming offences from the new release arrangements and delayed their introduction from September until October.", "type": "paragraph"}, {"text": "No revised supply-and-demand table or published calculation accompanied the announcement showing how many prison places those decisions consume, or how many further offenders could be excluded before projected demand exceeds available capacity.", "type": "paragraph"}, {"text": "The 5,000 figure cannot simply be deducted from the January capacity numbers to calculate that margin. It describes people expected to have release dates brought forward over ten months, while the capacity model measures the prison population at particular points in time. The policies within the Sentencing Act also interact with one another, something the government's own impact assessment warns against treating as a collection of figures that can simply be added or subtracted.", "type": "paragraph"}, {"text": "The published evidence backs the government's broader claim that prisons have little spare capacity, without quantifying the narrower claim that today's exclusions mark the exact limit of what the system can accommodate.", "type": "paragraph"}, {"text": "The progression model changes the amount of a determinate sentence normally served in prison, rather than cancelling the remainder of the sentence.", "type": "paragraph"}, {"text": "For standard determinate sentences currently carrying release after 40 or 50 per cent, the earliest release point will generally become one third. For a group currently released after two thirds, the new minimum will generally be one half. Prisoners released remain on licence in the community and can be recalled. Additional days can also be imposed for serious breaches of prison rules, delaying release.", "type": "paragraph"}, {"text": "More than 18,000 prisoners serving life sentences, extended determinate sentences and other more serious sentence types were already outside the progression model. Today's decision adds rape, specified child-sex offences and grooming offences to the exclusions.", "type": "paragraph"}, {"text": "Manslaughter was not excluded on 4 August.", "type": "paragraph"}, {"text": "That left Albert Bowers and Jessie Cole, convicted of the manslaughter of PC Andrew Harper, within the group potentially affected by the changes. Both received 13-year sentences after PC Harper was killed while responding to a quad-bike theft in Berkshire in 2019. Henry Long, who received a longer extended sentence, was not affected in the same way.", "type": "paragraph"}, {"text": "Norris apologised to PC Harper's family and said the government had wanted to include manslaughter among the exclusions but could not widen them further without adding to the capacity problem.", "type": "paragraph"}, {"text": "The latest prison population statistics show why the capacity argument needs some care.", "type": "paragraph"}, {"text": "There were 85,858 prisoners in England and Wales on 30 June, not the 87,342 recorded at the end of March. The total was about 1,500 lower than a year earlier.", "type": "paragraph"}, {"text": "The fall was not evidence that the underlying capacity problem had disappeared.", "type": "paragraph"}, {"text": "At the end of March, changes to fixed-term recall led to releases of prisoners who had spent more than 56 days back in custody following recall. The Ministry of Justice says that probably contributed to a fall of about 1,600 prisoners between March and April. The population then remained between roughly 85,700 and 86,000 through April, May and June.", "type": "paragraph"}, {"text": "The government's statement that adult male prisons are 98 per cent full is also not directly comparable with the total prison population figure. One measures occupancy against usable places in the adult male estate. The other counts prisoners across the system. Both can therefore be true at the same time.", "type": "paragraph"}, {"text": "The position on remand has improved.", "type": "paragraph"}, {"text": "There were 15,386 prisoners on remand at the end of June, down from 16,025 at the end of March and 13 per cent below June 2025. The Ministry of Justice says the fall is likely to be partly associated with increased magistrates' sentencing powers, additional Crown Court sitting days and extra court funding.", "type": "paragraph"}, {"text": "The earlier rise in remand prisoners had been one contributor to pressure on the estate, so its reversal eases one part of the problem without resolving the rest. The sentenced population stood at 70,003 in June, 1 per cent higher than a year earlier, with increases concentrated among several longer sentence bands.", "type": "paragraph"}, {"text": "The shortage of places was already well established before the present government took office.", "type": "paragraph"}, {"text": "The previous government expanded its prison-building commitment to 20,000 additional places, originally intended for delivery by the middle of the decade. By September 2024, 6,518 had been delivered. The National Audit Office found that 278 of those places came from allowing additional crowding at four privately run prisons rather than from new accommodation.", "type": "paragraph"}, {"text": "The current commitment to deliver 14,000 places by 2031 is largely the unfinished part of that programme, not a separate 14,000 places on top of the original 20,000.", "type": "paragraph"}, {"text": "HMPPS describes it as the \"remaining 14,000 of the 20,000 prison places\". By March 2025, about 6,500 of the original total had been delivered. The January 2026 capacity statement subsequently said around 2,900 additional places had been delivered since July 2024 and around 5,000 more were under construction by the end of 2025.", "type": "paragraph"}, {"text": "The National Audit Office concluded in 2024 that the expansion programme had been unrealistic and insufficiently prioritised and that delays had worsened the capacity crisis. It also pointed to policy choices which increased demand for places, including longer sentences and increased police numbers, while maintenance problems reduced the estate's ability to absorb that demand.", "type": "paragraph"}, {"text": "The Ministry of Justice's January 2026 assessment is considerably less pessimistic than projections made before the Sentencing Act was included.", "type": "paragraph"}, {"text": "Its central case now says prison supply can keep pace with demand if the sentencing reforms work broadly as modelled and new capacity arrives on schedule. But the department expressly warns that the projections are uncertain. Police and prosecutorial activity, court capacity, sentencing decisions, offender behaviour and delays to prison construction can all change the result.", "type": "paragraph"}, {"text": "Its November 2026 high-demand scenario is particularly tight: 88,900 prisoners against 89,300 projected places.", "type": "paragraph"}, {"text": "The supply figure already contains an operating margin intended to recognise that a nominally empty cell is not necessarily usable for whichever prisoner needs it. Women's prisons, high-security prisons and establishments holding particular categories of offender are not interchangeable. The forecast also does not attempt to predict major shocks such as temporary cell losses following disorder.", "type": "paragraph"}, {"text": "Moving prisoners out of custody sooner also transfers work elsewhere.", "type": "paragraph"}, {"text": "The progression model places people on licence for the remainder of the relevant part of their sentence. The government has announced up to £700 million of additional funding for probation and community services by 2028–29 and plans to recruit more probation officers and expand electronic monitoring.", "type": "paragraph"}, {"text": "The same January capacity statement recorded 5,559 full-time-equivalent probation officers against a target of 7,114 in September 2025, a staffing level of 78 per cent. The Ministry of Justice estimated a wider sentence-management staffing gap of 3,150 full-time-equivalent posts for 2026–27 and said a deficit was likely to remain even as recruitment increased.", "type": "paragraph"}, {"text": "The choice facing ministers is therefore not simply between keeping prisoners inside and releasing them. The prison-building programme is still catching up with a target first set years ago. The Sentencing Act is being used to reduce projected demand at the same time. The government's own January model says removing the Act's effects altogether would push demand above supply this year.", "type": "paragraph"}, {"text": "Today's announcement changes part of the package on which that forecast was based.", "type": "paragraph"}, {"text": "The government says it has now reached the point beyond which further exclusions would risk the prison system reaching capacity. Its published capacity statement shows why that is plausible under the high-demand scenario, even though the statement predates today's exclusions and so cannot say where that point now lies.", "type": "paragraph"}, {"text": "The latest public model gives the adult estate 400 places of headroom under the high-demand scenario in November. The government has since changed which prisoners will be released and when, but did not publish revised capacity figures with the 4 August decision.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$pn8k4qxw2r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$m2v9k7qx4r$k$, 'body_json', $o$[{"text": "Lisa Nandy is considering intervening in Paramount Skydance's proposed takeover of Warner Bros Discovery because of its potential effect on media plurality in Britain.", "type": "paragraph"}, {"text": "Her statement to Parliament on 30 June identified a problem in the law she would use to do it.", "type": "paragraph"}, {"text": "The Enterprise Act already contains public-interest tests covering news plurality and concentration of control over traditional media enterprises.", "type": "paragraph"}, {"text": "It does not currently put on-demand programme services inside the same ownership-plurality test.", "type": "paragraph"}, {"text": "Nandy told Parliament that if she intervenes on that ground, she will use powers in the Act to add a new public-interest consideration covering streaming and video-on-demand services.", "type": "paragraph"}, {"text": "That is narrower than saying Britain lacks the legal machinery to examine the merger.", "type": "paragraph"}, {"text": "The Enterprise Act anticipated that circumstances could arise which its original list of public-interest considerations did not cover. Section 42 allows a Culture Secretary to issue an intervention notice on a consideration that is not yet specified in section 58 if, in the Secretary of State's opinion, it ought to be. The government must then move to have that consideration formally added.", "type": "paragraph"}, {"text": "The gap is therefore in the standing media-plurality test, not in the government's ability to respond to an unforeseen type of merger.", "type": "paragraph"}, {"text": "Nandy's proposed wording would require consideration of whether there is sufficient plurality of people controlling \"media enterprises, or the enterprises providing on-demand programme services or both\" serving a UK audience. She said the existing legislation was written when viewing was predominantly through linear broadcasting and does not capture the full effect of mergers involving streaming services.", "type": "paragraph"}, {"text": "The transaction is large enough to expose that distinction.", "type": "paragraph"}, {"text": "Paramount agreed in February to buy Warner Bros Discovery in a deal valuing WBD at $81 billion in equity and $110 billion including debt. The companies said they expected the transaction to close in the third quarter of 2026, subject to regulatory approvals.", "type": "paragraph"}, {"text": "The combined group would bring together Paramount+ and HBO Max, CBS and CBS News with CNN, Nickelodeon with Cartoon Network, and Paramount Pictures with Warner Bros.", "type": "paragraph"}, {"text": "In Britain, Nandy specifically named Channel 5, TNT Sports, Cartoon Network, Nickelodeon and CNN International, along with Paramount+ and HBO Max, when explaining why she believed the merger could affect UK audiences.", "type": "paragraph"}, {"text": "TNT Sports needs a qualification. As of 2 July 2026, Companies House still listed both British Telecommunications plc and the Warner Bros Discovery-linked entity Dni Foreign Holdings Limited as active persons with significant control of TNT Sports Broadcasting Ltd, with no cessation recorded for either — consistent with BT's own reporting that its UK and Ireland sports business remained a 50:50 joint venture, with Warner Bros Discovery holding an option to acquire BT's half that had not been reported as exercised.", "type": "paragraph"}, {"text": "Britain had already tried to update its media-merger rules for changing viewing habits.", "type": "paragraph"}, {"text": "Nandy opened a consultation in November 2024 after Ofcom recommended broadening a regime designed around newspapers and broadcasters. The government said at the time that the law had not kept pace with technology.", "type": "paragraph"}, {"text": "The reform that followed concentrated principally on news.", "type": "paragraph"}, {"text": "In May 2025, the government decided to bring online news publications and periodical news magazines into the regime and broaden the existing news public-interest tests. It rejected a much wider approach that could have captured any entity creating news, saying that could impose disproportionate burdens.", "type": "paragraph"}, {"text": "The resulting secondary legislation came into force in July 2025.", "type": "paragraph"}, {"text": "It changed section 58 so that tests concerning accurate news, freedom of opinion and plurality of views applied to \"news media\", defined as newspapers and broadcast news programmes. It also broadened the ownership-plurality provision across newspaper and broadcasting enterprises.", "type": "paragraph"}, {"text": "It did not add general video-on-demand services to that ownership test.", "type": "paragraph"}, {"text": "Less than a year later, Paramount-Warner has brought exactly that omission into a live merger decision.", "type": "paragraph"}, {"text": "This does not mean the 2025 reform failed at what it was designed to do. It was primarily aimed at bringing online journalism into rules written for print and broadcasting.", "type": "paragraph"}, {"text": "But the government described that exercise as modernising the media-merger regime for the digital age. The Paramount transaction has shown that one increasingly important part of that digital market remained outside the specified ownership-plurality test.", "type": "paragraph"}, {"text": "The Competition and Markets Authority is examining a different question.", "type": "paragraph"}, {"text": "It formally opened its merger inquiry on 9 June to assess competition in the UK. Nandy's proposed intervention would add examination of wider public-interest issues, with Ofcom reporting on media plurality if she issues the intervention notice.", "type": "paragraph"}, {"text": "The two tests should not be confused.", "type": "paragraph"}, {"text": "A merger can pass competition scrutiny while still raising questions about concentration of media ownership, editorial independence or the number of separate organisations controlling services consumed by the public.", "type": "paragraph"}, {"text": "The US Department of Justice reached its competition decision on 12 June. It closed its antitrust investigation after concluding that the merger was unlikely to harm American consumers in streaming, linear television or film production. It went further on streaming, saying the combined business could provide stronger competition to larger subscription services.", "type": "paragraph"}, {"text": "That finding does not answer Nandy's media-plurality question, and it does not amount to worldwide regulatory clearance of the transaction.", "type": "paragraph"}, {"text": "Nor had the transaction cleared every US regulatory process by 2 July. Paramount had separately asked the Federal Communications Commission to permit the level of foreign investment expected in the combined company. A US national-security review of that request had begun in June.", "type": "paragraph"}, {"text": "Nandy had also used the existing British media public-interest regime earlier in the year.", "type": "paragraph"}, {"text": "In February she issued an intervention notice over Daily Mail and General Trust's proposed purchase of the Telegraph, relying on the existing tests covering plurality of views in news media and plurality of people controlling media enterprises.", "type": "paragraph"}, {"text": "Paramount-Warner requires something additional because part of the audience Nandy wants Ofcom to consider receives content through services the existing ownership test does not expressly cover.", "type": "paragraph"}, {"text": "The parties have until 6 July to respond to her concerns.", "type": "paragraph"}, {"text": "Nandy has not yet issued an intervention notice. If she does, Ofcom would examine the media-public-interest considerations and the CMA would report on jurisdiction and competition before she decided whether a more detailed investigation was required.", "type": "paragraph"}, {"text": "The Secretary of State's role in these cases has historically been treated as quasi-judicial, with ministers expected to follow a fair and impartial process. There is no evidence that the timetable was chosen for political reasons or to constrain whoever succeeds Starmer.", "type": "paragraph"}, {"text": "The documented problem is simpler.", "type": "paragraph"}, {"text": "Britain modernised its media-merger rules in 2025 because audiences had moved online.", "type": "paragraph"}, {"text": "The reform brought online news into the system.", "type": "paragraph"}, {"text": "It did not bring general streaming services into the standing test for concentration of media ownership.", "type": "paragraph"}, {"text": "A year later, one of the world's largest media mergers has forced the Culture Secretary to use the Enterprise Act's catch-all mechanism to propose doing precisely that.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "Lisa Nandy is considering intervening in Paramount Skydance's proposed takeover of Warner Bros Discovery because of its potential effect on media plurality in Britain.", "type": "paragraph"}, {"text": "Her statement to Parliament on 30 June identified a problem in the law she would use to do it.", "type": "paragraph"}, {"text": "The Enterprise Act already contains public-interest tests covering news plurality and concentration of control over traditional media enterprises.", "type": "paragraph"}, {"text": "It does not currently put on-demand programme services inside the same ownership-plurality test.", "type": "paragraph"}, {"text": "Nandy told Parliament that if she intervenes on that ground, she will use powers in the Act to add a new public-interest consideration covering streaming and video-on-demand services.", "type": "paragraph"}, {"text": "That is narrower than saying Britain lacks the legal machinery to examine the merger.", "type": "paragraph"}, {"text": "The Enterprise Act anticipated that circumstances could arise which its original list of public-interest considerations did not cover. Section 42 allows a Culture Secretary to issue an intervention notice on a consideration that is not yet specified in section 58 if, in the Secretary of State's opinion, it ought to be. The government must then move to have that consideration formally added.", "type": "paragraph"}, {"text": "The gap is therefore in the standing media-plurality test, not in the government's ability to respond to an unforeseen type of merger.", "type": "paragraph"}, {"text": "Nandy's proposed wording would require consideration of whether there is sufficient plurality of people controlling \"media enterprises, or the enterprises providing on-demand programme services or both\" serving a UK audience. She said the existing legislation was written when viewing was predominantly through linear broadcasting and does not capture the full effect of mergers involving streaming services.", "type": "paragraph"}, {"text": "The transaction is large enough to expose that distinction.", "type": "paragraph"}, {"text": "Paramount agreed in February to buy Warner Bros Discovery in a deal valuing WBD at $81 billion in equity and $110 billion including debt. The companies said they expected the transaction to close in the third quarter of 2026, subject to regulatory approvals.", "type": "paragraph"}, {"text": "The combined group would bring together Paramount+ and HBO Max, CBS and CBS News with CNN, Nickelodeon with Cartoon Network, and Paramount Pictures with Warner Bros.", "type": "paragraph"}, {"text": "In Britain, Nandy specifically named Channel 5, TNT Sports, Cartoon Network, Nickelodeon and CNN International, along with Paramount+ and HBO Max, when explaining why she believed the merger could affect UK audiences.", "type": "paragraph"}, {"text": "TNT Sports needs a qualification. As of 2 July 2026, Companies House still listed both British Telecommunications plc and the Warner Bros Discovery-linked entity Dni Foreign Holdings Limited as active persons with significant control of TNT Sports Broadcasting Ltd, with no cessation recorded for either, consistent with BT's own reporting that its UK and Ireland sports business remained a 50:50 joint venture, with Warner Bros Discovery holding an option to acquire BT's half that had not been reported as exercised.", "type": "paragraph"}, {"text": "Britain had already tried to update its media-merger rules for changing viewing habits.", "type": "paragraph"}, {"text": "Nandy opened a consultation in November 2024 after Ofcom recommended broadening a regime designed around newspapers and broadcasters. The government said at the time that the law had not kept pace with technology.", "type": "paragraph"}, {"text": "The reform that followed concentrated principally on news.", "type": "paragraph"}, {"text": "In May 2025, the government decided to bring online news publications and periodical news magazines into the regime and broaden the existing news public-interest tests. It rejected a much wider approach that could have captured any entity creating news, saying that could impose disproportionate burdens.", "type": "paragraph"}, {"text": "The resulting secondary legislation came into force in July 2025.", "type": "paragraph"}, {"text": "It changed section 58 so that tests concerning accurate news, freedom of opinion and plurality of views applied to \"news media\", defined as newspapers and broadcast news programmes. It also broadened the ownership-plurality provision across newspaper and broadcasting enterprises.", "type": "paragraph"}, {"text": "It did not add general video-on-demand services to that ownership test.", "type": "paragraph"}, {"text": "Less than a year later, Paramount-Warner has brought exactly that omission into a live merger decision.", "type": "paragraph"}, {"text": "This does not mean the 2025 reform failed at what it was designed to do. It was primarily aimed at bringing online journalism into rules written for print and broadcasting.", "type": "paragraph"}, {"text": "But the government described that exercise as modernising the media-merger regime for the digital age. The Paramount transaction has shown that one increasingly important part of that digital market remained outside the specified ownership-plurality test.", "type": "paragraph"}, {"text": "The Competition and Markets Authority is examining a different question.", "type": "paragraph"}, {"text": "It formally opened its merger inquiry on 9 June to assess competition in the UK. Nandy's proposed intervention would add examination of wider public-interest issues, with Ofcom reporting on media plurality if she issues the intervention notice.", "type": "paragraph"}, {"text": "The two tests should not be confused.", "type": "paragraph"}, {"text": "A merger can pass competition scrutiny while still raising questions about concentration of media ownership, editorial independence or the number of separate organisations controlling services consumed by the public.", "type": "paragraph"}, {"text": "The US Department of Justice reached its competition decision on 12 June. It closed its antitrust investigation after concluding that the merger was unlikely to harm American consumers in streaming, linear television or film production. It went further on streaming, saying the combined business could provide stronger competition to larger subscription services.", "type": "paragraph"}, {"text": "That finding does not answer Nandy's media-plurality question, and it does not amount to worldwide regulatory clearance of the transaction.", "type": "paragraph"}, {"text": "Nor had the transaction cleared every US regulatory process by 2 July. Paramount had separately asked the Federal Communications Commission to permit the level of foreign investment expected in the combined company. A US national-security review of that request had begun in June.", "type": "paragraph"}, {"text": "Nandy had also used the existing British media public-interest regime earlier in the year.", "type": "paragraph"}, {"text": "In February she issued an intervention notice over Daily Mail and General Trust's proposed purchase of the Telegraph, relying on the existing tests covering plurality of views in news media and plurality of people controlling media enterprises.", "type": "paragraph"}, {"text": "Paramount-Warner requires something additional because part of the audience Nandy wants Ofcom to consider receives content through services the existing ownership test does not expressly cover.", "type": "paragraph"}, {"text": "The parties have until 6 July to respond to her concerns.", "type": "paragraph"}, {"text": "Nandy has not yet issued an intervention notice. If she does, Ofcom would examine the media-public-interest considerations and the CMA would report on jurisdiction and competition before she decided whether a more detailed investigation was required.", "type": "paragraph"}, {"text": "The Secretary of State's role in these cases has historically been treated as quasi-judicial, with ministers expected to follow a fair and impartial process. There is no evidence that the timetable was chosen for political reasons or to constrain whoever succeeds Starmer.", "type": "paragraph"}, {"text": "The documented problem is simpler.", "type": "paragraph"}, {"text": "Britain modernised its media-merger rules in 2025 because audiences had moved online.", "type": "paragraph"}, {"text": "The reform brought online news into the system.", "type": "paragraph"}, {"text": "It did not bring general streaming services into the standing test for concentration of media ownership.", "type": "paragraph"}, {"text": "A year later, one of the world's largest media mergers has forced the Culture Secretary to use the Enterprise Act's catch-all mechanism to propose doing precisely that.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$m2v9k7qx4r$k$ AND body_json = $o$[{"text": "Lisa Nandy is considering intervening in Paramount Skydance's proposed takeover of Warner Bros Discovery because of its potential effect on media plurality in Britain.", "type": "paragraph"}, {"text": "Her statement to Parliament on 30 June identified a problem in the law she would use to do it.", "type": "paragraph"}, {"text": "The Enterprise Act already contains public-interest tests covering news plurality and concentration of control over traditional media enterprises.", "type": "paragraph"}, {"text": "It does not currently put on-demand programme services inside the same ownership-plurality test.", "type": "paragraph"}, {"text": "Nandy told Parliament that if she intervenes on that ground, she will use powers in the Act to add a new public-interest consideration covering streaming and video-on-demand services.", "type": "paragraph"}, {"text": "That is narrower than saying Britain lacks the legal machinery to examine the merger.", "type": "paragraph"}, {"text": "The Enterprise Act anticipated that circumstances could arise which its original list of public-interest considerations did not cover. Section 42 allows a Culture Secretary to issue an intervention notice on a consideration that is not yet specified in section 58 if, in the Secretary of State's opinion, it ought to be. The government must then move to have that consideration formally added.", "type": "paragraph"}, {"text": "The gap is therefore in the standing media-plurality test, not in the government's ability to respond to an unforeseen type of merger.", "type": "paragraph"}, {"text": "Nandy's proposed wording would require consideration of whether there is sufficient plurality of people controlling \"media enterprises, or the enterprises providing on-demand programme services or both\" serving a UK audience. She said the existing legislation was written when viewing was predominantly through linear broadcasting and does not capture the full effect of mergers involving streaming services.", "type": "paragraph"}, {"text": "The transaction is large enough to expose that distinction.", "type": "paragraph"}, {"text": "Paramount agreed in February to buy Warner Bros Discovery in a deal valuing WBD at $81 billion in equity and $110 billion including debt. The companies said they expected the transaction to close in the third quarter of 2026, subject to regulatory approvals.", "type": "paragraph"}, {"text": "The combined group would bring together Paramount+ and HBO Max, CBS and CBS News with CNN, Nickelodeon with Cartoon Network, and Paramount Pictures with Warner Bros.", "type": "paragraph"}, {"text": "In Britain, Nandy specifically named Channel 5, TNT Sports, Cartoon Network, Nickelodeon and CNN International, along with Paramount+ and HBO Max, when explaining why she believed the merger could affect UK audiences.", "type": "paragraph"}, {"text": "TNT Sports needs a qualification. As of 2 July 2026, Companies House still listed both British Telecommunications plc and the Warner Bros Discovery-linked entity Dni Foreign Holdings Limited as active persons with significant control of TNT Sports Broadcasting Ltd, with no cessation recorded for either — consistent with BT's own reporting that its UK and Ireland sports business remained a 50:50 joint venture, with Warner Bros Discovery holding an option to acquire BT's half that had not been reported as exercised.", "type": "paragraph"}, {"text": "Britain had already tried to update its media-merger rules for changing viewing habits.", "type": "paragraph"}, {"text": "Nandy opened a consultation in November 2024 after Ofcom recommended broadening a regime designed around newspapers and broadcasters. The government said at the time that the law had not kept pace with technology.", "type": "paragraph"}, {"text": "The reform that followed concentrated principally on news.", "type": "paragraph"}, {"text": "In May 2025, the government decided to bring online news publications and periodical news magazines into the regime and broaden the existing news public-interest tests. It rejected a much wider approach that could have captured any entity creating news, saying that could impose disproportionate burdens.", "type": "paragraph"}, {"text": "The resulting secondary legislation came into force in July 2025.", "type": "paragraph"}, {"text": "It changed section 58 so that tests concerning accurate news, freedom of opinion and plurality of views applied to \"news media\", defined as newspapers and broadcast news programmes. It also broadened the ownership-plurality provision across newspaper and broadcasting enterprises.", "type": "paragraph"}, {"text": "It did not add general video-on-demand services to that ownership test.", "type": "paragraph"}, {"text": "Less than a year later, Paramount-Warner has brought exactly that omission into a live merger decision.", "type": "paragraph"}, {"text": "This does not mean the 2025 reform failed at what it was designed to do. It was primarily aimed at bringing online journalism into rules written for print and broadcasting.", "type": "paragraph"}, {"text": "But the government described that exercise as modernising the media-merger regime for the digital age. The Paramount transaction has shown that one increasingly important part of that digital market remained outside the specified ownership-plurality test.", "type": "paragraph"}, {"text": "The Competition and Markets Authority is examining a different question.", "type": "paragraph"}, {"text": "It formally opened its merger inquiry on 9 June to assess competition in the UK. Nandy's proposed intervention would add examination of wider public-interest issues, with Ofcom reporting on media plurality if she issues the intervention notice.", "type": "paragraph"}, {"text": "The two tests should not be confused.", "type": "paragraph"}, {"text": "A merger can pass competition scrutiny while still raising questions about concentration of media ownership, editorial independence or the number of separate organisations controlling services consumed by the public.", "type": "paragraph"}, {"text": "The US Department of Justice reached its competition decision on 12 June. It closed its antitrust investigation after concluding that the merger was unlikely to harm American consumers in streaming, linear television or film production. It went further on streaming, saying the combined business could provide stronger competition to larger subscription services.", "type": "paragraph"}, {"text": "That finding does not answer Nandy's media-plurality question, and it does not amount to worldwide regulatory clearance of the transaction.", "type": "paragraph"}, {"text": "Nor had the transaction cleared every US regulatory process by 2 July. Paramount had separately asked the Federal Communications Commission to permit the level of foreign investment expected in the combined company. A US national-security review of that request had begun in June.", "type": "paragraph"}, {"text": "Nandy had also used the existing British media public-interest regime earlier in the year.", "type": "paragraph"}, {"text": "In February she issued an intervention notice over Daily Mail and General Trust's proposed purchase of the Telegraph, relying on the existing tests covering plurality of views in news media and plurality of people controlling media enterprises.", "type": "paragraph"}, {"text": "Paramount-Warner requires something additional because part of the audience Nandy wants Ofcom to consider receives content through services the existing ownership test does not expressly cover.", "type": "paragraph"}, {"text": "The parties have until 6 July to respond to her concerns.", "type": "paragraph"}, {"text": "Nandy has not yet issued an intervention notice. If she does, Ofcom would examine the media-public-interest considerations and the CMA would report on jurisdiction and competition before she decided whether a more detailed investigation was required.", "type": "paragraph"}, {"text": "The Secretary of State's role in these cases has historically been treated as quasi-judicial, with ministers expected to follow a fair and impartial process. There is no evidence that the timetable was chosen for political reasons or to constrain whoever succeeds Starmer.", "type": "paragraph"}, {"text": "The documented problem is simpler.", "type": "paragraph"}, {"text": "Britain modernised its media-merger rules in 2025 because audiences had moved online.", "type": "paragraph"}, {"text": "The reform brought online news into the system.", "type": "paragraph"}, {"text": "It did not bring general streaming services into the standing test for concentration of media ownership.", "type": "paragraph"}, {"text": "A year later, one of the world's largest media mergers has forced the Culture Secretary to use the Enterprise Act's catch-all mechanism to propose doing precisely that.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$m2v9k7qx4r$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$vt6k9mxw3n$k$, 'body_json', $o$[{"text": "Andy Burnham's government has announced a £850 million cut to VAT on electricity bills, funded in part by scrapping the digital ID programme. The savings from that cancellation have not yet been published.", "type": "paragraph"}, {"text": "The VAT cut, unveiled on 21 July, reduces the rate charged on domestic electricity from 20 per cent to 5 per cent for the remainder of this parliament. The Treasury says the measure will cost £850 million in 2026/27.", "type": "paragraph"}, {"text": "The OBR's November 2025 Economic and Fiscal Outlook had set out the digital ID programme's cost over the Spending Review period at £1.8 billion, made up of roughly £500 million in set-up costs and £1.3 billion in running costs across the forecast period.", "type": "paragraph"}, {"text": "The OBR put the provisional cost of digital ID at £600 million a year over the Spending Review period.", "type": "paragraph"}, {"text": "The VAT cut is expected to cost £850 million in 2026/27.", "type": "paragraph"}, {"text": "On those published figures, the new policy costs roughly £250 million more this year than the annual spending pressure the OBR had allowed for digital ID.", "type": "paragraph"}, {"text": "That does not necessarily mean there is a £250 million hole. The digital ID estimate was provisional and the government had not created a dedicated £600 million annual budget for the programme. Darren Jones told MPs in March that ministers did not yet know what the final scheme would cost because its design had not been settled.", "type": "paragraph"}, {"text": "But the comparison does leave something for Burnham's government to explain.", "type": "paragraph"}, {"text": "The OBR had treated digital ID as an unfunded spending pressure of £600 million a year. It said departments were expected to absorb the cost from existing budgets, although no specific savings had been identified.", "type": "paragraph"}, {"text": "Burnham has now cancelled that programme and says those departmental savings will instead pay for an £850 million VAT cut.", "type": "paragraph"}, {"text": "The government has not published the departmental arithmetic showing how £600 million of annual digital ID pressure becomes £850 million available for the VAT measure in 2026/27.", "type": "paragraph"}, {"text": "Nor has it said which existing budgets will be reprioritised, what spending will be reduced or delayed, or how much each department is expected to contribute.", "type": "paragraph"}, {"text": "Cancelling digital ID removes a genuine future spending pressure. It does not, by itself, identify £850 million of cash savings.", "type": "paragraph"}, {"text": "That is the distinction Darren Jones's criticism gets partly right. Digital ID had no separately funded pot waiting to be transferred. But the OBR had already allowed for its cost in the fiscal forecast.", "type": "paragraph"}, {"text": "Burnham has changed what the proposed departmental savings are supposed to pay for. Ministers have yet to publish how the full £850 million will be found.", "type": "paragraph"}, {"text": "When the Commons Science, Innovation and Technology Committee pressed Darren Jones on this in March, he told MPs the £1.8 billion figure was the OBR's own estimate, which the government had disputed, and that ministers did not yet know what the finished scheme would ultimately cost. Ian Murray, now responsible for the digital ID brief, has not published a revised costing since the programme's cancellation.", "type": "paragraph"}, {"text": "The £45 figure that has circulated in coverage of the cut is an annualised estimate based on the current Ofgem price cap, not a guaranteed saving for any individual household. Actual bills vary with usage, and the price cap itself is reviewed quarterly, so the real-terms benefit will shift as wholesale prices move.", "type": "paragraph"}, {"text": "Martin Lewis's analysis for MoneySavingExpert found that a 15-percentage-point VAT cut would be expected to reduce a typical bill by around 4.8 per cent in cash terms once standing charges and non-VAT-rated elements are accounted for, meaning the headline annualised saving significantly overstates what most households will actually notice. He also noted that if the price cap itself rises in the same period, as had been separately forecast, much of the VAT cut's benefit would be absorbed by that increase before bills are compared year-on-year — effectively eating into the saving before it reaches the consumer.", "type": "paragraph"}, {"text": "The government has not published a date by which it intends to set out the departmental savings underpinning the measure, or confirm whether any will fall on budgets unrelated to digital ID.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "Andy Burnham's government has announced a £850 million cut to VAT on electricity bills, funded in part by scrapping the digital ID programme. The savings from that cancellation have not yet been published.", "type": "paragraph"}, {"text": "The VAT cut, unveiled on 21 July, reduces the rate charged on domestic electricity from 20 per cent to 5 per cent for the remainder of this parliament. The Treasury says the measure will cost £850 million in 2026/27.", "type": "paragraph"}, {"text": "The OBR's November 2025 Economic and Fiscal Outlook had set out the digital ID programme's cost over the Spending Review period at £1.8 billion, made up of roughly £500 million in set-up costs and £1.3 billion in running costs across the forecast period.", "type": "paragraph"}, {"text": "The OBR put the provisional cost of digital ID at £600 million a year over the Spending Review period.", "type": "paragraph"}, {"text": "The VAT cut is expected to cost £850 million in 2026/27.", "type": "paragraph"}, {"text": "On those published figures, the new policy costs roughly £250 million more this year than the annual spending pressure the OBR had allowed for digital ID.", "type": "paragraph"}, {"text": "That does not necessarily mean there is a £250 million hole. The digital ID estimate was provisional and the government had not created a dedicated £600 million annual budget for the programme. Darren Jones told MPs in March that ministers did not yet know what the final scheme would cost because its design had not been settled.", "type": "paragraph"}, {"text": "But the comparison does leave something for Burnham's government to explain.", "type": "paragraph"}, {"text": "The OBR had treated digital ID as an unfunded spending pressure of £600 million a year. It said departments were expected to absorb the cost from existing budgets, although no specific savings had been identified.", "type": "paragraph"}, {"text": "Burnham has now cancelled that programme and says those departmental savings will instead pay for an £850 million VAT cut.", "type": "paragraph"}, {"text": "The government has not published the departmental arithmetic showing how £600 million of annual digital ID pressure becomes £850 million available for the VAT measure in 2026/27.", "type": "paragraph"}, {"text": "Nor has it said which existing budgets will be reprioritised, what spending will be reduced or delayed, or how much each department is expected to contribute.", "type": "paragraph"}, {"text": "Cancelling digital ID removes a genuine future spending pressure. It does not, by itself, identify £850 million of cash savings.", "type": "paragraph"}, {"text": "That is the distinction Darren Jones's criticism gets partly right. Digital ID had no separately funded pot waiting to be transferred. But the OBR had already allowed for its cost in the fiscal forecast.", "type": "paragraph"}, {"text": "Burnham has changed what the proposed departmental savings are supposed to pay for. Ministers have yet to publish how the full £850 million will be found.", "type": "paragraph"}, {"text": "When the Commons Science, Innovation and Technology Committee pressed Darren Jones on this in March, he told MPs the £1.8 billion figure was the OBR's own estimate, which the government had disputed, and that ministers did not yet know what the finished scheme would ultimately cost. Ian Murray, now responsible for the digital ID brief, has not published a revised costing since the programme's cancellation.", "type": "paragraph"}, {"text": "The £45 figure that has circulated in coverage of the cut is an annualised estimate based on the current Ofgem price cap, not a guaranteed saving for any individual household. Actual bills vary with usage, and the price cap itself is reviewed quarterly, so the real-terms benefit will shift as wholesale prices move.", "type": "paragraph"}, {"text": "Martin Lewis's analysis for MoneySavingExpert found that a 15-percentage-point VAT cut would be expected to reduce a typical bill by around 4.8 per cent in cash terms once standing charges and non-VAT-rated elements are accounted for, meaning the headline annualised saving significantly overstates what most households will actually notice. He also noted that if the price cap itself rises in the same period, as had been separately forecast, much of the VAT cut's benefit would be absorbed by that increase before bills are compared year-on-year, effectively eating into the saving before it reaches the consumer.", "type": "paragraph"}, {"text": "The government has not published a date by which it intends to set out the departmental savings underpinning the measure, or confirm whether any will fall on budgets unrelated to digital ID.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$vt6k9mxw3n$k$ AND body_json = $o$[{"text": "Andy Burnham's government has announced a £850 million cut to VAT on electricity bills, funded in part by scrapping the digital ID programme. The savings from that cancellation have not yet been published.", "type": "paragraph"}, {"text": "The VAT cut, unveiled on 21 July, reduces the rate charged on domestic electricity from 20 per cent to 5 per cent for the remainder of this parliament. The Treasury says the measure will cost £850 million in 2026/27.", "type": "paragraph"}, {"text": "The OBR's November 2025 Economic and Fiscal Outlook had set out the digital ID programme's cost over the Spending Review period at £1.8 billion, made up of roughly £500 million in set-up costs and £1.3 billion in running costs across the forecast period.", "type": "paragraph"}, {"text": "The OBR put the provisional cost of digital ID at £600 million a year over the Spending Review period.", "type": "paragraph"}, {"text": "The VAT cut is expected to cost £850 million in 2026/27.", "type": "paragraph"}, {"text": "On those published figures, the new policy costs roughly £250 million more this year than the annual spending pressure the OBR had allowed for digital ID.", "type": "paragraph"}, {"text": "That does not necessarily mean there is a £250 million hole. The digital ID estimate was provisional and the government had not created a dedicated £600 million annual budget for the programme. Darren Jones told MPs in March that ministers did not yet know what the final scheme would cost because its design had not been settled.", "type": "paragraph"}, {"text": "But the comparison does leave something for Burnham's government to explain.", "type": "paragraph"}, {"text": "The OBR had treated digital ID as an unfunded spending pressure of £600 million a year. It said departments were expected to absorb the cost from existing budgets, although no specific savings had been identified.", "type": "paragraph"}, {"text": "Burnham has now cancelled that programme and says those departmental savings will instead pay for an £850 million VAT cut.", "type": "paragraph"}, {"text": "The government has not published the departmental arithmetic showing how £600 million of annual digital ID pressure becomes £850 million available for the VAT measure in 2026/27.", "type": "paragraph"}, {"text": "Nor has it said which existing budgets will be reprioritised, what spending will be reduced or delayed, or how much each department is expected to contribute.", "type": "paragraph"}, {"text": "Cancelling digital ID removes a genuine future spending pressure. It does not, by itself, identify £850 million of cash savings.", "type": "paragraph"}, {"text": "That is the distinction Darren Jones's criticism gets partly right. Digital ID had no separately funded pot waiting to be transferred. But the OBR had already allowed for its cost in the fiscal forecast.", "type": "paragraph"}, {"text": "Burnham has changed what the proposed departmental savings are supposed to pay for. Ministers have yet to publish how the full £850 million will be found.", "type": "paragraph"}, {"text": "When the Commons Science, Innovation and Technology Committee pressed Darren Jones on this in March, he told MPs the £1.8 billion figure was the OBR's own estimate, which the government had disputed, and that ministers did not yet know what the finished scheme would ultimately cost. Ian Murray, now responsible for the digital ID brief, has not published a revised costing since the programme's cancellation.", "type": "paragraph"}, {"text": "The £45 figure that has circulated in coverage of the cut is an annualised estimate based on the current Ofgem price cap, not a guaranteed saving for any individual household. Actual bills vary with usage, and the price cap itself is reviewed quarterly, so the real-terms benefit will shift as wholesale prices move.", "type": "paragraph"}, {"text": "Martin Lewis's analysis for MoneySavingExpert found that a 15-percentage-point VAT cut would be expected to reduce a typical bill by around 4.8 per cent in cash terms once standing charges and non-VAT-rated elements are accounted for, meaning the headline annualised saving significantly overstates what most households will actually notice. He also noted that if the price cap itself rises in the same period, as had been separately forecast, much of the VAT cut's benefit would be absorbed by that increase before bills are compared year-on-year — effectively eating into the saving before it reaches the consumer.", "type": "paragraph"}, {"text": "The government has not published a date by which it intends to set out the departmental savings underpinning the measure, or confirm whether any will fall on budgets unrelated to digital ID.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$vt6k9mxw3n$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('editorials', $k$ck8m2wq7x3$k$, 'body_json', $o$[{"text": "GMB's published regional data record 992,536 council tax court actions in England in 2024/25, although the union's figures contain an unresolved discrepancy that prevents a clean national total.", "type": "paragraph"}, {"text": "GMB sent Freedom of Information requests to councils across Great Britain responsible for collecting council tax. Almost 200 replied within the statutory deadline. Its published table records entries in a \"Court 24/25\" column for each region. Summing the nine English regional entries gives 992,536. Councils that did not respond are absent from the exercise altogether.", "type": "paragraph"}, {"text": "There is also a discrepancy in GMB's own national figures.", "type": "paragraph"}, {"text": "The text accompanying its investigation says 1,430,726 people were summoned to court across Great Britain. The regional table on the same page totals 1,505,126 court entries, a difference of 74,400. GMB variously describes the figures as people, summonses and court cases.", "type": "paragraph"}, {"text": "Neither of those totals reconciles cleanly with the regional breakdown either. Adding the English, Scottish and Welsh regional entries together gives 1,272,272 — some 232,854 short of the table's own printed total of 1,505,126. GMB has not published an explanation for the gap.", "type": "paragraph"}, {"text": "The defensible finding is therefore not a single precise national total. It is that responding councils reported court enforcement on a scale running into nearly a million cases in England alone, with the true national total unavailable from the published exercise.", "type": "paragraph"}, {"text": "The same responses recorded 4,593,838 council tax accounts in arrears, more than 3.2 million accounts subject to debt-management proceedings and just over £4.6 billion outstanding across Great Britain.", "type": "paragraph"}, {"text": "England is now changing the rules governing how quickly a missed council tax payment can escalate.", "type": "paragraph"}, {"text": "Ministers have already decided that households should have substantially longer before they lose the right to continue paying by instalments. Under reforms announced in April, that period will extend to at least 63 days after the first missed payment. Councils will also have to follow statutory steps before formal enforcement, and the costs they can add for seeking a liability order will be capped at £100.", "type": "paragraph"}, {"text": "Those protections will not begin until April 2027.", "type": "paragraph"}, {"text": "The current regulations give councils considerably more scope to move quickly.", "type": "paragraph"}, {"text": "They do not prescribe a minimum period between an instalment being missed and a reminder being sent. The government's latest consultation says practices therefore vary between councils. If the arrears remain unpaid, the existing system can ultimately make the remaining annual balance payable before a council seeks a liability order from the magistrates' court.", "type": "paragraph"}, {"text": "The replacement is much more prescriptive.", "type": "paragraph"}, {"text": "Under proposals published on 1 July, a final notice could not be issued earlier than 41 days after the missed instalment, or until at least 14 days after the most recent reminder. The household would then have 21 days to pay the amount demanded. If it remained unpaid, the rest of the year's bill could become due on day 63.", "type": "paragraph"}, {"text": "The government also wants reminder notices to direct households towards debt advice, payment plans, discounts and other support rather than immediately emphasising the most severe enforcement powers.", "type": "paragraph"}, {"text": "Ministers have not concluded that councils should stop pursuing unpaid council tax.", "type": "paragraph"}, {"text": "Council tax is a major source of local government income, and the government says councils must retain the ability to enforce debts against people who can pay but deliberately do not. Councils have warned that slowing the process could affect in-year collection rates and cash flow. The government is seeking evidence on those costs before the new rules are finalised.", "type": "paragraph"}, {"text": "The average Band D council tax bill in England is £2,392 in 2026/27, up £111, or 4.9 per cent, in a year. Of 384 authorities subject to referendum principles, 274 used the maximum increase available without a referendum and another 50 came close.", "type": "paragraph"}, {"text": "There is already a direct precedent for the 63-day rule.", "type": "paragraph"}, {"text": "Wales introduced essentially the same minimum period on 1 April 2026. Welsh councils must now give households at least 63 days from a missed payment before applying for a liability order on the unpaid annual balance, with a reminder and final notice required first.", "type": "paragraph"}, {"text": "England's own government response explicitly says its reform is aligned with the change in Wales.", "type": "paragraph"}, {"text": "It is too early to say what the Welsh change has done to collection rates or court action. The official Welsh collection statistics covering April 2026 to March 2027 are not due until June 2027.", "type": "paragraph"}, {"text": "That leaves an unusual position in England.", "type": "paragraph"}, {"text": "The government has already decided that households need more time before council tax arrears can escalate towards court enforcement. It has settled on a 63-day minimum, a model already operating in Wales, and is now consulting on the detailed notices councils must issue.", "type": "paragraph"}, {"text": "For the rest of the current financial year, English councils will continue using the existing statutory timetable.", "type": "paragraph"}]$o$);
  UPDATE public.editorials SET body_json = $n$[{"text": "GMB's published regional data record 992,536 council tax court actions in England in 2024/25, although the union's figures contain an unresolved discrepancy that prevents a clean national total.", "type": "paragraph"}, {"text": "GMB sent Freedom of Information requests to councils across Great Britain responsible for collecting council tax. Almost 200 replied within the statutory deadline. Its published table records entries in a \"Court 24/25\" column for each region. Summing the nine English regional entries gives 992,536. Councils that did not respond are absent from the exercise altogether.", "type": "paragraph"}, {"text": "There is also a discrepancy in GMB's own national figures.", "type": "paragraph"}, {"text": "The text accompanying its investigation says 1,430,726 people were summoned to court across Great Britain. The regional table on the same page totals 1,505,126 court entries, a difference of 74,400. GMB variously describes the figures as people, summonses and court cases.", "type": "paragraph"}, {"text": "Neither of those totals reconciles cleanly with the regional breakdown either. Adding the English, Scottish and Welsh regional entries together gives 1,272,272, some 232,854 short of the table's own printed total of 1,505,126. GMB has not published an explanation for the gap.", "type": "paragraph"}, {"text": "The defensible finding is therefore not a single precise national total. It is that responding councils reported court enforcement on a scale running into nearly a million cases in England alone, with the true national total unavailable from the published exercise.", "type": "paragraph"}, {"text": "The same responses recorded 4,593,838 council tax accounts in arrears, more than 3.2 million accounts subject to debt-management proceedings and just over £4.6 billion outstanding across Great Britain.", "type": "paragraph"}, {"text": "England is now changing the rules governing how quickly a missed council tax payment can escalate.", "type": "paragraph"}, {"text": "Ministers have already decided that households should have substantially longer before they lose the right to continue paying by instalments. Under reforms announced in April, that period will extend to at least 63 days after the first missed payment. Councils will also have to follow statutory steps before formal enforcement, and the costs they can add for seeking a liability order will be capped at £100.", "type": "paragraph"}, {"text": "Those protections will not begin until April 2027.", "type": "paragraph"}, {"text": "The current regulations give councils considerably more scope to move quickly.", "type": "paragraph"}, {"text": "They do not prescribe a minimum period between an instalment being missed and a reminder being sent. The government's latest consultation says practices therefore vary between councils. If the arrears remain unpaid, the existing system can ultimately make the remaining annual balance payable before a council seeks a liability order from the magistrates' court.", "type": "paragraph"}, {"text": "The replacement is much more prescriptive.", "type": "paragraph"}, {"text": "Under proposals published on 1 July, a final notice could not be issued earlier than 41 days after the missed instalment, or until at least 14 days after the most recent reminder. The household would then have 21 days to pay the amount demanded. If it remained unpaid, the rest of the year's bill could become due on day 63.", "type": "paragraph"}, {"text": "The government also wants reminder notices to direct households towards debt advice, payment plans, discounts and other support rather than immediately emphasising the most severe enforcement powers.", "type": "paragraph"}, {"text": "Ministers have not concluded that councils should stop pursuing unpaid council tax.", "type": "paragraph"}, {"text": "Council tax is a major source of local government income, and the government says councils must retain the ability to enforce debts against people who can pay but deliberately do not. Councils have warned that slowing the process could affect in-year collection rates and cash flow. The government is seeking evidence on those costs before the new rules are finalised.", "type": "paragraph"}, {"text": "The average Band D council tax bill in England is £2,392 in 2026/27, up £111, or 4.9 per cent, in a year. Of 384 authorities subject to referendum principles, 274 used the maximum increase available without a referendum and another 50 came close.", "type": "paragraph"}, {"text": "There is already a direct precedent for the 63-day rule.", "type": "paragraph"}, {"text": "Wales introduced essentially the same minimum period on 1 April 2026. Welsh councils must now give households at least 63 days from a missed payment before applying for a liability order on the unpaid annual balance, with a reminder and final notice required first.", "type": "paragraph"}, {"text": "England's own government response explicitly says its reform is aligned with the change in Wales.", "type": "paragraph"}, {"text": "It is too early to say what the Welsh change has done to collection rates or court action. The official Welsh collection statistics covering April 2026 to March 2027 are not due until June 2027.", "type": "paragraph"}, {"text": "That leaves an unusual position in England.", "type": "paragraph"}, {"text": "The government has already decided that households need more time before council tax arrears can escalate towards court enforcement. It has settled on a 63-day minimum, a model already operating in Wales, and is now consulting on the detailed notices councils must issue.", "type": "paragraph"}, {"text": "For the rest of the current financial year, English councils will continue using the existing statutory timetable.", "type": "paragraph"}]$n$::jsonb WHERE slug::text = $k$ck8m2wq7x3$k$ AND body_json = $o$[{"text": "GMB's published regional data record 992,536 council tax court actions in England in 2024/25, although the union's figures contain an unresolved discrepancy that prevents a clean national total.", "type": "paragraph"}, {"text": "GMB sent Freedom of Information requests to councils across Great Britain responsible for collecting council tax. Almost 200 replied within the statutory deadline. Its published table records entries in a \"Court 24/25\" column for each region. Summing the nine English regional entries gives 992,536. Councils that did not respond are absent from the exercise altogether.", "type": "paragraph"}, {"text": "There is also a discrepancy in GMB's own national figures.", "type": "paragraph"}, {"text": "The text accompanying its investigation says 1,430,726 people were summoned to court across Great Britain. The regional table on the same page totals 1,505,126 court entries, a difference of 74,400. GMB variously describes the figures as people, summonses and court cases.", "type": "paragraph"}, {"text": "Neither of those totals reconciles cleanly with the regional breakdown either. Adding the English, Scottish and Welsh regional entries together gives 1,272,272 — some 232,854 short of the table's own printed total of 1,505,126. GMB has not published an explanation for the gap.", "type": "paragraph"}, {"text": "The defensible finding is therefore not a single precise national total. It is that responding councils reported court enforcement on a scale running into nearly a million cases in England alone, with the true national total unavailable from the published exercise.", "type": "paragraph"}, {"text": "The same responses recorded 4,593,838 council tax accounts in arrears, more than 3.2 million accounts subject to debt-management proceedings and just over £4.6 billion outstanding across Great Britain.", "type": "paragraph"}, {"text": "England is now changing the rules governing how quickly a missed council tax payment can escalate.", "type": "paragraph"}, {"text": "Ministers have already decided that households should have substantially longer before they lose the right to continue paying by instalments. Under reforms announced in April, that period will extend to at least 63 days after the first missed payment. Councils will also have to follow statutory steps before formal enforcement, and the costs they can add for seeking a liability order will be capped at £100.", "type": "paragraph"}, {"text": "Those protections will not begin until April 2027.", "type": "paragraph"}, {"text": "The current regulations give councils considerably more scope to move quickly.", "type": "paragraph"}, {"text": "They do not prescribe a minimum period between an instalment being missed and a reminder being sent. The government's latest consultation says practices therefore vary between councils. If the arrears remain unpaid, the existing system can ultimately make the remaining annual balance payable before a council seeks a liability order from the magistrates' court.", "type": "paragraph"}, {"text": "The replacement is much more prescriptive.", "type": "paragraph"}, {"text": "Under proposals published on 1 July, a final notice could not be issued earlier than 41 days after the missed instalment, or until at least 14 days after the most recent reminder. The household would then have 21 days to pay the amount demanded. If it remained unpaid, the rest of the year's bill could become due on day 63.", "type": "paragraph"}, {"text": "The government also wants reminder notices to direct households towards debt advice, payment plans, discounts and other support rather than immediately emphasising the most severe enforcement powers.", "type": "paragraph"}, {"text": "Ministers have not concluded that councils should stop pursuing unpaid council tax.", "type": "paragraph"}, {"text": "Council tax is a major source of local government income, and the government says councils must retain the ability to enforce debts against people who can pay but deliberately do not. Councils have warned that slowing the process could affect in-year collection rates and cash flow. The government is seeking evidence on those costs before the new rules are finalised.", "type": "paragraph"}, {"text": "The average Band D council tax bill in England is £2,392 in 2026/27, up £111, or 4.9 per cent, in a year. Of 384 authorities subject to referendum principles, 274 used the maximum increase available without a referendum and another 50 came close.", "type": "paragraph"}, {"text": "There is already a direct precedent for the 63-day rule.", "type": "paragraph"}, {"text": "Wales introduced essentially the same minimum period on 1 April 2026. Welsh councils must now give households at least 63 days from a missed payment before applying for a liability order on the unpaid annual balance, with a reminder and final notice required first.", "type": "paragraph"}, {"text": "England's own government response explicitly says its reform is aligned with the change in Wales.", "type": "paragraph"}, {"text": "It is too early to say what the Welsh change has done to collection rates or court action. The official Welsh collection statistics covering April 2026 to March 2027 are not due until June 2027.", "type": "paragraph"}, {"text": "That leaves an unusual position in England.", "type": "paragraph"}, {"text": "The government has already decided that households need more time before council tax arrears can escalate towards court enforcement. It has settled on a 63-day minimum, a model already operating in Wales, and is now consulting on the detailed notices councils must issue.", "type": "paragraph"}, {"text": "For the rest of the current financial year, English councils will continue using the existing statutory timetable.", "type": "paragraph"}]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'editorials.body_json row % updated % rows', $k$ck8m2wq7x3$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$31e92efe19$k$, 'headline', $o$Farage quits his own seat to dodge standards probe — then tries to win it back$o$);
  UPDATE public.briefings SET headline = $n$Farage quits his own seat to dodge standards probe, then tries to win it back$n$ WHERE slug::text = $k$31e92efe19$k$ AND headline = $o$Farage quits his own seat to dodge standards probe — then tries to win it back$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.headline row % updated % rows', $k$31e92efe19$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$f8627e2be1$k$, 'headline', $o$Farage Quits Parliament to Dodge Standards Probe — Then Immediately Tries to Win His Seat Back$o$);
  UPDATE public.briefings SET headline = $n$Farage Quits Parliament to Dodge Standards Probe, Then Immediately Tries to Win His Seat Back$n$ WHERE slug::text = $k$f8627e2be1$k$ AND headline = $o$Farage Quits Parliament to Dodge Standards Probe — Then Immediately Tries to Win His Seat Back$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.headline row % updated % rows', $k$f8627e2be1$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$7bb78d3366$k$, 'headline', $o$Labour nominations close this week and Burnham is on course to be PM by Sunday — but some of his own MPs say a coronation denies members their voice$o$);
  UPDATE public.briefings SET headline = $n$Labour nominations close this week and Burnham is on course to be PM by Sunday, but some of his own MPs say a coronation denies members their voice$n$ WHERE slug::text = $k$7bb78d3366$k$ AND headline = $o$Labour nominations close this week and Burnham is on course to be PM by Sunday — but some of his own MPs say a coronation denies members their voice$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.headline row % updated % rows', $k$7bb78d3366$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$920e6b2857$k$, 'headline', $o$Lords set to debate cohabitation rights and undercover policing this week — two accountability bills the Commons has stalled on for years$o$);
  UPDATE public.briefings SET headline = $n$Lords set to debate cohabitation rights and undercover policing this week: two accountability bills the Commons has stalled on for years$n$ WHERE slug::text = $k$920e6b2857$k$ AND headline = $o$Lords set to debate cohabitation rights and undercover policing this week — two accountability bills the Commons has stalled on for years$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.headline row % updated % rows', $k$920e6b2857$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$52c0c7633d$k$, 'body', $o$The cross-party Treasury Committee has demanded the government reverse its freeze on the student loan repayment threshold, calling it a moral obligation. The report was published on 7 July 2026.

The freeze locks the Plan 2 repayment threshold at £29,385 for three years from April 2027. When the loans were first sold to students in 2010, the government promised the threshold would rise with earnings every year from 2016. Both Conservative and Labour governments have repeatedly broken that promise.

The committee found that students were effectively mis-sold their loans. The government compared repayments to a mobile phone contract, then rewrote the terms after graduates had signed up, while relying on exemptions from consumer protection law that leave borrowers with virtually no legal recourse.

Committee chair Dame Meg Hillier said: "Ministers openly accept that the system is broken and unfair but have said that it is not a priority to fix it."

The freeze raises just £255 million extra next year — more than 1% of the £23 billion in total fiscal consolidation measures from the 2025 Budget. The committee called it a modest reversal the government can afford.$o$);
  UPDATE public.briefings SET body = $n$The cross-party Treasury Committee has demanded the government reverse its freeze on the student loan repayment threshold, calling it a moral obligation. The report was published on 7 July 2026.

The freeze locks the Plan 2 repayment threshold at £29,385 for three years from April 2027. When the loans were first sold to students in 2010, the government promised the threshold would rise with earnings every year from 2016. Both Conservative and Labour governments have repeatedly broken that promise.

The committee found that students were effectively mis-sold their loans. The government compared repayments to a mobile phone contract, then rewrote the terms after graduates had signed up, while relying on exemptions from consumer protection law that leave borrowers with virtually no legal recourse.

Committee chair Dame Meg Hillier said: "Ministers openly accept that the system is broken and unfair but have said that it is not a priority to fix it."

The freeze raises just £255 million extra next year, more than 1% of the £23 billion in total fiscal consolidation measures from the 2025 Budget. The committee called it a modest reversal the government can afford.$n$ WHERE slug::text = $k$52c0c7633d$k$ AND body = $o$The cross-party Treasury Committee has demanded the government reverse its freeze on the student loan repayment threshold, calling it a moral obligation. The report was published on 7 July 2026.

The freeze locks the Plan 2 repayment threshold at £29,385 for three years from April 2027. When the loans were first sold to students in 2010, the government promised the threshold would rise with earnings every year from 2016. Both Conservative and Labour governments have repeatedly broken that promise.

The committee found that students were effectively mis-sold their loans. The government compared repayments to a mobile phone contract, then rewrote the terms after graduates had signed up, while relying on exemptions from consumer protection law that leave borrowers with virtually no legal recourse.

Committee chair Dame Meg Hillier said: "Ministers openly accept that the system is broken and unfair but have said that it is not a priority to fix it."

The freeze raises just £255 million extra next year — more than 1% of the £23 billion in total fiscal consolidation measures from the 2025 Budget. The committee called it a modest reversal the government can afford.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$52c0c7633d$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$31e92efe19$k$, 'body', $o$Nigel Farage resigned as MP for Clacton on 7 July, triggering a by-election he intends to contest himself. The move came as a parliamentary standards investigation closed in on his finances, including reportedly undeclared gifts and the use of a London townhouse funded by long-time associate George Cottrell, who was jailed in the US for wire fraud in 2017.

The writ to formally trigger the poll was moved on 9 July. Polling day is set for 13 August 2026.

Every major party has refused to stand against him. Labour called it "this circus." Kemi Badenoch called it a "fake by-election" and said Farage should "man up and answer some questions." Ed Davey labelled it "Farage's vanity project."

The standards investigation will pause during the contest but resume once a result is declared. If it ultimately leads to a suspension of more than 10 sitting days or 14 calendar days, a recall petition remains possible — at a time of no one's choosing but his.

Farage won Clacton with 46.2% in 2024. The PollCheck model currently projects Reform near 60% in the seat. A £5 million payment to Reform UK from donor Harborne was reportedly flagged to the National Crime Agency under anti-money laundering rules on the day of Farage's resignation.$o$);
  UPDATE public.briefings SET body = $n$Nigel Farage resigned as MP for Clacton on 7 July, triggering a by-election he intends to contest himself. The move came as a parliamentary standards investigation closed in on his finances, including reportedly undeclared gifts and the use of a London townhouse funded by long-time associate George Cottrell, who was jailed in the US for wire fraud in 2017.

The writ to formally trigger the poll was moved on 9 July. Polling day is set for 13 August 2026.

Every major party has refused to stand against him. Labour called it "this circus." Kemi Badenoch called it a "fake by-election" and said Farage should "man up and answer some questions." Ed Davey labelled it "Farage's vanity project."

The standards investigation will pause during the contest but resume once a result is declared. If it ultimately leads to a suspension of more than 10 sitting days or 14 calendar days, a recall petition remains possible, at a time of no one's choosing but his.

Farage won Clacton with 46.2% in 2024. The PollCheck model currently projects Reform near 60% in the seat. A £5 million payment to Reform UK from donor Harborne was reportedly flagged to the National Crime Agency under anti-money laundering rules on the day of Farage's resignation.$n$ WHERE slug::text = $k$31e92efe19$k$ AND body = $o$Nigel Farage resigned as MP for Clacton on 7 July, triggering a by-election he intends to contest himself. The move came as a parliamentary standards investigation closed in on his finances, including reportedly undeclared gifts and the use of a London townhouse funded by long-time associate George Cottrell, who was jailed in the US for wire fraud in 2017.

The writ to formally trigger the poll was moved on 9 July. Polling day is set for 13 August 2026.

Every major party has refused to stand against him. Labour called it "this circus." Kemi Badenoch called it a "fake by-election" and said Farage should "man up and answer some questions." Ed Davey labelled it "Farage's vanity project."

The standards investigation will pause during the contest but resume once a result is declared. If it ultimately leads to a suspension of more than 10 sitting days or 14 calendar days, a recall petition remains possible — at a time of no one's choosing but his.

Farage won Clacton with 46.2% in 2024. The PollCheck model currently projects Reform near 60% in the seat. A £5 million payment to Reform UK from donor Harborne was reportedly flagged to the National Crime Agency under anti-money laundering rules on the day of Farage's resignation.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$31e92efe19$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$39fae59df8$k$, 'body', $o$Nominations to replace Keir Starmer as Labour leader opened on 9 July. Andy Burnham is the only declared candidate. Nominations close on 16 July.

If no other candidate clears the threshold of 81 MP nominations, a special conference on 17 July will confirm Burnham as leader. He would then meet King Charles III and become Prime Minister on 20 July.

Starmer announced his resignation on 22 June after losing the confidence of his MPs. He had held office for exactly two years following Labour's July 2024 landslide. Burnham returned to Parliament only on 22 June itself, winning the Makerfield by-election after the seat's incumbent resigned to clear his path.

All other potential contenders — including Wes Streeting and Al Carns — have ruled themselves out and endorsed Burnham. A Lord Ashcroft poll found only 27% of Britons believe Burnham should become PM without a leadership race. Burnham has pledged to relocate part of Downing Street's operations to Manchester.$o$);
  UPDATE public.briefings SET body = $n$Nominations to replace Keir Starmer as Labour leader opened on 9 July. Andy Burnham is the only declared candidate. Nominations close on 16 July.

If no other candidate clears the threshold of 81 MP nominations, a special conference on 17 July will confirm Burnham as leader. He would then meet King Charles III and become Prime Minister on 20 July.

Starmer announced his resignation on 22 June after losing the confidence of his MPs. He had held office for exactly two years following Labour's July 2024 landslide. Burnham returned to Parliament only on 22 June itself, winning the Makerfield by-election after the seat's incumbent resigned to clear his path.

All other potential contenders, including Wes Streeting and Al Carns, have ruled themselves out and endorsed Burnham. A Lord Ashcroft poll found only 27% of Britons believe Burnham should become PM without a leadership race. Burnham has pledged to relocate part of Downing Street's operations to Manchester.$n$ WHERE slug::text = $k$39fae59df8$k$ AND body = $o$Nominations to replace Keir Starmer as Labour leader opened on 9 July. Andy Burnham is the only declared candidate. Nominations close on 16 July.

If no other candidate clears the threshold of 81 MP nominations, a special conference on 17 July will confirm Burnham as leader. He would then meet King Charles III and become Prime Minister on 20 July.

Starmer announced his resignation on 22 June after losing the confidence of his MPs. He had held office for exactly two years following Labour's July 2024 landslide. Burnham returned to Parliament only on 22 June itself, winning the Makerfield by-election after the seat's incumbent resigned to clear his path.

All other potential contenders — including Wes Streeting and Al Carns — have ruled themselves out and endorsed Burnham. A Lord Ashcroft poll found only 27% of Britons believe Burnham should become PM without a leadership race. Burnham has pledged to relocate part of Downing Street's operations to Manchester.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$39fae59df8$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$95b73adcf0$k$, 'body', $o$Andy Burnham is on the verge of becoming Britain's next Prime Minister without a single vote being cast. Nominations for the Labour leadership close on 16 July. If no other candidate qualifies, a special conference on 17 July confirms him unopposed.

Keir Starmer quit as Labour leader on 22 June after losing the support of his MPs. Burnham had just won the Makerfield by-election, making him eligible to stand under party rules that require any leadership candidate to be a sitting MP.

To get on the ballot, a candidate must secure backing from 81 of Labour's 402 MPs. Burnham has reportedly already far exceeded that threshold. No rival has publicly declared.

This would make Burnham Britain's seventh Prime Minister in ten years — the highest turnover in nearly two centuries, according to Vatican News. The DWP has not yet been asked about the handover date.$o$);
  UPDATE public.briefings SET body = $n$Andy Burnham is on the verge of becoming Britain's next Prime Minister without a single vote being cast. Nominations for the Labour leadership close on 16 July. If no other candidate qualifies, a special conference on 17 July confirms him unopposed.

Keir Starmer quit as Labour leader on 22 June after losing the support of his MPs. Burnham had just won the Makerfield by-election, making him eligible to stand under party rules that require any leadership candidate to be a sitting MP.

To get on the ballot, a candidate must secure backing from 81 of Labour's 402 MPs. Burnham has reportedly already far exceeded that threshold. No rival has publicly declared.

This would make Burnham Britain's seventh Prime Minister in ten years, the highest turnover in nearly two centuries, according to Vatican News. The DWP has not yet been asked about the handover date.$n$ WHERE slug::text = $k$95b73adcf0$k$ AND body = $o$Andy Burnham is on the verge of becoming Britain's next Prime Minister without a single vote being cast. Nominations for the Labour leadership close on 16 July. If no other candidate qualifies, a special conference on 17 July confirms him unopposed.

Keir Starmer quit as Labour leader on 22 June after losing the support of his MPs. Burnham had just won the Makerfield by-election, making him eligible to stand under party rules that require any leadership candidate to be a sitting MP.

To get on the ballot, a candidate must secure backing from 81 of Labour's 402 MPs. Burnham has reportedly already far exceeded that threshold. No rival has publicly declared.

This would make Burnham Britain's seventh Prime Minister in ten years — the highest turnover in nearly two centuries, according to Vatican News. The DWP has not yet been asked about the handover date.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$95b73adcf0$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$f8627e2be1$k$, 'body', $o$Nigel Farage resigned as MP for Clacton on 7 July while under investigation by Parliament's standards watchdog — then announced he would stand in the by-election he himself triggered. The probe is suspended the moment he ceases to be an MP.

Parliamentary standards commissioner Daniel Greenberg was already investigating a £5 million gift to Farage from Thailand-based cryptocurrency billionaire Christopher Harborne. A second inquiry was then requested over undeclared payments from George Cottrell — a former aide convicted of wire fraud in the United States — who reportedly paid for Farage's security and staff before he became an MP.

Farage insists he has "done nothing wrong." His Reform Treasury spokesman Robert Jenrick called the Cottrell payments "a minor administrative error."

Every major party refused to field a candidate against him. Labour called him "engulfed in a sleaze scandal." Conservative leader Kemi Badenoch called the by-election "fake" and "a gimmick." Count Binface has confirmed he will run.$o$);
  UPDATE public.briefings SET body = $n$Nigel Farage resigned as MP for Clacton on 7 July while under investigation by Parliament's standards watchdog, then announced he would stand in the by-election he himself triggered. The probe is suspended the moment he ceases to be an MP.

Parliamentary standards commissioner Daniel Greenberg was already investigating a £5 million gift to Farage from Thailand-based cryptocurrency billionaire Christopher Harborne. A second inquiry was then requested over undeclared payments from George Cottrell, a former aide convicted of wire fraud in the United States, who reportedly paid for Farage's security and staff before he became an MP.

Farage insists he has "done nothing wrong." His Reform Treasury spokesman Robert Jenrick called the Cottrell payments "a minor administrative error."

Every major party refused to field a candidate against him. Labour called him "engulfed in a sleaze scandal." Conservative leader Kemi Badenoch called the by-election "fake" and "a gimmick." Count Binface has confirmed he will run.$n$ WHERE slug::text = $k$f8627e2be1$k$ AND body = $o$Nigel Farage resigned as MP for Clacton on 7 July while under investigation by Parliament's standards watchdog — then announced he would stand in the by-election he himself triggered. The probe is suspended the moment he ceases to be an MP.

Parliamentary standards commissioner Daniel Greenberg was already investigating a £5 million gift to Farage from Thailand-based cryptocurrency billionaire Christopher Harborne. A second inquiry was then requested over undeclared payments from George Cottrell — a former aide convicted of wire fraud in the United States — who reportedly paid for Farage's security and staff before he became an MP.

Farage insists he has "done nothing wrong." His Reform Treasury spokesman Robert Jenrick called the Cottrell payments "a minor administrative error."

Every major party refused to field a candidate against him. Labour called him "engulfed in a sleaze scandal." Conservative leader Kemi Badenoch called the by-election "fake" and "a gimmick." Count Binface has confirmed he will run.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$f8627e2be1$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$99612fea22$k$, 'body', $o$A cross-party committee of MPs published a report this week demanding the government boost Universal Credit for 66-year-olds before the state pension age rise hits them hard. The Work and Pensions Committee wants the change in place by the end of 2026.

The state pension age is rising gradually from 66 to 67, reaching 67 by April 2028. Anyone who cannot keep working in the meantime is left on the standard Universal Credit rate of £425 a month. Pension Credit — which guarantees £1,031 a month — is only available once state pension age is reached.

The committee pointed to the last time the pension age rose. When it went from 65 to 66, absolute poverty rates among those affected more than doubled — from 10 per cent to 24 per cent. The committee warned the impact this time is "likely to be greater."

Only 42 per cent of 66-year-olds are currently in paid work. The DWP said it would consider the report's recommendations "in due course."$o$);
  UPDATE public.briefings SET body = $n$A cross-party committee of MPs published a report this week demanding the government boost Universal Credit for 66-year-olds before the state pension age rise hits them hard. The Work and Pensions Committee wants the change in place by the end of 2026.

The state pension age is rising gradually from 66 to 67, reaching 67 by April 2028. Anyone who cannot keep working in the meantime is left on the standard Universal Credit rate of £425 a month. Pension Credit, which guarantees £1,031 a month, is only available once state pension age is reached.

The committee pointed to the last time the pension age rose. When it went from 65 to 66, absolute poverty rates among those affected more than doubled, from 10 per cent to 24 per cent. The committee warned the impact this time is "likely to be greater."

Only 42 per cent of 66-year-olds are currently in paid work. The DWP said it would consider the report's recommendations "in due course."$n$ WHERE slug::text = $k$99612fea22$k$ AND body = $o$A cross-party committee of MPs published a report this week demanding the government boost Universal Credit for 66-year-olds before the state pension age rise hits them hard. The Work and Pensions Committee wants the change in place by the end of 2026.

The state pension age is rising gradually from 66 to 67, reaching 67 by April 2028. Anyone who cannot keep working in the meantime is left on the standard Universal Credit rate of £425 a month. Pension Credit — which guarantees £1,031 a month — is only available once state pension age is reached.

The committee pointed to the last time the pension age rose. When it went from 65 to 66, absolute poverty rates among those affected more than doubled — from 10 per cent to 24 per cent. The committee warned the impact this time is "likely to be greater."

Only 42 per cent of 66-year-olds are currently in paid work. The DWP said it would consider the report's recommendations "in due course."$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$99612fea22$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$ef9b698039$k$, 'body', $o$Nigel Farage resigned as MP for Clacton on 7 July, forcing a by-election in which he intends to stand again. The move suspends a parliamentary standards investigation into his finances for as long as he remains outside the House.

Parliamentary standards commissioner Daniel Greenberg was already investigating a £5 million gift to Farage from Christopher Harborne, a cryptocurrency billionaire based in Thailand. A second referral followed after the Sunday Times reported that Farage failed to declare payments from George Cottrell — an aide convicted of wire fraud in the United States in 2016 — made before Farage became an MP.

Farage insists he has "done nothing wrong." Reform treasury spokesman Robert Jenrick confirmed Cottrell had paid for Farage's security and staff but said the payments predated Farage's election to parliament.

If Farage loses the by-election, the standards commissioner will decide whether to resume the investigation under official protocol.

Labour, the Conservatives and the Liberal Democrats all declined to field candidates. A Labour spokesperson called Farage "engulfed in a sleaze scandal." Kemi Badenoch called the by-election "fake" and "a gimmick."$o$);
  UPDATE public.briefings SET body = $n$Nigel Farage resigned as MP for Clacton on 7 July, forcing a by-election in which he intends to stand again. The move suspends a parliamentary standards investigation into his finances for as long as he remains outside the House.

Parliamentary standards commissioner Daniel Greenberg was already investigating a £5 million gift to Farage from Christopher Harborne, a cryptocurrency billionaire based in Thailand. A second referral followed after the Sunday Times reported that Farage failed to declare payments from George Cottrell, an aide convicted of wire fraud in the United States in 2016, made before Farage became an MP.

Farage insists he has "done nothing wrong." Reform treasury spokesman Robert Jenrick confirmed Cottrell had paid for Farage's security and staff but said the payments predated Farage's election to parliament.

If Farage loses the by-election, the standards commissioner will decide whether to resume the investigation under official protocol.

Labour, the Conservatives and the Liberal Democrats all declined to field candidates. A Labour spokesperson called Farage "engulfed in a sleaze scandal." Kemi Badenoch called the by-election "fake" and "a gimmick."$n$ WHERE slug::text = $k$ef9b698039$k$ AND body = $o$Nigel Farage resigned as MP for Clacton on 7 July, forcing a by-election in which he intends to stand again. The move suspends a parliamentary standards investigation into his finances for as long as he remains outside the House.

Parliamentary standards commissioner Daniel Greenberg was already investigating a £5 million gift to Farage from Christopher Harborne, a cryptocurrency billionaire based in Thailand. A second referral followed after the Sunday Times reported that Farage failed to declare payments from George Cottrell — an aide convicted of wire fraud in the United States in 2016 — made before Farage became an MP.

Farage insists he has "done nothing wrong." Reform treasury spokesman Robert Jenrick confirmed Cottrell had paid for Farage's security and staff but said the payments predated Farage's election to parliament.

If Farage loses the by-election, the standards commissioner will decide whether to resume the investigation under official protocol.

Labour, the Conservatives and the Liberal Democrats all declined to field candidates. A Labour spokesperson called Farage "engulfed in a sleaze scandal." Kemi Badenoch called the by-election "fake" and "a gimmick."$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$ef9b698039$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$57f7c0f6bf$k$, 'body', $o$Keir Starmer will take Prime Minister's Questions in the Commons for the final time today, according to the Hansard Society's parliamentary bulletin for the week of 13–17 July.

Starmer announced his resignation as Prime Minister and Labour leader on 22 June 2026, days after Andy Burnham won the Makerfield by-election and confirmed he would challenge for the leadership.

Nominations for the contest opened on 9 July and close on 16 July. If only one candidate is validly nominated, a special conference on 17 July can confirm them unopposed. If the race is contested, a member ballot runs through August, with a result due by 29 August.

To reach the ballot a candidate must be nominated by 81 Labour MPs — 20 per cent of the parliamentary party. Burnham is the frontrunner. The ruling National Executive Committee set the full timetable on 25 June.

The Lords order paper for today shows peers are simultaneously scrutinising the Railways Bill and a national security statutory instrument linked to the National Security (State Threats) Act 2026, which received Royal Assent last week.$o$);
  UPDATE public.briefings SET body = $n$Keir Starmer will take Prime Minister's Questions in the Commons for the final time today, according to the Hansard Society's parliamentary bulletin for the week of 13 to 17 July.

Starmer announced his resignation as Prime Minister and Labour leader on 22 June 2026, days after Andy Burnham won the Makerfield by-election and confirmed he would challenge for the leadership.

Nominations for the contest opened on 9 July and close on 16 July. If only one candidate is validly nominated, a special conference on 17 July can confirm them unopposed. If the race is contested, a member ballot runs through August, with a result due by 29 August.

To reach the ballot a candidate must be nominated by 81 Labour MPs, 20 per cent of the parliamentary party. Burnham is the frontrunner. The ruling National Executive Committee set the full timetable on 25 June.

The Lords order paper for today shows peers are simultaneously scrutinising the Railways Bill and a national security statutory instrument linked to the National Security (State Threats) Act 2026, which received Royal Assent last week.$n$ WHERE slug::text = $k$57f7c0f6bf$k$ AND body = $o$Keir Starmer will take Prime Minister's Questions in the Commons for the final time today, according to the Hansard Society's parliamentary bulletin for the week of 13–17 July.

Starmer announced his resignation as Prime Minister and Labour leader on 22 June 2026, days after Andy Burnham won the Makerfield by-election and confirmed he would challenge for the leadership.

Nominations for the contest opened on 9 July and close on 16 July. If only one candidate is validly nominated, a special conference on 17 July can confirm them unopposed. If the race is contested, a member ballot runs through August, with a result due by 29 August.

To reach the ballot a candidate must be nominated by 81 Labour MPs — 20 per cent of the parliamentary party. Burnham is the frontrunner. The ruling National Executive Committee set the full timetable on 25 June.

The Lords order paper for today shows peers are simultaneously scrutinising the Railways Bill and a national security statutory instrument linked to the National Security (State Threats) Act 2026, which received Royal Assent last week.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$57f7c0f6bf$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$1f7715902c$k$, 'body', $o$Nigel Farage's £5 million gift from crypto-billionaire and Reform donor Christopher Harborne has been reported to the National Crime Agency by bankers under anti-money laundering rules. The referral, made on the same day Farage quit as an MP, adds a criminal-law dimension to what had previously been a parliamentary standards matter.

Farage formally vacated his Clacton seat on 8 July after being appointed Steward and Bailiff of the Manor of Northstead — the procedural device MPs use to resign. He is standing again in the resulting by-election, set for 13 August.

Every major party is boycotting the contest. Labour called it "this circus." Kemi Badenoch called it a "fake by-election" and an "ego by-election." The Lib Dems' Ed Davey called it "Farage's vanity project."

That leaves Count Binface as Farage's highest-profile opponent. A nationwide Ipsos poll found 33% of British adults want Binface to win, against 21% for Farage.

The parliamentary standards investigation into whether Farage broke Commons rules by failing to declare the £5m gift has been suspended due to his resignation. It will resume if he wins and returns to the Commons. If he is then found to have broken the rules and suspended for more than 10 days, a recall petition could strip him of his seat — potentially triggering a second by-election.

Farage won Clacton in 2024 with 46.2% of the vote and a majority of 8,405.$o$);
  UPDATE public.briefings SET body = $n$Nigel Farage's £5 million gift from crypto-billionaire and Reform donor Christopher Harborne has been reported to the National Crime Agency by bankers under anti-money laundering rules. The referral, made on the same day Farage quit as an MP, adds a criminal-law dimension to what had previously been a parliamentary standards matter.

Farage formally vacated his Clacton seat on 8 July after being appointed Steward and Bailiff of the Manor of Northstead, the procedural device MPs use to resign. He is standing again in the resulting by-election, set for 13 August.

Every major party is boycotting the contest. Labour called it "this circus." Kemi Badenoch called it a "fake by-election" and an "ego by-election." The Lib Dems' Ed Davey called it "Farage's vanity project."

That leaves Count Binface as Farage's highest-profile opponent. A nationwide Ipsos poll found 33% of British adults want Binface to win, against 21% for Farage.

The parliamentary standards investigation into whether Farage broke Commons rules by failing to declare the £5m gift has been suspended due to his resignation. It will resume if he wins and returns to the Commons. If he is then found to have broken the rules and suspended for more than 10 days, a recall petition could strip him of his seat, potentially triggering a second by-election.

Farage won Clacton in 2024 with 46.2% of the vote and a majority of 8,405.$n$ WHERE slug::text = $k$1f7715902c$k$ AND body = $o$Nigel Farage's £5 million gift from crypto-billionaire and Reform donor Christopher Harborne has been reported to the National Crime Agency by bankers under anti-money laundering rules. The referral, made on the same day Farage quit as an MP, adds a criminal-law dimension to what had previously been a parliamentary standards matter.

Farage formally vacated his Clacton seat on 8 July after being appointed Steward and Bailiff of the Manor of Northstead — the procedural device MPs use to resign. He is standing again in the resulting by-election, set for 13 August.

Every major party is boycotting the contest. Labour called it "this circus." Kemi Badenoch called it a "fake by-election" and an "ego by-election." The Lib Dems' Ed Davey called it "Farage's vanity project."

That leaves Count Binface as Farage's highest-profile opponent. A nationwide Ipsos poll found 33% of British adults want Binface to win, against 21% for Farage.

The parliamentary standards investigation into whether Farage broke Commons rules by failing to declare the £5m gift has been suspended due to his resignation. It will resume if he wins and returns to the Commons. If he is then found to have broken the rules and suspended for more than 10 days, a recall petition could strip him of his seat — potentially triggering a second by-election.

Farage won Clacton in 2024 with 46.2% of the vote and a majority of 8,405.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$1f7715902c$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$eff6a11636$k$, 'body', $o$The Electoral Commission is now reviewing the SNP's past accounts to determine whether Peter Murrell embezzled public money alongside the £400,000 he stole from party donors. The watchdog confirmed this in correspondence to Westminster's Scottish Affairs Committee, published this week.

Murrell, former SNP chief executive and ex-husband of Nicola Sturgeon, was sentenced to five years and three months in prison on 23 June after pleading guilty to embezzling £400,310 from the SNP between August 2010 and October 2022.

The SNP received £2.2 million in Electoral Commission policy development grants and £8.2 million in Short Money — taxpayer-funded parliamentary support cash — during the same period. All of it went into a single bank account over which Murrell had control.

The Scottish Affairs Committee has agreed to write to Holyrood committees to explore a joint inquiry. John Swinney has refused to call one. The Electoral Commission told the committee it had seen no evidence of misuse of its grants so far, but said it was "working with the SNP to review any past accounts, declarations or disclosures."

If public money is found to have been stolen, the Commission can force the SNP to repay it or pursue civil proceedings.$o$);
  UPDATE public.briefings SET body = $n$The Electoral Commission is now reviewing the SNP's past accounts to determine whether Peter Murrell embezzled public money alongside the £400,000 he stole from party donors. The watchdog confirmed this in correspondence to Westminster's Scottish Affairs Committee, published this week.

Murrell, former SNP chief executive and ex-husband of Nicola Sturgeon, was sentenced to five years and three months in prison on 23 June after pleading guilty to embezzling £400,310 from the SNP between August 2010 and October 2022.

The SNP received £2.2 million in Electoral Commission policy development grants and £8.2 million in Short Money (taxpayer-funded parliamentary support cash) during the same period. All of it went into a single bank account over which Murrell had control.

The Scottish Affairs Committee has agreed to write to Holyrood committees to explore a joint inquiry. John Swinney has refused to call one. The Electoral Commission told the committee it had seen no evidence of misuse of its grants so far, but said it was "working with the SNP to review any past accounts, declarations or disclosures."

If public money is found to have been stolen, the Commission can force the SNP to repay it or pursue civil proceedings.$n$ WHERE slug::text = $k$eff6a11636$k$ AND body = $o$The Electoral Commission is now reviewing the SNP's past accounts to determine whether Peter Murrell embezzled public money alongside the £400,000 he stole from party donors. The watchdog confirmed this in correspondence to Westminster's Scottish Affairs Committee, published this week.

Murrell, former SNP chief executive and ex-husband of Nicola Sturgeon, was sentenced to five years and three months in prison on 23 June after pleading guilty to embezzling £400,310 from the SNP between August 2010 and October 2022.

The SNP received £2.2 million in Electoral Commission policy development grants and £8.2 million in Short Money — taxpayer-funded parliamentary support cash — during the same period. All of it went into a single bank account over which Murrell had control.

The Scottish Affairs Committee has agreed to write to Holyrood committees to explore a joint inquiry. John Swinney has refused to call one. The Electoral Commission told the committee it had seen no evidence of misuse of its grants so far, but said it was "working with the SNP to review any past accounts, declarations or disclosures."

If public money is found to have been stolen, the Commission can force the SNP to repay it or pursue civil proceedings.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$eff6a11636$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$7bb78d3366$k$, 'body', $o$Andy Burnham is on course to become Britain's next Prime Minister this week, with almost no policy detail nailed down. Labour's MP nomination window closes on 16 July. If no other candidates come forward, a special conference will confirm the result on July 17, the day after nominations close. If a single candidate is validly nominated, the leadership special conference on July 17 can confirm them as leader unopposed, with no members' ballot. By convention a new leader does not become Prime Minister on the same day, so the handover to No 10 follows a few days later — expected on July 20.

No one has challenged him. Burnham received 322 nominations on the day nominations opened, one short of the 323 that would mean no other candidate could receive enough nominations to challenge him. By July 13 the number of MPs nominating Burnham had increased to 349. Those included Communities Secretary Steve Reed, a key ally of Keir Starmer and the last cabinet minister still holding out; his nomination completed the cabinet's discretionary backing. Shabana Mahmood and Anna Turley do not nominate anyone by convention, as chairs of Labour's NEC and of the party. Starmer, as outgoing leader, also takes no part.

Burnham will be the first uncontested Labour leader in the modern era. Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed. But Brown had run the Treasury for a decade. Burnham is certain to be the UK's next prime minister. What's uncertain is almost everything else concerning his plans for government, with their detail still obscure to allies.

Many lawmakers feel he is the party's best chance of clawing back support from Nigel Farage's Reform UK before the next general election, expected in 2029. Reform has led Labour in national opinion polls for well over a year, although the gap has narrowed in recent weeks.

Not everyone is comfortable with the process. The Guardian reported that some Labour MPs still want a contested leadership race, arguing that an uncontested result denies the wider membership a vote and risks undermining Burnham's democratic mandate. An Ashcroft poll found only 27 per cent of Britons and 45 per cent of Labour voters believe Burnham should take over without a leadership race.

In his first major policy speech since entering Parliament, Burnham pledged to give more decision-making authority to regional governments, expand social housing, support industrial investment and relocate part of the Prime Minister's Office to Manchester. He did not provide details on how the proposals would be funded.

Former defence minister Al Carns had considered running. Carns said in a statement: 'I'd hoped a leadership contest would give us the opportunity for a proper debate.' He stood aside anyway. Burnham takes office with 349 backers and no mandate from Labour members.$o$);
  UPDATE public.briefings SET body = $n$Andy Burnham is on course to become Britain's next Prime Minister this week, with almost no policy detail nailed down. Labour's MP nomination window closes on 16 July. If no other candidates come forward, a special conference will confirm the result on July 17, the day after nominations close. If a single candidate is validly nominated, the leadership special conference on July 17 can confirm them as leader unopposed, with no members' ballot. By convention a new leader does not become Prime Minister on the same day, so the handover to No 10 follows a few days later, expected on July 20.

No one has challenged him. Burnham received 322 nominations on the day nominations opened, one short of the 323 that would mean no other candidate could receive enough nominations to challenge him. By July 13 the number of MPs nominating Burnham had increased to 349. Those included Communities Secretary Steve Reed, a key ally of Keir Starmer and the last cabinet minister still holding out; his nomination completed the cabinet's discretionary backing. Shabana Mahmood and Anna Turley do not nominate anyone by convention, as chairs of Labour's NEC and of the party. Starmer, as outgoing leader, also takes no part.

Burnham will be the first uncontested Labour leader in the modern era. Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed. But Brown had run the Treasury for a decade. Burnham is certain to be the UK's next prime minister. What's uncertain is almost everything else concerning his plans for government, with their detail still obscure to allies.

Many lawmakers feel he is the party's best chance of clawing back support from Nigel Farage's Reform UK before the next general election, expected in 2029. Reform has led Labour in national opinion polls for well over a year, although the gap has narrowed in recent weeks.

Not everyone is comfortable with the process. The Guardian reported that some Labour MPs still want a contested leadership race, arguing that an uncontested result denies the wider membership a vote and risks undermining Burnham's democratic mandate. An Ashcroft poll found only 27 per cent of Britons and 45 per cent of Labour voters believe Burnham should take over without a leadership race.

In his first major policy speech since entering Parliament, Burnham pledged to give more decision-making authority to regional governments, expand social housing, support industrial investment and relocate part of the Prime Minister's Office to Manchester. He did not provide details on how the proposals would be funded.

Former defence minister Al Carns had considered running. Carns said in a statement: 'I'd hoped a leadership contest would give us the opportunity for a proper debate.' He stood aside anyway. Burnham takes office with 349 backers and no mandate from Labour members.$n$ WHERE slug::text = $k$7bb78d3366$k$ AND body = $o$Andy Burnham is on course to become Britain's next Prime Minister this week, with almost no policy detail nailed down. Labour's MP nomination window closes on 16 July. If no other candidates come forward, a special conference will confirm the result on July 17, the day after nominations close. If a single candidate is validly nominated, the leadership special conference on July 17 can confirm them as leader unopposed, with no members' ballot. By convention a new leader does not become Prime Minister on the same day, so the handover to No 10 follows a few days later — expected on July 20.

No one has challenged him. Burnham received 322 nominations on the day nominations opened, one short of the 323 that would mean no other candidate could receive enough nominations to challenge him. By July 13 the number of MPs nominating Burnham had increased to 349. Those included Communities Secretary Steve Reed, a key ally of Keir Starmer and the last cabinet minister still holding out; his nomination completed the cabinet's discretionary backing. Shabana Mahmood and Anna Turley do not nominate anyone by convention, as chairs of Labour's NEC and of the party. Starmer, as outgoing leader, also takes no part.

Burnham will be the first uncontested Labour leader in the modern era. Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed. But Brown had run the Treasury for a decade. Burnham is certain to be the UK's next prime minister. What's uncertain is almost everything else concerning his plans for government, with their detail still obscure to allies.

Many lawmakers feel he is the party's best chance of clawing back support from Nigel Farage's Reform UK before the next general election, expected in 2029. Reform has led Labour in national opinion polls for well over a year, although the gap has narrowed in recent weeks.

Not everyone is comfortable with the process. The Guardian reported that some Labour MPs still want a contested leadership race, arguing that an uncontested result denies the wider membership a vote and risks undermining Burnham's democratic mandate. An Ashcroft poll found only 27 per cent of Britons and 45 per cent of Labour voters believe Burnham should take over without a leadership race.

In his first major policy speech since entering Parliament, Burnham pledged to give more decision-making authority to regional governments, expand social housing, support industrial investment and relocate part of the Prime Minister's Office to Manchester. He did not provide details on how the proposals would be funded.

Former defence minister Al Carns had considered running. Carns said in a statement: 'I'd hoped a leadership contest would give us the opportunity for a proper debate.' He stood aside anyway. Burnham takes office with 349 backers and no mandate from Labour members.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$7bb78d3366$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$920e6b2857$k$, 'body', $o$Two long-delayed accountability issues reach the House of Lords this week. Cohabitation rights, the conduct of undercover policing, and genocide determination are on the agenda in second reading debates on July 17. All three have been subject to years of parliamentary inaction.

Cohabitation reform has been recommended by the Law Commission since 2007. Millions of unmarried couples in England and Wales have no automatic right to each other's property or assets if the relationship ends, unlike married couples or civil partners. Scotland enacted its own cohabitation law under the Family Law (Scotland) Act 2006, which came into force on 4 May 2006. No Commons government bill has yet reached the statute book.

The government's position is not that it has ignored the issue. Ministers have opened the 'A fairer end to relationships' consultation on cohabitation reform, which runs until 14 August 2026 — described in a written parliamentary answer as 'a matter of utmost importance.' The consultation will 'consider how best to strengthen the rights of cohabitating couples and the circumstances in which protections may apply, while firmly upholding marriage as one of our most important institutions,' said justice minister Alex Davies-Jones. Critics counter that the Law Commission made detailed proposals nearly 20 years ago and that the consultation offers no guarantee of legislation within this Parliament.

The undercover policing debate follows the long-running Undercover Policing Inquiry, which has been examining the conduct of officers who infiltrated political and campaign groups — in some cases forming intimate relationships with activists under false identities. The inquiry began taking oral evidence in November 2020. By 2025 it had cost £102 million, with an additional £68.6 million in policing costs. The government passed the Crime and Policing Act 2026, which addresses policing integrity and misconduct standards, but the inquiry's specific recommendations on undercover infiltration have not yet been translated into primary legislation.

Members are also set to consider prohibiting airlines from separating family groups, and airport expansion. Further debates will cover ticket touting, gambling advertisements, grassroots sports and free-to-air broadcasts.

Thirty-seven bills were announced in the 2026 King's Speech. None of the three issues being debated on July 17 featured among them as standalone legislation. The Lords second reading stage carries no binding power — but it puts ministers on record about when, if ever, they intend to act.$o$);
  UPDATE public.briefings SET body = $n$Two long-delayed accountability issues reach the House of Lords this week. Cohabitation rights, the conduct of undercover policing, and genocide determination are on the agenda in second reading debates on July 17. All three have been subject to years of parliamentary inaction.

Cohabitation reform has been recommended by the Law Commission since 2007. Millions of unmarried couples in England and Wales have no automatic right to each other's property or assets if the relationship ends, unlike married couples or civil partners. Scotland enacted its own cohabitation law under the Family Law (Scotland) Act 2006, which came into force on 4 May 2006. No Commons government bill has yet reached the statute book.

The government's position is not that it has ignored the issue. Ministers have opened the 'A fairer end to relationships' consultation on cohabitation reform, which runs until 14 August 2026, described in a written parliamentary answer as 'a matter of utmost importance.' The consultation will 'consider how best to strengthen the rights of cohabitating couples and the circumstances in which protections may apply, while firmly upholding marriage as one of our most important institutions,' said justice minister Alex Davies-Jones. Critics counter that the Law Commission made detailed proposals nearly 20 years ago and that the consultation offers no guarantee of legislation within this Parliament.

The undercover policing debate follows the long-running Undercover Policing Inquiry, which has been examining the conduct of officers who infiltrated political and campaign groups, in some cases forming intimate relationships with activists under false identities. The inquiry began taking oral evidence in November 2020. By 2025 it had cost £102 million, with an additional £68.6 million in policing costs. The government passed the Crime and Policing Act 2026, which addresses policing integrity and misconduct standards, but the inquiry's specific recommendations on undercover infiltration have not yet been translated into primary legislation.

Members are also set to consider prohibiting airlines from separating family groups, and airport expansion. Further debates will cover ticket touting, gambling advertisements, grassroots sports and free-to-air broadcasts.

Thirty-seven bills were announced in the 2026 King's Speech. None of the three issues being debated on July 17 featured among them as standalone legislation. The Lords second reading stage carries no binding power, but it puts ministers on record about when, if ever, they intend to act.$n$ WHERE slug::text = $k$920e6b2857$k$ AND body = $o$Two long-delayed accountability issues reach the House of Lords this week. Cohabitation rights, the conduct of undercover policing, and genocide determination are on the agenda in second reading debates on July 17. All three have been subject to years of parliamentary inaction.

Cohabitation reform has been recommended by the Law Commission since 2007. Millions of unmarried couples in England and Wales have no automatic right to each other's property or assets if the relationship ends, unlike married couples or civil partners. Scotland enacted its own cohabitation law under the Family Law (Scotland) Act 2006, which came into force on 4 May 2006. No Commons government bill has yet reached the statute book.

The government's position is not that it has ignored the issue. Ministers have opened the 'A fairer end to relationships' consultation on cohabitation reform, which runs until 14 August 2026 — described in a written parliamentary answer as 'a matter of utmost importance.' The consultation will 'consider how best to strengthen the rights of cohabitating couples and the circumstances in which protections may apply, while firmly upholding marriage as one of our most important institutions,' said justice minister Alex Davies-Jones. Critics counter that the Law Commission made detailed proposals nearly 20 years ago and that the consultation offers no guarantee of legislation within this Parliament.

The undercover policing debate follows the long-running Undercover Policing Inquiry, which has been examining the conduct of officers who infiltrated political and campaign groups — in some cases forming intimate relationships with activists under false identities. The inquiry began taking oral evidence in November 2020. By 2025 it had cost £102 million, with an additional £68.6 million in policing costs. The government passed the Crime and Policing Act 2026, which addresses policing integrity and misconduct standards, but the inquiry's specific recommendations on undercover infiltration have not yet been translated into primary legislation.

Members are also set to consider prohibiting airlines from separating family groups, and airport expansion. Further debates will cover ticket touting, gambling advertisements, grassroots sports and free-to-air broadcasts.

Thirty-seven bills were announced in the 2026 King's Speech. None of the three issues being debated on July 17 featured among them as standalone legislation. The Lords second reading stage carries no binding power — but it puts ministers on record about when, if ever, they intend to act.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.body row % updated % rows', $k$920e6b2857$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$52c0c7633d$k$, 'sources', $o$["Treasury Committee report, published 7 July 2026: https://committees.parliament.uk/committee/158/treasury-committee/news/214705/government-has-moral-obligation-to-reverse-freezing-of-student-loans-repayment-threshold/", "Full report – 'Student Loans: Broken and Unfair?': https://committees.parliament.uk/publications/54019/documents/301142/default", "Bloomberg, 6 July 2026: https://www.bloomberg.com/news/articles/2026-07-06/uk-urged-to-reverse-freeze-on-student-loan-repayment-threshold", "House of Commons Library – Student loans FAQs: https://commonslibrary.parliament.uk/research-briefings/cbp-10654/"]$o$);
  UPDATE public.briefings SET sources = $n$["Treasury Committee report, published 7 July 2026: https://committees.parliament.uk/committee/158/treasury-committee/news/214705/government-has-moral-obligation-to-reverse-freezing-of-student-loans-repayment-threshold/", "Full report: 'Student Loans: Broken and Unfair?': https://committees.parliament.uk/publications/54019/documents/301142/default", "Bloomberg, 6 July 2026: https://www.bloomberg.com/news/articles/2026-07-06/uk-urged-to-reverse-freeze-on-student-loan-repayment-threshold", "House of Commons Library: Student loans FAQs: https://commonslibrary.parliament.uk/research-briefings/cbp-10654/"]$n$::jsonb WHERE slug::text = $k$52c0c7633d$k$ AND sources = $o$["Treasury Committee report, published 7 July 2026: https://committees.parliament.uk/committee/158/treasury-committee/news/214705/government-has-moral-obligation-to-reverse-freezing-of-student-loans-repayment-threshold/", "Full report – 'Student Loans: Broken and Unfair?': https://committees.parliament.uk/publications/54019/documents/301142/default", "Bloomberg, 6 July 2026: https://www.bloomberg.com/news/articles/2026-07-06/uk-urged-to-reverse-freeze-on-student-loan-repayment-threshold", "House of Commons Library – Student loans FAQs: https://commonslibrary.parliament.uk/research-briefings/cbp-10654/"]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.sources row % updated % rows', $k$52c0c7633d$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$5d946914c1$k$, 'sources', $o$["UK Parliament, 14 July 2026 — 'Report backs benefit boost for 66-year-olds amid State Pension age rise' (Work and Pensions Committee report published today)"]$o$);
  UPDATE public.briefings SET sources = $n$["UK Parliament, 14 July 2026: 'Report backs benefit boost for 66-year-olds amid State Pension age rise' (Work and Pensions Committee report published today)"]$n$::jsonb WHERE slug::text = $k$5d946914c1$k$ AND sources = $o$["UK Parliament, 14 July 2026 — 'Report backs benefit boost for 66-year-olds amid State Pension age rise' (Work and Pensions Committee report published today)"]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.sources row % updated % rows', $k$5d946914c1$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$1f7715902c$k$, 'sources', $o$["The Guardian, 7 July 2026 — 'Revealed: Farage's £5m gift reported to UK crime agency over money laundering concerns'", "ITV News Anglia, 10 July 2026 — 'Poll date of 13 August confirmed for Clacton by-election after Farage MP resignation'", "PollCheck — Clacton By-Election tracker, updated 11 July 2026", "Wikipedia — 2026 Clacton by-election (citing BBC News, POLITICO, Ipsos, Tendring District Council)", "Al Jazeera, 7 July 2026 — 'Reform UK's Farage resigns as MP amid funding scandal'"]$o$);
  UPDATE public.briefings SET sources = $n$["The Guardian, 7 July 2026: 'Revealed: Farage's £5m gift reported to UK crime agency over money laundering concerns'", "ITV News Anglia, 10 July 2026: 'Poll date of 13 August confirmed for Clacton by-election after Farage MP resignation'", "PollCheck: Clacton By-Election tracker, updated 11 July 2026", "Wikipedia: 2026 Clacton by-election (citing BBC News, POLITICO, Ipsos, Tendring District Council)", "Al Jazeera, 7 July 2026: 'Reform UK's Farage resigns as MP amid funding scandal'"]$n$::jsonb WHERE slug::text = $k$1f7715902c$k$ AND sources = $o$["The Guardian, 7 July 2026 — 'Revealed: Farage's £5m gift reported to UK crime agency over money laundering concerns'", "ITV News Anglia, 10 July 2026 — 'Poll date of 13 August confirmed for Clacton by-election after Farage MP resignation'", "PollCheck — Clacton By-Election tracker, updated 11 July 2026", "Wikipedia — 2026 Clacton by-election (citing BBC News, POLITICO, Ipsos, Tendring District Council)", "Al Jazeera, 7 July 2026 — 'Reform UK's Farage resigns as MP amid funding scandal'"]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.sources row % updated % rows', $k$1f7715902c$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$eff6a11636$k$, 'sources', $o$["UK Parliament Scottish Affairs Committee, 14 July 2026 — 'Embezzlement of funds from the SNP: Scottish Affairs Committee writes to Scottish Parliament committees'", "Scottish Daily Express — 'SNP probed by election watchdog over Peter Murrell embezzlement'", "The Scotsman — 'MPs push for joint Holyrood probe into embezzlement of SNP funds'", "BBC News, 23 June 2026 — 'Former SNP chief Peter Murrell sentenced to five years and three months for embezzling party funds'", "ITV News, 2 June 2026 — 'Fake invoices and staff charge cards: How Peter Murrell used SNP funds'"]$o$);
  UPDATE public.briefings SET sources = $n$["UK Parliament Scottish Affairs Committee, 14 July 2026: 'Embezzlement of funds from the SNP: Scottish Affairs Committee writes to Scottish Parliament committees'", "Scottish Daily Express: 'SNP probed by election watchdog over Peter Murrell embezzlement'", "The Scotsman: 'MPs push for joint Holyrood probe into embezzlement of SNP funds'", "BBC News, 23 June 2026: 'Former SNP chief Peter Murrell sentenced to five years and three months for embezzling party funds'", "ITV News, 2 June 2026: 'Fake invoices and staff charge cards: How Peter Murrell used SNP funds'"]$n$::jsonb WHERE slug::text = $k$eff6a11636$k$ AND sources = $o$["UK Parliament Scottish Affairs Committee, 14 July 2026 — 'Embezzlement of funds from the SNP: Scottish Affairs Committee writes to Scottish Parliament committees'", "Scottish Daily Express — 'SNP probed by election watchdog over Peter Murrell embezzlement'", "The Scotsman — 'MPs push for joint Holyrood probe into embezzlement of SNP funds'", "BBC News, 23 June 2026 — 'Former SNP chief Peter Murrell sentenced to five years and three months for embezzling party funds'", "ITV News, 2 June 2026 — 'Fake invoices and staff charge cards: How Peter Murrell used SNP funds'"]$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.sources row % updated % rows', $k$eff6a11636$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$7bb78d3366$k$, 'verification', $o${"_initial": {"_initial": {"balanced": {"note": "The briefing omits the publicly available counterpoint from Labour MPs who explicitly wanted a contested race to give Burnham a democratic mandate from members, a concern reported in multiple sources including the Guardian and IfG.", "pass": false}, "not_stale": {"note": "The briefing describes Burnham as becoming PM 'by Sunday' but Wikipedia and ITV now confirm the PM handover date is July 20 (a Sunday), which is consistent; however, as of today (July 15) nominations have not yet closed, so the uncontested outcome is anticipated but not yet finalised.", "pass": false}, "facts_match": {"note": "The briefing states Reed was the only non-nominating cabinet minister, but sources clarify Mahmood and Turley also did not nominate by convention (plus outgoing leader Starmer), making the description of Reed's position partially misleading; more critically, the briefing's claim that 'Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed' cannot be verified from the cited sources, as index 33-13 in our results contains no such Gordon Brown claim.", "pass": false}, "quotes_verbatim": {"note": "The Al Carns quote is rendered as 'I'd hoped a leadership contest would give us the opportunity for a proper debate,' but sources quote him as saying he hoped it would give the party the opportunity — 'us' appears to be an unattributed paraphrase presented in quotation marks.", "pass": false}}, "balanced": {"note": "The briefing omits the publicly available counterpoint from Labour MPs who explicitly wanted a contested race to give Burnham a democratic mandate from members, a concern reported in multiple sources including the Guardian and IfG.", "pass": false}, "not_stale": {"note": "The briefing describes Burnham as becoming PM 'by Sunday' but Wikipedia and ITV now confirm the PM handover date is July 20 (a Sunday), which is consistent; however, as of today (July 15) nominations have not yet closed, so the uncontested outcome is anticipated but not yet finalised.", "pass": false}, "_corrected": true, "facts_match": {"note": "The briefing states Reed was the only non-nominating cabinet minister, but sources clarify Mahmood and Turley also did not nominate by convention (plus outgoing leader Starmer), making the description of Reed's position partially misleading; more critically, the briefing's claim that 'Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed' cannot be verified from the cited sources, as index 33-13 in our results contains no such Gordon Brown claim.", "pass": false}, "_needs_review": true, "quotes_verbatim": {"note": "The Al Carns quote is rendered as 'I'd hoped a leadership contest would give us the opportunity for a proper debate,' but sources quote him as saying he hoped it would give the party the opportunity — 'us' appears to be an unattributed paraphrase presented in quotation marks.", "pass": false}}, "balanced": {"note": "Counterpoint present: Guardian on MPs wanting a contest, Ashcroft 27%/45%, \"no mandate from members\".", "pass": true}, "not_stale": {"note": "Date wording corrected — nominations close 16 July (story ran 15 July); figures current.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified vs primary sources: Gordon Brown elected unopposed 24 Jun 2007, PM 27 Jun (3 days); timeline (nominations close 16 Jul, conference 17 Jul, PM 20 Jul) and 322/323 threshold math confirmed. Reed wording corrected to remove contradiction.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; corrections applied.", "quotes_verbatim": {"note": "Al Carns quote confirmed verbatim (\"...give us the opportunity for a proper debate\").", "pass": true}}$o$);
  UPDATE public.briefings SET verification = $n${"_initial": {"_initial": {"balanced": {"note": "The briefing omits the publicly available counterpoint from Labour MPs who explicitly wanted a contested race to give Burnham a democratic mandate from members, a concern reported in multiple sources including the Guardian and IfG.", "pass": false}, "not_stale": {"note": "The briefing describes Burnham as becoming PM 'by Sunday' but Wikipedia and ITV now confirm the PM handover date is July 20 (a Sunday), which is consistent; however, as of today (July 15) nominations have not yet closed, so the uncontested outcome is anticipated but not yet finalised.", "pass": false}, "facts_match": {"note": "The briefing states Reed was the only non-nominating cabinet minister, but sources clarify Mahmood and Turley also did not nominate by convention (plus outgoing leader Starmer), making the description of Reed's position partially misleading; more critically, the briefing's claim that 'Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed' cannot be verified from the cited sources, as index 33-13 in our results contains no such Gordon Brown claim.", "pass": false}, "quotes_verbatim": {"note": "The Al Carns quote is rendered as 'I'd hoped a leadership contest would give us the opportunity for a proper debate,' but sources quote him as saying he hoped it would give the party the opportunity; 'us' appears to be an unattributed paraphrase presented in quotation marks.", "pass": false}}, "balanced": {"note": "The briefing omits the publicly available counterpoint from Labour MPs who explicitly wanted a contested race to give Burnham a democratic mandate from members, a concern reported in multiple sources including the Guardian and IfG.", "pass": false}, "not_stale": {"note": "The briefing describes Burnham as becoming PM 'by Sunday' but Wikipedia and ITV now confirm the PM handover date is July 20 (a Sunday), which is consistent; however, as of today (July 15) nominations have not yet closed, so the uncontested outcome is anticipated but not yet finalised.", "pass": false}, "_corrected": true, "facts_match": {"note": "The briefing states Reed was the only non-nominating cabinet minister, but sources clarify Mahmood and Turley also did not nominate by convention (plus outgoing leader Starmer), making the description of Reed's position partially misleading; more critically, the briefing's claim that 'Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed' cannot be verified from the cited sources, as index 33-13 in our results contains no such Gordon Brown claim.", "pass": false}, "_needs_review": true, "quotes_verbatim": {"note": "The Al Carns quote is rendered as 'I'd hoped a leadership contest would give us the opportunity for a proper debate,' but sources quote him as saying he hoped it would give the party the opportunity; 'us' appears to be an unattributed paraphrase presented in quotation marks.", "pass": false}}, "balanced": {"note": "Counterpoint present: Guardian on MPs wanting a contest, Ashcroft 27%/45%, \"no mandate from members\".", "pass": true}, "not_stale": {"note": "Date wording corrected: nominations close 16 July (story ran 15 July); figures current.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified vs primary sources: Gordon Brown elected unopposed 24 Jun 2007, PM 27 Jun (3 days); timeline (nominations close 16 Jul, conference 17 Jul, PM 20 Jul) and 322/323 threshold math confirmed. Reed wording corrected to remove contradiction.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; corrections applied.", "quotes_verbatim": {"note": "Al Carns quote confirmed verbatim (\"...give us the opportunity for a proper debate\").", "pass": true}}$n$::jsonb WHERE slug::text = $k$7bb78d3366$k$ AND verification = $o${"_initial": {"_initial": {"balanced": {"note": "The briefing omits the publicly available counterpoint from Labour MPs who explicitly wanted a contested race to give Burnham a democratic mandate from members, a concern reported in multiple sources including the Guardian and IfG.", "pass": false}, "not_stale": {"note": "The briefing describes Burnham as becoming PM 'by Sunday' but Wikipedia and ITV now confirm the PM handover date is July 20 (a Sunday), which is consistent; however, as of today (July 15) nominations have not yet closed, so the uncontested outcome is anticipated but not yet finalised.", "pass": false}, "facts_match": {"note": "The briefing states Reed was the only non-nominating cabinet minister, but sources clarify Mahmood and Turley also did not nominate by convention (plus outgoing leader Starmer), making the description of Reed's position partially misleading; more critically, the briefing's claim that 'Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed' cannot be verified from the cited sources, as index 33-13 in our results contains no such Gordon Brown claim.", "pass": false}, "quotes_verbatim": {"note": "The Al Carns quote is rendered as 'I'd hoped a leadership contest would give us the opportunity for a proper debate,' but sources quote him as saying he hoped it would give the party the opportunity — 'us' appears to be an unattributed paraphrase presented in quotation marks.", "pass": false}}, "balanced": {"note": "The briefing omits the publicly available counterpoint from Labour MPs who explicitly wanted a contested race to give Burnham a democratic mandate from members, a concern reported in multiple sources including the Guardian and IfG.", "pass": false}, "not_stale": {"note": "The briefing describes Burnham as becoming PM 'by Sunday' but Wikipedia and ITV now confirm the PM handover date is July 20 (a Sunday), which is consistent; however, as of today (July 15) nominations have not yet closed, so the uncontested outcome is anticipated but not yet finalised.", "pass": false}, "_corrected": true, "facts_match": {"note": "The briefing states Reed was the only non-nominating cabinet minister, but sources clarify Mahmood and Turley also did not nominate by convention (plus outgoing leader Starmer), making the description of Reed's position partially misleading; more critically, the briefing's claim that 'Gordon Brown became leader this way in 2007, taking over as PM three days after being confirmed' cannot be verified from the cited sources, as index 33-13 in our results contains no such Gordon Brown claim.", "pass": false}, "_needs_review": true, "quotes_verbatim": {"note": "The Al Carns quote is rendered as 'I'd hoped a leadership contest would give us the opportunity for a proper debate,' but sources quote him as saying he hoped it would give the party the opportunity — 'us' appears to be an unattributed paraphrase presented in quotation marks.", "pass": false}}, "balanced": {"note": "Counterpoint present: Guardian on MPs wanting a contest, Ashcroft 27%/45%, \"no mandate from members\".", "pass": true}, "not_stale": {"note": "Date wording corrected — nominations close 16 July (story ran 15 July); figures current.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified vs primary sources: Gordon Brown elected unopposed 24 Jun 2007, PM 27 Jun (3 days); timeline (nominations close 16 Jul, conference 17 Jul, PM 20 Jul) and 322/323 threshold math confirmed. Reed wording corrected to remove contradiction.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; corrections applied.", "quotes_verbatim": {"note": "Al Carns quote confirmed verbatim (\"...give us the opportunity for a proper debate\").", "pass": true}}$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.verification row % updated % rows', $k$7bb78d3366$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$920e6b2857$k$, 'verification', $o${"_initial": {"_initial": {"balanced": {"note": "The briefing omits the government's stated position on cohabitation reform and undercover policing legislation — ministers may have given responses to parliamentary questions on timelines that would provide the relevant counterpoint to the framing of total inaction.", "pass": false}, "not_stale": {"note": "The Lords schedule and King's Speech bill count remain accurate as of the publication date; no material changes identified.", "pass": true}, "facts_match": {"note": "The briefing states 'Scotland enacted its own cohabitation law decades ago,' but Scotland's Family Law (Scotland) Act 2006 was passed only about 19 years ago — 'decades' (implying 20+ years) is inaccurate; all other schedule and bill-count facts (37 bills, July 17 debates) are confirmed.", "pass": false}, "quotes_verbatim": {"note": "The IfG quote about 'strengthening public services and reforming the state' and '37 bills' is confirmed verbatim from the IfG source; no other direct quotes are used.", "pass": true}}, "balanced": {"note": "The briefing omits the government's stated position on cohabitation reform and undercover policing legislation — ministers may have given responses to parliamentary questions on timelines that would provide the relevant counterpoint to the framing of total inaction.", "pass": false}, "not_stale": {"note": "The Lords schedule and King's Speech bill count remain accurate as of the publication date; no material changes identified.", "pass": true}, "_corrected": true, "facts_match": {"note": "The briefing states 'Scotland enacted its own cohabitation law decades ago,' but Scotland's Family Law (Scotland) Act 2006 was passed only about 19 years ago — 'decades' (implying 20+ years) is inaccurate; all other schedule and bill-count facts (37 bills, July 17 debates) are confirmed.", "pass": false}, "_needs_review": true, "quotes_verbatim": {"note": "The IfG quote about 'strengthening public services and reforming the state' and '37 bills' is confirmed verbatim from the IfG source; no other direct quotes are used.", "pass": true}}, "balanced": {"note": "Government position present: \"A fairer end to relationships\" consultation + Davies-Jones for cohabitation; Crime and Policing Act 2026 for undercover policing.", "pass": true}, "not_stale": {"note": "Lords schedule and King’s Speech bill count current as of 15 July.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified: 37 King’s Speech bills, Family Law (Scotland) Act 2006 (in force 4 May 2006), Law Commission 2007, UCPI oral evidence from Nov 2020 and £102m + £68.6m costs. Consultation reference corrected to \"A fairer end to relationships\" (runs to 14 Aug 2026); imprecise \"June 2026\" removed.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; consultation reference corrected.", "quotes_verbatim": {"note": "Davies-Jones quotes confirmed verbatim (\"a matter of utmost importance\"; consultation wording).", "pass": true}}$o$);
  UPDATE public.briefings SET verification = $n${"_initial": {"_initial": {"balanced": {"note": "The briefing omits the government's stated position on cohabitation reform and undercover policing legislation; ministers may have given responses to parliamentary questions on timelines that would provide the relevant counterpoint to the framing of total inaction.", "pass": false}, "not_stale": {"note": "The Lords schedule and King's Speech bill count remain accurate as of the publication date; no material changes identified.", "pass": true}, "facts_match": {"note": "The briefing states 'Scotland enacted its own cohabitation law decades ago,' but Scotland's Family Law (Scotland) Act 2006 was passed only about 19 years ago, so 'decades' (implying 20+ years) is inaccurate; all other schedule and bill-count facts (37 bills, July 17 debates) are confirmed.", "pass": false}, "quotes_verbatim": {"note": "The IfG quote about 'strengthening public services and reforming the state' and '37 bills' is confirmed verbatim from the IfG source; no other direct quotes are used.", "pass": true}}, "balanced": {"note": "The briefing omits the government's stated position on cohabitation reform and undercover policing legislation; ministers may have given responses to parliamentary questions on timelines that would provide the relevant counterpoint to the framing of total inaction.", "pass": false}, "not_stale": {"note": "The Lords schedule and King's Speech bill count remain accurate as of the publication date; no material changes identified.", "pass": true}, "_corrected": true, "facts_match": {"note": "The briefing states 'Scotland enacted its own cohabitation law decades ago,' but Scotland's Family Law (Scotland) Act 2006 was passed only about 19 years ago, so 'decades' (implying 20+ years) is inaccurate; all other schedule and bill-count facts (37 bills, July 17 debates) are confirmed.", "pass": false}, "_needs_review": true, "quotes_verbatim": {"note": "The IfG quote about 'strengthening public services and reforming the state' and '37 bills' is confirmed verbatim from the IfG source; no other direct quotes are used.", "pass": true}}, "balanced": {"note": "Government position present: \"A fairer end to relationships\" consultation + Davies-Jones for cohabitation; Crime and Policing Act 2026 for undercover policing.", "pass": true}, "not_stale": {"note": "Lords schedule and King’s Speech bill count current as of 15 July.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified: 37 King’s Speech bills, Family Law (Scotland) Act 2006 (in force 4 May 2006), Law Commission 2007, UCPI oral evidence from Nov 2020 and £102m + £68.6m costs. Consultation reference corrected to \"A fairer end to relationships\" (runs to 14 Aug 2026); imprecise \"June 2026\" removed.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; consultation reference corrected.", "quotes_verbatim": {"note": "Davies-Jones quotes confirmed verbatim (\"a matter of utmost importance\"; consultation wording).", "pass": true}}$n$::jsonb WHERE slug::text = $k$920e6b2857$k$ AND verification = $o${"_initial": {"_initial": {"balanced": {"note": "The briefing omits the government's stated position on cohabitation reform and undercover policing legislation — ministers may have given responses to parliamentary questions on timelines that would provide the relevant counterpoint to the framing of total inaction.", "pass": false}, "not_stale": {"note": "The Lords schedule and King's Speech bill count remain accurate as of the publication date; no material changes identified.", "pass": true}, "facts_match": {"note": "The briefing states 'Scotland enacted its own cohabitation law decades ago,' but Scotland's Family Law (Scotland) Act 2006 was passed only about 19 years ago — 'decades' (implying 20+ years) is inaccurate; all other schedule and bill-count facts (37 bills, July 17 debates) are confirmed.", "pass": false}, "quotes_verbatim": {"note": "The IfG quote about 'strengthening public services and reforming the state' and '37 bills' is confirmed verbatim from the IfG source; no other direct quotes are used.", "pass": true}}, "balanced": {"note": "The briefing omits the government's stated position on cohabitation reform and undercover policing legislation — ministers may have given responses to parliamentary questions on timelines that would provide the relevant counterpoint to the framing of total inaction.", "pass": false}, "not_stale": {"note": "The Lords schedule and King's Speech bill count remain accurate as of the publication date; no material changes identified.", "pass": true}, "_corrected": true, "facts_match": {"note": "The briefing states 'Scotland enacted its own cohabitation law decades ago,' but Scotland's Family Law (Scotland) Act 2006 was passed only about 19 years ago — 'decades' (implying 20+ years) is inaccurate; all other schedule and bill-count facts (37 bills, July 17 debates) are confirmed.", "pass": false}, "_needs_review": true, "quotes_verbatim": {"note": "The IfG quote about 'strengthening public services and reforming the state' and '37 bills' is confirmed verbatim from the IfG source; no other direct quotes are used.", "pass": true}}, "balanced": {"note": "Government position present: \"A fairer end to relationships\" consultation + Davies-Jones for cohabitation; Crime and Policing Act 2026 for undercover policing.", "pass": true}, "not_stale": {"note": "Lords schedule and King’s Speech bill count current as of 15 July.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified: 37 King’s Speech bills, Family Law (Scotland) Act 2006 (in force 4 May 2006), Law Commission 2007, UCPI oral evidence from Nov 2020 and £102m + £68.6m costs. Consultation reference corrected to \"A fairer end to relationships\" (runs to 14 Aug 2026); imprecise \"June 2026\" removed.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; consultation reference corrected.", "quotes_verbatim": {"note": "Davies-Jones quotes confirmed verbatim (\"a matter of utmost importance\"; consultation wording).", "pass": true}}$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.verification row % updated % rows', $k$920e6b2857$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('briefings', $k$9daa8d566a$k$, 'verification', $o${"_initial": {"_initial": {"balanced": {"note": "The briefing omits South East Water's own public response to the EFRA report and government statement, which is a relevant counterpoint available in the public domain.", "pass": false}, "not_stale": {"note": "No material changes found since the July 10 government response; South East Water remains under regulatory investigation with no new enforcement action announced.", "pass": true}, "facts_match": {"note": "Core facts — EFRA report published May 2026, resignations of Chair Chris Train and CEO David Hinton, government response on July 10, Tunbridge Wells outage November–December 2025, and further January 2026 outages — all confirmed by parliamentary and trade sources.", "pass": true}, "quotes_verbatim": {"note": "The two Carmichael quotes (index 36-6,36-7 in the briefing) are presented as separate attributed statements with 'He said' and 'He added,' but in every source they form a single continuous statement; additionally, the second Carmichael quote block (index 44-4,44-5) from a different source could not be verified verbatim from available results.", "pass": false}}, "balanced": {"note": "The briefing omits South East Water's own public response to the EFRA report and government statement, which is a relevant counterpoint available in the public domain.", "pass": false}, "not_stale": {"note": "No material changes found since the July 10 government response; South East Water remains under regulatory investigation with no new enforcement action announced.", "pass": true}, "_corrected": true, "facts_match": {"note": "Core facts — EFRA report published May 2026, resignations of Chair Chris Train and CEO David Hinton, government response on July 10, Tunbridge Wells outage November–December 2025, and further January 2026 outages — all confirmed by parliamentary and trade sources.", "pass": true}, "_needs_review": true, "quotes_verbatim": {"note": "The two Carmichael quotes (index 36-6,36-7 in the briefing) are presented as separate attributed statements with 'He said' and 'He added,' but in every source they form a single continuous statement; additionally, the second Carmichael quote block (index 44-4,44-5) from a different source could not be verified verbatim from available results.", "pass": false}}, "balanced": {"note": "Company response included (\"mutually agreed... new independent board leadership is now required\").", "pass": true}, "not_stale": {"note": "No material change since 10 Jul response; company remains under regulatory investigation.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified: EFRA report May 2026, Chair Chris Train + CEO David Hinton resignations, govt response 10 Jul, Tunbridge Wells outage Nov–Dec 2025, Jan 2026 outages.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; all quotes verified verbatim, no body change needed.", "quotes_verbatim": {"note": "All quotes verified verbatim: govt response block, Emma Hardy \"grateful\", both Carmichael statements (Clean Water Bill reaction + resignation-day), company \"mutually agreed\" statement.", "pass": true}}$o$);
  UPDATE public.briefings SET verification = $n${"_initial": {"_initial": {"balanced": {"note": "The briefing omits South East Water's own public response to the EFRA report and government statement, which is a relevant counterpoint available in the public domain.", "pass": false}, "not_stale": {"note": "No material changes found since the July 10 government response; South East Water remains under regulatory investigation with no new enforcement action announced.", "pass": true}, "facts_match": {"note": "Core facts (EFRA report published May 2026, resignations of Chair Chris Train and CEO David Hinton, government response on July 10, Tunbridge Wells outage November to December 2025, and further January 2026 outages) all confirmed by parliamentary and trade sources.", "pass": true}, "quotes_verbatim": {"note": "The two Carmichael quotes (index 36-6,36-7 in the briefing) are presented as separate attributed statements with 'He said' and 'He added,' but in every source they form a single continuous statement; additionally, the second Carmichael quote block (index 44-4,44-5) from a different source could not be verified verbatim from available results.", "pass": false}}, "balanced": {"note": "The briefing omits South East Water's own public response to the EFRA report and government statement, which is a relevant counterpoint available in the public domain.", "pass": false}, "not_stale": {"note": "No material changes found since the July 10 government response; South East Water remains under regulatory investigation with no new enforcement action announced.", "pass": true}, "_corrected": true, "facts_match": {"note": "Core facts (EFRA report published May 2026, resignations of Chair Chris Train and CEO David Hinton, government response on July 10, Tunbridge Wells outage November to December 2025, and further January 2026 outages) all confirmed by parliamentary and trade sources.", "pass": true}, "_needs_review": true, "quotes_verbatim": {"note": "The two Carmichael quotes (index 36-6,36-7 in the briefing) are presented as separate attributed statements with 'He said' and 'He added,' but in every source they form a single continuous statement; additionally, the second Carmichael quote block (index 44-4,44-5) from a different source could not be verified verbatim from available results.", "pass": false}}, "balanced": {"note": "Company response included (\"mutually agreed... new independent board leadership is now required\").", "pass": true}, "not_stale": {"note": "No material change since 10 Jul response; company remains under regulatory investigation.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified: EFRA report May 2026, Chair Chris Train + CEO David Hinton resignations, govt response 10 Jul, Tunbridge Wells outage Nov to Dec 2025, Jan 2026 outages.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; all quotes verified verbatim, no body change needed.", "quotes_verbatim": {"note": "All quotes verified verbatim: govt response block, Emma Hardy \"grateful\", both Carmichael statements (Clean Water Bill reaction + resignation-day), company \"mutually agreed\" statement.", "pass": true}}$n$::jsonb WHERE slug::text = $k$9daa8d566a$k$ AND verification = $o${"_initial": {"_initial": {"balanced": {"note": "The briefing omits South East Water's own public response to the EFRA report and government statement, which is a relevant counterpoint available in the public domain.", "pass": false}, "not_stale": {"note": "No material changes found since the July 10 government response; South East Water remains under regulatory investigation with no new enforcement action announced.", "pass": true}, "facts_match": {"note": "Core facts — EFRA report published May 2026, resignations of Chair Chris Train and CEO David Hinton, government response on July 10, Tunbridge Wells outage November–December 2025, and further January 2026 outages — all confirmed by parliamentary and trade sources.", "pass": true}, "quotes_verbatim": {"note": "The two Carmichael quotes (index 36-6,36-7 in the briefing) are presented as separate attributed statements with 'He said' and 'He added,' but in every source they form a single continuous statement; additionally, the second Carmichael quote block (index 44-4,44-5) from a different source could not be verified verbatim from available results.", "pass": false}}, "balanced": {"note": "The briefing omits South East Water's own public response to the EFRA report and government statement, which is a relevant counterpoint available in the public domain.", "pass": false}, "not_stale": {"note": "No material changes found since the July 10 government response; South East Water remains under regulatory investigation with no new enforcement action announced.", "pass": true}, "_corrected": true, "facts_match": {"note": "Core facts — EFRA report published May 2026, resignations of Chair Chris Train and CEO David Hinton, government response on July 10, Tunbridge Wells outage November–December 2025, and further January 2026 outages — all confirmed by parliamentary and trade sources.", "pass": true}, "_needs_review": true, "quotes_verbatim": {"note": "The two Carmichael quotes (index 36-6,36-7 in the briefing) are presented as separate attributed statements with 'He said' and 'He added,' but in every source they form a single continuous statement; additionally, the second Carmichael quote block (index 44-4,44-5) from a different source could not be verified verbatim from available results.", "pass": false}}, "balanced": {"note": "Company response included (\"mutually agreed... new independent board leadership is now required\").", "pass": true}, "not_stale": {"note": "No material change since 10 Jul response; company remains under regulatory investigation.", "pass": true}, "_corrected": true, "_published": true, "facts_match": {"note": "Verified: EFRA report May 2026, Chair Chris Train + CEO David Hinton resignations, govt response 10 Jul, Tunbridge Wells outage Nov–Dec 2025, Jan 2026 outages.", "pass": true}, "_needs_review": false, "_manual_review": "Editor fact-checked against primary sources 2026-07-15; all quotes verified verbatim, no body change needed.", "quotes_verbatim": {"note": "All quotes verified verbatim: govt response block, Emma Hardy \"grateful\", both Carmichael statements (Clean Water Bill reaction + resignation-day), company \"mutually agreed\" statement.", "pass": true}}$o$::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings.verification row % updated % rows', $k$9daa8d566a$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('uk_political_news', $k$3$k$, 'commentary', $o$Polling on the Removal of Peerages Bill has surfaced a result so neat it deserves to be stitched onto a tea towel: 94% of the British public would like the House of Lords abolished, while 6% would prefer it left exactly as it is. A bracing exercise in self-knowledge has been duly conducted, and the maths needs no further explanation.

The Bill itself proceeds at the dignified pace appropriate to constitutional reform — that is, the pace of a particularly slow-moving glacier carrying a great deal of ermine. The Lords have agreed, as they always do, to consider the matter carefully. They are nothing if not punctilious about ensuring their own demise is conducted with proper procedural decorum.

A select committee has been formed. Submissions have been invited. A timetable will, in due course, be published. The 94% wait. The 6%, of course, wait differently — in much more comfortable chairs, and at considerably less personal cost.$o$);
  UPDATE public.uk_political_news SET commentary = $n$Polling on the Removal of Peerages Bill has surfaced a result so neat it deserves to be stitched onto a tea towel: 94% of the British public would like the House of Lords abolished, while 6% would prefer it left exactly as it is. A bracing exercise in self-knowledge has been duly conducted, and the maths needs no further explanation.

The Bill itself proceeds at the dignified pace appropriate to constitutional reform, that is, the pace of a particularly slow-moving glacier carrying a great deal of ermine. The Lords have agreed, as they always do, to consider the matter carefully. They are nothing if not punctilious about ensuring their own demise is conducted with proper procedural decorum.

A select committee has been formed. Submissions have been invited. A timetable will, in due course, be published. The 94% wait. The 6%, of course, wait differently, in much more comfortable chairs, and at considerably less personal cost.$n$ WHERE id::text = $k$3$k$ AND commentary = $o$Polling on the Removal of Peerages Bill has surfaced a result so neat it deserves to be stitched onto a tea towel: 94% of the British public would like the House of Lords abolished, while 6% would prefer it left exactly as it is. A bracing exercise in self-knowledge has been duly conducted, and the maths needs no further explanation.

The Bill itself proceeds at the dignified pace appropriate to constitutional reform — that is, the pace of a particularly slow-moving glacier carrying a great deal of ermine. The Lords have agreed, as they always do, to consider the matter carefully. They are nothing if not punctilious about ensuring their own demise is conducted with proper procedural decorum.

A select committee has been formed. Submissions have been invited. A timetable will, in due course, be published. The 94% wait. The 6%, of course, wait differently — in much more comfortable chairs, and at considerably less personal cost.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary row % updated % rows', $k$3$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('uk_political_news', $k$4$k$, 'commentary', $o$Stuart Andrew, MP for Daventry, has claimed £367,659 in business costs for 2024-25 — a figure which has earned him the unofficial gold medal in this year's Big Spenders league. A spokesperson is understood to have suggested, off the record and not for direct quotation, that this represents "terribly efficient" expense management compared to previous years, on the grounds that any number is more efficient than the same number plus inflation.

It is, as ever, all entirely above board. IPSA approves each claim with the patient resignation of a parent ticking off a bedtime story. The system works precisely as designed — which is, perhaps, the gentlest way of putting it.

Daventry sits 78 miles from Westminster, give or take a roundabout. Each mile, by some discreet alchemy of accommodation, transport, and constituency staffing, has cost the British public £4,713. At that rate, an MP for somewhere truly remote — say, Lerwick — would represent a fiscal event roughly equivalent to a small public inquiry.$o$);
  UPDATE public.uk_political_news SET commentary = $n$Stuart Andrew, MP for Daventry, has claimed £367,659 in business costs for 2024-25, a figure which has earned him the unofficial gold medal in this year's Big Spenders league. A spokesperson is understood to have suggested, off the record and not for direct quotation, that this represents "terribly efficient" expense management compared to previous years, on the grounds that any number is more efficient than the same number plus inflation.

It is, as ever, all entirely above board. IPSA approves each claim with the patient resignation of a parent ticking off a bedtime story. The system works precisely as designed, which is, perhaps, the gentlest way of putting it.

Daventry sits 78 miles from Westminster, give or take a roundabout. Each mile, by some discreet alchemy of accommodation, transport, and constituency staffing, has cost the British public £4,713. At that rate, an MP for somewhere truly remote (say, Lerwick) would represent a fiscal event roughly equivalent to a small public inquiry.$n$ WHERE id::text = $k$4$k$ AND commentary = $o$Stuart Andrew, MP for Daventry, has claimed £367,659 in business costs for 2024-25 — a figure which has earned him the unofficial gold medal in this year's Big Spenders league. A spokesperson is understood to have suggested, off the record and not for direct quotation, that this represents "terribly efficient" expense management compared to previous years, on the grounds that any number is more efficient than the same number plus inflation.

It is, as ever, all entirely above board. IPSA approves each claim with the patient resignation of a parent ticking off a bedtime story. The system works precisely as designed — which is, perhaps, the gentlest way of putting it.

Daventry sits 78 miles from Westminster, give or take a roundabout. Each mile, by some discreet alchemy of accommodation, transport, and constituency staffing, has cost the British public £4,713. At that rate, an MP for somewhere truly remote — say, Lerwick — would represent a fiscal event roughly equivalent to a small public inquiry.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary row % updated % rows', $k$4$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('uk_political_news', $k$5$k$, 'commentary', $o$The Department for Energy Security and Net Zero has awarded £10,000,000,000 to ILIOS — a consortium pleasantly named after the Greek for "sun" — to construct STEP, the country's prototype fusion reactor at West Burton. Ten thousand million pounds. A one followed by ten zeroes.

Fusion power, for those who have not been keeping up, is the holy grail of energy generation: limitless clean power produced by replicating, on a small industrial scale, the conditions inside a star. The slight hitch is that nobody, anywhere, has yet managed to make a fusion reactor produce more energy than it consumes. They have been trying for eighty years. Recent progress has been described in scientific circles as "encouraging," which is the technical term for "still nowhere close."

ILIOS will receive its £10bn in instalments over the coming decade, in exchange for attempting it anyway. If they succeed, we get a genuinely revolutionary power source. If they don't, we get a £10bn industrial monument to optimism. The state, having made its choice, is now waiting to see which it built.$o$);
  UPDATE public.uk_political_news SET commentary = $n$The Department for Energy Security and Net Zero has awarded £10,000,000,000 to ILIOS, a consortium pleasantly named after the Greek for "sun", to construct STEP, the country's prototype fusion reactor at West Burton. Ten thousand million pounds. A one followed by ten zeroes.

Fusion power, for those who have not been keeping up, is the holy grail of energy generation: limitless clean power produced by replicating, on a small industrial scale, the conditions inside a star. The slight hitch is that nobody, anywhere, has yet managed to make a fusion reactor produce more energy than it consumes. They have been trying for eighty years. Recent progress has been described in scientific circles as "encouraging," which is the technical term for "still nowhere close."

ILIOS will receive its £10bn in instalments over the coming decade, in exchange for attempting it anyway. If they succeed, we get a genuinely revolutionary power source. If they don't, we get a £10bn industrial monument to optimism. The state, having made its choice, is now waiting to see which it built.$n$ WHERE id::text = $k$5$k$ AND commentary = $o$The Department for Energy Security and Net Zero has awarded £10,000,000,000 to ILIOS — a consortium pleasantly named after the Greek for "sun" — to construct STEP, the country's prototype fusion reactor at West Burton. Ten thousand million pounds. A one followed by ten zeroes.

Fusion power, for those who have not been keeping up, is the holy grail of energy generation: limitless clean power produced by replicating, on a small industrial scale, the conditions inside a star. The slight hitch is that nobody, anywhere, has yet managed to make a fusion reactor produce more energy than it consumes. They have been trying for eighty years. Recent progress has been described in scientific circles as "encouraging," which is the technical term for "still nowhere close."

ILIOS will receive its £10bn in instalments over the coming decade, in exchange for attempting it anyway. If they succeed, we get a genuinely revolutionary power source. If they don't, we get a £10bn industrial monument to optimism. The state, having made its choice, is now waiting to see which it built.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary row % updated % rows', $k$5$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('uk_political_news', $k$6$k$, 'commentary', $o$A wealthy private individual has, this morning, provided £5,000,000 to Reform UK. He has, through his representatives, asked it be made entirely clear that this donation is made in the spirit of pure civic-mindedness, and that he would be horrified — really, quite genuinely horrified — at any suggestion that he might be hoping for influence, access, or a pleasant honour somewhere down the line.

It is a touching tradition of British political donation that the donor's enthusiasm for democracy expands roughly in proportion to the size of his cheque. Reform UK accepts the donation, as it is required to do. The Electoral Commission notes the donation, as it is required to do. Both parties to the transaction then look very firmly at the floor.

What might £5m buy a man whose only stated motivation is the strengthening of British democracy? The answer, charitably, is "a useful conversation now and then." The answer, less charitably, is exactly the same thing said with a different facial expression.$o$);
  UPDATE public.uk_political_news SET commentary = $n$A wealthy private individual has, this morning, provided £5,000,000 to Reform UK. He has, through his representatives, asked it be made entirely clear that this donation is made in the spirit of pure civic-mindedness, and that he would be horrified (really, quite genuinely horrified) at any suggestion that he might be hoping for influence, access, or a pleasant honour somewhere down the line.

It is a touching tradition of British political donation that the donor's enthusiasm for democracy expands roughly in proportion to the size of his cheque. Reform UK accepts the donation, as it is required to do. The Electoral Commission notes the donation, as it is required to do. Both parties to the transaction then look very firmly at the floor.

What might £5m buy a man whose only stated motivation is the strengthening of British democracy? The answer, charitably, is "a useful conversation now and then." The answer, less charitably, is exactly the same thing said with a different facial expression.$n$ WHERE id::text = $k$6$k$ AND commentary = $o$A wealthy private individual has, this morning, provided £5,000,000 to Reform UK. He has, through his representatives, asked it be made entirely clear that this donation is made in the spirit of pure civic-mindedness, and that he would be horrified — really, quite genuinely horrified — at any suggestion that he might be hoping for influence, access, or a pleasant honour somewhere down the line.

It is a touching tradition of British political donation that the donor's enthusiasm for democracy expands roughly in proportion to the size of his cheque. Reform UK accepts the donation, as it is required to do. The Electoral Commission notes the donation, as it is required to do. Both parties to the transaction then look very firmly at the floor.

What might £5m buy a man whose only stated motivation is the strengthening of British democracy? The answer, charitably, is "a useful conversation now and then." The answer, less charitably, is exactly the same thing said with a different facial expression.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary row % updated % rows', $k$6$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('uk_political_news', $k$7$k$, 'commentary', $o$The Medical Training (Prioritisation) Act has secured 99% public support — a result so unambiguous it barely qualifies as polling and instead resembles a national consensus. The proposition is straightforward: train more doctors, train them faster, and stop allowing the entire pipeline to drain steadily away to Sydney, Auckland, or, in particularly bleak moments, Frankfurt.

The remaining 1% who oppose the Bill are widely believed to consist almost entirely of consultants who have now noticed that a sudden expansion of the medical workforce might, in some indirect way, complicate the queueing system at private clinics in Marylebone.

The Bill itself is currently "under consideration," that immortal British political euphemism meaning "it has been placed somewhere and very thorough work is being done in not finding it." Two select committees have asked questions. A consultation has been opened, in the technical sense that someone has set up an email address. A timeline has been promised, in due course.

The 99% continue to wait, with that distinctively British patience that has previously sustained the country through two world wars and three separate attempts to reform the railways.$o$);
  UPDATE public.uk_political_news SET commentary = $n$The Medical Training (Prioritisation) Act has secured 99% public support, a result so unambiguous it barely qualifies as polling and instead resembles a national consensus. The proposition is straightforward: train more doctors, train them faster, and stop allowing the entire pipeline to drain steadily away to Sydney, Auckland, or, in particularly bleak moments, Frankfurt.

The remaining 1% who oppose the Bill are widely believed to consist almost entirely of consultants who have now noticed that a sudden expansion of the medical workforce might, in some indirect way, complicate the queueing system at private clinics in Marylebone.

The Bill itself is currently "under consideration," that immortal British political euphemism meaning "it has been placed somewhere and very thorough work is being done in not finding it." Two select committees have asked questions. A consultation has been opened, in the technical sense that someone has set up an email address. A timeline has been promised, in due course.

The 99% continue to wait, with that distinctively British patience that has previously sustained the country through two world wars and three separate attempts to reform the railways.$n$ WHERE id::text = $k$7$k$ AND commentary = $o$The Medical Training (Prioritisation) Act has secured 99% public support — a result so unambiguous it barely qualifies as polling and instead resembles a national consensus. The proposition is straightforward: train more doctors, train them faster, and stop allowing the entire pipeline to drain steadily away to Sydney, Auckland, or, in particularly bleak moments, Frankfurt.

The remaining 1% who oppose the Bill are widely believed to consist almost entirely of consultants who have now noticed that a sudden expansion of the medical workforce might, in some indirect way, complicate the queueing system at private clinics in Marylebone.

The Bill itself is currently "under consideration," that immortal British political euphemism meaning "it has been placed somewhere and very thorough work is being done in not finding it." Two select committees have asked questions. A consultation has been opened, in the technical sense that someone has set up an email address. A timeline has been promised, in due course.

The 99% continue to wait, with that distinctively British patience that has previously sustained the country through two world wars and three separate attempts to reform the railways.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary row % updated % rows', $k$7$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$3$k$, 'notes', $o$Universal Credit caseload (people on UC) by Westminster Parliamentary Constituency, 202605. Proof-of-concept import — first of six benefits.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$Universal Credit caseload (people on UC) by Westminster Parliamentary Constituency, 202605. Proof-of-concept import: first of six benefits.$n$ WHERE id::text = $k$3$k$ AND notes = $o$Universal Credit caseload (people on UC) by Westminster Parliamentary Constituency, 202605. Proof-of-concept import — first of six benefits.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$3$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$13$k$, 'notes', $o$PIP claimant caseload by Westminster Parliamentary Constituency, 202407 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$PIP claimant caseload by Westminster Parliamentary Constituency, 202407 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$13$k$ AND notes = $o$PIP claimant caseload by Westminster Parliamentary Constituency, 202407 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$13$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$14$k$, 'notes', $o$Housing Benefit claimant caseload by Westminster Parliamentary Constituency, 202403 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$Housing Benefit claimant caseload by Westminster Parliamentary Constituency, 202403 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$14$k$ AND notes = $o$Housing Benefit claimant caseload by Westminster Parliamentary Constituency, 202403 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$14$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$15$k$, 'notes', $o$DLA claimant caseload by Westminster Parliamentary Constituency, 202402 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$DLA claimant caseload by Westminster Parliamentary Constituency, 202402 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$15$k$ AND notes = $o$DLA claimant caseload by Westminster Parliamentary Constituency, 202402 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$15$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$16$k$, 'notes', $o$Carer's Allowance claimant caseload by Westminster Parliamentary Constituency, 202402 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$Carer's Allowance claimant caseload by Westminster Parliamentary Constituency, 202402 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$16$k$ AND notes = $o$Carer's Allowance claimant caseload by Westminster Parliamentary Constituency, 202402 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$16$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$17$k$, 'notes', $o$ESA claimant caseload by Westminster Parliamentary Constituency, 202402 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$ESA claimant caseload by Westminster Parliamentary Constituency, 202402 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$17$k$ AND notes = $o$ESA claimant caseload by Westminster Parliamentary Constituency, 202402 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$17$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$18$k$, 'notes', $o$UC households caseload and constituency-level mean monthly payment, 202405 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$UC households caseload and constituency-level mean monthly payment, 202405 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$18$k$ AND notes = $o$UC households caseload and constituency-level mean monthly payment, 202405 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$18$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$29$k$, 'notes', $o$PIP claimant caseload by local authority, 202407 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$PIP claimant caseload by local authority, 202407 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$29$k$ AND notes = $o$PIP claimant caseload by local authority, 202407 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$29$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$30$k$, 'notes', $o$Housing Benefit claimant caseload by local authority, 202403 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$Housing Benefit claimant caseload by local authority, 202403 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$30$k$ AND notes = $o$Housing Benefit claimant caseload by local authority, 202403 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$30$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$31$k$, 'notes', $o$DLA claimant caseload by local authority, 202402 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$DLA claimant caseload by local authority, 202402 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$31$k$ AND notes = $o$DLA claimant caseload by local authority, 202402 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$31$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$32$k$, 'notes', $o$Carer's Allowance claimant caseload by local authority, 202402 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$Carer's Allowance claimant caseload by local authority, 202402 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$32$k$ AND notes = $o$Carer's Allowance claimant caseload by local authority, 202402 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$32$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$33$k$, 'notes', $o$ESA claimant caseload by local authority, 202402 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$ESA claimant caseload by local authority, 202402 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$33$k$ AND notes = $o$ESA claimant caseload by local authority, 202402 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$33$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$34$k$, 'notes', $o$UC households caseload and local-authority-level mean monthly payment, 202405 — BASELINE period for the two-year % change feature.$o$);
  UPDATE public.welfare_source_releases SET notes = $n$UC households caseload and local-authority-level mean monthly payment, 202405 (BASELINE period for the two-year % change feature).$n$ WHERE id::text = $k$34$k$ AND notes = $o$UC households caseload and local-authority-level mean monthly payment, 202405 — BASELINE period for the two-year % change feature.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$34$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$35$k$, 'notes', $o$UC Health Caseload — LCW and LCWRA counts by Westminster Parliamentary Constituency, 202606. Covers all GB constituencies (UC is not devolved to Scotland).$o$);
  UPDATE public.welfare_source_releases SET notes = $n$UC Health Caseload: LCW and LCWRA counts by Westminster Parliamentary Constituency, 202606. Covers all GB constituencies (UC is not devolved to Scotland).$n$ WHERE id::text = $k$35$k$ AND notes = $o$UC Health Caseload — LCW and LCWRA counts by Westminster Parliamentary Constituency, 202606. Covers all GB constituencies (UC is not devolved to Scotland).$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$35$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('welfare_source_releases', $k$36$k$, 'notes', $o$UC Health Caseload — LCW and LCWRA counts by local authority, 202606. Covers all GB local authorities (UC is not devolved to Scotland).$o$);
  UPDATE public.welfare_source_releases SET notes = $n$UC Health Caseload: LCW and LCWRA counts by local authority, 202606. Covers all GB local authorities (UC is not devolved to Scotland).$n$ WHERE id::text = $k$36$k$ AND notes = $o$UC Health Caseload — LCW and LCWRA counts by local authority, 202606. Covers all GB local authorities (UC is not devolved to Scotland).$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'welfare_source_releases.notes row % updated % rows', $k$36$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('ap_policies', $k$5$k$, 'summary', $o$Every state-school pupil aged 7–16 receives £400/year in vouchers for vetted tutoring (in person or online), redeemable through a regulated marketplace. Higher rates for pupil-premium-eligible students.$o$);
  UPDATE public.ap_policies SET summary = $n$Every state-school pupil aged 7 to 16 receives £400/year in vouchers for vetted tutoring (in person or online), redeemable through a regulated marketplace. Higher rates for pupil-premium-eligible students.$n$ WHERE id::text = $k$5$k$ AND summary = $o$Every state-school pupil aged 7–16 receives £400/year in vouchers for vetted tutoring (in person or online), redeemable through a regulated marketplace. Higher rates for pupil-premium-eligible students.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'ap_policies.summary row % updated % rows', $k$5$k$, n; END IF;
  INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) VALUES ('ap_policies', $k$7$k$, 'summary', $o$For first-time non-violent offences (low-value theft, criminal damage, low-level fraud), offer a structured restorative-justice route — face-to-face meeting with the victim, agreed reparations, no criminal record on completion. Refusal or breach defaults to standard prosecution.$o$);
  UPDATE public.ap_policies SET summary = $n$For first-time non-violent offences (low-value theft, criminal damage, low-level fraud), offer a structured restorative-justice route: face-to-face meeting with the victim, agreed reparations, no criminal record on completion. Refusal or breach defaults to standard prosecution.$n$ WHERE id::text = $k$7$k$ AND summary = $o$For first-time non-violent offences (low-value theft, criminal damage, low-level fraud), offer a structured restorative-justice route — face-to-face meeting with the victim, agreed reparations, no criminal record on completion. Refusal or breach defaults to standard prosecution.$o$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'ap_policies.summary row % updated % rows', $k$7$k$, n; END IF;
END $do$;

-- peer_finance: one period label (keyed by slug); year ranges take a hyphen, other ranges 'to'.
INSERT INTO public.emdash_backup_20261017 (tbl,row_key,col,old_value) SELECT 'peer_finance', slug, 'period_label', period_label FROM public.peer_finance WHERE period_label ~ '[—–]';
UPDATE public.peer_finance SET period_label = regexp_replace(regexp_replace(regexp_replace(period_label, '(\d)[—–](\d)', '\1-\2', 'g'), '\s*[—–]\s*', ' to ', 'g'), '\s+', ' ', 'g') WHERE period_label ~ '[—–]';

SELECT tbl, col, count(*) AS rows_backed_up FROM public.emdash_backup_20261017 GROUP BY 1,2 ORDER BY 1,2;
COMMIT;
