-- Guarded load: St Helens Borough Council 2026-05-07, St Helens Borough Council 2026-06-25
-- written by scripts/import-council-election-results.js --sql from /Users/johnnybot/peoples-chamber-frontend/Claude outputs/council-results-2026/sunderland-st-helens/election-results-2026-st-helens.csv
-- 2 elections, 18 wards, 162 candidates; party_names rows used: 10 (old rows kept in public.party_names_backup_20261019d)
\set ON_ERROR_STOP on
BEGIN;

DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E08000013', '2026-05-07'::date), ('E08000013', '2026-06-25'::date));
  IF n <> 0 THEN RAISE EXCEPTION 'already loaded: % of these elections', n; END IF; END $$;

CREATE TABLE public.party_names_backup_20261019d AS SELECT *, now() AS saved_at FROM public.party_names WHERE published_name IN ('Conservative Party', 'Green Party', 'Green Party - Save Our Green Space', 'Independent (Ungrouped)', 'Labour Party', 'Liberal Democrat', 'Newton-le-Willows Independents', 'Rainhill Independents', 'Reform UK', 'The Conservative Party Candidate');
ALTER TABLE public.party_names_backup_20261019d ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019d FROM anon, authenticated;
INSERT INTO public.party_names (published_name, party_id, party_name, parties_slug) VALUES
  ('Conservative Party', 'conservative', 'Conservative and Unionist Party', 'conservative'),
  ('Green Party', 'green', 'Green Party', 'green'),
  ('Green Party - Save Our Green Space', 'green', 'Green Party', 'green'),
  ('Independent (Ungrouped)', 'independent', 'Independent', 'independent'),
  ('Labour Party', 'labour', 'Labour Party', 'labour'),
  ('Liberal Democrat', 'liberal-democrats', 'Liberal Democrats', 'liberal-democrats'),
  ('Newton-le-Willows Independents', 'newton-le-willows-independents', 'Newton-le-Willows Independents', NULL),
  ('Rainhill Independents', 'rainhill-independents', 'Rainhill Independents', NULL),
  ('Reform UK', 'reform-uk', 'Reform UK', 'reform-uk'),
  ('The Conservative Party Candidate', 'conservative', 'Conservative and Unionist Party', 'conservative')
ON CONFLICT (published_name) DO UPDATE SET party_id = EXCLUDED.party_id, party_name = EXCLUDED.party_name, parties_slug = EXCLUDED.parties_slug;

INSERT INTO public.council_elections (council_gss_code, election_date, wards_contested, seats_contested, turnout_pct, source_note) VALUES ('E08000013', '2026-05-07', 17, 46, NULL, 'St Helens Borough Council''s published results') RETURNING id AS eid \gset
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014120', 'gss', 'Billinge and Seneley Green', 3, NULL, NULL, 6, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=319&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'GERRARD, Jennifer Anne', 'Jennifer Anne Gerrard', 'Reform UK', 'reform-uk', 1465, 14.8, true),
  (:wid, 'PORTER, John Terence', 'John Terence Porter', 'Reform UK', 'reform-uk', 1421, 14.36, true),
  (:wid, 'KENT, Matthew', 'Matthew Kent', 'Reform UK', 'reform-uk', 1370, 13.84, true),
  (:wid, 'OWEN, Steve', 'Steve Owen', 'Labour Party', 'labour', 958, 9.68, false),
  (:wid, 'PEERS, Peter', 'Peter Peers', 'Independent (Ungrouped)', 'independent', 947, 9.57, false),
  (:wid, 'BETTS, Colin Richard', 'Colin Richard Betts', 'Independent (Ungrouped)', 'independent', 816, 8.24, false),
  (:wid, 'BELL, Rod', 'Rod Bell', 'Labour Party', 'labour', 777, 7.85, false),
  (:wid, 'GWILLIAM, Phil', 'Phil Gwilliam', 'Labour Party', 'labour', 727, 7.34, false),
  (:wid, 'JENNINGS, Sarah Isabel', 'Sarah Isabel Jennings', 'Green Party', 'green', 552, 5.58, false),
  (:wid, 'GASKELL, Stephen William', 'Stephen William Gaskell', 'Green Party - Save Our Green Space', 'green', 546, 5.52, false),
  (:wid, 'GIBNEY, Denise Anne', 'Denise Anne Gibney', 'The Conservative Party Candidate', 'conservative', 319, 3.22, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014121', 'gss', 'Blackbrook', 3, NULL, NULL, 5, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=320&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'BROWN, Nigel', 'Nigel Brown', 'Reform UK', 'reform-uk', 1364, 16.44, true),
  (:wid, 'FLEMING, Eileen', 'Eileen Fleming', 'Reform UK', 'reform-uk', 1345, 16.21, true),
  (:wid, 'FLOYD, Victor James', 'Victor James Floyd', 'Reform UK', 'reform-uk', 1281, 15.44, true),
  (:wid, 'BURNS, Anthony James', 'Anthony James Burns', 'Labour Party', 'labour', 965, 11.63, false),
  (:wid, 'MCQUADE, Paul', 'Paul McQuade', 'Labour Party', 'labour', 886, 10.68, false),
  (:wid, 'CROSS, Gareth William', 'Gareth William Cross', 'Labour Party', 'labour', 792, 9.55, false),
  (:wid, 'CLARKE, Lorraine Vivienne', 'Lorraine Vivienne Clarke', 'Green Party', 'green', 590, 7.11, false),
  (:wid, 'DAVIES, Jack Eiddon', 'Jack Eiddon Davies', 'Green Party', 'green', 454, 5.47, false),
  (:wid, 'THOMAS, Daniel John', 'Daniel John Thomas', 'Green Party', 'green', 442, 5.33, false),
  (:wid, 'TITMUSS, David Michael', 'David Michael Titmuss', 'The Conservative Party Candidate', 'conservative', 176, 2.12, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014122', 'gss', 'Bold and Lea Green', 3, NULL, NULL, 12, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=361&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'HAWLEY, David Edward', 'David Edward Hawley', 'Reform UK', 'reform-uk', 1456, 16.16, true),
  (:wid, 'HITCHEN, Mark Joseph', 'Mark Joseph Hitchen', 'Reform UK', 'reform-uk', 1434, 15.92, true),
  (:wid, 'EGBIKE, Samson Chika', 'Samson Chika Egbike', 'Reform UK', 'reform-uk', 1340, 14.88, true),
  (:wid, 'HARDING, Sam', 'Sam Harding', 'Green Party', 'green', 744, 8.26, false),
  (:wid, 'OAKLEY, Fae Sophia Morgan', 'Fae Sophia Morgan Oakley', 'Green Party', 'green', 728, 8.08, false),
  (:wid, 'MCCAULEY, Angela', 'Angela McCauley', 'Labour Party', 'labour', 700, 7.77, false),
  (:wid, 'KNAPPER, Graeme Thomas John', 'Graeme Thomas John Knapper', 'Green Party', 'green', 695, 7.72, false),
  (:wid, 'LANGLEY, Alan', 'Alan Langley', 'Labour Party', 'labour', 677, 7.52, false),
  (:wid, 'PRITCHARD, Paul Joseph', 'Paul Joseph Pritchard', 'Labour Party', 'labour', 610, 6.77, false),
  (:wid, 'LEE, John', 'John Lee', 'Liberal Democrat', 'liberal-democrats', 346, 3.84, false),
  (:wid, 'WOODCOCK, Barbara Evelyn', 'Barbara Evelyn Woodcock', 'The Conservative Party Candidate', 'conservative', 278, 3.09, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014123', 'gss', 'Eccleston', 3, NULL, NULL, 12, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=323&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'HAW, Michael', 'Michael Haw', 'Liberal Democrat', 'liberal-democrats', 2224, 21.22, true),
  (:wid, 'CASS, Philip Jonathan', 'Philip Jonathan Cass', 'Liberal Democrat', 'liberal-democrats', 1809, 17.26, true),
  (:wid, 'PEARL, Geoff', 'Geoff Pearl', 'Liberal Democrat', 'liberal-democrats', 1756, 16.75, true),
  (:wid, 'LAWRENSON, David', 'David Lawrenson', 'Reform UK', 'reform-uk', 979, 9.34, false),
  (:wid, 'JONES, Billy', 'Billy Jones', 'Reform UK', 'reform-uk', 943, 9, false),
  (:wid, 'TOWNSEND, Steve', 'Steve Townsend', 'Reform UK', 'reform-uk', 897, 8.56, false),
  (:wid, 'AKINKUADE, Joy', 'Joy Akinkuade', 'Labour Party', 'labour', 566, 5.4, false),
  (:wid, 'DODGSON, Sally', 'Sally Dodgson', 'Green Party', 'green', 536, 5.11, false),
  (:wid, 'QUINN, Joe', 'Joe Quinn', 'Labour Party', 'labour', 511, 4.87, false),
  (:wid, 'APPLETON, Elizabeth Ann', 'Elizabeth Ann Appleton', 'The Conservative Party Candidate', 'conservative', 262, 2.5, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014124', 'gss', 'Haydock', 3, NULL, NULL, 5, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=324&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'MOUSDELL, Stephen David', 'Stephen David Mousdell', 'Reform UK', 'reform-uk', 1331, 15.39, true),
  (:wid, 'CHESWORTH, Michael John', 'Michael John Chesworth', 'Reform UK', 'reform-uk', 1282, 14.83, true),
  (:wid, 'CLAYBROOK, Stephen Philip', 'Stephen Philip Claybrook', 'Reform UK', 'reform-uk', 1240, 14.34, true),
  (:wid, 'HOOTON, Paul Robert', 'Paul Robert Hooton', 'Green Party', 'green', 938, 10.85, false),
  (:wid, 'VAN DER BURG, Emma Carolyn', 'Emma Carolyn van der Burg', 'Green Party - Save Our Green Space', 'green', 771, 8.92, false),
  (:wid, 'EDDLESTON, Oliver', 'Oliver Eddleston', 'Green Party', 'green', 692, 8, false),
  (:wid, 'BURNS, Caleb', 'Caleb Burns', 'Labour Party', 'labour', 607, 7.02, false),
  (:wid, 'HARRISON, Rachael', 'Rachael Harrison', 'Labour Party', 'labour', 577, 6.67, false),
  (:wid, 'FARNWORTH, Owen Thomas', 'Owen Thomas Farnworth', 'Labour Party', 'labour', 561, 6.49, false),
  (:wid, 'BLAKE, Andrea', 'Andrea Blake', 'Independent (Ungrouped)', 'independent', 237, 2.74, false),
  (:wid, 'SUTTON, Ian Samuel', 'Ian Samuel Sutton', 'Independent (Ungrouped)', 'independent', 229, 2.65, false),
  (:wid, 'LEE, Melanie Ann Marie', 'Melanie Ann Marie Lee', 'The Conservative Party Candidate', 'conservative', 181, 2.09, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014125', 'gss', 'Moss Bank', 3, NULL, NULL, 6, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=325&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'EDGERTON, Gary', 'Gary Edgerton', 'Reform UK', 'reform-uk', 1664, 18.06, true),
  (:wid, 'KENT, David', 'David Kent', 'Reform UK', 'reform-uk', 1638, 17.78, true),
  (:wid, 'STYLES, Jack', 'Jack Styles', 'Reform UK', 'reform-uk', 1613, 17.51, true),
  (:wid, 'BANKS, Jeanette Susan', 'Jeanette Susan Banks', 'Labour Party', 'labour', 1172, 12.72, false),
  (:wid, 'DICKINSON, Tracy', 'Tracy Dickinson', 'Labour Party', 'labour', 1126, 12.22, false),
  (:wid, 'BEGUM, Shana', 'Shana Begum', 'Labour Party', 'labour', 1116, 12.11, false),
  (:wid, 'KAYLL, Allan John', 'Allan John Kayll', 'Green Party', 'green', 605, 6.57, false),
  (:wid, 'CUNLIFFE, Lisa', 'Lisa Cunliffe', 'The Conservative Party Candidate', 'conservative', 280, 3.04, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014126', 'gss', 'Newton le Willows - East', 3, NULL, NULL, 9, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=356&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'LAIRD, Keith Anthony', 'Keith Anthony Laird', 'Labour Party', 'labour', 1293, 13.07, true),
  (:wid, 'WOODWARD, George', 'George Woodward', 'Reform UK', 'reform-uk', 1248, 12.62, true),
  (:wid, 'MILLS, Ian Francis', 'Ian Francis Mills', 'Labour Party', 'labour', 1183, 11.96, true),
  (:wid, 'MURPHY, John David', 'John David Murphy', 'Reform UK', 'reform-uk', 1083, 10.95, false),
  (:wid, 'MIDDLETON-LEONARD, Tom', 'Tom Middleton-Leonard', 'Newton-le-Willows Independents', 'newton-le-willows-independents', 1055, 10.67, false),
  (:wid, 'OWEN, John Henry', 'John Henry Owen', 'Reform UK', 'reform-uk', 1019, 10.3, false),
  (:wid, 'KENNEDY, Chris', 'Chris Kennedy', 'Green Party', 'green', 1000, 10.11, false),
  (:wid, 'PRESTON, Lisa Kathleen', 'Lisa Kathleen Preston', 'Labour Party', 'labour', 993, 10.04, false),
  (:wid, 'SMITH, David James', 'David James Smith', 'Liberal Democrat', 'liberal-democrats', 698, 7.06, false),
  (:wid, 'CUNLIFFE, John Philip', 'John Philip Cunliffe', 'Conservative Party', 'conservative', 318, 3.22, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014127', 'gss', 'Newton le Willows - West', 3, NULL, NULL, 14, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=357&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'MAGUIRE, Terry', 'Terry Maguire', 'Newton-le-Willows Independents', 'newton-le-willows-independents', 1622, 17.87, true),
  (:wid, 'COLLIER, Karl Lionel', 'Karl Lionel Collier', 'Newton-le-Willows Independents', 'newton-le-willows-independents', 1426, 15.71, true),
  (:wid, 'SMITH, Craig', 'Craig Smith', 'Newton-le-Willows Independents', 'newton-le-willows-independents', 1148, 12.65, true),
  (:wid, 'BANKS, Dave', 'Dave Banks', 'Labour Party', 'labour', 920, 10.14, false),
  (:wid, 'BLOOD, Peter Thomas', 'Peter Thomas Blood', 'Labour Party', 'labour', 900, 9.92, false),
  (:wid, 'SMULDERS, Scott Steven', 'Scott Steven Smulders', 'Labour Party', 'labour', 809, 8.91, false),
  (:wid, 'BELL, Mark', 'Mark Bell', 'Reform UK', 'reform-uk', 785, 8.65, false),
  (:wid, 'HART, Robert', 'Robert Hart', 'Reform UK', 'reform-uk', 699, 7.7, false),
  (:wid, 'PIERRE-LOUIS MOORE, Gillian', 'Gillian Pierre-Louis Moore', 'Reform UK', 'reform-uk', 673, 7.42, false),
  (:wid, 'DOCKERTY, Allan Albert', 'Allan Albert Dockerty', 'The Conservative Party Candidate', 'conservative', 94, 1.04, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014128', 'gss', 'Parr', 3, NULL, NULL, 8, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=327&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'AXWORTHY, Dan', 'Dan Axworthy', 'Reform UK', 'reform-uk', 1173, 18.59, true),
  (:wid, 'ROWLANDS, Janet', 'Janet Rowlands', 'Reform UK', 'reform-uk', 1161, 18.4, true),
  (:wid, 'WEBSTER, Mal', 'Mal Webster', 'Reform UK', 'reform-uk', 1104, 17.49, true),
  (:wid, 'BROOKS, Cath', 'Cath Brooks', 'Labour Party', 'labour', 713, 11.3, false),
  (:wid, 'BOWDEN, Andy', 'Andy Bowden', 'Labour Party', 'labour', 708, 11.22, false),
  (:wid, 'OSUNDEKO, Bisi', 'Bisi Osundeko', 'Labour Party', 'labour', 593, 9.4, false),
  (:wid, 'O''DELL, Lizzie', 'Lizzie O''Dell', 'Green Party', 'green', 364, 5.77, false),
  (:wid, 'GEORGE, Teri', 'Teri George', 'Independent (Ungrouped)', 'independent', 204, 3.23, false),
  (:wid, 'WILLIAMS, Jeff', 'Jeff Williams', 'Independent (Ungrouped)', 'independent', 187, 2.96, false),
  (:wid, 'FRANCE, Mackenzie Jacob', 'Mackenzie Jacob France', 'The Conservative Party Candidate', 'conservative', 104, 1.65, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014129', 'gss', 'Peasley Cross and Fingerpost', 1, NULL, NULL, 1, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=358&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'ROUGHLEY, Sharon', 'Sharon Roughley', 'Reform UK', 'reform-uk', 392, 48.51, true),
  (:wid, 'O''CONNOR, Damien Patrick', 'Damien Patrick O''Connor', 'Labour Party', 'labour', 217, 26.86, false),
  (:wid, 'PATTERSON, Em', 'Em Patterson', 'Green Party', 'green', 122, 15.1, false),
  (:wid, 'LOW, Andrew Kiang Seng', 'Andrew Kiang Seng Low', 'Independent (Ungrouped)', 'independent', 48, 5.94, false),
  (:wid, 'BROWN, Iris', 'Iris Brown', 'The Conservative Party Candidate', 'conservative', 29, 3.59, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014130', 'gss', 'Rainford', 2, NULL, NULL, 5, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=328&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'CORDEN, Philip', 'Philip Corden', 'Reform UK', 'reform-uk', 1058, 16.68, true),
  (:wid, 'MUSSELL, Linda', 'Linda Mussell', 'Conservative Party', 'conservative', 1025, 16.16, true),
  (:wid, 'CASE, Charlotte', 'Charlotte Case', 'The Conservative Party Candidate', 'conservative', 933, 14.71, false),
  (:wid, 'DEVANNY, Anthony', 'Anthony Devanny', 'Reform UK', 'reform-uk', 898, 14.16, false),
  (:wid, 'JOHNSON, Amber Carole', 'Amber Carole Johnson', 'Green Party', 'green', 758, 11.95, false),
  (:wid, 'DAVIES, Sean', 'Sean Davies', 'Green Party', 'green', 739, 11.65, false),
  (:wid, 'JACQUES, Richard', 'Richard Jacques', 'Labour Party', 'labour', 495, 7.8, false),
  (:wid, 'SIMM, Malcolm', 'Malcolm Simm', 'Labour Party', 'labour', 437, 6.89, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014131', 'gss', 'Rainhill', 3, NULL, NULL, 21, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=329&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'TASKER, James Stephen', 'James Stephen Tasker', 'Rainhill Independents', 'rainhill-independents', 2372, 21.47, true),
  (:wid, 'GREAVES, Donna', 'Donna Greaves', 'Rainhill Independents', 'rainhill-independents', 2113, 19.13, true),
  (:wid, 'DUNN, James', 'James Dunn', 'Rainhill Independents', 'rainhill-independents', 2095, 18.96, true),
  (:wid, 'CONWAY, Neil Peter', 'Neil Peter Conway', 'Reform UK', 'reform-uk', 806, 7.3, false),
  (:wid, 'WOODHOUSE, Jo', 'Jo Woodhouse', 'Reform UK', 'reform-uk', 788, 7.13, false),
  (:wid, 'GILGANNON, Mark', 'Mark Gilgannon', 'Reform UK', 'reform-uk', 778, 7.04, false),
  (:wid, 'HODKINSON, Elaine', 'Elaine Hodkinson', 'Labour Party', 'labour', 765, 6.92, false),
  (:wid, 'IFTIKHAR, Tabinda', 'Tabinda Iftikhar', 'Labour Party', 'labour', 612, 5.54, false),
  (:wid, 'ZAKI, Masooma', 'Masooma Zaki', 'Labour Party', 'labour', 569, 5.15, false),
  (:wid, 'SPRIGGS, Henry John', 'Henry John Spriggs', 'The Conservative Party Candidate', 'conservative', 149, 1.35, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014133', 'gss', 'Sutton - North West', 2, NULL, NULL, 21, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=359&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'JOHNSON, Anthony Albert', 'Anthony Albert Johnson', 'Reform UK', 'reform-uk', 909, 25.77, true),
  (:wid, 'JOHNSON, Mark Barry', 'Mark Barry Johnson', 'Reform UK', 'reform-uk', 909, 25.77, true),
  (:wid, 'CAMPBELL, Niall Peter Andrew', 'Niall Peter Andrew Campbell', 'Labour Party', 'labour', 757, 21.46, false),
  (:wid, 'HODKINSON, John William', 'John William Hodkinson', 'Labour Party', 'labour', 733, 20.78, false),
  (:wid, 'SPANNER, Anne Marie', 'Anne Marie Spanner', 'The Conservative Party Candidate', 'conservative', 219, 6.21, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014134', 'gss', 'Sutton - South East', 2, NULL, NULL, 29, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=360&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'PINNINGTON, John Leonard', 'John Leonard Pinnington', 'Reform UK', 'reform-uk', 895, 26.4, true),
  (:wid, 'MOSS, Brendan', 'Brendan Moss', 'Reform UK', 'reform-uk', 854, 25.19, true),
  (:wid, 'PRESTON, Charlie', 'Charlie Preston', 'Labour Party', 'labour', 755, 22.27, false),
  (:wid, 'RILEY, John Patrick', 'John Patrick Riley', 'Labour Party', 'labour', 734, 21.65, false),
  (:wid, 'SMITH, Dawn', 'Dawn Smith', 'The Conservative Party Candidate', 'conservative', 152, 4.48, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014135', 'gss', 'Thatto Heath', 3, NULL, NULL, 3, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=331&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'BECK, Emma Victoria', 'Emma Victoria Beck', 'Reform UK', 'reform-uk', 1364, 15.96, true),
  (:wid, 'BENYON, Jack Joseph', 'Jack Joseph Benyon', 'Reform UK', 'reform-uk', 1329, 15.55, true),
  (:wid, 'LONG, James William', 'James William Long', 'Reform UK', 'reform-uk', 1252, 14.65, true),
  (:wid, 'CHARLTON, Nova Louise', 'Nova Louise Charlton', 'Labour Party', 'labour', 1185, 13.87, false),
  (:wid, 'HATTERSLEY, Robyn', 'Robyn Hattersley', 'Labour Party', 'labour', 1105, 12.93, false),
  (:wid, 'MCCAULEY, Richard', 'Richard McCauley', 'Labour Party', 'labour', 998, 11.68, false),
  (:wid, 'BISHOP, Sue', 'Sue Bishop', 'Green Party', 'green', 651, 7.62, false),
  (:wid, 'ADAMOVICI, Alexandru-Emilian', 'Alexandru-Emilian Adamovici', 'Liberal Democrat', 'liberal-democrats', 390, 4.56, false),
  (:wid, 'BLACK, Elizabeth', 'Elizabeth Black', 'The Conservative Party Candidate', 'conservative', 271, 3.17, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014136', 'gss', 'West Park', 3, NULL, NULL, 10, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=333&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'LITTLE, Stephen', 'Stephen Little', 'Reform UK', 'reform-uk', 1391, 14.5, true),
  (:wid, 'GIBSON, Michael James', 'Michael James Gibson', 'Reform UK', 'reform-uk', 1381, 14.4, true),
  (:wid, 'KING, Mark Anthony', 'Mark Anthony King', 'Reform UK', 'reform-uk', 1370, 14.28, true),
  (:wid, 'ALCANTARA, Patrick', 'Patrick Alcantara', 'Labour Party', 'labour', 1188, 12.39, false),
  (:wid, 'HAND, Julie Gwendoline', 'Julie Gwendoline Hand', 'Labour Party', 'labour', 1123, 11.71, false),
  (:wid, 'BUTTERWORTH, Matthew Peter', 'Matthew Peter Butterworth', 'Labour Party', 'labour', 1102, 11.49, false),
  (:wid, 'ARMSTRONG, Tom', 'Tom Armstrong', 'Green Party', 'green', 630, 6.57, false),
  (:wid, 'WHELAN, Sarah', 'Sarah Whelan', 'Green Party', 'green', 598, 6.24, false),
  (:wid, 'ASTER, Anthony', 'Anthony Aster', 'Green Party', 'green', 559, 5.83, false),
  (:wid, 'BARTON, Richard William', 'Richard William Barton', 'The Conservative Party Candidate', 'conservative', 249, 2.6, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014137', 'gss', 'Windle', 3, NULL, NULL, 10, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?XXR=0&ID=334&RPID=58005341') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'EDE, Clayton', 'Clayton Ede', 'Reform UK', 'reform-uk', 1287, 13.28, true),
  (:wid, 'KEOGH, Anthony Michael', 'Anthony Michael Keogh', 'Reform UK', 'reform-uk', 1262, 13.03, true),
  (:wid, 'TWIST, Alex Callum', 'Alex Callum Twist', 'Reform UK', 'reform-uk', 1237, 12.77, true),
  (:wid, 'CLARKE, Lynn Susan', 'Lynn Susan Clarke', 'Labour Party', 'labour', 1205, 12.44, false),
  (:wid, 'MCCULLEY, George Andrew', 'George Andrew McCulley', 'Labour Party', 'labour', 1042, 10.76, false),
  (:wid, 'YOUNG, Robbie', 'Robbie Young', 'Labour Party', 'labour', 993, 10.25, false),
  (:wid, 'DONNELLY, Andrew William', 'Andrew William Donnelly', 'Green Party', 'green', 880, 9.08, false),
  (:wid, 'PRICE, Terence Stephen', 'Terence Stephen Price', 'Green Party', 'green', 731, 7.55, false),
  (:wid, 'RAHMAN, Sue', 'Sue Rahman', 'Green Party', 'green', 725, 7.48, false),
  (:wid, 'FRAWLEY, Leighton James', 'Leighton James Frawley', 'The Conservative Party Candidate', 'conservative', 326, 3.36, false);

INSERT INTO public.council_elections (council_gss_code, election_date, wards_contested, seats_contested, turnout_pct, source_note) VALUES ('E08000013', '2026-06-25', 1, 2, NULL, 'St Helens Borough Council''s published results') RETURNING id AS eid \gset
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05014132', 'gss', 'St Helens Town Centre', 2, NULL, NULL, 4, 'https://sthelens.moderngov.co.uk/mgElectionAreaResults.aspx?ID=363') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'AXWORTHY, Jeremy Peter', 'Jeremy Peter Axworthy', 'Reform UK', 'reform-uk', 460, 22.16, true),
  (:wid, 'FISHER, Michael Angelo', 'Michael Angelo Fisher', 'Labour Party', 'labour', 436, 21, true),
  (:wid, 'PAGE, Christopher Martin', 'Christopher Martin Page', 'Reform UK', 'reform-uk', 419, 20.18, false),
  (:wid, 'SWEENEY, Michelle Elaine', 'Michelle Elaine Sweeney', 'Labour Party', 'labour', 391, 18.83, false),
  (:wid, 'GRAVES, Chloe Louise Jean', 'Chloe Louise Jean Graves', 'Green Party', 'green', 146, 7.03, false),
  (:wid, 'MELLORS, James David', 'James David Mellors', 'Green Party', 'green', 112, 5.39, false),
  (:wid, 'HUGHES, Thomas', 'Thomas Hughes', 'Independent (Ungrouped)', 'independent', 71, 3.42, false),
  (:wid, 'HUSKIE, Christine', 'Christine Huskie', 'The Conservative Party Candidate', 'conservative', 41, 1.97, false);

DO $$ DECLARE e int; w int; c int; BEGIN
  SELECT count(*) INTO e FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E08000013', '2026-05-07'::date), ('E08000013', '2026-06-25'::date));
  SELECT count(*) INTO w FROM public.council_election_wards x JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E08000013', '2026-05-07'::date), ('E08000013', '2026-06-25'::date));
  SELECT count(*) INTO c FROM public.council_election_candidates k JOIN public.council_election_wards x ON x.id = k.ward_id JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E08000013', '2026-05-07'::date), ('E08000013', '2026-06-25'::date));
  IF e <> 2 OR w <> 18 OR c <> 162 THEN RAISE EXCEPTION 'expected 2 elections, 18 wards, 162 candidates; found %, %, %', e, w, c; END IF; END $$;
SELECT y.council_gss_code, y.election_date, y.wards_contested, y.seats_contested, count(k.*) AS candidates FROM public.council_elections y JOIN public.council_election_wards x ON x.election_id = y.id JOIN public.council_election_candidates k ON k.ward_id = x.id WHERE (y.council_gss_code, y.election_date) IN (('E08000013', '2026-05-07'::date), ('E08000013', '2026-06-25'::date)) GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

COMMIT;
