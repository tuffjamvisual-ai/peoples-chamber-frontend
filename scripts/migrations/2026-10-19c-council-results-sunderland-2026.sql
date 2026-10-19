-- Guarded load: Sunderland 2026-05-07
-- written by scripts/import-council-election-results.js --sql from /Users/johnnybot/peoples-chamber-frontend/Claude outputs/council-results-2026/sunderland-st-helens/election-results-2026-sunderland.csv
-- 1 elections, 25 wards, 367 candidates; party_names rows used: 7 (old rows kept in public.party_names_backup_20261019c)
\set ON_ERROR_STOP on
BEGIN;

DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E08000024', '2026-05-07'::date));
  IF n <> 0 THEN RAISE EXCEPTION 'already loaded: % of these elections', n; END IF; END $$;

CREATE TABLE public.party_names_backup_20261019c AS SELECT *, now() AS saved_at FROM public.party_names WHERE published_name IN ('Conservative', 'Green Party', 'Independent', 'Labour', 'Labour and Co-operative', 'Liberal Democrats', 'Reform UK');
ALTER TABLE public.party_names_backup_20261019c ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019c FROM anon, authenticated;
INSERT INTO public.party_names (published_name, party_id, party_name, parties_slug) VALUES
  ('Conservative', 'conservative', 'Conservative and Unionist Party', 'conservative'),
  ('Green Party', 'green', 'Green Party', 'green'),
  ('Independent', 'independent', 'Independent', 'independent'),
  ('Labour', 'labour', 'Labour Party', 'labour'),
  ('Labour and Co-operative', 'labour-coop', 'Labour and Co-operative Party (joint description of the Labour Party and the Co-operative Party)', 'labour'),
  ('Liberal Democrats', 'liberal-democrats', 'Liberal Democrats', 'liberal-democrats'),
  ('Reform UK', 'reform-uk', 'Reform UK', 'reform-uk')
ON CONFLICT (published_name) DO UPDATE SET party_id = EXCLUDED.party_id, party_name = EXCLUDED.party_name, parties_slug = EXCLUDED.parties_slug;

INSERT INTO public.council_elections (council_gss_code, election_date, wards_contested, seats_contested, turnout_pct, source_note) VALUES ('E08000024', '2026-05-07', 25, 75, NULL, 'Wikipedia''s record of the council''s published results, CC BY-SA 4.0') RETURNING id AS eid \gset
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016387', 'gss', 'Penshaw & Shiney Row', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Carole Allcroft', 'Carole Allcroft', 'Reform UK', 'reform-uk', 1718, 17.11, true),
  (:wid, 'Abbey Purcell', 'Abbey Purcell', 'Reform UK', 'reform-uk', 1640, 16.34, true),
  (:wid, 'Axel Tye', 'Axel Tye', 'Reform UK', 'reform-uk', 1594, 15.88, true),
  (:wid, 'Mel Speding', 'Mel Speding', 'Labour', 'labour', 1065, 10.61, false),
  (:wid, 'Katherine Mason-Gage', 'Katherine Mason-Gage', 'Labour', 'labour', 1005, 10.01, false),
  (:wid, 'David Snowdon', 'David Snowdon', 'Labour', 'labour', 967, 9.63, false),
  (:wid, 'Sam Mcbride', 'Sam Mcbride', 'Green Party', 'green', 371, 3.7, false),
  (:wid, 'Carl O''Halloran', 'Carl O''Halloran', 'Green Party', 'green', 323, 3.22, false),
  (:wid, 'Christopher Rose', 'Christopher Rose', 'Conservative', 'conservative', 287, 2.86, false),
  (:wid, 'David Oleka', 'David Oleka', 'Conservative', 'conservative', 272, 2.71, false),
  (:wid, 'Irene Onyia', 'Irene Onyia', 'Conservative', 'conservative', 254, 2.53, false),
  (:wid, 'Judy Durrant', 'Judy Durrant', 'Liberal Democrats', 'liberal-democrats', 221, 2.2, false),
  (:wid, 'Dorinda Strokes', 'Dorinda Strokes', 'Liberal Democrats', 'liberal-democrats', 172, 1.71, false),
  (:wid, 'Ringo Taylor', 'Ringo Taylor', 'Liberal Democrats', 'liberal-democrats', 149, 1.48, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016377', 'gss', 'Fulwell', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Malcolm Bond', 'Malcolm Bond', 'Liberal Democrats', 'liberal-democrats', 1988, 14.16, true),
  (:wid, 'Peter Walton', 'Peter Walton', 'Liberal Democrats', 'liberal-democrats', 1738, 12.38, true),
  (:wid, 'Steve Pickering', 'Steve Pickering', 'Liberal Democrats', 'liberal-democrats', 1659, 11.81, true),
  (:wid, 'Phillip Thompson', 'Phillip Thompson', 'Reform UK', 'reform-uk', 1424, 10.14, false),
  (:wid, 'David Owen', 'David Owen', 'Reform UK', 'reform-uk', 1376, 9.8, false),
  (:wid, 'Janet Tyson', 'Janet Tyson', 'Reform UK', 'reform-uk', 1199, 8.54, false),
  (:wid, 'Michael Hartnack', 'Michael Hartnack', 'Conservative', 'conservative', 1186, 8.45, false),
  (:wid, 'Nichola Austin-Ratcliffe', 'Nichola Austin-Ratcliffe', 'Conservative', 'conservative', 847, 6.03, false),
  (:wid, 'Bill Smith', 'Bill Smith', 'Conservative', 'conservative', 801, 5.7, false),
  (:wid, 'Naomi Mather', 'Naomi Mather', 'Labour', 'labour', 380, 2.71, false),
  (:wid, 'Peter Barley', 'Peter Barley', 'Labour', 'labour', 376, 2.68, false),
  (:wid, 'Malcolm Kilner', 'Malcolm Kilner', 'Labour', 'labour', 368, 2.62, false),
  (:wid, 'Brian Plemper', 'Brian Plemper', 'Green Party', 'green', 254, 1.81, false),
  (:wid, 'Genevieve Johnson', 'Genevieve Johnson', 'Green Party', 'green', 232, 1.65, false),
  (:wid, 'Sebastian Graca de Silva', 'Sebastian Graca de Silva', 'Green Party', 'green', 214, 1.52, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016390', 'gss', 'Ryhope', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Sharon Surtees', 'Sharon Surtees', 'Reform UK', 'reform-uk', 1665, 17.08, true),
  (:wid, 'Pamela Taylor', 'Pamela Taylor', 'Reform UK', 'reform-uk', 1605, 16.47, true),
  (:wid, 'James Jackson', 'James Jackson', 'Reform UK', 'reform-uk', 1549, 15.89, true),
  (:wid, 'Helen Glancy', 'Helen Glancy', 'Labour and Co-operative', 'labour-coop', 1044, 10.71, false),
  (:wid, 'Martyn Herron', 'Martyn Herron', 'Labour and Co-operative', 'labour-coop', 1014, 10.4, false),
  (:wid, 'Lindsey Leonard', 'Lindsey Leonard', 'Labour and Co-operative', 'labour-coop', 969, 9.94, false),
  (:wid, 'Nicola Jacques', 'Nicola Jacques', 'Green Party', 'green', 284, 2.91, false),
  (:wid, 'Barry Jacques', 'Barry Jacques', 'Green Party', 'green', 268, 2.75, false),
  (:wid, 'Spencer Rose Cash-Archer', 'Spencer Rose Cash-Archer', 'Green Party', 'green', 255, 2.62, false),
  (:wid, 'Lewis Hunter', 'Lewis Hunter', 'Liberal Democrats', 'liberal-democrats', 202, 2.07, false),
  (:wid, 'James Doyle', 'James Doyle', 'Conservative', 'conservative', 196, 2.01, false),
  (:wid, 'David Banks', 'David Banks', 'Liberal Democrats', 'liberal-democrats', 179, 1.84, false),
  (:wid, 'Pamela Jameson', 'Pamela Jameson', 'Conservative', 'conservative', 178, 1.83, false),
  (:wid, 'Sharon Boddy', 'Sharon Boddy', 'Liberal Democrats', 'liberal-democrats', 162, 1.66, false),
  (:wid, 'Pamela Taylor', 'Pamela Taylor', 'Conservative', 'conservative', 177, 1.82, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016373', 'gss', 'Barnes & Thornhill', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ehthesham Haque', 'Ehthesham Haque', 'Labour and Co-operative', 'labour-coop', 1502, 12.37, true),
  (:wid, 'Caroline Comer', 'Caroline Comer', 'Labour and Co-operative', 'labour-coop', 1483, 12.21, true),
  (:wid, 'Fiona Katharine Tobin', 'Fiona Katharine Tobin', 'Labour and Co-operative', 'labour-coop', 1401, 11.53, true),
  (:wid, 'Victor John Skinner', 'Victor John Skinner', 'Reform UK', 'reform-uk', 1128, 9.29, false),
  (:wid, 'Robert Snowdon', 'Robert Snowdon', 'Reform UK', 'reform-uk', 1114, 9.17, false),
  (:wid, 'Lynn Wynn', 'Lynn Wynn', 'Reform UK', 'reform-uk', 1064, 8.76, false),
  (:wid, 'Benjamin William Davies-Scott', 'Benjamin William Davies-Scott', 'Conservative', 'conservative', 751, 6.18, false),
  (:wid, 'Nathan Williamson', 'Nathan Williamson', 'Conservative', 'conservative', 724, 5.96, false),
  (:wid, 'Kevin Leonard', 'Kevin Leonard', 'Conservative', 'conservative', 703, 5.79, false),
  (:wid, 'Syed Mahfuz Ahmed', 'Syed Mahfuz Ahmed', 'Liberal Democrats', 'liberal-democrats', 502, 4.13, false),
  (:wid, 'Jake Taylor', 'Jake Taylor', 'Green Party', 'green', 402, 3.31, false),
  (:wid, 'Alyson Kordbarlag', 'Alyson Kordbarlag', 'Green Party', 'green', 398, 3.28, false),
  (:wid, 'Mark Dominic Tyers', 'Mark Dominic Tyers', 'Green Party', 'green', 338, 2.78, false),
  (:wid, 'Tim Ellis-Dale', 'Tim Ellis-Dale', 'Liberal Democrats', 'liberal-democrats', 328, 2.7, false),
  (:wid, 'Kai Lamont Crawford', 'Kai Lamont Crawford', 'Liberal Democrats', 'liberal-democrats', 308, 2.54, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016374', 'gss', 'Deptford & Hendon', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'David Barker', 'David Barker', 'Reform UK', 'reform-uk', 1070, 13.35, true),
  (:wid, 'Marie McCarty', 'Marie McCarty', 'Reform UK', 'reform-uk', 990, 12.35, true),
  (:wid, 'Lynda Andrews', 'Lynda Andrews', 'Reform UK', 'reform-uk', 964, 12.03, true),
  (:wid, 'Stephen Lewis Elms', 'Stephen Lewis Elms', 'Labour and Co-operative', 'labour-coop', 865, 10.79, false),
  (:wid, 'Syeda Shilpe Chowdhury', 'Syeda Shilpe Chowdhury', 'Labour and Co-operative', 'labour-coop', 823, 10.27, false),
  (:wid, 'Myles Alfie Mordey', 'Myles Alfie Mordey', 'Labour and Co-operative', 'labour-coop', 814, 10.16, false),
  (:wid, 'Liam Murphy', 'Liam Murphy', 'Green Party', 'green', 399, 4.98, false),
  (:wid, 'Helmut Izaks', 'Helmut Izaks', 'Green Party', 'green', 395, 4.93, false),
  (:wid, 'Raymond John Moore', 'Raymond John Moore', 'Green Party', 'green', 384, 4.79, false),
  (:wid, 'Colin Wilson', 'Colin Wilson', 'Liberal Democrats', 'liberal-democrats', 352, 4.39, false),
  (:wid, 'Ciaran Morrissey', 'Ciaran Morrissey', 'Liberal Democrats', 'liberal-democrats', 304, 3.79, false),
  (:wid, 'Francesca Hodson', 'Francesca Hodson', 'Liberal Democrats', 'liberal-democrats', 292, 3.64, false),
  (:wid, 'James Ebere', 'James Ebere', 'Conservative', 'conservative', 144, 1.8, false),
  (:wid, 'Steven Porter', 'Steven Porter', 'Conservative', 'conservative', 111, 1.38, false),
  (:wid, 'Gideon Oseremen Eriaye', 'Gideon Oseremen Eriaye', 'Conservative', 'conservative', 108, 1.35, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016375', 'gss', 'Doxford Park', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Heather Fagan', 'Heather Fagan', 'Liberal Democrats', 'liberal-democrats', 1860, 16.77, true),
  (:wid, 'Paul Gibson', 'Paul Gibson', 'Liberal Democrats', 'liberal-democrats', 1649, 14.87, true),
  (:wid, 'Michael Peacock', 'Michael Peacock', 'Liberal Democrats', 'liberal-democrats', 1574, 14.19, true),
  (:wid, 'Lynda Alexander', 'Lynda Alexander', 'Reform UK', 'reform-uk', 1349, 12.16, false),
  (:wid, 'Alan Emery', 'Alan Emery', 'Reform UK', 'reform-uk', 1262, 11.38, false),
  (:wid, 'Bryn Thomas', 'Bryn Thomas', 'Reform UK', 'reform-uk', 1229, 11.08, false),
  (:wid, 'Jean Barley', 'Jean Barley', 'Labour', 'labour', 405, 3.65, false),
  (:wid, 'Allen Curtis', 'Allen Curtis', 'Labour', 'labour', 387, 3.49, false),
  (:wid, 'Duncan Wood', 'Duncan Wood', 'Labour', 'labour', 372, 3.35, false),
  (:wid, 'Keith Brown', 'Keith Brown', 'Green Party', 'green', 197, 1.78, false),
  (:wid, 'Lily Daniels', 'Lily Daniels', 'Green Party', 'green', 197, 1.78, false),
  (:wid, 'Haley', 'Haley', 'Green Party', 'green', 171, 1.54, false),
  (:wid, 'Adam Aiston', 'Adam Aiston', 'Conservative', 'conservative', 171, 1.54, false),
  (:wid, 'Helen Maddison', 'Helen Maddison', 'Conservative', 'conservative', 149, 1.34, false),
  (:wid, 'Ehis Uwaifo', 'Ehis Uwaifo', 'Conservative', 'conservative', 119, 1.07, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016376', 'gss', 'Farringdon & Silksworth', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Helen Greener', 'Helen Greener', 'Reform UK', 'reform-uk', 1684, 16.38, true),
  (:wid, 'Ian Dury', 'Ian Dury', 'Reform UK', 'reform-uk', 1683, 16.37, true),
  (:wid, 'Robert Hutchinson', 'Robert Hutchinson', 'Reform UK', 'reform-uk', 1644, 16, true),
  (:wid, 'Joanne Laverick', 'Joanne Laverick', 'Labour', 'labour', 1187, 11.55, false),
  (:wid, 'Phil Tye', 'Phil Tye', 'Labour', 'labour', 1124, 10.94, false),
  (:wid, 'Lauren Laws', 'Lauren Laws', 'Labour', 'labour', 1023, 9.95, false),
  (:wid, 'Scott Burrows', 'Scott Burrows', 'Green Party', 'green', 350, 3.41, false),
  (:wid, 'Heidi Tolson', 'Heidi Tolson', 'Green Party', 'green', 274, 2.67, false),
  (:wid, 'Billy Howells', 'Billy Howells', 'Green Party', 'green', 264, 2.57, false),
  (:wid, 'Joesph Austin', 'Joesph Austin', 'Conservative', 'conservative', 229, 2.23, false),
  (:wid, 'Deborah Mullen', 'Deborah Mullen', 'Conservative', 'conservative', 204, 1.98, false),
  (:wid, 'Kevin de Roche', 'Kevin de Roche', 'Conservative', 'conservative', 203, 1.98, false),
  (:wid, 'Jess Jenkins', 'Jess Jenkins', 'Liberal Democrats', 'liberal-democrats', 154, 1.5, false),
  (:wid, 'Martin Smith', 'Martin Smith', 'Liberal Democrats', 'liberal-democrats', 131, 1.27, false),
  (:wid, 'Linda Mary Wood', 'Linda Mary Wood', 'Liberal Democrats', 'liberal-democrats', 124, 1.21, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016378', 'gss', 'Grangetown', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Daniel Cowie', 'Daniel Cowie', 'Reform UK', 'reform-uk', 1476, 13.43, true),
  (:wid, 'Mark Wynn', 'Mark Wynn', 'Reform UK', 'reform-uk', 1424, 12.96, true),
  (:wid, 'Colin Wright', 'Colin Wright', 'Reform UK', 'reform-uk', 1334, 12.14, true),
  (:wid, 'Michael Mordey', 'Michael Mordey', 'Labour', 'labour', 1003, 9.13, false),
  (:wid, 'Michael Dixon', 'Michael Dixon', 'Conservative', 'conservative', 965, 8.78, false),
  (:wid, 'Lynda Scanlan', 'Lynda Scanlan', 'Labour', 'labour', 936, 8.52, false),
  (:wid, 'Ray Matthews', 'Ray Matthews', 'Labour', 'labour', 917, 8.35, false),
  (:wid, 'Alison Mason', 'Alison Mason', 'Conservative', 'conservative', 765, 6.96, false),
  (:wid, 'Hardip Baras', 'Hardip Baras', 'Conservative', 'conservative', 735, 6.69, false),
  (:wid, 'Layla-Jayne Laidler', 'Layla-Jayne Laidler', 'Green Party', 'green', 357, 3.25, false),
  (:wid, 'Serena Rush', 'Serena Rush', 'Green Party', 'green', 322, 2.93, false),
  (:wid, 'Grace Weir', 'Grace Weir', 'Green Party', 'green', 320, 2.91, false),
  (:wid, 'Marjorie Ledger', 'Marjorie Ledger', 'Liberal Democrats', 'liberal-democrats', 162, 1.47, false),
  (:wid, 'Vince Morrison', 'Vince Morrison', 'Liberal Democrats', 'liberal-democrats', 138, 1.26, false),
  (:wid, 'Audrey Smith', 'Audrey Smith', 'Liberal Democrats', 'liberal-democrats', 133, 1.21, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016379', 'gss', 'Grindon & Thorney Close', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Paul Edgeworth', 'Paul Edgeworth', 'Liberal Democrats', 'liberal-democrats', 1728, 18.04, true),
  (:wid, 'Stephen O''Brien', 'Stephen O''Brien', 'Liberal Democrats', 'liberal-democrats', 1678, 17.51, true),
  (:wid, 'Margaret Crosby', 'Margaret Crosby', 'Liberal Democrats', 'liberal-democrats', 1673, 17.46, true),
  (:wid, 'Steven Mustard', 'Steven Mustard', 'Reform UK', 'reform-uk', 1128, 11.77, false),
  (:wid, 'Michael Gutowski', 'Michael Gutowski', 'Reform UK', 'reform-uk', 1079, 11.26, false),
  (:wid, 'Mark Starling', 'Mark Starling', 'Reform UK', 'reform-uk', 1076, 11.23, false),
  (:wid, 'Dennis Carroll', 'Dennis Carroll', 'Labour', 'labour', 343, 3.58, false),
  (:wid, 'Ellie Young', 'Ellie Young', 'Labour', 'labour', 332, 3.47, false),
  (:wid, 'Keith Lakeman', 'Keith Lakeman', 'Labour', 'labour', 313, 3.27, false),
  (:wid, 'Paula Reed', 'Paula Reed', 'Conservative', 'conservative', 91, 0.95, false),
  (:wid, 'Alex Sinclair', 'Alex Sinclair', 'Conservative', 'conservative', 77, 0.8, false),
  (:wid, 'John Wiper', 'John Wiper', 'Conservative', 'conservative', 63, 0.66, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016380', 'gss', 'Herrington & Newbottle', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Bill Blackett', 'Bill Blackett', 'Reform UK', 'reform-uk', 1548, 13.34, true),
  (:wid, 'Bruce Allcroft', 'Bruce Allcroft', 'Reform UK', 'reform-uk', 1520, 13.1, true),
  (:wid, 'Jeffrey Shaw', 'Jeffrey Shaw', 'Reform UK', 'reform-uk', 1416, 12.2, true),
  (:wid, 'Dominic McDonough', 'Dominic McDonough', 'Conservative', 'conservative', 1085, 9.35, false),
  (:wid, 'Robert Oliver', 'Robert Oliver', 'Conservative', 'conservative', 1068, 9.2, false),
  (:wid, 'Chris Burnicle', 'Chris Burnicle', 'Conservative', 'conservative', 1038, 8.94, false),
  (:wid, 'Paul Jorgenson', 'Paul Jorgenson', 'Labour', 'labour', 888, 7.65, false),
  (:wid, 'Maureen Richardson', 'Maureen Richardson', 'Labour', 'labour', 875, 7.54, false),
  (:wid, 'Martin Old', 'Martin Old', 'Labour', 'labour', 872, 7.51, false),
  (:wid, 'Donna Brown', 'Donna Brown', 'Green Party', 'green', 300, 2.58, false),
  (:wid, 'Hayley Campbell', 'Hayley Campbell', 'Green Party', 'green', 297, 2.56, false),
  (:wid, 'Joella Lynch', 'Joella Lynch', 'Green Party', 'green', 250, 2.15, false),
  (:wid, 'Michelle Hardie', 'Michelle Hardie', 'Liberal Democrats', 'liberal-democrats', 181, 1.56, false),
  (:wid, 'Christopher Marshall', 'Christopher Marshall', 'Liberal Democrats', 'liberal-democrats', 147, 1.27, false),
  (:wid, 'Malcolm Waine', 'Malcolm Waine', 'Liberal Democrats', 'liberal-democrats', 122, 1.05, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016381', 'gss', 'Hetton', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Alan Davies', 'Alan Davies', 'Reform UK', 'reform-uk', 1340, 18.69, true),
  (:wid, 'Jason Lloyd', 'Jason Lloyd', 'Reform UK', 'reform-uk', 1292, 18.02, true),
  (:wid, 'Steven Paterson', 'Steven Paterson', 'Reform UK', 'reform-uk', 1241, 17.31, true),
  (:wid, 'James Blackburn', 'James Blackburn', 'Labour', 'labour', 742, 10.35, false),
  (:wid, 'George Callaghan', 'George Callaghan', 'Labour', 'labour', 587, 8.19, false),
  (:wid, 'Christopher Tobin', 'Christopher Tobin', 'Labour', 'labour', 535, 7.46, false),
  (:wid, 'Rachel Lowe', 'Rachel Lowe', 'Green Party', 'green', 277, 3.86, false),
  (:wid, 'Christopher Donaldson', 'Christopher Donaldson', 'Green Party', 'green', 260, 3.63, false),
  (:wid, 'Ynez Tulsen', 'Ynez Tulsen', 'Green Party', 'green', 185, 2.58, false),
  (:wid, 'Ian Ellis', 'Ian Ellis', 'Liberal Democrats', 'liberal-democrats', 153, 2.13, false),
  (:wid, 'Trevor Colgin', 'Trevor Colgin', 'Conservative', 'conservative', 132, 1.84, false),
  (:wid, 'Kath Gaffney', 'Kath Gaffney', 'Liberal Democrats', 'liberal-democrats', 121, 1.69, false),
  (:wid, 'Gwynneth Gibson', 'Gwynneth Gibson', 'Conservative', 'conservative', 113, 1.58, false),
  (:wid, 'Elizabeth Gaffney', 'Elizabeth Gaffney', 'Liberal Democrats', 'liberal-democrats', 102, 1.42, false),
  (:wid, 'Henry Ndubuisi', 'Henry Ndubuisi', 'Conservative', 'conservative', 89, 1.24, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016383', 'gss', 'Houghton South & Hetton Downs', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Heather Finlay', 'Heather Finlay', 'Reform UK', 'reform-uk', 1477, 16.42, true),
  (:wid, 'Jonathon Robert Emerson', 'Jonathon Robert Emerson', 'Reform UK', 'reform-uk', 1339, 14.89, true),
  (:wid, 'Michael Quigley', 'Michael Quigley', 'Reform UK', 'reform-uk', 1327, 14.76, true),
  (:wid, 'Kevin Johnston', 'Kevin Johnston', 'Labour', 'labour', 999, 11.11, false),
  (:wid, 'Tracy Dodds', 'Tracy Dodds', 'Labour', 'labour', 975, 10.84, false),
  (:wid, 'Melanie Thornton', 'Melanie Thornton', 'Labour', 'labour', 904, 10.05, false),
  (:wid, 'Andrew Robertson', 'Andrew Robertson', 'Green Party', 'green', 466, 5.18, false),
  (:wid, 'Harrison Hopps', 'Harrison Hopps', 'Green Party', 'green', 334, 3.71, false),
  (:wid, 'Connor Sinclair', 'Connor Sinclair', 'Conservative', 'conservative', 233, 2.59, false),
  (:wid, 'Emma Jane Baker', 'Emma Jane Baker', 'Liberal Democrats', 'liberal-democrats', 217, 2.41, false),
  (:wid, 'Mia Coupland', 'Mia Coupland', 'Liberal Democrats', 'liberal-democrats', 188, 2.09, false),
  (:wid, 'Harry Levi Jordan Brandon Shovlin', 'Harry Levi Jordan Brandon Shovlin', 'Conservative', 'conservative', 180, 2, false),
  (:wid, 'Mickey Mikhimade Olowoko', 'Mickey Mikhimade Olowoko', 'Conservative', 'conservative', 179, 1.99, false),
  (:wid, 'Jan Foster', 'Jan Foster', 'Liberal Democrats', 'liberal-democrats', 175, 1.95, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016384', 'gss', 'Hylton Castle', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ian Jones', 'Ian Jones', 'Reform UK', 'reform-uk', 1383, 19.23, true),
  (:wid, 'David Laing', 'David Laing', 'Reform UK', 'reform-uk', 1302, 18.1, true),
  (:wid, 'Glenn Gibbins', 'Glenn Gibbins', 'Reform UK', 'reform-uk', 1285, 17.86, true),
  (:wid, 'Denny Wilson', 'Denny Wilson', 'Labour', 'labour', 792, 11.01, false),
  (:wid, 'Stephen Foster', 'Stephen Foster', 'Labour', 'labour', 772, 10.73, false),
  (:wid, 'Allison Chisnall', 'Allison Chisnall', 'Labour', 'labour', 767, 10.66, false),
  (:wid, 'Angela Smith', 'Angela Smith', 'Liberal Democrats', 'liberal-democrats', 178, 2.47, false),
  (:wid, 'William Douglas', 'William Douglas', 'Liberal Democrats', 'liberal-democrats', 174, 2.42, false),
  (:wid, 'Miriam Townsend', 'Miriam Townsend', 'Liberal Democrats', 'liberal-democrats', 150, 2.09, false),
  (:wid, 'Les Dunn', 'Les Dunn', 'Conservative', 'conservative', 135, 1.88, false),
  (:wid, 'Denise Worthy', 'Denise Worthy', 'Conservative', 'conservative', 128, 1.78, false),
  (:wid, 'Dorothy Hartnack', 'Dorothy Hartnack', 'Conservative', 'conservative', 127, 1.77, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016385', 'gss', 'Pallion & Ford', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Martin Haswell', 'Martin Haswell', 'Liberal Democrats', 'liberal-democrats', 1700, 15.8, true),
  (:wid, 'Steve Donkin', 'Steve Donkin', 'Liberal Democrats', 'liberal-democrats', 1595, 14.82, true),
  (:wid, 'Julia Potts', 'Julia Potts', 'Liberal Democrats', 'liberal-democrats', 1557, 14.47, true),
  (:wid, 'Raymond Lathan', 'Raymond Lathan', 'Reform UK', 'reform-uk', 1120, 10.41, false),
  (:wid, 'Emma Margetson', 'Emma Margetson', 'Reform UK', 'reform-uk', 1051, 9.77, false),
  (:wid, 'David Parr', 'David Parr', 'Reform UK', 'reform-uk', 1011, 9.4, false),
  (:wid, 'Kenny Amadasun', 'Kenny Amadasun', 'Labour', 'labour', 561, 5.21, false),
  (:wid, 'Angela Smith', 'Angela Smith', 'Labour', 'labour', 481, 4.47, false),
  (:wid, 'Gorge Smith', 'Gorge Smith', 'Labour', 'labour', 425, 3.95, false),
  (:wid, 'Naomi Browne', 'Naomi Browne', 'Green Party', 'green', 313, 2.91, false),
  (:wid, 'Rebecca Grant', 'Rebecca Grant', 'Green Party', 'green', 275, 2.56, false),
  (:wid, 'Jamie Lee', 'Jamie Lee', 'Green Party', 'green', 240, 2.23, false),
  (:wid, 'Karren Boble', 'Karren Boble', 'Independent', 'independent', 194, 1.8, false),
  (:wid, 'Phil Avery', 'Phil Avery', 'Conservative', 'conservative', 99, 0.92, false),
  (:wid, 'Bob Francis', 'Bob Francis', 'Conservative', 'conservative', 73, 0.68, false),
  (:wid, 'Joy Tennant', 'Joy Tennant', 'Conservative', 'conservative', 65, 0.6, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016386', 'gss', 'Pennywell & South Hylton', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Carol Giles', 'Carol Giles', 'Reform UK', 'reform-uk', 1570, 19.38, true),
  (:wid, 'Russell Giles', 'Russell Giles', 'Reform UK', 'reform-uk', 1551, 19.15, true),
  (:wid, 'Julia Ann Irwing', 'Julia Ann Irwing', 'Reform UK', 'reform-uk', 1439, 17.76, true),
  (:wid, 'Lynne Dagg', 'Lynne Dagg', 'Labour and Co-operative', 'labour-coop', 605, 7.47, false),
  (:wid, 'Susan Watson', 'Susan Watson', 'Labour and Co-operative', 'labour-coop', 539, 6.65, false),
  (:wid, 'Catherine Hunter', 'Catherine Hunter', 'Labour and Co-operative', 'labour-coop', 525, 6.48, false),
  (:wid, 'Greg Peacock', 'Greg Peacock', 'Conservative', 'conservative', 364, 4.49, false),
  (:wid, 'Laura Dunning', 'Laura Dunning', 'Green Party', 'green', 291, 3.59, false),
  (:wid, 'Simon Hughes', 'Simon Hughes', 'Green Party', 'green', 252, 3.11, false),
  (:wid, 'Shaun Cudworth', 'Shaun Cudworth', 'Conservative', 'conservative', 239, 2.95, false),
  (:wid, 'Godwin Ejeh', 'Godwin Ejeh', 'Liberal Democrats', 'liberal-democrats', 196, 2.42, false),
  (:wid, 'Sunshine Babalola', 'Sunshine Babalola', 'Liberal Democrats', 'liberal-democrats', 183, 2.26, false),
  (:wid, 'Anthony Usher', 'Anthony Usher', 'Liberal Democrats', 'liberal-democrats', 175, 2.16, false),
  (:wid, 'Jake Walker', 'Jake Walker', 'Conservative', 'conservative', 172, 2.12, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016388', 'gss', 'Redhouse', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Shaun Conley', 'Shaun Conley', 'Reform UK', 'reform-uk', 1329, 18.98, true),
  (:wid, 'Chris Eynon', 'Chris Eynon', 'Reform UK', 'reform-uk', 1270, 18.14, true),
  (:wid, 'Ciera Hudspith', 'Ciera Hudspith', 'Reform UK', 'reform-uk', 1260, 17.99, true),
  (:wid, 'Paul Stewart', 'Paul Stewart', 'Labour and Co-operative', 'labour-coop', 684, 9.77, false),
  (:wid, 'Alison Smith', 'Alison Smith', 'Labour and Co-operative', 'labour-coop', 654, 9.34, false),
  (:wid, 'John Usher', 'John Usher', 'Labour and Co-operative', 'labour-coop', 545, 7.78, false),
  (:wid, 'Martha Bradley', 'Martha Bradley', 'Green Party', 'green', 232, 3.31, false),
  (:wid, 'John Scratcher', 'John Scratcher', 'Green Party', 'green', 206, 2.94, false),
  (:wid, 'Paul Humble', 'Paul Humble', 'Independent', 'independent', 156, 2.23, false),
  (:wid, 'Steven Dale', 'Steven Dale', 'Liberal Democrats', 'liberal-democrats', 136, 1.94, false),
  (:wid, 'Janice Ellis', 'Janice Ellis', 'Liberal Democrats', 'liberal-democrats', 122, 1.74, false),
  (:wid, 'Margaret Stephenson', 'Margaret Stephenson', 'Liberal Democrats', 'liberal-democrats', 118, 1.68, false),
  (:wid, 'Louise Avery', 'Louise Avery', 'Conservative', 'conservative', 114, 1.63, false),
  (:wid, 'Bob Forster', 'Bob Forster', 'Conservative', 'conservative', 90, 1.29, false),
  (:wid, 'Sue Leishman', 'Sue Leishman', 'Conservative', 'conservative', 87, 1.24, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016389', 'gss', 'Roker', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Kirsty Alder', 'Kirsty Alder', 'Reform UK', 'reform-uk', 1818, 15.01, true),
  (:wid, 'Andrew Ramsey', 'Andrew Ramsey', 'Reform UK', 'reform-uk', 1701, 14.04, true),
  (:wid, 'Thomas Steele', 'Thomas Steele', 'Reform UK', 'reform-uk', 1544, 12.75, true),
  (:wid, 'Bev Grainger', 'Bev Grainger', 'Labour', 'labour', 1352, 11.16, false),
  (:wid, 'Matthew Jackson', 'Matthew Jackson', 'Labour', 'labour', 1291, 10.66, false),
  (:wid, 'Tom Newton', 'Tom Newton', 'Labour', 'labour', 1213, 10.01, false),
  (:wid, 'Sean Chapman', 'Sean Chapman', 'Conservative', 'conservative', 607, 5.01, false),
  (:wid, 'Emma Porter', 'Emma Porter', 'Conservative', 'conservative', 454, 3.75, false),
  (:wid, 'Justine Merton-Scott', 'Justine Merton-Scott', 'Green Party', 'green', 430, 3.55, false),
  (:wid, 'David Ogundipe', 'David Ogundipe', 'Conservative', 'conservative', 418, 3.45, false),
  (:wid, 'John Lennox', 'John Lennox', 'Liberal Democrats', 'liberal-democrats', 380, 3.14, false),
  (:wid, 'Helen Schell', 'Helen Schell', 'Green Party', 'green', 348, 2.87, false),
  (:wid, 'Craig King', 'Craig King', 'Liberal Democrats', 'liberal-democrats', 306, 2.53, false),
  (:wid, 'Miguel Smith', 'Miguel Smith', 'Liberal Democrats', 'liberal-democrats', 251, 2.07, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016391', 'gss', 'Southwick', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Michael Leadbitter', 'Michael Leadbitter', 'Reform UK', 'reform-uk', 1357, 16.96, true),
  (:wid, 'Jannine Morrow', 'Jannine Morrow', 'Reform UK', 'reform-uk', 1305, 16.31, true),
  (:wid, 'Jamie Scott', 'Jamie Scott', 'Reform UK', 'reform-uk', 1217, 15.21, true),
  (:wid, 'Michael Butler', 'Michael Butler', 'Labour', 'labour', 829, 10.36, false),
  (:wid, 'Zoe Chandler', 'Zoe Chandler', 'Labour', 'labour', 733, 9.16, false),
  (:wid, 'Kelly Chequer', 'Kelly Chequer', 'Labour', 'labour', 729, 9.11, false),
  (:wid, 'Paul Jacques', 'Paul Jacques', 'Green Party', 'green', 270, 3.38, false),
  (:wid, 'John Appleton', 'John Appleton', 'Green Party', 'green', 260, 3.25, false),
  (:wid, 'Ben Hardie', 'Ben Hardie', 'Liberal Democrats', 'liberal-democrats', 227, 2.84, false),
  (:wid, 'Craig Doughty', 'Craig Doughty', 'Liberal Democrats', 'liberal-democrats', 220, 2.75, false),
  (:wid, 'Rafal Marzec', 'Rafal Marzec', 'Green Party', 'green', 195, 2.44, false),
  (:wid, 'Andrew Wood', 'Andrew Wood', 'Liberal Democrats', 'liberal-democrats', 167, 2.09, false),
  (:wid, 'Jon Reed', 'Jon Reed', 'Conservative', 'conservative', 127, 1.59, false),
  (:wid, 'Sheila Smith', 'Sheila Smith', 'Conservative', 'conservative', 126, 1.58, false),
  (:wid, 'Kath Worthy', 'Kath Worthy', 'Conservative', 'conservative', 123, 1.54, false),
  (:wid, 'Rosalind Copeland', 'Rosalind Copeland', 'Independent', 'independent', 114, 1.43, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016392', 'gss', 'Tunstall & Humbledon', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'David ''Taff'' Wales', 'David ''Taff'' Wales', 'Reform UK', 'reform-uk', 1225, 10.61, true),
  (:wid, 'Richard Vardy', 'Richard Vardy', 'Reform UK', 'reform-uk', 1194, 10.34, true),
  (:wid, 'Glenda Hall', 'Glenda Hall', 'Reform UK', 'reform-uk', 1191, 10.32, true),
  (:wid, 'Adele Graham-King', 'Adele Graham-King', 'Conservative', 'conservative', 1050, 9.09, false),
  (:wid, 'Lyall Jonathan Reed', 'Lyall Jonathan Reed', 'Conservative', 'conservative', 1039, 9, false),
  (:wid, 'Antony Mullen', 'Antony Mullen', 'Conservative', 'conservative', 1037, 8.98, false),
  (:wid, 'Lennon Airey', 'Lennon Airey', 'Labour', 'labour', 814, 7.05, false),
  (:wid, 'Charlie Bell', 'Charlie Bell', 'Labour', 'labour', 789, 6.83, false),
  (:wid, 'Richard Bradley', 'Richard Bradley', 'Green Party', 'green', 723, 6.26, false),
  (:wid, 'Dan Sullivan', 'Dan Sullivan', 'Green Party', 'green', 700, 6.06, false),
  (:wid, 'Dale Gillett', 'Dale Gillett', 'Green Party', 'green', 698, 6.05, false),
  (:wid, 'Zareen Haque', 'Zareen Haque', 'Labour', 'labour', 672, 5.82, false),
  (:wid, 'Simon Dawes', 'Simon Dawes', 'Liberal Democrats', 'liberal-democrats', 149, 1.29, false),
  (:wid, 'Janet Wood', 'Janet Wood', 'Liberal Democrats', 'liberal-democrats', 135, 1.17, false),
  (:wid, 'Robbie Potts', 'Robbie Potts', 'Liberal Democrats', 'liberal-democrats', 129, 1.12, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016393', 'gss', 'Washington Central', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Joseph Phillips', 'Joseph Phillips', 'Reform UK', 'reform-uk', 1448, 16.14, true),
  (:wid, 'Janis Berzemnieks', 'Janis Berzemnieks', 'Reform UK', 'reform-uk', 1213, 13.52, true),
  (:wid, 'Saleem Memon', 'Saleem Memon', 'Reform UK', 'reform-uk', 1112, 12.4, true),
  (:wid, 'Dianne Snowdon', 'Dianne Snowdon', 'Labour', 'labour', 1035, 11.54, false),
  (:wid, 'Linda Williams', 'Linda Williams', 'Labour', 'labour', 976, 10.88, false),
  (:wid, 'Harry Trueman', 'Harry Trueman', 'Labour', 'labour', 860, 9.59, false),
  (:wid, 'Michael Colling', 'Michael Colling', 'Green Party', 'green', 360, 4.01, false),
  (:wid, 'Ashley Smith', 'Ashley Smith', 'Green Party', 'green', 349, 3.89, false),
  (:wid, 'Rebecca Armstrong', 'Rebecca Armstrong', 'Liberal Democrats', 'liberal-democrats', 337, 3.76, false),
  (:wid, 'Joshua Hall', 'Joshua Hall', 'Liberal Democrats', 'liberal-democrats', 294, 3.28, false),
  (:wid, 'Valerie Moore', 'Valerie Moore', 'Conservative', 'conservative', 245, 2.73, false),
  (:wid, 'Mishka Belik', 'Mishka Belik', 'Green Party', 'green', 222, 2.48, false),
  (:wid, 'Audrey Jaitay', 'Audrey Jaitay', 'Conservative', 'conservative', 190, 2.12, false),
  (:wid, 'Mary Ogundipe', 'Mary Ogundipe', 'Conservative', 'conservative', 169, 1.88, false),
  (:wid, 'Kelsey Hall', 'Kelsey Hall', 'Liberal Democrats', 'liberal-democrats', 159, 1.77, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016394', 'gss', 'Washington East', 3, NULL, 35.5, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ian Hembrough', 'Ian Hembrough', 'Reform UK', 'reform-uk', 1275, 15.44, true),
  (:wid, 'Emily Lopez', 'Emily Lopez', 'Reform UK', 'reform-uk', 1123, 13.6, true),
  (:wid, 'Anthony Ormond', 'Anthony Ormond', 'Reform UK', 'reform-uk', 1113, 13.48, true),
  (:wid, 'Beth Jones', 'Beth Jones', 'Labour and Co-operative', 'labour-coop', 1065, 12.9, false),
  (:wid, 'Graeme Miller', 'Graeme Miller', 'Labour and Co-operative', 'labour-coop', 910, 11.02, false),
  (:wid, 'Jennifer Orji', 'Jennifer Orji', 'Labour and Co-operative', 'labour-coop', 789, 9.56, false),
  (:wid, 'Gary Bridge', 'Gary Bridge', 'Green Party', 'green', 429, 5.2, false),
  (:wid, 'Anna Snell', 'Anna Snell', 'Green Party', 'green', 243, 2.94, false),
  (:wid, 'Michal Chantkowski', 'Michal Chantkowski', 'Green Party', 'green', 240, 2.91, false),
  (:wid, 'Lauren Laws', 'Lauren Laws', 'Liberal Democrats', 'liberal-democrats', 240, 2.91, false),
  (:wid, 'Ian Francombe', 'Ian Francombe', 'Conservative', 'conservative', 209, 2.53, false),
  (:wid, 'Finlee Gibbons', 'Finlee Gibbons', 'Conservative', 'conservative', 195, 2.36, false),
  (:wid, 'Victor Oluwagbemi', 'Victor Oluwagbemi', 'Conservative', 'conservative', 160, 1.94, false),
  (:wid, 'Helen Attey', 'Helen Attey', 'Liberal Democrats', 'liberal-democrats', 140, 1.7, false),
  (:wid, 'Nana Boddy', 'Nana Boddy', 'Liberal Democrats', 'liberal-democrats', 126, 1.53, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016395', 'gss', 'Washington North', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jason King', 'Jason King', 'Reform UK', 'reform-uk', 1313, 15.73, true),
  (:wid, 'Paul Donaghy', 'Paul Donaghy', 'Reform UK', 'reform-uk', 1311, 15.71, true),
  (:wid, 'Elizabeth Brown', 'Elizabeth Brown', 'Reform UK', 'reform-uk', 1235, 14.8, true),
  (:wid, 'Michael Walker', 'Michael Walker', 'Labour', 'labour', 935, 11.2, false),
  (:wid, 'Jill Fletcher', 'Jill Fletcher', 'Labour', 'labour', 917, 10.99, false),
  (:wid, 'Callum McPake', 'Callum McPake', 'Labour', 'labour', 840, 10.07, false),
  (:wid, 'Janette Nightingale', 'Janette Nightingale', 'Green Party', 'green', 366, 4.39, false),
  (:wid, 'Ross Dargan', 'Ross Dargan', 'Green Party', 'green', 328, 3.93, false),
  (:wid, 'Steven Tolson', 'Steven Tolson', 'Green Party', 'green', 236, 2.83, false),
  (:wid, 'Ayobami Adeoye', 'Ayobami Adeoye', 'Conservative', 'conservative', 209, 2.5, false),
  (:wid, 'Patricia Francis', 'Patricia Francis', 'Conservative', 'conservative', 192, 2.3, false),
  (:wid, 'Richard Green', 'Richard Green', 'Conservative', 'conservative', 177, 2.12, false),
  (:wid, 'Karen Laws', 'Karen Laws', 'Liberal Democrats', 'liberal-democrats', 102, 1.22, false),
  (:wid, 'Carlton West', 'Carlton West', 'Liberal Democrats', 'liberal-democrats', 97, 1.16, false),
  (:wid, 'Kieran Wood', 'Kieran Wood', 'Liberal Democrats', 'liberal-democrats', 87, 1.04, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016396', 'gss', 'Washington South', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Robert Pattison', 'Robert Pattison', 'Reform UK', 'reform-uk', 1616, 13.23, true),
  (:wid, 'Elouise Redmayne', 'Elouise Redmayne', 'Reform UK', 'reform-uk', 1591, 13.02, true),
  (:wid, 'John Watson', 'John Watson', 'Reform UK', 'reform-uk', 1518, 12.42, true),
  (:wid, 'Sean Laws', 'Sean Laws', 'Labour', 'labour', 1259, 10.3, false),
  (:wid, 'Logan Guy', 'Logan Guy', 'Labour', 'labour', 1154, 9.45, false),
  (:wid, 'Andrew Rowntree', 'Andrew Rowntree', 'Labour', 'labour', 881, 7.21, false),
  (:wid, 'Brandon Oakland', 'Brandon Oakland', 'Conservative', 'conservative', 705, 5.77, false),
  (:wid, 'Fiona Miller', 'Fiona Miller', 'Green Party', 'green', 684, 5.6, false),
  (:wid, 'Gabriel Green', 'Gabriel Green', 'Conservative', 'conservative', 676, 5.53, false),
  (:wid, 'Thomas Such', 'Thomas Such', 'Conservative', 'conservative', 664, 5.43, false),
  (:wid, 'Theo Rose', 'Theo Rose', 'Green Party', 'green', 525, 4.3, false),
  (:wid, 'Peter Deegan', 'Peter Deegan', 'Green Party', 'green', 455, 3.72, false),
  (:wid, 'Sean Terry', 'Sean Terry', 'Liberal Democrats', 'liberal-democrats', 200, 1.64, false),
  (:wid, 'Jack Docherty', 'Jack Docherty', 'Liberal Democrats', 'liberal-democrats', 152, 1.24, false),
  (:wid, 'Amy Wilson', 'Amy Wilson', 'Liberal Democrats', 'liberal-democrats', 138, 1.13, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016397', 'gss', 'Washington West', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Brandon Feeley', 'Brandon Feeley', 'Labour', 'labour', 1662, 15.3, true),
  (:wid, 'Joanne Chapman', 'Joanne Chapman', 'Labour', 'labour', 1560, 14.36, true),
  (:wid, 'Adrian Pickering', 'Adrian Pickering', 'Reform UK', 'reform-uk', 1508, 13.88, true),
  (:wid, 'Patricia Raynor', 'Patricia Raynor', 'Labour', 'labour', 1400, 12.89, false),
  (:wid, 'Lee Redmayne', 'Lee Redmayne', 'Reform UK', 'reform-uk', 1357, 12.49, false),
  (:wid, 'Neil Moffitt', 'Neil Moffitt', 'Reform UK', 'reform-uk', 1350, 12.43, false),
  (:wid, 'Josh Thurlow', 'Josh Thurlow', 'Green Party', 'green', 382, 3.52, false),
  (:wid, 'Chloe Harvey', 'Chloe Harvey', 'Green Party', 'green', 370, 3.41, false),
  (:wid, 'Paul Leonard', 'Paul Leonard', 'Green Party', 'green', 349, 3.21, false),
  (:wid, 'Sam Cosgrove', 'Sam Cosgrove', 'Conservative', 'conservative', 269, 2.48, false),
  (:wid, 'Neil King', 'Neil King', 'Conservative', 'conservative', 201, 1.85, false),
  (:wid, 'Samson Ibijola', 'Samson Ibijola', 'Conservative', 'conservative', 153, 1.41, false),
  (:wid, 'Viv Lee', 'Viv Lee', 'Liberal Democrats', 'liberal-democrats', 114, 1.05, false),
  (:wid, 'Ernie Peel', 'Ernie Peel', 'Liberal Democrats', 'liberal-democrats', 97, 0.89, false),
  (:wid, 'Kairo Pearson', 'Kairo Pearson', 'Liberal Democrats', 'liberal-democrats', 89, 0.82, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05016382', 'gss', 'Houghton North', 3, NULL, NULL, NULL, 'https://en.wikipedia.org/wiki/2026_Sunderland_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Sandra Louisa Hobson-Tate', 'Sandra Louisa Hobson-Tate', 'Reform UK', 'reform-uk', 1584, 17.02, true),
  (:wid, 'Joseph Francomb Parkin', 'Joseph Francomb Parkin', 'Reform UK', 'reform-uk', 1542, 16.57, true),
  (:wid, 'Donna Sarah Thomas', 'Donna Sarah Thomas', 'Reform UK', 'reform-uk', 1432, 15.38, true),
  (:wid, 'John Price', 'John Price', 'Labour', 'labour', 973, 10.45, false),
  (:wid, 'Mark Burrell', 'Mark Burrell', 'Labour', 'labour', 969, 10.41, false),
  (:wid, 'Claire Danielle Bryant', 'Claire Danielle Bryant', 'Labour', 'labour', 963, 10.35, false),
  (:wid, 'Steph Langford', 'Steph Langford', 'Green Party', 'green', 401, 4.31, false),
  (:wid, 'Pauline Robson', 'Pauline Robson', 'Green Party', 'green', 275, 2.95, false),
  (:wid, 'Kirsty Elizabeth Younger', 'Kirsty Elizabeth Younger', 'Green Party', 'green', 248, 2.66, false),
  (:wid, 'Michaela Rhiannon Peacock', 'Michaela Rhiannon Peacock', 'Conservative', 'conservative', 195, 2.09, false),
  (:wid, 'Mark John Reynoldson', 'Mark John Reynoldson', 'Conservative', 'conservative', 171, 1.84, false),
  (:wid, 'Christel Rose', 'Christel Rose', 'Conservative', 'conservative', 162, 1.74, false),
  (:wid, 'Felicity Louise Brand', 'Felicity Louise Brand', 'Liberal Democrats', 'liberal-democrats', 152, 1.63, false),
  (:wid, 'Stewart Hardie', 'Stewart Hardie', 'Liberal Democrats', 'liberal-democrats', 130, 1.4, false),
  (:wid, 'Steven Render', 'Steven Render', 'Liberal Democrats', 'liberal-democrats', 111, 1.19, false);

DO $$ DECLARE e int; w int; c int; BEGIN
  SELECT count(*) INTO e FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E08000024', '2026-05-07'::date));
  SELECT count(*) INTO w FROM public.council_election_wards x JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E08000024', '2026-05-07'::date));
  SELECT count(*) INTO c FROM public.council_election_candidates k JOIN public.council_election_wards x ON x.id = k.ward_id JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E08000024', '2026-05-07'::date));
  IF e <> 1 OR w <> 25 OR c <> 367 THEN RAISE EXCEPTION 'expected 1 elections, 25 wards, 367 candidates; found %, %, %', e, w, c; END IF; END $$;
SELECT y.council_gss_code, y.election_date, y.wards_contested, y.seats_contested, count(k.*) AS candidates FROM public.council_elections y JOIN public.council_election_wards x ON x.election_id = y.id JOIN public.council_election_candidates k ON k.ward_id = x.id WHERE (y.council_gss_code, y.election_date) IN (('E08000024', '2026-05-07'::date)) GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

COMMIT;
