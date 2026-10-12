-- Corrects 14 handwritten MP biographies that still treat Keir Starmer as Prime Minister / Labour leader.
-- Starmer was PM 5 Jul 2024 - 20 Jul 2026; Andy Burnham became Labour leader 17 Jul 2026 and PM 20 Jul 2026;
-- Starmer left the Commons 1 Sep 2026. Each change replaces one exact phrase. If any phrase is not found
-- (text changed since it was checked) the whole update stops and nothing is changed.
DO $do$
DECLARE
  r record;
  bio text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    (4514, $q$Keir Starmer has been Prime Minister since July 2024.$q$, $q$Keir Starmer was Prime Minister from July 2024 to July 2026.$q$),
    (4514, $q$He has been MP for Holborn and St Pancras since 2015. He became Labour leader in April 2020, immediately after the worst Labour defeat since 1935.$q$, $q$He was MP for Holborn and St Pancras from 2015 until 1 September 2026, when he stood down from the Commons. He became Labour leader in April 2020, immediately after the worst Labour defeat since 1935, and led the party until July 2026: Andy Burnham succeeded him as Labour leader on 17 July and as Prime Minister on 20 July.$q$),
    (4514, $q$The mandate is real but smaller than the seat count suggests, and that mismatch defines almost everything about the early period of his government.$q$, $q$The mandate was real but smaller than the seat count suggested, and that mismatch defined almost everything about the early period of his government.$q$),
    (4514, $q$The character of Starmer's politics is essentially professional. He runs the operation tightly. The party machine is disciplined for the first time in over a decade. The cabinet, with occasional exceptions, sticks to message.$q$, $q$The character of Starmer's politics was essentially professional. He ran the operation tightly. The party machine was disciplined for the first time in over a decade. The cabinet, with occasional exceptions, stuck to message.$q$),
    (4514, $q$That trade has costs. Discipline produces a frontbench that often sounds the same. Caution produces a government that has been slow to make the politically risky moves its own backbenchers want. The first year has been defined$q$, $q$That trade had costs. Discipline produced a frontbench that often sounded the same. Caution produced a government that was slow to make the politically risky moves its own backbenchers wanted. His first year was defined$q$),
    (4514, $q$The political record so far has flashes of substance. The Employment Rights Bill is real. GB Energy is real. The planning reforms in the NPPF are real, although the test is whether they produce houses.$q$, $q$The political record had flashes of substance. The Employment Rights Bill was real. GB Energy was real. The planning reforms in the NPPF were real, although the test was whether they would produce houses.$q$),
    (4514, $q$however disciplined, is still capable of mishandling its own internal politics.$q$, $q$however disciplined, was still capable of mishandling its own internal politics.$q$),
    (4514, $q$The harder critique is that Starmer is more comfortable saying what Labour is not than what Labour is. He has spent fifteen years of his political life on positions that have shifted as the politics shifted,$q$, $q$The harder critique was that Starmer was more comfortable saying what Labour was not than what Labour was. He spent his political career on positions that shifted as the politics shifted,$q$),
    (4514, $q$Both are partly true and the country has not yet settled on which weighs more.$q$, $q$Both are partly true, and the country never settled on which weighed more.$q$),
    (4514, $q$He won the leadership in 2020 on ten pledges and has since walked away from many of them.$q$, $q$He won the leadership in 2020 on ten pledges and later walked away from many of them.$q$),
    (4514, $q$but in office only rail remains slated for public ownership,$q$, $q$but in office only rail was slated for public ownership,$q$),
    (4514, $q$He is not corrupt. He is not theatrical. He is, by some distance, the most disciplined Prime Minister Britain has had since the early Cameron years. Whether discipline is enough to address what is actually wrong with the country is the question the rest of this parliament will answer.$q$, $q$He was not corrupt. He was not theatrical. He was, by some distance, the most disciplined Prime Minister Britain had had since the early Cameron years. Discipline did not prove enough. After heavy Labour losses in the May 2026 local elections his support among Labour MPs collapsed, and on 22 June 2026 he announced that he would stand down as Labour leader.$q$),
    (4268, $q$That matters in his housing brief,$q$, $q$That mattered in his housing brief,$q$),
    (4268, $q$and clearly trusted by Keir Starmer's operation.$q$, $q$and was clearly trusted by Keir Starmer's operation.$q$),
    (4479, $q$Nick Thomas-Symonds has been Labour MP for Torfaen since 2015 and currently serves as Paymaster General, Minister for the Cabinet Office, and Minister for the Constitution and European Union Relations.$q$, $q$Nick Thomas-Symonds has been Labour MP for Torfaen since 2015. Until July 2026 he served as Paymaster General, Minister for the Cabinet Office, and Minister for the Constitution and European Union Relations.$q$),
    (4479, $q$is the most significant diplomatic achievement of the Starmer government to date.$q$, $q$was the most significant diplomatic achievement of the Starmer government.$q$),
    (4479, $q$and a ministerial portfolio at the centre of the government's constitutional and European agenda.$q$, $q$and, until July 2026, a ministerial portfolio at the centre of the government's constitutional and European agenda.$q$),
    (4479, $q$that undervalues what he has delivered,$q$, $q$that undervalued what he delivered,$q$),
    (4493, $q$and a rebellion record that guarantees permanent exclusion from any Starmer led government.$q$, $q$and a rebellion record that kept him out of Starmer's government.$q$),
    (4493, $q$depends on who leads the party next.$q$, $q$depends on the direction Labour takes under Andy Burnham.$q$),
    (4623, $q$and she has since called for Keir Starmer to set a departure timetable.$q$, $q$and she later called for Keir Starmer to set a departure timetable.$q$),
    (4623, $q$the call for Starmer to go closing any door to government,$q$, $q$the call for Starmer to go, which closed the door to government under his leadership,$q$),
    (4716, $q$the call for Starmer's resignation closing the door to ministerial office under this leadership,$q$, $q$the call for Starmer's resignation, which closed the door to ministerial office under his leadership,$q$),
    (4716, $q$Whether the prisons inquiry and the Starmer confrontation produce consequences will determine$q$, $q$Whether the prisons inquiry produces consequences, and how she fares under Andy Burnham's leadership, will determine$q$),
    (4747, $q$the Starmer resignation call closing any door to government,$q$, $q$the Starmer resignation call, which closed the door to government under his leadership,$q$),
    (4828, $q$will say as much about Starmer's priorities as about hers.$q$, $q$will say as much about Andy Burnham's priorities as about hers.$q$),
    (4873, $q$the frontbench resignation over Gaza closing the door to ministerial promotion under Starmer,$q$, $q$the frontbench resignation over Gaza, which closed the door to ministerial promotion under Starmer,$q$),
    (5065, $q$Whether the Starmer resignation call helps or hinders in a constituency where Reform UK took 26 percent is the immediate question.$q$, $q$Starmer resigned in July 2026. Whether her call for his resignation helps or hinders her in a constituency where Reform UK took 26 percent is the immediate question.$q$),
    (5154, $q$the Starmer resignation call closing the door to government under this leadership,$q$, $q$the Starmer resignation call, which closed the door to government under his leadership,$q$),
    (5178, $q$the Starmer resignation call closing the door to any government role under this leadership,$q$, $q$the Starmer resignation call, which closed the door to any government role under his leadership,$q$),
    (5215, $q$that constitutes the most serious internal challenge to a sitting Labour Prime Minister since the attempted coup against Corbyn in 2016.$q$, $q$that constituted the most serious internal challenge to a sitting Labour leader since the attempted coup against Corbyn in 2016, and that ended with Starmer's resignation.$q$),
    (5215, $q$a public break with the Prime Minister that forecloses any return to government under Starmer,$q$, $q$a public break with the Prime Minister that ruled out any return to government under Starmer,$q$),
    (5215, $q$Whether the Starmer revolt helps or destroys that career depends on who leads Labour next.$q$, $q$Whether the Starmer revolt helps or destroys that career now depends on how she fares under Andy Burnham, who succeeded him in July 2026.$q$),
    (5221, $q$the SCG membership potentially limiting advancement under Starmer,$q$, $q$the SCG membership, which limited advancement under Starmer,$q$)
  ) AS t(member_id, old_text, new_text) LOOP
    SELECT political_bio INTO bio FROM public.mp_biography WHERE member_id = r.member_id;
    IF bio IS NULL OR position(r.old_text IN bio) = 0 THEN
      RAISE EXCEPTION 'Phrase not found for member %: %', r.member_id, left(r.old_text, 80);
    END IF;
    UPDATE public.mp_biography SET political_bio = replace(political_bio, r.old_text, r.new_text) WHERE member_id = r.member_id;
  END LOOP;
  RAISE NOTICE 'Applied % biography corrections', 34;
END
$do$;
