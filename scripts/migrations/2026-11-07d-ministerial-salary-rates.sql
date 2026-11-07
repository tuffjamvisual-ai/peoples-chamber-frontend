-- 2026-11-07d: ministerial salary rates from GOV.UK (owner's yes, 7 Nov 2026; job N1). Prepared by Terminal 2, applied by Terminal 1.
-- 1. A new table, ministerial_salary_rates: GOV.UK's 14 categories from "Salaries of members of His Majesty's Government:
--    September 2026" (figures from 1 April 2026; entitled and claimed), and the MP salary (IPSA, £98,599 from 1 April 2026),
--    each with its source address. Public read only.
-- 2. dept_ministers gains salary_category (references the table). All 121 rows are filed, each matched on id, department,
--    name, role and the old salary_band exactly; any other count raises and nothing applies. salary_band is kept until the
--    code that stops reading it is live (rule 10); it is dropped later.
-- 3. peer_finance: the April 2022 figure for richard-hermer (no longer Attorney General; Ellie Reeves is) is cleared,
--    matched on all three old values.
-- 4. hand_loaded_datasets gains one row, ministerial_salaries, so the weekly check emails when GOV.UK updates the publication.
-- Needs: the branch t2-salaries, merged straight after this is applied and before the next /api/sync-govuk-data run
-- (05:23 GMT daily), because that sync deletes and reinserts dept_ministers and only the new code keeps salary_category.
-- Undo: 2026-11-07d-ministerial-salary-rates-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.ministerial_salary_rates (
  category text PRIMARY KEY,
  house text NOT NULL CHECK (house IN ('Commons', 'Lords')),
  cabinet boolean NOT NULL,
  entitled integer NOT NULL,
  claimed integer NOT NULL,
  effective_from date NOT NULL,
  source_url text NOT NULL,
  checked_at timestamptz NOT NULL
);
INSERT INTO public.ministerial_salary_rates (category, house, cabinet, entitled, claimed, effective_from, source_url, checked_at) VALUES
  ('commons_pm', 'Commons', true, 83837, 75440, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('commons_cabinet', 'Commons', true, 75170, 67505, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('commons_minister_of_state', 'Commons', false, 36045, 31680, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('commons_parliamentary_secretary', 'Commons', false, 25882, 22375, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('commons_attorney_general', 'Commons', false, 104599, 94450, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('commons_solicitor_general', 'Commons', false, 64706, 57962, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('commons_whip', 'Commons', false, 21021, 17917, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_leader_or_secretary_of_state', 'Lords', true, 110351, 104360, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_minister_of_state', 'Lords', false, 86162, 81485, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_parliamentary_secretary', 'Lords', false, 75043, 70969, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_advocate_general', 'Lords', false, 100211, 94772, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_chief_whip', 'Lords', false, 86162, 81485, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_deputy_chief_whip', 'Lords', false, 75043, 70969, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('lords_in_waiting', 'Lords', false, 69392, 65625, DATE '2026-04-01', 'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-september-2026', TIMESTAMPTZ '2026-11-07 12:15:00+00'),
  ('mp_salary', 'Commons', false, 98599, 98599, DATE '2026-04-01', 'https://theipsa.org.uk/news/press-releases/ipsa-confirms-decision-on-mps-pay-for-2026-27', TIMESTAMPTZ '2026-11-07 12:15:00+00');
ALTER TABLE public.ministerial_salary_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY ministerial_salary_rates_public_read ON public.ministerial_salary_rates FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.ministerial_salary_rates TO anon, authenticated;

-- 4. The weekly hand-loaded releases check (/api/check-hand-loaded-releases) watches the GOV.UK publication through its
--    content API and emails, through the same alert, when the publication is updated after the table held here.
INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern)
VALUES ('ministerial_salaries', 'Ministerial salaries (GOV.UK)', 'ministerial_salary_rates', '2026-09-24 (September 2026 table)', DATE '2026-11-07',
        'https://www.gov.uk/government/publications/ministerial-salary-data', 'when GOV.UK publishes a new salaries table (usually after 1 April)', 'page_period',
        'https://www.gov.uk/api/content/government/publications/ministerial-salary-data', '"public_updated_at":"(20\d\d-\d\d-\d\d)');

ALTER TABLE public.dept_ministers ADD COLUMN salary_category text REFERENCES public.ministerial_salary_rates (category);

CREATE TEMP TABLE _filing (id integer PRIMARY KEY, dept_slug text NOT NULL, name text NOT NULL, role text, old_band text, category text NOT NULL) ON COMMIT DROP;
INSERT INTO _filing VALUES
  (21928, $v$treasury$v$, $v$The Rt Hon John Healey MP$v$, $v$Chancellor of the Exchequer$v$, $v$sos$v$, 'commons_cabinet'),
  (21929, $v$treasury$v$, $v$The Rt Hon Emma Reynolds MP$v$, $v$Chief Secretary to the Treasury$v$, $v$sos$v$, 'commons_minister_of_state'),
  (21930, $v$treasury$v$, $v$The Rt Hon James Murray MP$v$, $v$Paymaster General$v$, NULL, 'commons_minister_of_state'),
  (21931, $v$treasury$v$, $v$The Rt Hon Lucy Rigby KC MP$v$, $v$Economic Secretary to the Treasury$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21932, $v$treasury$v$, $v$Daniel Tomlinson MP$v$, $v$Parliamentary Secretary$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21933, $v$treasury$v$, $v$Torsten Bell MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Pensions)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21934, $v$treasury$v$, $v$Lord Pitt-Watson$v$, $v$Parliamentary Secretary$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21935, $v$home-office$v$, $v$The Rt Hon Shabana Mahmood MP$v$, $v$Secretary of State for the Home Department$v$, $v$sos$v$, 'commons_cabinet'),
  (21936, $v$home-office$v$, $v$The Rt Hon Dan Jarvis MBE MP$v$, $v$Minister of State (Security Minister)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21937, $v$home-office$v$, $v$The Rt Hon Lord Hanson of Flint$v$, $v$Minister of State (Lords Minister)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (21938, $v$home-office$v$, $v$Sarah Jones MP$v$, $v$Minister of State (Minister for Policing and Crime)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21939, $v$home-office$v$, $v$The Rt Hon Anna Turley MP$v$, $v$Minister of State (Minister for Border Security and Asylum)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21940, $v$home-office$v$, $v$Satvir Kaur MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Safeguarding and Violence Against Women and Girls)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21941, $v$home-office$v$, $v$Lord Collins of Highbury$v$, $v$Parliamentary Under-Secretary of State (Minister for Equalities)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21942, $v$home-office$v$, $v$Jo White MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Migration and Citizenship)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21943, $v$health$v$, $v$The Rt Hon Yvette Cooper MP$v$, $v$Secretary of State for Health and Social Care$v$, $v$sos$v$, 'commons_cabinet'),
  (21944, $v$health$v$, $v$The Rt Hon Dame Diana Johnson DBE MP$v$, $v$Minister of State (Minister for Public Health and Patient Safety)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21945, $v$health$v$, $v$Alison McGovern MP$v$, $v$Minister of State (Minister for Social Care and Mental Health)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21946, $v$health$v$, $v$Karin Smyth MP$v$, $v$Minister of State for Health (Secondary Care)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21947, $v$health$v$, $v$Chris McDonald MP$v$, $v$Minister of State (Minister for Science, Innovation and Investment)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21948, $v$health$v$, $v$James Frith MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Health Innovation)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21949, $v$health$v$, $v$Baroness Merron$v$, $v$Parliamentary Under-Secretary of State (Minister for Women's Health and Maternity)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21950, $v$energy$v$, $v$The Rt Hon Miatta Fahnbulleh MP$v$, $v$Secretary of State for Energy Security and Net Zero$v$, $v$sos$v$, 'commons_cabinet'),
  (21951, $v$energy$v$, $v$Michael Shanks MP$v$, $v$Minister of State (Minister for Energy)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21952, $v$energy$v$, $v$Katie White OBE MP$v$, $v$Minister of State (Minister for Climate Transition)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21953, $v$energy$v$, $v$Martin McCluskey MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Local Energy and Jobs)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21954, $v$energy$v$, $v$Polly Billington MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Energy Consumers)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21955, $v$energy$v$, $v$Blair McDougall MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Reindustrialisation)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21956, $v$energy$v$, $v$Baroness Curran$v$, $v$Parliamentary Under-Secretary of State (Lords Minister)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21957, $v$education$v$, $v$The Rt Hon Lucy Powell MP$v$, $v$Secretary of State for Education$v$, $v$sos$v$, 'commons_cabinet'),
  (21958, $v$education$v$, $v$Georgia Gould OBE MP$v$, $v$Minister of State (Minister for School Standards)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21959, $v$education$v$, $v$The Rt Hon Baroness Smith of Malvern$v$, $v$Minister of State (Minister for Skills)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (21960, $v$education$v$, $v$Josh MacAlister OBE MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Children and Families)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21961, $v$education$v$, $v$Paul Waugh MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Early Education)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21962, $v$work-pensions$v$, $v$The Rt Hon Pat McFadden MP$v$, $v$Secretary of State for Work and Pensions$v$, $v$sos$v$, 'commons_cabinet'),
  (21963, $v$work-pensions$v$, $v$The Rt Hon Sir Stephen Timms MP$v$, $v$Minister of State (Minister for Social Security and Disability)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21964, $v$work-pensions$v$, $v$Andrew Western MP$v$, $v$Minister of State (Minister for Employment)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21965, $v$work-pensions$v$, $v$The Rt Hon Baroness Smith of Malvern$v$, $v$Minister of State (Minister for Skills)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (21966, $v$work-pensions$v$, $v$Baroness Sherlock OBE$v$, $v$Minister of State (Minister for Lords)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (21967, $v$work-pensions$v$, $v$Torsten Bell MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Pensions)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21968, $v$work-pensions$v$, $v$Lilian Greenwood MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Innovation, Fraud and Data) $v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21969, $v$transport$v$, $v$The Rt Hon Heidi Alexander MP$v$, $v$Secretary of State for Transport$v$, $v$sos$v$, 'commons_cabinet'),
  (21970, $v$transport$v$, $v$Lord Hendy of Richmond Hill CBE$v$, $v$Minister of State (Minister for Rail)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (21971, $v$transport$v$, $v$Justin Madders MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Roads)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21972, $v$transport$v$, $v$Simon Lightwood MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Buses and Local Transport)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21973, $v$transport$v$, $v$Keir Mather MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Aviation, Maritime and Logistics)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21974, $v$environment$v$, $v$The Rt Hon Dame Angela Eagle DBE MP$v$, $v$Secretary of State for Environment, Food and Rural Affairs$v$, $v$sos$v$, 'commons_cabinet'),
  (21975, $v$environment$v$, $v$Emma Hardy MP$v$, $v$Minister of State$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21976, $v$environment$v$, $v$Jenny Riddell-Carpenter MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21977, $v$environment$v$, $v$Stephen Morgan MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21978, $v$environment$v$, $v$Baroness Hayman of Ullock$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21979, $v$business-trade$v$, $v$The Rt Hon Jonathan Reynolds MP$v$, $v$President of the Board of Trade$v$, $v$sos$v$, 'commons_cabinet'),
  (21980, $v$business-trade$v$, $v$The Rt Hon Kanishka Narayan MP$v$, $v$Minister of State (Minister for Artificial Intelligence)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21981, $v$business-trade$v$, $v$Chris McDonald MP$v$, $v$Minister of State (Minister for Science, Innovation and Investment)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21982, $v$business-trade$v$, $v$Kate Dearden MP$v$, $v$Minister of State (Minister for the Future of Work)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21983, $v$business-trade$v$, $v$Lord Sarwar$v$, $v$Minister of State (Minister for Trade)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (21984, $v$business-trade$v$, $v$Blair McDougall MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Reindustrialisation)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21985, $v$business-trade$v$, $v$Baroness Lloyd of Effra CBE$v$, $v$Parliamentary Under-Secretary of State (Minister for Space, Cyber and Regulatory Reform)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21986, $v$business-trade$v$, $v$Lord Leong CBE$v$, $v$Parliamentary Under-Secretary of State (Minister for Small Business and Enterprise)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21987, $v$housing$v$, $v$The Rt Hon Angela Rayner MP$v$, $v$Secretary of State for Housing, Communities and Local Government$v$, $v$sos$v$, 'commons_cabinet'),
  (21988, $v$housing$v$, $v$The Rt Hon Bridget Phillipson MP$v$, $v$Minister for Women and Equalities$v$, NULL, 'commons_cabinet'),
  (21989, $v$housing$v$, $v$The Rt Hon Matthew Pennycook MP$v$, $v$Minister of State (Minister for Housing and Planning)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21990, $v$housing$v$, $v$Florence Eshalomi MP$v$, $v$Minister of State (Minister for Homelessness, Democracy, Communities and Faith)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21991, $v$housing$v$, $v$The Rt Hon Sir Stephen Timms MP$v$, $v$Minister of State (Minister for Social Security and Disability)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (21992, $v$housing$v$, $v$Sally Jameson MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21993, $v$housing$v$, $v$Jim McMahon OBE MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Local Government, Devolution and Regional Growth)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21994, $v$housing$v$, $v$Baroness Taylor of Stevenage OBE$v$, $v$Parliamentary Under-Secretary of State (Minister for Housing and Local Government)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21995, $v$housing$v$, $v$Baroness Blake of Leeds CBE$v$, $v$Parliamentary Under-Secretary of State (Minister for Building Safety, Fire and Resilience)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21996, $v$housing$v$, $v$Satvir Kaur MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Safeguarding and Violence Against Women and Girls)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21997, $v$housing$v$, $v$Simon Lightwood MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Buses and Local Transport)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (21998, $v$housing$v$, $v$Lord Collins of Highbury$v$, $v$Parliamentary Under-Secretary of State (Minister for Equalities)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (21999, $v$justice$v$, $v$The Rt Hon Alex Norris MP$v$, $v$Lord Chancellor and Secretary of State for Justice$v$, $v$sos$v$, 'commons_cabinet'),
  (22000, $v$justice$v$, $v$Catherine McKinnell MP$v$, $v$Minister of State (Minister for Prisons, Probation and Reducing Reoffending)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22001, $v$justice$v$, $v$Sarah Sackman KC MP$v$, $v$Minister of State (Minister for Courts and Legal Services)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22002, $v$justice$v$, $v$Lord Lemos CMG CBE$v$, $v$Parliamentary Under-Secretary of State and Lords Minister$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22003, $v$justice$v$, $v$Alex Davies-Jones MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Victims, Violence Against Women and Girls (VAWG) and International Justice)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22004, $v$justice$v$, $v$Jake Richards MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Sentencing, Human Rights and Technology)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22005, $v$defence$v$, $v$The Rt Hon Wes Streeting MP$v$, $v$Secretary of State for Defence$v$, $v$sos$v$, 'commons_cabinet'),
  (22006, $v$defence$v$, $v$Luke Pollard MP$v$, $v$Minister of State (Minister for Defence Readiness and Industry)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22007, $v$defence$v$, $v$Lord Coaker$v$, $v$Minister of State (Minister for the House of Lords)$v$, $v$minister_of_state$v$, 'lords_minister_of_state'),
  (22008, $v$defence$v$, $v$Louise Sandher-Jones MP$v$, $v$Parliamentary Under-Secretary of State (Minister for the Armed Forces)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22009, $v$defence$v$, $v$Calvin Bailey MBE MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Veterans and People) $v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22010, $v$culture$v$, $v$The Rt Hon Lisa Nandy MP$v$, $v$Secretary of State for Digital, Culture, Media and Sport$v$, $v$sos$v$, 'commons_cabinet'),
  (22011, $v$culture$v$, $v$The Rt Hon Ian Murray MP$v$, $v$Minister of State (Minister for Creative Industries, Media and Online Safety)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22012, $v$culture$v$, $v$Vicky Foxcroft MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Youth, Gambling, Digital Inclusion, Civil Society & Loneliness)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22013, $v$culture$v$, $v$Stephanie Peacock MP$v$, $v$Parliamentary Under-Secretary of State (Minister for Sport, Tourism, Place and Digital Government)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22014, $v$culture$v$, $v$Baroness Mackenzie of Sherwood CBE$v$, $v$Parliamentary Under-Secretary of State (Minister for Arts and Museums)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22015, $v$culture$v$, $v$Baroness Lloyd of Effra CBE$v$, $v$Parliamentary Under-Secretary of State (Minister for Space, Cyber and Regulatory Reform)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22016, $v$culture$v$, $v$Baroness Twycross$v$, $v$Parliamentary Under-Secretary of State (Minister for Heritage)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22017, $v$cabinet-office$v$, $v$The Rt Hon Louise Haigh MP$v$, $v$Minister for the Cabinet Office$v$, $v$pm$v$, 'commons_cabinet'),
  (22018, $v$cabinet-office$v$, $v$The Rt Hon Hamish Falconer MP$v$, $v$Minister of State (Minister for Intergovernmental Relations and European Relations) $v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22019, $v$cabinet-office$v$, $v$The Rt Hon Kanishka Narayan MP$v$, $v$Minister of State (Minister for Artificial Intelligence)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22020, $v$cabinet-office$v$, $v$The Rt Hon Dan Jarvis MBE MP$v$, $v$Minister of State (Security Minister)$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22021, $v$cabinet-office$v$, $v$Sally Jameson MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22022, $v$cabinet-office$v$, $v$Daniel Tomlinson MP$v$, $v$Parliamentary Secretary$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22023, $v$cabinet-office$v$, $v$Mark Ferguson MP$v$, $v$Parliamentary Secretary$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22024, $v$cabinet-office$v$, $v$Baroness Twycross$v$, $v$Parliamentary Under-Secretary of State (Minister for Heritage)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22025, $v$foreign-office$v$, $v$The Rt Hon Ed Miliband MP$v$, $v$Secretary of State for Foreign, Commonwealth and Development Affairs$v$, $v$sos$v$, 'commons_cabinet'),
  (22026, $v$foreign-office$v$, $v$The Rt Hon Hamish Falconer MP$v$, $v$Minister of State (Minister for Intergovernmental Relations and European Relations) $v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22027, $v$foreign-office$v$, $v$Kirsty McNeill MP$v$, $v$Minister of State for International Development$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22028, $v$foreign-office$v$, $v$Stephen Doughty MP$v$, $v$Minister of State$v$, $v$minister_of_state$v$, 'commons_minister_of_state'),
  (22029, $v$foreign-office$v$, $v$Uma Kumaran MP$v$, $v$Assistant Whip$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22030, $v$foreign-office$v$, $v$Chris Elmore MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22031, $v$foreign-office$v$, $v$Lord Wood of Anfield$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22032, $v$foreign-office$v$, $v$The Rt Hon Baroness Winterton of Doncaster DBE$v$, $v$Parliamentary Under Secretary of State $v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22033, $v$attorney-general$v$, $v$The Rt Hon Ellie Reeves KC MP$v$, $v$Attorney General$v$, $v$sos$v$, 'commons_attorney_general'),
  (22034, $v$attorney-general$v$, $v$Andy Slaughter KC MP$v$, $v$Solicitor General$v$, $v$puss$v$, 'commons_solicitor_general'),
  (22035, $v$scotland-office$v$, $v$The Rt Hon Douglas Alexander MP$v$, $v$Secretary of State for Scotland$v$, $v$sos$v$, 'commons_cabinet'),
  (22036, $v$scotland-office$v$, $v$Melanie Ward MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22037, $v$wales-office$v$, $v$The Rt Hon Stephen Kinnock MP$v$, $v$Secretary of State for Wales$v$, $v$sos$v$, 'commons_cabinet'),
  (22038, $v$wales-office$v$, $v$Anna McMorrin MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22039, $v$wales-office$v$, $v$Claire Hughes MP$v$, $v$Junior Lord of the Treasury (Government Whip)$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22040, $v$northern-ireland-office$v$, $v$The Rt Hon Sir Chris Bryant MP$v$, $v$Secretary of State for Northern Ireland$v$, $v$sos$v$, 'commons_cabinet'),
  (22041, $v$northern-ireland-office$v$, $v$Sarah Owen MP$v$, $v$Parliamentary Under-Secretary of State$v$, $v$puss$v$, 'commons_parliamentary_secretary'),
  (22042, $v$northern-ireland-office$v$, $v$Baroness Anderson of Stoke-on-Trent$v$, $v$Captain of The King’s Bodyguard of the Yeoman of the Guard (Lords Deputy Chief Whip)$v$, NULL, 'lords_deputy_chief_whip'),
  (22043, $v$commons-leader$v$, $v$The Rt Hon Sir Alan Campbell MP$v$, $v$Leader of the House of Commons$v$, $v$sos$v$, 'commons_cabinet'),
  (22044, $v$lords-leader$v$, $v$The Rt Hon Baroness Smith of Basildon$v$, $v$Leader of the House of Lords$v$, $v$sos$v$, 'lords_leader_or_secretary_of_state'),
  (22045, $v$lords-leader$v$, $v$Lord Collins of Highbury$v$, $v$Parliamentary Under-Secretary of State (Minister for Equalities)$v$, $v$puss$v$, 'lords_parliamentary_secretary'),
  (22046, $v$advocate-general$v$, $v$Baroness Smith of Cluny KC$v$, $v$HM Advocate General for Scotland $v$, $v$sos$v$, 'lords_advocate_general'),
  (22047, $v$ukef$v$, $v$The Rt Hon Jonathan Reynolds MP$v$, $v$President of the Board of Trade$v$, $v$sos$v$, 'commons_cabinet'),
  (22048, $v$ukef$v$, $v$Lord Sarwar$v$, $v$Minister of State (Minister for Trade)$v$, $v$minister_of_state$v$, 'lords_minister_of_state');

DO $chk$
DECLARE n integer; total integer;
BEGIN
  SELECT count(*) INTO n FROM public.ministerial_salary_rates;
  IF n <> 15 THEN RAISE EXCEPTION 'expected 15 rates, found %', n; END IF;
  SELECT count(*) INTO n FROM public.hand_loaded_datasets WHERE key = 'ministerial_salaries';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 hand_loaded_datasets row, found %', n; END IF;
  SELECT count(*) INTO total FROM public.dept_ministers;
  IF total <> 121 THEN RAISE EXCEPTION 'dept_ministers has % rows, expected 121 (re-export the filing: the GOV.UK sync may have run)', total; END IF;
  UPDATE public.dept_ministers d SET salary_category = f.category
    FROM _filing f
   WHERE d.id = f.id AND d.dept_slug = f.dept_slug AND d.name = f.name
     AND d.role IS NOT DISTINCT FROM f.role AND d.salary_band IS NOT DISTINCT FROM f.old_band AND d.salary_category IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 121 THEN RAISE EXCEPTION 'dept_ministers: expected 121 rows filed, filed %', n; END IF;
  UPDATE public.peer_finance SET ministerial_salary_annual = NULL, period_label = NULL, ministerial_source_url = NULL
   WHERE slug = 'richard-hermer' AND ministerial_salary_annual = 100819
     AND period_label = $v$Last published April 2022 to figure listed for Attorney General when held by a Commons MP. The Lords-AG entitled salary is not separately disclosed in the April 2022 ministerial-salary publication.$v$ AND ministerial_source_url = $v$https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-april-2022-html$v$;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'peer_finance: expected 1 row cleared, cleared %', n; END IF;
END
$chk$;
COMMIT;
