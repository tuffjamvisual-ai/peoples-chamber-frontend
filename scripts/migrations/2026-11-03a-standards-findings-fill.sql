-- Standards findings, part B step 2 (owner's brief, 3 Nov 2026): outcome, rule_breached, penalty and a plain summary
-- for the 23 Committee on Standards reports whose text was read (Claude outputs/standards-findings-review.csv, each
-- value taken from the Committee's report, with the evidence sentences and paragraph numbers in that file).
-- Outcome: breach -> upheld, partial -> partially_upheld, no breach -> not_upheld; Flynn (42367) and Phillips (40272),
-- where the Committee made no finding of its own -> no_finding. The two policy reports (Respect Policy, the Committee's
-- role in ICGS appeals) keep outcome NULL and member_id NULL, so they never show on a profile. The 15 older reports with
-- no text available are not touched. Undo: 2026-11-03a-standards-findings-fill-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03a-standards-findings-fill.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- Every case_ref below must exist exactly once.
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['pcs-cmt-55293', 'pcs-cmt-54173', 'pcs-cmt-54117', 'pcs-cmt-50720', 'pcs-cmt-50709', 'pcs-cmt-47688', 'pcs-cmt-45874', 'pcs-cmt-42581', 'pcs-cmt-42367', 'pcs-cmt-41434', 'pcs-cmt-41272', 'pcs-cmt-40781', 'pcs-cmt-40272', 'pcs-cmt-40177', 'pcs-cmt-34645', 'pcs-cmt-33922', 'pcs-cmt-31469', 'pcs-cmt-8457', 'pcs-cmt-7644', 'pcs-cmt-903', 'pcs-cmt-851', 'pcs-cmt-784', 'pcs-cmt-410', 'pcs-cmt-19372', 'pcs-cmt-10767'] LOOP
    SELECT count(*) INTO n FROM mp_conduct_findings WHERE case_ref = r;
    IF n <> 1 THEN RAISE EXCEPTION 'case_ref % found % times (expected exactly 1)', r, n; END IF;
  END LOOP;
END $$;

-- Kevin Hollinrake
UPDATE mp_conduct_findings SET outcome = $q$not_upheld$q$, rule_breached = $q$Rule 14$q$, penalty = $q$none$q$,
  summary = $q$Kevin Hollinrake wrote to the Commissioner about an ongoing investigation into another Member, raising the question of whether he had lobbied the Commissioner.$q$
  WHERE case_ref = 'pcs-cmt-55293';
-- Andrew Gwynne
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 11$q$, penalty = $q$former Member’s pass revoked with immediate effect$q$,
  summary = $q$Andrew Gwynne, then MP for Gorton and Denton, wrote and took part without challenge in offensive and discriminatory messages in a private WhatsApp group called Trigger Me Timbers.$q$
  WHERE case_ref = 'pcs-cmt-54173';
-- Peter Prinsley
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$rule 13$q$, penalty = $q$no further action$q$,
  summary = $q$Peter Prinsley, MP for Bury St Edmunds and Stowmarket, told a news reporter details of an ongoing Commissioner investigation into him, breaking the confidentiality rule.$q$
  WHERE case_ref = 'pcs-cmt-54117';
-- Charlie Maynard
UPDATE mp_conduct_findings SET outcome = $q$partially_upheld$q$, rule_breached = $q$Rule 5$q$, penalty = $q$apology to the House, on a point of order; commit to a more diligent approach to the registration of his interests; attend a training session with the Registrar of Members’ Financial Interests$q$,
  summary = $q$Charlie Maynard, MP for Witney, failed to register pro bono legal advice and other interests on time, and was also investigated for not cooperating with the Commissioner. The Committee found no breach of Rule 12.$q$
  WHERE case_ref = 'pcs-cmt-50720';
-- Neil Shastri-Hurst
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 10$q$, penalty = $q$apology in writing to the House, text agreed in advance with the Chair of the Committee$q$,
  summary = $q$As Chair and Registered Contact of the APPG for Defence Technology, the Member did not ensure adequate due diligence on a secretariat funder, which let a foreign government indirectly part fund the secretariat in breach of the APPG rules.$q$
  WHERE case_ref = 'pcs-cmt-50709';
-- Andrew Bridgen
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = NULL, penalty = $q$no practical sanction now at its disposal$q$,
  summary = $q$Andrew Bridgen, then MP for North West Leicestershire, did not register within 28 days the money a donor gave him to pay his private legal costs.$q$
  WHERE case_ref = 'pcs-cmt-47688';
-- Bob Stewart
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$Paragraph 16 of the 2009 Code; paragraph 13 of the 2015 Code; Paragraph 12 of the 2023 Code$q$, penalty = $q$former Member's pass revoked from the rising of the House for its Christmas recess$q$,
  summary = $q$Former MP Bob Stewart did not correctly register his paid roles with VES Consultancy and Ksantex, did not declare the Ksantex role to the Defence Committee, and did not cooperate fully with the Commissioner's inquiry.$q$
  WHERE case_ref = 'pcs-cmt-45874';
-- Scott Benton
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$Paragraph 11 of the Rules$q$, penalty = $q$suspension from the service of the House for a total of 35 days, with concomitant loss of salary$q$,
  summary = $q$Scott Benton, meeting undercover Times reporters posing as representatives of a company seeking to extend its involvement in the UK betting and gaming industry, said he had broken House rules before, would do so for payment, and that other Members would too.$q$
  WHERE case_ref = 'pcs-cmt-42581';
-- Stephen Flynn
UPDATE mp_conduct_findings SET outcome = $q$no_finding$q$, rule_breached = $q$paragraph 8$q$, penalty = $q$no further action$q$,
  summary = $q$Stephen Flynn MP used House of Commons compliments slips in mugs sent to the press lobby carrying a party political message about Labour, and declined the Commissioner's offer of rectification. The Commissioner found a breach; the Committee recommended no further action.$q$
  WHERE case_ref = 'pcs-cmt-42367';
-- Rishi Sunak
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 13$q$, penalty = $q$no sanction recommended$q$,
  summary = $q$The Prime Minister's spokesperson told the media on 17 April 2023 how Rishi Sunak intended to respond to the Commissioner's confidential inquiry into his declaration of interests.$q$
  WHERE case_ref = 'pcs-cmt-41434';
-- Marcus Fysh
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 13$q$, penalty = $q$apology to the House by means of a letter to the Committee$q$,
  summary = $q$Marcus Fysh gave statements to the media setting out what he was doing in response to an ongoing Commissioner investigation into an APPG he chaired, breaking the confidentiality rule.$q$
  WHERE case_ref = 'pcs-cmt-41272';
-- Christopher Pincher
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 17$q$, penalty = $q$suspension from the service of the House for 8 weeks$q$,
  summary = $q$Christopher Pincher groped two people at the Carlton Club on 29 and 30 June 2022 while attending in his public capacity, causing significant damage to the reputation of the House.$q$
  WHERE case_ref = 'pcs-cmt-40781';
-- Jess Phillips
UPDATE mp_conduct_findings SET outcome = $q$no_finding$q$, rule_breached = NULL, penalty = $q$no further action$q$,
  summary = $q$Jess Phillips was investigated over not registering a television fee and registering a payment from the University of Bristol two days after the 28 day deadline. The Commissioner found a breach of paragraph 14 over the late registration and did not uphold the complaint about the television fee; the Committee recommended no further action.$q$
  WHERE case_ref = 'pcs-cmt-40272';
-- Matt Hancock
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 14$q$, penalty = $q$apology to the House and to the Commissioner by personal statement; briefing on his obligations under the Code with the Commissioner$q$,
  summary = $q$Matt Hancock sent an unsolicited letter to the Commissioner on 28 March 2023 about the Commissioner's ongoing investigation into another Member, Mr Brine.$q$
  WHERE case_ref = 'pcs-cmt-40177';
-- Margaret Ferrier
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 11 and paragraph 17$q$, penalty = $q$suspension from the service of the House for 30 days$q$,
  summary = $q$Margaret Ferrier travelled by train from London to Scotland in September 2020 after receiving a positive COVID 19 test instead of self isolating, and misled her Chief Whip about why she wanted to return home.$q$
  WHERE case_ref = 'pcs-cmt-34645';
-- Alex Davies-Jones
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 12$q$, penalty = $q$no further action$q$,
  summary = $q$The Member referred herself to the Commissioner after asking a topical question seeking Government support for the British Council within six months of a visit to Japan funded by the British Council.$q$
  WHERE case_ref = 'pcs-cmt-33922';
-- Andrew Bridgen
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 12, paragraph 14 and paragraph 20$q$, penalty = $q$suspension for two sitting days; suspension for a further three sitting days; apology to the House and to the Commissioner by personal statement$q$,
  summary = $q$Andrew Bridgen made approaches to Ministers about carbon credits on behalf of Mere Plantations, which had funded a visit, made a donation and given him an adviser contract, failed to register and declare those interests correctly, and sent an email that tried improperly to influence the Commissioner.$q$
  WHERE case_ref = 'pcs-cmt-31469';
-- Daniel Kawczynski
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 17$q$, penalty = $q$suspension for a single sitting day (not a Friday); further apology to the House by personal statement$q$,
  summary = $q$Daniel Kawczynski spoke to the media on the day he made an apology ordered by the Independent Expert Panel, which breached its confidentiality requirements and undermined the apology, so he failed to comply with its sanction.$q$
  WHERE case_ref = 'pcs-cmt-8457';
-- Owen Paterson
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraph 11, paragraph 13, paragraph 15 and paragraph 16 of the 2015 Code of Conduct$q$, penalty = $q$suspension from the service of the House for 30 sitting days$q$,
  summary = $q$Owen Paterson lobbied the Food Standards Agency and Ministers for Randox and Lynn's Country Foods, two companies paying him as a consultant, failed to declare that interest in four emails, and used his parliamentary office and House notepaper for his business interests.$q$
  WHERE case_ref = 'pcs-cmt-7644';
-- Conor Burns
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraphs 11, 16 and 17$q$, penalty = $q$suspension from the service of the House for seven days; written apology to the House by letter to Mr Speaker; written apology to the complainant$q$,
  summary = $q$Conor Burns wrote to a member of the public on House of Commons stationery about a private family dispute and suggested he might use parliamentary privilege to secure a payment to his father.$q$
  WHERE case_ref = 'pcs-cmt-903';
-- Greg Hands
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$Rule 16$q$, penalty = $q$apology to the House by personal statement$q$,
  summary = $q$Greg Hands used House provided stationery to send constituents a general update in April 2019, then withdrew from the rectification process to argue his case before the Committee.$q$
  WHERE case_ref = 'pcs-cmt-851';
-- Stephen Pound
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$Rule 16$q$, penalty = $q$no further action$q$,
  summary = $q$Stephen Pound accepted payments, which he gave to charity, for arranging tours, talks and seminars on the parliamentary estate for two US universities and DODS Training between 2012 and 2019.$q$
  WHERE case_ref = 'pcs-cmt-784';
-- Kate Osamor
UPDATE mp_conduct_findings SET outcome = $q$upheld$q$, rule_breached = $q$paragraphs 16 and 17$q$, penalty = $q$apology to the House by letter to the Committee$q$,
  summary = $q$Kate Osamor used House of Commons stationery for a character reference for her son in a criminal case, and used threatening language to a journalist on 30 November 2018.$q$
  WHERE case_ref = 'pcs-cmt-410';

-- Policy reports, not about one MP: no outcome and no member, so they never display.
UPDATE mp_conduct_findings SET outcome = NULL, member_id = NULL WHERE case_ref = 'pcs-cmt-19372';
UPDATE mp_conduct_findings SET outcome = NULL, member_id = NULL WHERE case_ref = 'pcs-cmt-10767';

COMMIT;
