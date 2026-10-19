-- Guarded load: Peterborough City Council 2026-05-07
-- written by scripts/import-council-election-results.js --sql from /Users/johnnybot/peoples-chamber-frontend/Claude outputs/council-results-2026/peterborough/election-results-2026-peterborough.csv
-- 1 elections, 18 wards, 92 candidates; party_names rows used: 13 (old rows kept in public.party_names_backup_20261019e)
\set ON_ERROR_STOP on
BEGIN;

DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E06000031', '2026-05-07'::date));
  IF n <> 0 THEN RAISE EXCEPTION 'already loaded: % of these elections', n; END IF; END $$;

CREATE TABLE public.party_names_backup_20261019e AS SELECT *, now() AS saved_at FROM public.party_names WHERE published_name IN ('Conservative', 'Green Party', 'Independent', 'Labour', 'Labour Party', 'Labour and Co-operative', 'Liberal Democrat', 'Liberal Democrats', 'Peterborough First', 'Reform UK', 'TUSC', 'The Conservative Party Candidate', 'Your Party (UK)');
ALTER TABLE public.party_names_backup_20261019e ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019e FROM anon, authenticated;
INSERT INTO public.party_names (published_name, party_id, party_name, parties_slug) VALUES
  ('Conservative', 'conservative', 'Conservative and Unionist Party', 'conservative'),
  ('Green Party', 'green', 'Green Party', 'green'),
  ('Independent', 'independent', 'Independent', 'independent'),
  ('Labour', 'labour', 'Labour Party', 'labour'),
  ('Labour Party', 'labour', 'Labour Party', 'labour'),
  ('Labour and Co-operative', 'labour-coop', 'Labour and Co-operative Party (joint description of the Labour Party and the Co-operative Party)', 'labour'),
  ('Liberal Democrat', 'liberal-democrats', 'Liberal Democrats', 'liberal-democrats'),
  ('Liberal Democrats', 'liberal-democrats', 'Liberal Democrats', 'liberal-democrats'),
  ('Peterborough First', 'peterborough-first', 'Peterborough First', NULL),
  ('Reform UK', 'reform-uk', 'Reform UK', 'reform-uk'),
  ('TUSC', 'trade-unionist-and-socialist-coalition', 'Trade Unionist and Socialist Coalition', NULL),
  ('The Conservative Party Candidate', 'conservative', 'Conservative and Unionist Party', 'conservative'),
  ('Your Party (UK)', 'your-party', 'Your Party', 'your-party')
ON CONFLICT (published_name) DO UPDATE SET party_id = EXCLUDED.party_id, party_name = EXCLUDED.party_name, parties_slug = EXCLUDED.parties_slug;

INSERT INTO public.council_elections (council_gss_code, election_date, wards_contested, seats_contested, turnout_pct, source_note) VALUES ('E06000031', '2026-05-07', 18, 18, 35.24, 'Wikipedia''s record of the council''s published results, CC BY-SA 4.0; Ravensthorpe from Peterborough City Council''s declaration of results') RETURNING id AS eid \gset
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010806', 'gss', 'Bretton', 1, NULL, 30.8, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'John Bolton', 'John Bolton', 'Reform UK', 'reform-uk', 687, 32.97, true),
  (:wid, 'Scott Warren', 'Scott Warren', 'Conservative', 'conservative', 627, 30.09, false),
  (:wid, 'Susan Glasgow', 'Susan Glasgow', 'Labour', 'labour', 407, 19.53, false),
  (:wid, 'David Narrainen', 'David Narrainen', 'Green Party', 'green', 239, 11.47, false),
  (:wid, 'Rohan Wilson', 'Rohan Wilson', 'Liberal Democrats', 'liberal-democrats', 124, 5.95, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010807', 'gss', 'Central', 1, NULL, 34.2, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Khurram Iqbal', 'Khurram Iqbal', 'Labour', 'labour', 1106, 34.62, true),
  (:wid, 'Shaz Choudhary', 'Shaz Choudhary', 'Green Party', 'green', 1069, 33.46, false),
  (:wid, 'Shahzadi Khan', 'Shahzadi Khan', 'Conservative', 'conservative', 403, 12.61, false),
  (:wid, 'Jeff Pitt', 'Jeff Pitt', 'Reform UK', 'reform-uk', 399, 12.49, false),
  (:wid, 'Jason Kerridge', 'Jason Kerridge', 'Liberal Democrats', 'liberal-democrats', 173, 5.41, false),
  (:wid, 'Steve Cawley', 'Steve Cawley', 'TUSC', 'trade-unionist-and-socialist-coalition', 45, 1.41, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010808', 'gss', 'Dogsthorpe', 1, NULL, 32, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ishfaq Hussain', 'Ishfaq Hussain', 'Conservative', 'conservative', 692, 31.02, true),
  (:wid, 'Bryan Tyler', 'Bryan Tyler', 'Reform UK', 'reform-uk', 579, 25.95, false),
  (:wid, 'Mohammad Haseeb', 'Mohammad Haseeb', 'Labour', 'labour', 431, 19.32, false),
  (:wid, 'Pip Gardner', 'Pip Gardner', 'Green Party', 'green', 390, 17.48, false),
  (:wid, 'Sandra Ringler', 'Sandra Ringler', 'Liberal Democrats', 'liberal-democrats', 103, 4.62, false),
  (:wid, 'Petr Torak', 'Petr Torak', 'Independent', 'independent', 36, 1.61, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010809', 'gss', 'East', 1, NULL, 34.6, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Sam Hemraj', 'Samantha Hemraj', 'Labour and Co-operative', 'labour-coop', 939, 35.27, true),
  (:wid, 'Aleem Miran', 'Aleem Miran', 'Conservative', 'conservative', 753, 28.29, false),
  (:wid, 'Dave West', 'Dave West', 'Reform UK', 'reform-uk', 562, 21.11, false),
  (:wid, 'Nassim Rhaiem', 'Nassim Rhaiem', 'Green Party', 'green', 297, 11.16, false),
  (:wid, 'Ian Hardman', 'Ian Hardman', 'Liberal Democrats', 'liberal-democrats', 111, 4.17, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010810', 'gss', 'Eye, Thorney & Newborough', 1, NULL, 41.6, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Layton Mills', 'Layton Mills', 'Reform UK', 'reform-uk', 1355, 43.53, true),
  (:wid, 'John Peach', 'John Peach', 'Conservative', 'conservative', 1064, 34.18, false),
  (:wid, 'Adam Warr', 'Adam Warr', 'Green Party', 'green', 331, 10.63, false),
  (:wid, 'Sue Farr', 'Sue Farr', 'Labour and Co-operative', 'labour-coop', 230, 7.39, false),
  (:wid, 'Anthony Church', 'Anthony Church', 'Liberal Democrats', 'liberal-democrats', 133, 4.27, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010811', 'gss', 'Fletton & Stanground', 1, NULL, 32.2, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Christian Hogg', 'Christian Hogg', 'Liberal Democrats', 'liberal-democrats', 919, 38.87, true),
  (:wid, 'Maria Pinotes', 'Maria Pinotes', 'Reform UK', 'reform-uk', 874, 36.97, false),
  (:wid, 'Andrew Johnson', 'Andrew Johnson', 'Labour', 'labour', 275, 11.63, false),
  (:wid, 'Neil Seekings', 'Neil Seekings', 'Conservative', 'conservative', 255, 10.79, false),
  (:wid, 'Jon Lloyd', 'Jon Lloyd', 'TUSC', 'trade-unionist-and-socialist-coalition', 41, 1.73, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010812', 'gss', 'Fletton & Woodston', 1, NULL, 34.5, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ed Murphy', 'Ed Murphy', 'Green Party', 'green', 1007, 37.84, true),
  (:wid, 'Yvonne Scarrott', 'Yvonne Scarrott', 'Reform UK', 'reform-uk', 714, 26.83, false),
  (:wid, 'Andy Coles', 'Andy Coles', 'Conservative', 'conservative', 428, 16.08, false),
  (:wid, 'Steve Harknett', 'Steve Harknett', 'Independent', 'independent', 258, 9.7, false),
  (:wid, 'Harvey Woodhouse', 'Harvey Woodhouse', 'Labour', 'labour', 254, 9.55, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010814', 'gss', 'Gunthorpe', 1, NULL, 39.7, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Andrew Bond', 'Andrew Bond', 'Liberal Democrats', 'liberal-democrats', 1230, 45.47, true),
  (:wid, 'Tom Rogers', 'Tom Rogers', 'Reform UK', 'reform-uk', 912, 33.72, false),
  (:wid, 'Andrew MacFarlane', 'Andrew MacFarlane', 'Conservative', 'conservative', 401, 14.82, false),
  (:wid, 'Muhammad Ahmed', 'Muhammad Ahmed', 'Labour', 'labour', 162, 5.99, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010815', 'gss', 'Hampton Vale', 1, NULL, 29.3, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Paul Wiggin', 'Paul Wiggin', 'Liberal Democrats', 'liberal-democrats', 558, 31.51, true),
  (:wid, 'Steve Newson', 'Steve Newson', 'Reform UK', 'reform-uk', 463, 26.14, false),
  (:wid, 'Toqeer Sethi', 'Toqeer Sethi', 'Green Party', 'green', 299, 16.88, false),
  (:wid, 'Marco Cereste', 'Marco Cereste', 'Conservative', 'conservative', 281, 15.87, false),
  (:wid, 'Simon Turp', 'Simon Turp', 'Labour', 'labour', 170, 9.6, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010816', 'gss', 'Hargate & Hempsted', 1, NULL, 29.3, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Vishal Vichare', 'Vishal Vichare', 'Conservative', 'conservative', 674, 29.48, true),
  (:wid, 'Simon Jones', 'Simon Jones', 'Reform UK', 'reform-uk', 652, 28.52, false),
  (:wid, 'Katherine Sharp', 'Katherine Sharp', 'Green Party', 'green', 478, 20.91, false),
  (:wid, 'Hamza Jarral', 'Hamza Jarral', 'Labour', 'labour', 318, 13.91, false),
  (:wid, 'Neil Walton', 'Neil Walton', 'Liberal Democrats', 'liberal-democrats', 164, 7.17, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010817', 'gss', 'North', 1, NULL, 32.6, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Javed Akhtar', 'Javed Akhtar', 'Conservative', 'conservative', 812, 34.79, true),
  (:wid, 'Noreen Bi', 'Noreen Bi', 'Labour and Co-operative', 'labour-coop', 738, 31.62, false),
  (:wid, 'Keith Sharp', 'Keith Sharp', 'Reform UK', 'reform-uk', 421, 18.04, false),
  (:wid, 'Mohammed Munir', 'Mohammed Munir', 'Green Party', 'green', 363, 15.55, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010818', 'gss', 'Orton Longueville', 1, NULL, 33.9, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Philip Whitworth', 'Philip Whitworth', 'Reform UK', 'reform-uk', 775, 30.45, true),
  (:wid, 'Jonathan Orchard', 'Jonathan Orchard', 'Green Party', 'green', 691, 27.15, false),
  (:wid, 'Nick Penniall', 'Nick Penniall', 'Independent', 'independent', 502, 19.72, false),
  (:wid, 'Ruwen Madugalla', 'Ruwen Madugalla', 'Conservative', 'conservative', 322, 12.65, false),
  (:wid, 'Olu Akinyele', 'Olu Akinyele', 'Labour', 'labour', 255, 10.02, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010819', 'gss', 'Orton Waterville', 1, NULL, 42.7, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Alex Bowerbanks', 'Alex Bowerbanks', 'Green Party', 'green', 1187, 37.96, true),
  (:wid, 'Stephen Arnott', 'Stephen Arnott', 'Reform UK', 'reform-uk', 897, 28.69, false),
  (:wid, 'Ray Knight', 'Ray Knight', 'Independent', 'independent', 559, 17.88, false),
  (:wid, 'Sanjaya Dodamgoda', 'Sanjaya Dodamgoda', 'Conservative', 'conservative', 310, 9.91, false),
  (:wid, 'Steve Bailey', 'Steve Bailey', 'Labour', 'labour', 174, 5.56, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010820', 'gss', 'Park', 1, NULL, 39.4, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Murtaza Ahmed-Munir', 'Murtaza Ahmed-Munir', 'Conservative', 'conservative', 1009, 35.21, true),
  (:wid, 'Saif Ali Yasin', 'Saif Ali Yasin', 'Labour', 'labour', 655, 22.85, false),
  (:wid, 'Tassadaq Hussain', 'Tassadaq Hussain', 'Green Party', 'green', 648, 22.61, false),
  (:wid, 'Reza Behravan', 'Reza Behravan', 'Reform UK', 'reform-uk', 315, 10.99, false),
  (:wid, 'Beki Sellick', 'Beki Sellick', 'Liberal Democrats', 'liberal-democrats', 124, 4.33, false),
  (:wid, 'Fiona Radic', 'Fiona Radic', 'Independent', 'independent', 115, 4.01, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010821', 'gss', 'Paston & Walton', 1, NULL, 35.8, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Iva Banyalieva', 'Ivelina Banyalieva', 'Conservative', 'conservative', 1000, 37.82, true),
  (:wid, 'Asif Shaheed', 'Asif Shaheed', 'Liberal Democrats', 'liberal-democrats', 714, 27, false),
  (:wid, 'Ryan Gallagher', 'Ryan Gallagher', 'Reform UK', 'reform-uk', 666, 25.19, false),
  (:wid, 'Mohammed Yasin', 'Mohammed Yasin', 'Labour', 'labour', 186, 7.03, false),
  (:wid, 'Rob Petch', 'Rob Petch', 'Your Party (UK)', 'your-party', 78, 2.95, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010823', 'gss', 'Stanground South', 1, NULL, 30.5, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Peter Reeve', 'Peter Reeve', 'Reform UK', 'reform-uk', 902, 38.32, true),
  (:wid, 'June Bull', 'June Bull', 'Peterborough First', 'peterborough-first', 450, 19.12, false),
  (:wid, 'Janet Brown', 'Janet Brown', 'Conservative', 'conservative', 325, 13.81, false),
  (:wid, 'Charles Coster', 'Charles Coster', 'Green Party', 'green', 291, 12.36, false),
  (:wid, 'Andrew Deacon', 'Andrew Deacon', 'Labour', 'labour', 229, 9.73, false),
  (:wid, 'Julian Bray', 'Julian Bray', 'Independent', 'independent', 80, 3.4, false),
  (:wid, 'Miriam Sellick', 'Miriam Sellick', 'Liberal Democrats', 'liberal-democrats', 77, 3.27, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010824', 'gss', 'Werrington', 1, NULL, 40.7, NULL, 'https://en.wikipedia.org/wiki/2026_Peterborough_City_Council_election') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Sarah Hillier', 'Sarah Hillier', 'Peterborough First', 'peterborough-first', 1448, 46.94, true),
  (:wid, 'Chris Watson', 'Chris Watson', 'Reform UK', 'reform-uk', 979, 31.73, false),
  (:wid, 'Ruta Dalton', 'Ruta Dalton', 'Conservative', 'conservative', 393, 12.74, false),
  (:wid, 'Bradley Dilloway', 'Bradley Dilloway', 'Labour', 'labour', 265, 8.59, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E05010822', 'gss', 'Ravensthorpe', 1, 7593, 39.6, 12, 'https://www.peterborough.gov.uk/asset-library/peterborough-local-elections-2026-declaration-of-results-of-poll-18-city-council-wards-and-one-parish.pdf') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'ALI, Shokat', 'Shokat Ali', 'Green Party', 'green', 699, 23.35, false),
  (:wid, 'CLEMENTS, Matthew Roger', 'Matthew Roger Clements', 'Labour Party', 'labour', 329, 10.99, false),
  (:wid, 'NAWAZ, Gul', 'Gul Nawaz', 'The Conservative Party Candidate', 'conservative', 1214, 40.55, true),
  (:wid, 'PHILIP, Ashli Susan', 'Ashli Susan Philip', 'Reform UK', 'reform-uk', 638, 21.31, false),
  (:wid, 'SANDFORD, James Nicholas', 'James Nicholas Sandford', 'Liberal Democrat', 'liberal-democrats', 114, 3.81, false);

DO $$ DECLARE e int; w int; c int; BEGIN
  SELECT count(*) INTO e FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E06000031', '2026-05-07'::date));
  SELECT count(*) INTO w FROM public.council_election_wards x JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E06000031', '2026-05-07'::date));
  SELECT count(*) INTO c FROM public.council_election_candidates k JOIN public.council_election_wards x ON x.id = k.ward_id JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E06000031', '2026-05-07'::date));
  IF e <> 1 OR w <> 18 OR c <> 92 THEN RAISE EXCEPTION 'expected 1 elections, 18 wards, 92 candidates; found %, %, %', e, w, c; END IF; END $$;
SELECT y.council_gss_code, y.election_date, y.wards_contested, y.seats_contested, count(k.*) AS candidates FROM public.council_elections y JOIN public.council_election_wards x ON x.election_id = y.id JOIN public.council_election_candidates k ON k.ward_id = x.id WHERE (y.council_gss_code, y.election_date) IN (('E06000031', '2026-05-07'::date)) GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

COMMIT;
