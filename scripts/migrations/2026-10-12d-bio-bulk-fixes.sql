-- Bulk biography fixes (step 1 of the biography clean-up), approved 12 Oct 2026.
--  * removes 6 "Open Govt note" paragraphs (the July 2026 facts they flagged were checked against
--    Parliament's records and the House of Commons Library first)
--  * removes leftover editing instructions published as text (e.g. "must be stated precisely")
--  * removes age references ("At 54, ..."), which go out of date every year
--  * changes "percent" to "per cent" (house style)
--  * fixes doubled apostrophes ('') left by an earlier import in 21 biographies
-- Each phrase change must match exactly once or the whole update stops and nothing changes.
\set ON_ERROR_STOP on
BEGIN;
DO $do$
DECLARE r record; bio text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    (400, $q$

Open Govt note: the account of the July 2026 change of government, including Healey's resignation as defence secretary, his move to the Treasury and Andy Burnham's cabinet, is drawn from Open Govt's own record of that period, not external reporting.$q$, $q$$q$),
    (1427, $q$

Open Govt note: the account of Burnham's return to Parliament and move to Downing Street is drawn from Open Govt's own record of the July 2026 change of government, not external reporting.$q$, $q$$q$),
    (1587, $q$

Open Govt note: the July 2026 material, including Andy Burnham keeping McFadden at work and pensions and references to his government, is drawn from Open Govt's own record of that period, not external reporting.$q$, $q$$q$),
    (3914, $q$

Open Govt note: the July 2026 material, including Andy Burnham's pause of the release scheme and references to his government, is drawn from Open Govt's own record of that period, not external reporting.$q$, $q$$q$),
    (4263, $q$

Open Govt note: the July 2026 material, including Powell's return as education secretary under Andy Burnham and his government's education programme, is drawn from Open Govt's own record of that period, not external reporting.$q$, $q$$q$),
    (5099, $q$

Open Govt note: the July 2026 material, including Fahnbulleh's return as energy secretary under Andy Burnham and his government's energy position, is drawn from Open Govt's own record of that period, not external reporting.$q$, $q$$q$),
    (1383, $q$At 63, the Deputy Chief Whip role is the peak of his career. $q$, $q$$q$),
    (1409, $q$At 73, after more than four decades in office, $q$, $q$After more than four decades in office, $q$),
    (1593, $q$At 73, with a teaching career, two mayoralties,$q$, $q$With a teaching career, two mayoralties,$q$),
    (3909, $q$At 41, returning to Parliament after nine years$q$, $q$Returning to Parliament after nine years$q$),
    (3928, $q$At 66, he is unlikely to receive a ministerial appointment now. $q$, $q$$q$),
    (4056, $q$At 70, the Vice-Chamberlain role is likely the final significant office of his career. $q$, $q$$q$),
    (4076, $q$At 71, with the Shadow Leader career, the bioch$q$, $q$With the Shadow Leader career, the bioch$q$),
    (4088, $q$At 49, with the PhD, the legislative record, an$q$, $q$With the PhD, the legislative record, an$q$),
    (4131, $q$At 71, with military service, a half century in$q$, $q$With military service, a half century in$q$),
    (4138, $q$At 51, she retains her seat but has lost both t$q$, $q$She retains her seat but has lost both t$q$),
    (4253, $q$At 53, with two ministerial portfolios, two fou$q$, $q$With two ministerial portfolios, two fou$q$),
    (4264, $q$At 46, with Oxford PPE, OSCE, Oxfam, special-ad$q$, $q$With Oxford PPE, OSCE, Oxfam, special-ad$q$),
    (4267, $q$At 56, she has achieved more from the backbench$q$, $q$She has achieved more from the backbench$q$),
    (4360, $q$At 41 he is young for the job but old in DUP service. $q$, $q$$q$),
    (4368, $q$At 47, he has survived. $q$, $q$$q$),
    (4389, $q$At 66, the Transport Committee chair is likely the peak institutional role of her career. $q$, $q$$q$),
    (4396, $q$At 46, with a safe seat and SCG membership, she$q$, $q$With a safe seat and SCG membership, she$q$),
    (4397, $q$At 68, his career is in its final phase. $q$, $q$$q$),
    (4409, $q$At 52, she may not survive the next election. $q$, $q$$q$),
    (4471, $q$At 53, with a safe seat and the vice chair of t$q$, $q$With a safe seat and the vice chair of t$q$),
    (4479, $q$At 45, he is young enough for further advancement. $q$, $q$$q$),
    (4491, $q$At 49, with the Youth Violence Commission, the $q$, $q$With the Youth Violence Commission, the $q$),
    (4493, $q$At 45, with a safe seat and the SCG, he will re$q$, $q$With a safe seat and the SCG, he will re$q$),
    (4518, $q$At 43, she retains a safe seat but her ministerial career is effectively over. $q$, $q$$q$),
    (4521, $q$At 61, she has accumulated more institutional w$q$, $q$She has accumulated more institutional w$q$),
    (4607, $q$At 39, she has more party institutional experience than many ministers twice her age. $q$, $q$$q$),
    (4623, $q$At 54, with seven years in Parliament, a World $q$, $q$With seven years in Parliament, a World $q$),
    (4631, $q$At 53, she holds a genuine Minister of State po$q$, $q$She holds a genuine Minister of State po$q$),
    (4653, $q$At 45, with the charity chief executive backgro$q$, $q$With the charity chief executive backgro$q$),
    (4716, $q$At 64, with the Wales TUC presidency, 30 years of NHS frontline work, and the Welsh Affairs chair, she has more institutional authority than a "steady Labour public servant" verdict captures. $q$, $q$$q$),
    (4739, $q$At 56, with the Mayhew name, the Go Ape record $q$, $q$With the Mayhew name, the Go Ape record $q$),
    (4747, $q$At 54, with the Royal Mail apprenticeship, the $q$, $q$With the Royal Mail apprenticeship, the $q$),
    (4759, $q$At 45, with the American background, the humani$q$, $q$With the American background, the humani$q$),
    (4777, $q$At 43, the WEC chair and the hate crime and Bri$q$, $q$The WEC chair and the hate crime and Bri$q$),
    (4779, $q$At 33, she is one of the youngest Government Whips. $q$, $q$$q$),
    (4787, $q$At 49, with a Downing Street background, the Ev$q$, $q$With a Downing Street background, the Ev$q$),
    (4798, $q$At 54, with a spell as Sentencing Minister, the$q$, $q$With a spell as Sentencing Minister, the$q$),
    (4811, $q$At 36, he has time and a safe seat. $q$, $q$$q$),
    (4827, $q$At 45, with the Concern decade, the Queen's LLM$q$, $q$With the Concern decade, the Queen's LLM$q$),
    (4828, $q$At 54, with the UNISON background, the housing $q$, $q$With the UNISON background, the housing $q$),
    (4857, $q$At 41, she represents Upper Bann with a methodi$q$, $q$She represents Upper Bann with a methodi$q$),
    (4860, $q$At 42, his career has moved from health to law $q$, $q$His career has moved from health to law $q$),
    (4864, $q$At 36, with a safe seat, a SEND chair, an Envir$q$, $q$With a safe seat, a SEND chair, an Envir$q$),
    (4869, $q$At 29, she is no longer the youngest MP following the 2024 intake. $q$, $q$$q$),
    (4869, $q$At 29 she has more parliamentary experience th$q$, $q$She has more parliamentary experience th$q$),
    (4873, $q$At 54, she has a platform on electoral administ$q$, $q$She has a platform on electoral administ$q$),
    (4938, $q$At 63, she has the health expertise, the commit$q$, $q$She has the health expertise, the commit$q$),
    (4943, $q$At 45, with the theatre acting background, the $q$, $q$With the theatre acting background, the $q$),
    (4976, $q$At 60, with an MBE, the Poverty Truth Commissio$q$, $q$With an MBE, the Poverty Truth Commissio$q$),
    (5001, $q$At 37, with a Central Saint Martins education and a marginal seat, she has time but not security. $q$, $q$$q$),
    (5035, $q$At 44, with the Rifles background, the gym, the$q$, $q$With the Rifles background, the gym, the$q$),
    (5041, $q$At 40, with the poverty to LGA chair trajectory$q$, $q$With the poverty to LGA chair trajectory$q$),
    (5052, $q$At 49, he has time to build the record. $q$, $q$$q$),
    (5053, $q$At 42, with the ministerial role now in hand, t$q$, $q$With the ministerial role now in hand, t$q$),
    (5064, $q$At 42, with the pharmacy expertise, the Science$q$, $q$With the pharmacy expertise, the Science$q$),
    (5085, $q$At 43, the test is concrete. $q$, $q$$q$),
    (5087, $q$At 40, with Aston, Harvard and 19 years of engi$q$, $q$With Aston, Harvard and 19 years of engi$q$),
    (5088, $q$At 34, she is young with significant political experience and a safe enough majority. $q$, $q$$q$),
    (5108, $q$At 41, with the doctorate, the Council of Europ$q$, $q$With the doctorate, the Council of Europ$q$),
    (5123, $q$At 58, she is unlikely to have a 30-year parliamentary career. $q$, $q$$q$),
    (5125, $q$At 40, with the mixed family, the Tesco backgro$q$, $q$With the mixed family, the Tesco backgro$q$),
    (5128, $q$At 38, with the Foreign Affairs Committee, the $q$, $q$With the Foreign Affairs Committee, the $q$),
    (5144, $q$At 54, with the engineering background, the sma$q$, $q$With the engineering background, the sma$q$),
    (5152, $q$At 51, with 25 years of classroom experience, t$q$, $q$With 25 years of classroom experience, t$q$),
    (5163, $q$At 67, he is unlikely to serve more than two terms. $q$, $q$$q$),
    (5165, $q$At 32, with the Sutton Trust and three APPG chairs, he carries more institutional responsibility than most MPs twice his age. $q$, $q$$q$),
    (5180, $q$At 37, she is young for a minister and has the local government expertise to be effective at MHCLG. $q$, $q$$q$),
    (5190, $q$At 67, this is likely her final political posting. $q$, $q$$q$),
    (5194, $q$At 62, with the chemistry degree, the AI life-s$q$, $q$With the chemistry degree, the AI life-s$q$),
    (5197, $q$At 41, with trauma surgery, military service, a$q$, $q$With trauma surgery, military service, a$q$),
    (5204, $q$At 41, with KC, Cambridge, Harvard and a Minist$q$, $q$With KC, Cambridge, Harvard and a Minist$q$),
    (5208, $q$At 56, he has a foundation built on genuine Cor$q$, $q$He has a foundation built on genuine Cor$q$),
    (5210, $q$At 43, with Cambridge, Yale, the charity chief $q$, $q$With Cambridge, Yale, the charity chief $q$),
    (5215, $q$At 40, with the housing expertise and the local$q$, $q$With the housing expertise and the local$q$),
    (5220, $q$At 40, with the Durham degrees, the Special Con$q$, $q$With the Durham degrees, the Special Con$q$),
    (5222, $q$At 34, with Oxford PPE, the OUSU presidency, Deloitte and the CMS Committee, he has an unusually polished political formation for his age. $q$, $q$$q$),
    (5246, $q$At 61, with 37 years of journalism including 12$q$, $q$With 37 years of journalism including 12$q$),
    (5247, $q$At 42, with the Kerala to Westminster trajector$q$, $q$With the Kerala to Westminster trajector$q$),
    (5249, $q$At 51, with a doctorate, a lecturing career, a $q$, $q$With a doctorate, a lecturing career, a $q$),
    (5253, $q$At 51, he has both the Holyrood experience and $q$, $q$He has both the Holyrood experience and $q$),
    (5255, $q$At 41, with a UCL degree, family roots in islan$q$, $q$With a UCL degree, family roots in islan$q$),
    (5267, $q$At 35, with Balliol, the LSE, the FT, a Penguin$q$, $q$With Balliol, the LSE, the FT, a Penguin$q$),
    (5278, $q$At 38, with the refugee heritage, the Tamil par$q$, $q$With the refugee heritage, the Tamil par$q$),
    (5285, $q$At 34, with the Union presidency, Goldman Sachs$q$, $q$With the Union presidency, Goldman Sachs$q$),
    (5287, $q$At 40, with the Westminster deputy leadership, $q$, $q$With the Westminster deputy leadership, $q$),
    (5308, $q$At 23, he has more time than any other MP. $q$, $q$$q$),
    (5311, $q$At 36, with an Imperial zoology degree, a Readi$q$, $q$With an Imperial zoology degree, a Readi$q$),
    (5312, $q$At 41, with the pharmacy background and a seat $q$, $q$With the pharmacy background and a seat $q$),
    (5314, $q$At 51, with the Oxford degree, three mayoral ca$q$, $q$With the Oxford degree, three mayoral ca$q$),
    (5317, $q$At 68, he is unlikely to serve more than two terms. $q$, $q$$q$),
    (5319, $q$At 54, with two ministerial terms, a national a$q$, $q$With two ministerial terms, a national a$q$),
    (5328, $q$At 40, with the housing officer background, the$q$, $q$With the housing officer background, the$q$),
    (5337, $q$At 39, with two ministerial roles and a safe en$q$, $q$With two ministerial roles and a safe en$q$),
    (5338, $q$At 40, with the magazine business, the communit$q$, $q$With the magazine business, the communit$q$),
    (5345, $q$At 38, he is one of the youngest MPs with executive local government experience. $q$, $q$$q$),
    (5347, $q$At 36, Reed pairs one of the most striking CVs $q$, $q$Reed pairs one of the most striking CVs $q$),
    (5356, $q$At 73, with a King's Counsel, more than fifty y$q$, $q$With a King's Counsel, more than fifty y$q$),
    (5358, $q$At 59, with three decades of journalism, an Ass$q$, $q$With three decades of journalism, an Ass$q$),
    (5447, $q$At 35, with a decade of self employment, a heat$q$, $q$With a decade of self employment, a heat$q$),
    (4786, $q$At 32 she is among the youngest party leaders in British politics and a member of the Council of the Progressive International.$q$, $q$She is a member of the Council of the Progressive International.$q$),
    (5340, $q$At 33, Rankin is one of the youngest Conservative MPs, and the Ashton to Windsor trajectory gives him$q$, $q$The Ashton to Windsor trajectory gives Rankin$q$),
    (4138, $q$The resignation must be stated precisely. $q$, $q$$q$),
    (4253, $q$Her ministerial record must be stated precisely. $q$, $q$$q$),
    (4396, $q$The June 2020 sacking requires precise detail. $q$, $q$$q$),
    (4493, $q$The "Zionism is the enemy of peace" episode must be precisely stated. $q$, $q$$q$),
    (4873, $q$ On a platform dedicated to government transparency, a father and daughter holding the two Luton seats across consecutive generations must be stated.$q$, $q$$q$),
    (5001, $q$The Holiday Inn episode must be stated with precise chronology. $q$, $q$$q$),
    (473, $q$It is sometimes said no legislative achievement is associated with his name. $q$, $q$$q$),
    (4479, $q$Some assessments cast his career as positioning rather than transformation. $q$, $q$$q$),
    (4479, $q$ That is not positioning.$q$, $q$$q$),
    (4479, $q$It is sometimes said he has no major legislative achievement. $q$, $q$$q$),
    (4493, $q$ He is not simply a trade union solicitor: he is a Cambridge English graduate from a mining family with an MP uncle who became one.$q$, $q$$q$),
    (4623, $q$Her rugby is no mere "colour". $q$, $q$$q$),
    (4785, $q$His legislative engagement on mental health is more substantial than the "too modest" verdict alone allows. $q$, $q$$q$),
    (5287, $q$ Running one of London's most significant local authorities is more substantial than "a Westminster councillor" suggests.$q$, $q$$q$),
    (5065, $q$With the Women and Equalities Committee, the freight APPG, and the willingness to call for the PM's removal, she has more definition than a "clean but indistinct" verdict allows. $q$, $q$$q$),
    (5188, $q$With 25 years of trade union experience, Scottish Government advisory roles, and the first-female-Regional-Secretary distinction, she carries more institutional weight than a "long-serving trade unionist" label conveys. $q$, $q$$q$),
    (473, $q$An Anglo-Somali Chartered Engineer who speaks German and was elected to the European Parliament is a more remarkable figure than "parliamentary endurance" suggests.$q$, $q$He is an Anglo-Somali Chartered Engineer who speaks German and was elected to the European Parliament.$q$),
    (4631, $q$, a more substantial pre political career than "campaigning and public affairs" suggests.$q$, $q$.$q$),
    (4716, $q$, not merely a Chartered Society of Physiotherapy official.$q$, $q$.$q$),
    (4747, $q$he came to Parliament with a working class and trade union trajectory the bare label "former councillor" obscures.$q$, $q$he came to Parliament from a working class and trade union background.$q$),
    (4777, $q$, a historic parliamentary first the bare label "Labour left of centre parliamentarian" obscures.$q$, $q$.$q$),
    (4976, $q$, a more distinctive biography than "local government apprenticeship" suggests.$q$, $q$.$q$),
    (5087, $q$, a more substantial professional profile than "local government and engineering" conveys.$q$, $q$.$q$),
    (5154, $q$, a Warrington political network deeper than "locally rooted party operator" suggests.$q$, $q$.$q$),
    (5194, $q$, a more substantial career than "IT and commercial roles" conveys.$q$, $q$.$q$),
    (5222, $q$, marking him out as a more formed political figure than "public affairs and communications" implies.$q$, $q$.$q$),
    (5246, $q$, a deeper island connection than "culturally rooted" captures.$q$, $q$.$q$),
    (5324, $q$, which makes the win more historically significant than "long held by the Conservatives" conveys.$q$, $q$.$q$),
    (5324, $q$She sits on the executive committee of the Fabian Society, a fuller intellectual foundation than "solicitor with local government experience" suggests.$q$, $q$She sits on the executive committee of the Fabian Society.$q$)
  ) AS t(member_id, old_text, new_text) LOOP
    SELECT political_bio INTO bio FROM public.mp_biography WHERE member_id = r.member_id;
    IF bio IS NULL OR position(r.old_text IN bio) = 0 THEN
      RAISE EXCEPTION 'Phrase not found for member %: %', r.member_id, left(r.old_text, 80);
    END IF;
    IF (length(bio) - length(replace(bio, r.old_text, ''))) / length(r.old_text) <> 1 THEN
      RAISE EXCEPTION 'Phrase appears more than once for member %: %', r.member_id, left(r.old_text, 80);
    END IF;
    UPDATE public.mp_biography SET political_bio = replace(political_bio, r.old_text, r.new_text) WHERE member_id = r.member_id;
  END LOOP;
  RAISE NOTICE 'Applied % phrase changes', 136;
END
$do$;
UPDATE public.mp_biography SET political_bio = regexp_replace(political_bio, '\mpercent\M', 'per cent', 'g')
 WHERE political_bio ~ '\mpercent\M';
UPDATE public.mp_biography SET political_bio = replace(political_bio, '''''', '''')
 WHERE political_bio LIKE '%''''%';
COMMIT;
