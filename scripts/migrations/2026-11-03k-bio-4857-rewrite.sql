-- 2026-11-03k: full rewrite of Carla Lockhart's biography (member 4857; owner's approval, 3 Nov 2026).
-- political_bio from "Claude outputs/bio-4857-new.txt", bio_sources from "Claude outputs/bio-4857-sources.json"
-- (5 sources), bio_last_reviewed today, review flag cleared. bio_visible stays false: the biography stays hidden
-- (lib/mp-biography.ts never reads it while hidden). Refuses unless exactly one row changes and it stays hidden.
-- Backup of the row: "Claude outputs/mp-biography-4857-backup-2026-11-03.csv". Undo: ...-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03k-bio-4857-rewrite.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $do$
DECLARE n int;
BEGIN
  UPDATE public.mp_biography
     SET political_bio = $bio4857$Carla Lockhart was elected MP for Upper Bann in December 2019 for the Democratic Unionist Party. On 2 November 2026 she resigned from the party, which she described as her "political home for more than two decades", and said she would sit in the House of Commons as an independent unionist.

Before Westminster she represented Upper Bann in the Northern Ireland Assembly. She was elected in May 2016, re-elected in March 2017, and left the Assembly after winning the Westminster seat in December 2019.

In the Commons she sat on the Northern Ireland Affairs Committee from November 2022 to May 2024. She also served on the bill committees for the Marriage and Civil Partnership (Minimum Age) Bill and the British Sign Language Bill in 2022, and the Local Government (Pay Accountability) Bill in 2024.

At the July 2024 general election she held Upper Bann with 21,642 votes, 45.7 per cent of the total, a majority of 7,406 over Catherine Nelson of Sinn Féin.

Her resignation followed a dispute over the Drumcree parade. In September 2026 Michelle O'Neill, the First Minister, took part with Sinn Féin colleagues in a protest on the Garvaghy Road in Portadown aimed at stopping an Orange Order parade, a protest the Irish News reported police were investigating. Lockhart argued that Ms O'Neill "should be removed from office" and urged the DUP to withdraw Deputy First Minister Emma Little-Pengelly, a step that would also have removed Ms O'Neill. The party instead said it would no longer take part in joint engagements with her.

Lockhart called the party's "graduated response" "insulting to those who have trusted us" and said she was leaving "on a point of principle". The DUP said it regretted her decision and shared "the anger felt across unionism at Michelle O'Neill's actions". She said she was not forming a new party.$bio4857$,
         bio_sources = $src4857$[
 {
  "title": "UK Parliament, Members API: Carla Lockhart, party, seat and committee memberships",
  "url": "https://members.parliament.uk/member/4857/career",
  "supports": "Upper Bann since December 2019; Independent from 2 November 2026; Northern Ireland Affairs Committee 2022 to 2024; bill committees"
 },
 {
  "title": "UK Parliament, Members API: 2024 general election result, Upper Bann",
  "url": "https://members.parliament.uk/member/4857/electionresult",
  "supports": "21,642 votes, 45.7 per cent, majority 7,406 over Sinn Féin"
 },
 {
  "title": "Northern Ireland Assembly open data: Carla Lockhart member roles",
  "url": "https://data.niassembly.gov.uk/members.asmx/GetMemberRolesByPersonId_JSON?personId=3328",
  "supports": "MLA for Upper Bann 2016 to 2019"
 },
 {
  "title": "Irish Times, Carla Lockhart resigns from DUP after Drumcree dispute, 2 November 2026",
  "url": "https://www.irishtimes.com/politics/2026/11/02/carla-lockhart-resigns-from-dup-after-drumcree-dispute/",
  "supports": "resignation, quotes, DUP response (secondary reporting)"
 },
 {
  "title": "Irish News, Carla Lockhart quits DUP insisting Michelle O'Neill should be removed from office, 2 November 2026",
  "url": "https://www.irishnews.com/news/northern-ireland/carla-lockhart-quits-dup-insisting-michelle-oneill-should-be-removed-from-office-HWE2TCW5MZDVXIRYZQEUXQVSPM/",
  "supports": "Drumcree protest, police investigation, independent unionist, no new party (secondary reporting)"
 }
]$src4857$::jsonb,
         bio_last_reviewed = current_date,
         bio_review_reason = NULL,
         bio_review_flagged_at = NULL
   WHERE member_id = 4857 AND bio_visible = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'refused: % rows would change, expected exactly 1', n; END IF;
  IF (SELECT bio_visible FROM public.mp_biography WHERE member_id = 4857) IS DISTINCT FROM false THEN RAISE EXCEPTION 'refused: bio_visible changed'; END IF;
END $do$;

SELECT member_id, bio_visible, bio_last_reviewed, bio_review_reason IS NULL AS flag_cleared, length(political_bio) AS bio_chars,
       jsonb_array_length(bio_sources) AS sources, left(political_bio, 60) AS starts
  FROM public.mp_biography WHERE member_id = 4857;

COMMIT;
