-- Guarded load: Surrey County Council 2021-05-06
-- written by scripts/import-council-election-results.js --sql from Claude outputs/council-results-2021/election-results-2021.csv
-- 1 elections, 81 wards, 331 candidates; party_names rows used: 20 (old rows kept in public.party_names_backup_20261019b)
\set ON_ERROR_STOP on
BEGIN;

DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E10000030', '2021-05-06'::date));
  IF n <> 0 THEN RAISE EXCEPTION 'already loaded: % of these elections', n; END IF; END $$;

CREATE TABLE public.party_names_backup_20261019b AS SELECT *, now() AS saved_at FROM public.party_names WHERE published_name IN ('Ashtead Independents', 'Conservative', 'Dittons and Weston Green Residents', 'Green Party', 'Guildford Greenbelt Group', 'Heritage Party', 'Independent', 'Independent Farnham Residents', 'Labour', 'Liberal Democrats', 'Molesey Residents Association', 'Nork and Tattenhams Residents Associations', 'Peace Party', 'Reform UK', 'Residents Associations of Epsom and Ewell', 'Residents for Guildford and Villages', 'Runnymede Independent Residents Group', 'TUSC', 'UKIP', 'Workers Party of Britain');
ALTER TABLE public.party_names_backup_20261019b ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_names_backup_20261019b FROM anon, authenticated;
INSERT INTO public.party_names (published_name, party_id, party_name, parties_slug) VALUES
  ('Ashtead Independents', 'ashtead-independents', 'Ashtead Independents', NULL),
  ('Conservative', 'conservative', 'Conservative and Unionist Party', 'conservative'),
  ('Dittons and Weston Green Residents', 'thames-ditton-weston-green-residents-association', 'Thames Ditton / Weston Green Residents'' Association', NULL),
  ('Green Party', 'green', 'Green Party', 'green'),
  ('Guildford Greenbelt Group', 'guildford-greenbelt-group', 'Guildford Greenbelt Group', NULL),
  ('Heritage Party', 'heritage-party', 'Heritage Party', NULL),
  ('Independent', 'independent', 'Independent', 'independent'),
  ('Independent Farnham Residents', 'independent-farnham-residents', 'Independent Farnham Residents', NULL),
  ('Labour', 'labour', 'Labour Party', 'labour'),
  ('Liberal Democrats', 'liberal-democrats', 'Liberal Democrats', 'liberal-democrats'),
  ('Molesey Residents Association', 'the-molesey-residents-association', 'The Molesey Residents Association', NULL),
  ('Nork and Tattenhams Residents Associations', 'nork-and-tattenhams-residents-associations', 'Nork Residents'' Association and Tattenham & Preston Residents (joint description)', NULL),
  ('Peace Party', 'peace-party', 'Peace Party', NULL),
  ('Reform UK', 'reform-uk', 'Reform UK', 'reform-uk'),
  ('Residents Associations of Epsom and Ewell', 'residents-associations-of-epsom-and-ewell', 'Residents Associations of Epsom and Ewell', NULL),
  ('Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 'Residents for Guildford and Villages', NULL),
  ('Runnymede Independent Residents Group', 'runnymede-independent-residents-group', 'Runnymede Independent Residents'' Group', NULL),
  ('TUSC', 'trade-unionist-and-socialist-coalition', 'Trade Unionist and Socialist Coalition', NULL),
  ('UKIP', 'uk-independence-party-ukip', 'UK Independence Party (UKIP)', NULL),
  ('Workers Party of Britain', 'workers-party-of-britain', 'Workers Party of Britain', NULL)
ON CONFLICT (published_name) DO UPDATE SET party_id = EXCLUDED.party_id, party_name = EXCLUDED.party_name, parties_slug = EXCLUDED.parties_slug;

INSERT INTO public.council_elections (council_gss_code, election_date, wards_contested, seats_contested, turnout_pct, source_note) VALUES ('E10000030', '2021-05-06', 81, 81, NULL, 'Local Elections Archive Project (Andrew Teale), CC BY-SA 3.0') RETURNING id AS eid \gset
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001528', 'gss', 'Walton', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12243/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Rachael Lake', 'Rachael Lake', 'Conservative', 'conservative', 2012, 48.12, true),
  (:wid, 'Damien Nolan', 'Damien Nolan', 'Liberal Democrats', 'liberal-democrats', 1446, 34.59, false),
  (:wid, 'Peter Ashurst', 'Peter Ashurst', 'Labour', 'labour', 723, 17.29, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001460', 'gss', 'Addlestone', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12278/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'John Furey', 'John Furey', 'Conservative', 'conservative', 1777, 50.1, true),
  (:wid, 'Michael Scott', 'Michael Scott', 'Labour', 'labour', 674, 19, false),
  (:wid, 'Christopher John', 'Christopher John', 'Green Party', 'green', 505, 14.24, false),
  (:wid, 'Rudi Dikty-Daudiyan', 'Rudi Dikty-Daudiyan', 'Liberal Democrats', 'liberal-democrats', 289, 8.15, false),
  (:wid, 'Tommy Traylen', 'Tommy Traylen', 'Independent', 'independent', 224, 6.32, false),
  (:wid, 'Lisa Allen', 'Lisa Allen', 'TUSC', 'trade-unionist-and-socialist-coalition', 78, 2.2, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001464', 'gss', 'Bagshot, Windlesham and Chobham', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12291/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Richard Tear', 'Richard Tear', 'Conservative', 'conservative', 1633, 36.5, true),
  (:wid, 'Victoria Wheeler', 'Victoria Wheeler', 'Independent', 'independent', 1326, 29.64, false),
  (:wid, 'Richard Wilson', 'Richard Wilson', 'Liberal Democrats', 'liberal-democrats', 1087, 24.3, false),
  (:wid, 'Jonathan Quin', 'Jonathan Quin', 'Labour', 'labour', 298, 6.66, false),
  (:wid, 'Samantha Goggin', 'Samantha Goggin', 'Reform UK', 'reform-uk', 130, 2.91, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001465', 'gss', 'Banstead, Woodmansterne and Chipstead', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12268/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Luke Bennett', 'Luke Bennett', 'Conservative', 'conservative', 2811, 68.78, true),
  (:wid, 'Ian Thirlwall', 'Ian Thirlwall', 'Labour', 'labour', 655, 16.03, false),
  (:wid, 'Mark Johnston', 'Mark Johnston', 'Liberal Democrats', 'liberal-democrats', 621, 15.19, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001466', 'gss', 'Bookham and Fetcham West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12263/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Clare Curran', 'Clare Curran', 'Conservative', 'conservative', 2907, 47.81, true),
  (:wid, 'Raj Haque', 'Raj Haque', 'Liberal Democrats', 'liberal-democrats', 2603, 42.81, false),
  (:wid, 'John Roche', 'John Roche', 'Green Party', 'green', 316, 5.2, false),
  (:wid, 'Laurence Nasskau', 'Laurence Nasskau', 'Labour', 'labour', 173, 2.85, false),
  (:wid, 'Terry Moody', 'Terry Moody', 'Reform UK', 'reform-uk', 81, 1.33, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001467', 'gss', 'Camberley East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12292/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Trefor Hogg', 'Trefor Hogg', 'Conservative', 'conservative', 2015, 56.89, true),
  (:wid, 'Sashi Mylvaganam', 'Sashi Mylvaganam', 'Liberal Democrats', 'liberal-democrats', 959, 27.08, false),
  (:wid, 'Rodney Bates', 'Rodney Bates', 'Labour', 'labour', 568, 16.04, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001468', 'gss', 'Camberley West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12293/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'David Lewis', 'David Lewis', 'Conservative', 'conservative', 1860, 49.18, true),
  (:wid, 'Alan Ashbery', 'Alan Ashbery', 'Liberal Democrats', 'liberal-democrats', 1243, 32.87, false),
  (:wid, 'Murray Rowlands', 'Murray Rowlands', 'Labour', 'labour', 593, 15.68, false),
  (:wid, 'Venura Ilangamudalige', 'Venura Ilangamudalige', 'Workers Party of Britain', 'workers-party-of-britain', 86, 2.27, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001470', 'gss', 'Caterham Valley', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12298/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jeffrey Gray', 'Jeffrey Gray', 'Liberal Democrats', 'liberal-democrats', 1751, 47.48, true),
  (:wid, 'Michael Cooper', 'Michael Cooper', 'Conservative', 'conservative', 1348, 36.55, false),
  (:wid, 'Caz Lessey', 'Caz Lessey', 'Labour', 'labour', 388, 10.52, false),
  (:wid, 'Jeffrey Bolter', 'Jeffrey Bolter', 'Independent', 'independent', 201, 5.45, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001471', 'gss', 'Chertsey', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12279/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Mark Nuti', 'Mark Nuti', 'Conservative', 'conservative', 2105, 60.4, true),
  (:wid, 'Philip Martin', 'Philip Martin', 'Labour', 'labour', 739, 21.21, false),
  (:wid, 'Sylvia Whyte', 'Sylvia Whyte', 'Liberal Democrats', 'liberal-democrats', 641, 18.39, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001472', 'gss', 'Cobham', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12238/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'David Lewis', 'David Lewis', 'Conservative', 'conservative', 2601, 65.57, true),
  (:wid, 'David Bellchamber', 'David Bellchamber', 'Liberal Democrats', 'liberal-democrats', 1087, 27.4, false),
  (:wid, 'Irene Threlkeld', 'Irene Threlkeld', 'Labour', 'labour', 279, 7.03, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001473', 'gss', 'Cranleigh and Ewhurst', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12303/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Liz Townsend', 'Liz Townsend', 'Liberal Democrats', 'liberal-democrats', 2318, 46.53, true),
  (:wid, 'Andrew Povey', 'Andrew Povey', 'Conservative', 'conservative', 2198, 44.12, false),
  (:wid, 'Callum Gordon', 'Callum Gordon', 'Labour', 'labour', 330, 6.62, false),
  (:wid, 'Dennis McLaren', 'Dennis McLaren', 'UKIP', 'uk-independence-party-ukip', 136, 2.73, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001474', 'gss', 'Dorking Hills', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12264/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Hazel Watson', 'Hazel Watson', 'Liberal Democrats', 'liberal-democrats', 2989, 58.6, true),
  (:wid, 'Gavin Musgrave', 'Gavin Musgrave', 'Conservative', 'conservative', 1510, 29.6, false),
  (:wid, 'Chris Crook', 'Chris Crook', 'Green Party', 'green', 414, 8.12, false),
  (:wid, 'Samuel Cockle-Hearne', 'Samuel Cockle-Hearne', 'Labour', 'labour', 188, 3.69, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001476', 'gss', 'Dorking South and the Holmwoods', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12266/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Stephen Cooksey', 'Stephen Cooksey', 'Liberal Democrats', 'liberal-democrats', 2406, 54.73, true),
  (:wid, 'Roger Jones', 'Roger Jones', 'Conservative', 'conservative', 1282, 29.16, false),
  (:wid, 'Hayley Baines-Buffery', 'Hayley Baines-Buffery', 'Green Party', 'green', 427, 9.71, false),
  (:wid, 'Kev Stroud', 'Kev Stroud', 'Labour', 'labour', 281, 6.39, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001478', 'gss', 'East Molesey and Esher', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12239/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Steve Bax', 'Steve Bax', 'Conservative', 'conservative', 2520, 54.18, true),
  (:wid, 'Bruce McDonald', 'Bruce McDonald', 'Liberal Democrats', 'liberal-democrats', 1429, 30.72, false),
  (:wid, 'Laura Harmour', 'Laura Harmour', 'Green Party', 'green', 472, 10.15, false),
  (:wid, 'Richard Bennett', 'Richard Bennett', 'Labour', 'labour', 230, 4.95, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001479', 'gss', 'Egham', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12280/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Robert King', 'Robert King', 'Labour', 'labour', 1101, 39.34, true),
  (:wid, 'Nick Prescot', 'Nick Prescot', 'Conservative', 'conservative', 1007, 35.98, false),
  (:wid, 'Mike Kusneraitis', 'Mike Kusneraitis', 'Independent', 'independent', 461, 16.47, false),
  (:wid, 'Ian Heath', 'Ian Heath', 'Liberal Democrats', 'liberal-democrats', 230, 8.22, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001480', 'gss', 'Englefield Green', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12281/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Marisa Heath', 'Marisa Heath', 'Conservative', 'conservative', 1171, 35.96, true),
  (:wid, 'Isabel Mullens', 'Isabel Mullens', 'Runnymede Independent Residents Group', 'runnymede-independent-residents-group', 1027, 31.54, false),
  (:wid, 'Dominic Breen', 'Dominic Breen', 'Labour', 'labour', 580, 17.81, false),
  (:wid, 'Maciej Pawlik', 'Maciej Pawlik', 'Green Party', 'green', 319, 9.8, false),
  (:wid, 'Blake Kwong', 'Blake Kwong', 'Liberal Democrats', 'liberal-democrats', 159, 4.88, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001481', 'gss', 'Epsom Town and Downs', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12247/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Steven McCormick', 'Steven McCormick', 'Residents Associations of Epsom and Ewell', 'residents-associations-of-epsom-and-ewell', 1436, 28.74, true),
  (:wid, 'Emma Ware', 'Emma Ware', 'Conservative', 'conservative', 1427, 28.56, false),
  (:wid, 'Julie Morris', 'Julie Morris', 'Liberal Democrats', 'liberal-democrats', 1304, 26.1, false),
  (:wid, 'Sarah Kenyon', 'Sarah Kenyon', 'Labour', 'labour', 494, 9.89, false),
  (:wid, 'Janice Baker', 'Janice Baker', 'Green Party', 'green', 319, 6.38, false),
  (:wid, 'Kier Kirby', 'Kier Kirby', 'Workers Party of Britain', 'workers-party-of-britain', 17, 0.34, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001482', 'gss', 'Epsom West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12248/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Bernie Muir', 'Bernie Muir', 'Conservative', 'conservative', 1518, 32.77, true),
  (:wid, 'Mark Todd', 'Mark Todd', 'Labour', 'labour', 1172, 25.3, false),
  (:wid, 'Neil Dallen', 'Neil Dallen', 'Residents Associations of Epsom and Ewell', 'residents-associations-of-epsom-and-ewell', 1029, 22.22, false),
  (:wid, 'Steve Gee', 'Steve Gee', 'Liberal Democrats', 'liberal-democrats', 913, 19.71, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001484', 'gss', 'Ewell', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12249/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'John Beckett', 'John Beckett', 'Residents Associations of Epsom and Ewell', 'residents-associations-of-epsom-and-ewell', 2699, 62.13, true),
  (:wid, 'Jamie Abrahams', 'Jamie Abrahams', 'Conservative', 'conservative', 797, 18.35, false),
  (:wid, 'Jason Anderson', 'Jason Anderson', 'Labour', 'labour', 407, 9.37, false),
  (:wid, 'David Gulland', 'David Gulland', 'Liberal Democrats', 'liberal-democrats', 241, 5.55, false),
  (:wid, 'Steve McDonald', 'Steve McDonald', 'Green Party', 'green', 200, 4.6, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001483', 'gss', 'Ewell Court, Auriol and Cuddington', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12250/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Eber Kington', 'Eber Kington', 'Residents Associations of Epsom and Ewell', 'residents-associations-of-epsom-and-ewell', 2974, 66.43, true),
  (:wid, 'George Bushati', 'George Bushati', 'Conservative', 'conservative', 629, 14.05, false),
  (:wid, 'Amos Sibanda', 'Amos Sibanda', 'Labour', 'labour', 311, 6.95, false),
  (:wid, 'Dan Brown', 'Dan Brown', 'Liberal Democrats', 'liberal-democrats', 297, 6.63, false),
  (:wid, 'Sarah Clayton', 'Sarah Clayton', 'Green Party', 'green', 266, 5.94, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001485', 'gss', 'Farnham Central', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12304/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Andy MacLeod', 'Andy MacLeod', 'Independent Farnham Residents', 'independent-farnham-residents', 2782, 67.34, true),
  (:wid, 'Aly Fitch', 'Aly Fitch', 'Conservative', 'conservative', 929, 22.49, false),
  (:wid, 'John Gaskell', 'John Gaskell', 'Labour', 'labour', 420, 10.17, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001486', 'gss', 'Farnham North', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12305/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Catherine Powell', 'Catherine Powell', 'Independent Farnham Residents', 'independent-farnham-residents', 2107, 55.8, true),
  (:wid, 'Nabeel Nasir', 'Nabeel Nasir', 'Conservative', 'conservative', 719, 19.04, false),
  (:wid, 'Mark Merryweather', 'Mark Merryweather', 'Liberal Democrats', 'liberal-democrats', 589, 15.6, false),
  (:wid, 'Howard Kaye', 'Howard Kaye', 'Labour', 'labour', 361, 9.56, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001487', 'gss', 'Farnham South', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12306/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Michaela Martin', 'Michaela Martin', 'Independent Farnham Residents', 'independent-farnham-residents', 1659, 40.49, true),
  (:wid, 'Simon Foale', 'Simon Foale', 'Conservative', 'conservative', 1497, 36.54, false),
  (:wid, 'Mark Westcott', 'Mark Westcott', 'Independent', 'independent', 492, 12.01, false),
  (:wid, 'Rebecca Birchwood', 'Rebecca Birchwood', 'Labour', 'labour', 449, 10.96, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001488', 'gss', 'Foxhills, Thorpe and Virginia Water', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12282/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jonathan Hulley', 'Jonathan Hulley', 'Conservative', 'conservative', 2098, 49.28, true),
  (:wid, 'Malcolm Cressey', 'Malcolm Cressey', 'Independent', 'independent', 1098, 25.79, false),
  (:wid, 'Donald Whyte', 'Donald Whyte', 'Liberal Democrats', 'liberal-democrats', 645, 15.15, false),
  (:wid, 'Karen McKinlay-Gunn', 'Karen McKinlay-Gunn', 'Labour', 'labour', 416, 9.77, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001489', 'gss', 'Frimley Green and Mytchett', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12294/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Paul Deach', 'Paul Deach', 'Conservative', 'conservative', 2520, 61.66, true),
  (:wid, 'Jacques Olmo', 'Jacques Olmo', 'Liberal Democrats', 'liberal-democrats', 1276, 31.22, false),
  (:wid, 'Christine Richards', 'Christine Richards', 'Labour', 'labour', 291, 7.12, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001490', 'gss', 'Godalming North', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12307/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Penny Rivers', 'Penny Rivers', 'Liberal Democrats', 'liberal-democrats', 3047, 59.62, true),
  (:wid, 'Frank Young', 'Frank Young', 'Conservative', 'conservative', 1530, 29.94, false),
  (:wid, 'Toby Westcott-White', 'Toby Westcott-White', 'Labour', 'labour', 534, 10.45, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001492', 'gss', 'Godstone', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12299/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Chris Farr', 'Chris Farr', 'Independent', 'independent', 1522, 39.23, true),
  (:wid, 'Eithne Webster', 'Eithne Webster', 'Conservative', 'conservative', 1312, 33.81, false),
  (:wid, 'Martin Redman', 'Martin Redman', 'Liberal Democrats', 'liberal-democrats', 412, 10.62, false),
  (:wid, 'Sarah Finch', 'Sarah Finch', 'Green Party', 'green', 382, 9.85, false),
  (:wid, 'Linda Baharier', 'Linda Baharier', 'Labour', 'labour', 252, 6.49, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001494', 'gss', 'Guildford East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12253/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'George Potter', 'George Potter', 'Liberal Democrats', 'liberal-democrats', 1503, 32.27, true),
  (:wid, 'Liz Hyland', 'Liz Hyland', 'Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 1421, 30.51, false),
  (:wid, 'Philip Brooker', 'Philip Brooker', 'Conservative', 'conservative', 1328, 28.52, false),
  (:wid, 'Sue Hackman', 'Sue Hackman', 'Labour', 'labour', 405, 8.7, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001496', 'gss', 'Guildford South East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12255/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Fiona Davidson', 'Fiona Davidson', 'Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 1749, 37.7, true),
  (:wid, 'Mark Brett-Warburton', 'Mark Brett-Warburton', 'Conservative', 'conservative', 1432, 30.87, false),
  (:wid, 'Cengiz Harwood', 'Cengiz Harwood', 'Liberal Democrats', 'liberal-democrats', 1077, 23.22, false),
  (:wid, 'Joseph Dewar', 'Joseph Dewar', 'Labour', 'labour', 381, 8.21, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001497', 'gss', 'Guildford South West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12256/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Angela Goodwin', 'Angela Goodwin', 'Liberal Democrats', 'liberal-democrats', 2009, 47.16, true),
  (:wid, 'Sallie Barker', 'Sallie Barker', 'Conservative', 'conservative', 852, 20, false),
  (:wid, 'Lucy Connor', 'Lucy Connor', 'Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 819, 19.23, false),
  (:wid, 'Jacob Allen', 'Jacob Allen', 'Labour', 'labour', 580, 13.62, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001498', 'gss', 'Guildford West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12257/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Fiona White', 'Fiona White', 'Liberal Democrats', 'liberal-democrats', 1020, 42.62, true),
  (:wid, 'Dorothy Chalklin', 'Dorothy Chalklin', 'Conservative', 'conservative', 656, 27.41, false),
  (:wid, 'Brian Creese', 'Brian Creese', 'Labour', 'labour', 577, 24.11, false),
  (:wid, 'John Morris', 'John Morris', 'Peace Party', 'peace-party', 140, 5.85, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001499', 'gss', 'Haslemere', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12309/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'John Robini', 'John Robini', 'Liberal Democrats', 'liberal-democrats', 2038, 50, true),
  (:wid, 'Ged Hall', 'Ged Hall', 'Conservative', 'conservative', 1751, 42.96, false),
  (:wid, 'David Irwin', 'David Irwin', 'Labour', 'labour', 287, 7.04, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001500', 'gss', 'Heatherside and Parkside', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12295/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Edward Hawkins', 'Edward Hawkins', 'Conservative', 'conservative', 2073, 48.56, true),
  (:wid, 'Nirmal Singh Kang', 'Nirmal Singh Kang', 'Liberal Democrats', 'liberal-democrats', 1900, 44.51, false),
  (:wid, 'Mick Sheehan', 'Mick Sheehan', 'Labour', 'labour', 194, 4.54, false),
  (:wid, 'Hazel Prowse', 'Hazel Prowse', 'UKIP', 'uk-independence-party-ukip', 102, 2.39, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001501', 'gss', 'Hersham', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12240/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'John O''Reilly', 'John O''Reilly', 'Conservative', 'conservative', 2424, 58.99, true),
  (:wid, 'Chester Chandler', 'Chester Chandler', 'Liberal Democrats', 'liberal-democrats', 1115, 27.14, false),
  (:wid, 'Jeremy Brown', 'Jeremy Brown', 'Labour', 'labour', 570, 13.87, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001502', 'gss', 'Hinchley Wood, Claygate and Oxshott', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12241/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Mark Sugden', 'Mark Sugden', 'Conservative', 'conservative', 2760, 46.94, true),
  (:wid, 'Sue Grose', 'Sue Grose', 'Liberal Democrats', 'liberal-democrats', 2607, 44.34, false),
  (:wid, 'Mike Bennison', 'Mike Bennison', 'Reform UK', 'reform-uk', 259, 4.4, false),
  (:wid, 'Frederick Green', 'Frederick Green', 'Labour', 'labour', 254, 4.32, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001503', 'gss', 'Horley East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12270/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jordan Beech', 'Jordan Beech', 'Conservative', 'conservative', 2034, 56.97, true),
  (:wid, 'Tom Turner', 'Tom Turner', 'Labour', 'labour', 820, 22.97, false),
  (:wid, 'Shasha Khan', 'Shasha Khan', 'Green Party', 'green', 716, 20.06, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001504', 'gss', 'Horley West, Salfords and Sidlow', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12271/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Andy Lynch', 'Andy Lynch', 'Conservative', 'conservative', 2281, 65.81, true),
  (:wid, 'Lynnette Easterbrook', 'Lynnette Easterbrook', 'Labour', 'labour', 1185, 34.19, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001505', 'gss', 'Horsleys', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12258/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Colin Cross', 'Colin Cross', 'Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 2214, 47.78, true),
  (:wid, 'Julie Iles', 'Julie Iles', 'Conservative', 'conservative', 1735, 37.44, false),
  (:wid, 'Elizabeth Daly', 'Elizabeth Daly', 'Liberal Democrats', 'liberal-democrats', 536, 11.57, false),
  (:wid, 'Peter Horitz', 'Peter Horitz', 'Labour', 'labour', 149, 3.22, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001506', 'gss', 'Knaphill and Goldsworth West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12313/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Saj Hussain', 'Saj Hussain', 'Conservative', 'conservative', 2101, 46.96, true),
  (:wid, 'Hassan Akberali', 'Hassan Akberali', 'Independent', 'independent', 988, 22.08, false),
  (:wid, 'Ann-Marie Barker', 'Ann-Marie Barker', 'Liberal Democrats', 'liberal-democrats', 935, 20.9, false),
  (:wid, 'Gerry Mitchell', 'Gerry Mitchell', 'Labour', 'labour', 363, 8.11, false),
  (:wid, 'Damien Heads', 'Damien Heads', 'Heritage Party', 'heritage-party', 50, 1.12, false),
  (:wid, 'Nathan Holmes', 'Nathan Holmes', 'TUSC', 'trade-unionist-and-socialist-coalition', 37, 0.83, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001507', 'gss', 'Laleham and Shepperton', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12285/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Maureen Attewell', 'Maureen Attewell', 'Conservative', 'conservative', 2477, 59.87, true),
  (:wid, 'Paul Hollingworth', 'Paul Hollingworth', 'Green Party', 'green', 752, 18.18, false),
  (:wid, 'Jon Button', 'Jon Button', 'Labour', 'labour', 473, 11.43, false),
  (:wid, 'Sandra Dunn', 'Sandra Dunn', 'Liberal Democrats', 'liberal-democrats', 398, 9.62, false),
  (:wid, 'Helen Couchman', 'Helen Couchman', 'TUSC', 'trade-unionist-and-socialist-coalition', 37, 0.89, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001508', 'gss', 'Leatherhead and Fetcham East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12267/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Tim Hall', 'Tim Hall', 'Conservative', 'conservative', 2633, 53.94, true),
  (:wid, 'Jane de Silva', 'Jane de Silva', 'Liberal Democrats', 'liberal-democrats', 1315, 26.94, false),
  (:wid, 'Ann Clark', 'Ann Clark', 'Labour', 'labour', 490, 10.04, false),
  (:wid, 'Tracey Harwood', 'Tracey Harwood', 'Green Party', 'green', 443, 9.08, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001509', 'gss', 'Lightwater, West End and Bisley', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12296/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Rebecca Jennings-Evans', 'Rebecca Jennings-Evans', 'Conservative', 'conservative', 1938, 43.78, true),
  (:wid, 'Liz Noble', 'Liz Noble', 'Liberal Democrats', 'liberal-democrats', 1416, 31.99, false),
  (:wid, 'Sharon Galliford', 'Sharon Galliford', 'Green Party', 'green', 386, 8.72, false),
  (:wid, 'Graham Alleway', 'Graham Alleway', 'Independent', 'independent', 364, 8.22, false),
  (:wid, 'Richard Claridge', 'Richard Claridge', 'Labour', 'labour', 222, 5.01, false),
  (:wid, 'Peter Appleford', 'Peter Appleford', 'Reform UK', 'reform-uk', 81, 1.83, false),
  (:wid, 'Katherine Parker', 'Katherine Parker', 'TUSC', 'trade-unionist-and-socialist-coalition', 20, 0.45, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001511', 'gss', 'Lingfield', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12300/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Lesley Steeds', 'Lesley Steeds', 'Conservative', 'conservative', 2352, 49.17, true),
  (:wid, 'Liz Lockwood', 'Liz Lockwood', 'Independent', 'independent', 1168, 24.42, false),
  (:wid, 'Becky Peterson', 'Becky Peterson', 'Green Party', 'green', 461, 9.64, false),
  (:wid, 'Dave Wilkes', 'Dave Wilkes', 'Liberal Democrats', 'liberal-democrats', 382, 7.99, false),
  (:wid, 'Andrea Moss', 'Andrea Moss', 'Labour', 'labour', 315, 6.59, false),
  (:wid, 'Julia Searle', 'Julia Searle', 'UKIP', 'uk-independence-party-ukip', 105, 2.2, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001512', 'gss', 'Lower Sunbury and Halliford', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12286/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Buddhi Weerasinghe', 'Buddhi Weerasinghe', 'Conservative', 'conservative', 1691, 40.51, true),
  (:wid, 'Lawrence Nichols', 'Lawrence Nichols', 'Liberal Democrats', 'liberal-democrats', 1661, 39.79, false),
  (:wid, 'Chris Hyde', 'Chris Hyde', 'Green Party', 'green', 434, 10.4, false),
  (:wid, 'Sean Beatty', 'Sean Beatty', 'Labour', 'labour', 388, 9.3, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001513', 'gss', 'Merstham and Banstead South', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12272/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Frank Kelly', 'Frank Kelly', 'Conservative', 'conservative', 2052, 56.73, true),
  (:wid, 'Shaka Aklilu', 'Shaka Aklilu', 'Labour', 'labour', 752, 20.79, false),
  (:wid, 'Jemma de Vincenzo', 'Jemma de Vincenzo', 'Liberal Democrats', 'liberal-democrats', 414, 11.45, false),
  (:wid, 'Kumari Lane', 'Kumari Lane', 'Green Party', 'green', 399, 11.03, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001514', 'gss', 'Nork and Tattenhams', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12273/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Nick Harrison', 'Nick Harrison', 'Nork and Tattenhams Residents Associations', 'nork-and-tattenhams-residents-associations', 2763, 63.78, true),
  (:wid, 'Ohis Ilalokhoin', 'Ohis Ilalokhoin', 'Conservative', 'conservative', 908, 20.96, false),
  (:wid, 'Ros Godson', 'Ros Godson', 'Labour', 'labour', 302, 6.97, false),
  (:wid, 'Alistair Morten', 'Alistair Morten', 'Green Party', 'green', 197, 4.55, false),
  (:wid, 'Andrew Knights', 'Andrew Knights', 'Liberal Democrats', 'liberal-democrats', 162, 3.74, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001515', 'gss', 'Oxted', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12301/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Cameron McIntosh', 'Cameron McIntosh', 'Conservative', 'conservative', 2907, 51.66, true),
  (:wid, 'Christopher Dean', 'Christopher Dean', 'Independent', 'independent', 1106, 19.66, false),
  (:wid, 'Samuel Kerr', 'Samuel Kerr', 'Labour', 'labour', 976, 17.34, false),
  (:wid, 'Perry Chotai', 'Perry Chotai', 'Liberal Democrats', 'liberal-democrats', 638, 11.34, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001516', 'gss', 'Redhill East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12274/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jonathan Essex', 'Jonathan Essex', 'Green Party', 'green', 2622, 65.27, true),
  (:wid, 'Adam Lehodey', 'Adam Lehodey', 'Conservative', 'conservative', 844, 21.01, false),
  (:wid, 'Mick Hay', 'Mick Hay', 'Labour', 'labour', 407, 10.13, false),
  (:wid, 'Peter Lambell', 'Peter Lambell', 'Liberal Democrats', 'liberal-democrats', 144, 3.58, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001517', 'gss', 'Redhill West and Meadvale', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12275/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Natalie Bramhall', 'Natalie Bramhall', 'Conservative', 'conservative', 1726, 43.43, true),
  (:wid, 'Steve Kulka', 'Steve Kulka', 'Liberal Democrats', 'liberal-democrats', 1309, 32.94, false),
  (:wid, 'Mark Smith', 'Mark Smith', 'Labour', 'labour', 829, 20.86, false),
  (:wid, 'Alastair Richardson', 'Alastair Richardson', 'UKIP', 'uk-independence-party-ukip', 110, 2.77, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001518', 'gss', 'Reigate', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12276/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Victor Lewanski', 'Victor Lewanski', 'Conservative', 'conservative', 2146, 46.14, true),
  (:wid, 'John Vincent', 'John Vincent', 'Liberal Democrats', 'liberal-democrats', 1101, 23.67, false),
  (:wid, 'Paul Chandler', 'Paul Chandler', 'Green Party', 'green', 948, 20.38, false),
  (:wid, 'Tony Robinson', 'Tony Robinson', 'Labour', 'labour', 456, 9.8, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001519', 'gss', 'Shalford', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12259/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Matt Furniss', 'Matt Furniss', 'Conservative', 'conservative', 2408, 55.97, true),
  (:wid, 'Cecilia Taylor', 'Cecilia Taylor', 'Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 1015, 23.59, false),
  (:wid, 'Philip Buckley', 'Philip Buckley', 'Liberal Democrats', 'liberal-democrats', 529, 12.3, false),
  (:wid, 'Susannah Patrick', 'Susannah Patrick', 'Labour', 'labour', 350, 8.14, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001520', 'gss', 'Shere', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12260/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Bob Hughes', 'Bob Hughes', 'Conservative', 'conservative', 1618, 37.23, true),
  (:wid, 'Julia Osborn', 'Julia Osborn', 'Guildford Greenbelt Group', 'guildford-greenbelt-group', 1540, 35.43, false),
  (:wid, 'Sam Peters', 'Sam Peters', 'Green Party', 'green', 862, 19.83, false),
  (:wid, 'John Marsh', 'John Marsh', 'Labour', 'labour', 326, 7.5, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001521', 'gss', 'Staines', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12287/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Sinead Mooney', 'Sinead Mooney', 'Conservative', 'conservative', 1387, 33.01, true),
  (:wid, 'Denise Saliagopoulos', 'Denise Saliagopoulos', 'Independent', 'independent', 1107, 26.34, false),
  (:wid, 'Tom Lagden', 'Tom Lagden', 'Green Party', 'green', 970, 23.08, false),
  (:wid, 'Daisy Gill', 'Daisy Gill', 'Labour', 'labour', 738, 17.56, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001522', 'gss', 'Staines South and Ashford West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12288/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Denise Turner-Stewart', 'Denise Turner-Stewart', 'Conservative', 'conservative', 1866, 50.12, true),
  (:wid, 'Chris Bateson', 'Chris Bateson', 'Liberal Democrats', 'liberal-democrats', 1238, 33.25, false),
  (:wid, 'Tim Lobanov', 'Tim Lobanov', 'Labour', 'labour', 536, 14.4, false),
  (:wid, 'Sue Bryer', 'Sue Bryer', 'TUSC', 'trade-unionist-and-socialist-coalition', 83, 2.23, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001523', 'gss', 'Stanwell and Stanwell Moor', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12289/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Robert Evans', 'Robert Evans', 'Labour', 'labour', 1434, 46.26, true),
  (:wid, 'Jim McIlroy', 'Jim McIlroy', 'Conservative', 'conservative', 1231, 39.71, false),
  (:wid, 'Sam Bradley', 'Sam Bradley', 'Independent', 'independent', 302, 9.74, false),
  (:wid, 'John Turner', 'John Turner', 'Liberal Democrats', 'liberal-democrats', 133, 4.29, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001524', 'gss', 'Sunbury Common and Ashford Common', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12290/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Alison Griffiths', 'Alison Griffiths', 'Conservative', 'conservative', 1509, 46.62, true),
  (:wid, 'Bernie Spoor', 'Bernie Spoor', 'Liberal Democrats', 'liberal-democrats', 610, 18.84, false),
  (:wid, 'Khalid Mustafa', 'Khalid Mustafa', 'Labour', 'labour', 522, 16.13, false),
  (:wid, 'Jan Doerfel', 'Jan Doerfel', 'Green Party', 'green', 274, 8.46, false),
  (:wid, 'Lesley Connor', 'Lesley Connor', 'Independent', 'independent', 175, 5.41, false),
  (:wid, 'Rory O''Brien', 'Rory O''Brien', 'Reform UK', 'reform-uk', 147, 4.54, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001525', 'gss', 'Tadworth, Walton and Kingswood', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12277/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Rebecca Paul', 'Rebecca Paul', 'Conservative', 'conservative', 2875, 69.82, true),
  (:wid, 'Steve Boeje', 'Steve Boeje', 'Labour', 'labour', 450, 10.93, false),
  (:wid, 'Roger Ponsford', 'Roger Ponsford', 'Green Party', 'green', 437, 10.61, false),
  (:wid, 'Christopher Thompson', 'Christopher Thompson', 'Liberal Democrats', 'liberal-democrats', 356, 8.64, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001526', 'gss', 'The Byfleets', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12314/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Amanda Boote', 'Amanda Boote', 'Independent', 'independent', 2022, 54.21, true),
  (:wid, 'Stewart Dick', 'Stewart Dick', 'Conservative', 'conservative', 1111, 29.79, false),
  (:wid, 'Peter Graves', 'Peter Graves', 'Liberal Democrats', 'liberal-democrats', 350, 9.38, false),
  (:wid, 'Jim Craig', 'Jim Craig', 'Green Party', 'green', 247, 6.62, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001527', 'gss', 'The Dittons', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12242/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Nick Darby', 'Nick Darby', 'Dittons and Weston Green Residents', 'thames-ditton-weston-green-residents-association', 2744, 49.68, true),
  (:wid, 'David Gattey', 'David Gattey', 'Liberal Democrats', 'liberal-democrats', 1239, 22.43, false),
  (:wid, 'Nicholas Weber', 'Nicholas Weber', 'Conservative', 'conservative', 1014, 18.36, false),
  (:wid, 'Greg Knowles', 'Greg Knowles', 'Green Party', 'green', 297, 5.38, false),
  (:wid, 'Ahmad Ali', 'Ahmad Ali', 'Labour', 'labour', 229, 4.15, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001529', 'gss', 'Walton South and Oatlands', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12244/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Tony Samuels', 'Tony Samuels', 'Conservative', 'conservative', 2475, 53.61, true),
  (:wid, 'Peter Hampson', 'Peter Hampson', 'Liberal Democrats', 'liberal-democrats', 1692, 36.65, false),
  (:wid, 'Warren Weertman', 'Warren Weertman', 'Labour', 'labour', 450, 9.75, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001530', 'gss', 'Warlingham', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12302/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Becky Rush', 'Becky Rush', 'Conservative', 'conservative', 2492, 58.21, true),
  (:wid, 'Celia Caulcott', 'Celia Caulcott', 'Liberal Democrats', 'liberal-democrats', 1217, 28.43, false),
  (:wid, 'Martin Haley', 'Martin Haley', 'Independent', 'independent', 337, 7.87, false),
  (:wid, 'Nathan Manning', 'Nathan Manning', 'Labour', 'labour', 235, 5.49, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001531', 'gss', 'Waverley Eastern Villages', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12310/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Kevin Deanus', 'Kevin Deanus', 'Conservative', 'conservative', 2793, 61.75, true),
  (:wid, 'Stephen Williams', 'Stephen Williams', 'Green Party', 'green', 1287, 28.45, false),
  (:wid, 'Peter Hopwood', 'Peter Hopwood', 'Labour', 'labour', 443, 9.79, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001532', 'gss', 'Waverley Western Villages', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12311/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Peter Harmer', 'Peter Harmer', 'Conservative', 'conservative', 2414, 57.82, true),
  (:wid, 'Julian Spence', 'Julian Spence', 'Liberal Democrats', 'liberal-democrats', 1043, 24.98, false),
  (:wid, 'Fi Scimone', 'Fi Scimone', 'Green Party', 'green', 422, 10.11, false),
  (:wid, 'Andrew Jones', 'Andrew Jones', 'Labour', 'labour', 216, 5.17, false),
  (:wid, 'Richard Williams', 'Richard Williams', 'Reform UK', 'reform-uk', 80, 1.92, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001533', 'gss', 'West Ewell', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12251/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jan Mason', 'Jan Mason', 'Residents Associations of Epsom and Ewell', 'residents-associations-of-epsom-and-ewell', 1781, 48.34, true),
  (:wid, 'Kieran Persand', 'Kieran Persand', 'Conservative', 'conservative', 703, 19.08, false),
  (:wid, 'Rob Geleit', 'Rob Geleit', 'Labour', 'labour', 677, 18.38, false),
  (:wid, 'Tony Foster', 'Tony Foster', 'Green Party', 'green', 263, 7.14, false),
  (:wid, 'Alison Kelly', 'Alison Kelly', 'Liberal Democrats', 'liberal-democrats', 260, 7.06, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001534', 'gss', 'West Molesey', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12245/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ernest Mallett', 'Ernest Mallett', 'Molesey Residents Association', 'the-molesey-residents-association', 1922, 47.4, true),
  (:wid, 'Charu Sood', 'Charu Sood', 'Conservative', 'conservative', 1039, 25.62, false),
  (:wid, 'David Nickerson', 'David Nickerson', 'Liberal Democrats', 'liberal-democrats', 719, 17.73, false),
  (:wid, 'Jamal Ajjane', 'Jamal Ajjane', 'Labour', 'labour', 375, 9.25, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001535', 'gss', 'Weybridge', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12246/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Tim Oliver', 'Tim Oliver', 'Conservative', 'conservative', 2384, 49.69, true),
  (:wid, 'Ashley Tilling', 'Ashley Tilling', 'Liberal Democrats', 'liberal-democrats', 1610, 33.56, false),
  (:wid, 'Helen Pilmer', 'Helen Pilmer', 'Labour', 'labour', 456, 9.5, false),
  (:wid, 'Nicholas Wood', 'Nicholas Wood', 'Independent', 'independent', 348, 7.25, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001536', 'gss', 'Woking North', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12315/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Mohammad Riasat Khan', 'Mohammad Riasat Khan', 'Conservative', 'conservative', 2119, 47.82, true),
  (:wid, 'Mohammad Ali', 'Mohammad Ali', 'Labour', 'labour', 1973, 44.53, false),
  (:wid, 'Will Roe', 'Will Roe', 'UKIP', 'uk-independence-party-ukip', 203, 4.58, false),
  (:wid, 'Gian Palermiti', 'Gian Palermiti', 'Heritage Party', 'heritage-party', 136, 3.07, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001538', 'gss', 'Woking South', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12316/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Will Forster', 'Will Forster', 'Liberal Democrats', 'liberal-democrats', 2747, 57.98, true),
  (:wid, 'Philip Gent', 'Philip Gent', 'Conservative', 'conservative', 1210, 25.54, false),
  (:wid, 'Sabir Hussain', 'Sabir Hussain', 'Labour', 'labour', 360, 7.6, false),
  (:wid, 'Kate Kett', 'Kate Kett', 'Green Party', 'green', 327, 6.9, false),
  (:wid, 'Michael Heaton', 'Michael Heaton', 'Heritage Party', 'heritage-party', 94, 1.98, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001537', 'gss', 'Woking South East', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12317/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Liz Bowes', 'Liz Bowes', 'Conservative', 'conservative', 2246, 50.51, true),
  (:wid, 'Ellen Nicholson', 'Ellen Nicholson', 'Liberal Democrats', 'liberal-democrats', 1607, 36.14, false),
  (:wid, 'Christine Murphy', 'Christine Murphy', 'Green Party', 'green', 475, 10.68, false),
  (:wid, 'Judith Squire', 'Judith Squire', 'Heritage Party', 'heritage-party', 119, 2.68, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001539', 'gss', 'Woking South West', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12318/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Ayesha Azad', 'Ayesha Azad', 'Conservative', 'conservative', 1721, 45.55, true),
  (:wid, 'Dale Roberts', 'Dale Roberts', 'Liberal Democrats', 'liberal-democrats', 1260, 33.35, false),
  (:wid, 'Ella Walding', 'Ella Walding', 'Green Party', 'green', 345, 9.13, false),
  (:wid, 'Sharaz Hussain', 'Sharaz Hussain', 'Labour', 'labour', 310, 8.21, false),
  (:wid, 'Tim Read', 'Tim Read', 'Heritage Party', 'heritage-party', 142, 3.76, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001540', 'gss', 'Woodham and New Haw', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12283/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Scott Lewis', 'Scott Lewis', 'Conservative', 'conservative', 2054, 60.55, true),
  (:wid, 'Kevin Decruz', 'Kevin Decruz', 'Liberal Democrats', 'liberal-democrats', 792, 23.35, false),
  (:wid, 'Bernie Stacey', 'Bernie Stacey', 'Labour', 'labour', 546, 16.1, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001541', 'gss', 'Worplesdon', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12261/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Keith Witham', 'Keith Witham', 'Conservative', 'conservative', 2574, 59.76, true),
  (:wid, 'Gina Redpath', 'Gina Redpath', 'Residents for Guildford and Villages', 'residents-for-guildford-and-villages', 713, 16.55, false),
  (:wid, 'Philippa Dolan', 'Philippa Dolan', 'Liberal Democrats', 'liberal-democrats', 619, 14.37, false),
  (:wid, 'Amanda Creese', 'Amanda Creese', 'Labour', 'labour', 401, 9.31, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001475', 'gss', 'Dorking Rural', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12265/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Helyn Clack', 'Helyn Clack', 'Conservative', 'conservative', 2416, 49.16, true),
  (:wid, 'Claire Malcomson', 'Claire Malcomson', 'Liberal Democrats', 'liberal-democrats', 1864, 37.92, false),
  (:wid, 'Lisa Scott', 'Lisa Scott', 'Green Party', 'green', 509, 10.36, false),
  (:wid, 'Christine Foster', 'Christine Foster', 'Labour', 'labour', 126, 2.56, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001461', 'gss', 'Ash', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12252/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Carla Morson', 'Carla Morson', 'Liberal Democrats', 'liberal-democrats', 2025, 55.83, true),
  (:wid, 'Nigel Manning', 'Nigel Manning', 'Conservative', 'conservative', 1326, 36.56, false),
  (:wid, 'Peter Kimber', 'Peter Kimber', 'Labour', 'labour', 276, 7.61, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001462', 'gss', 'Ashford', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12284/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Joanne Sexton', 'Joanne Sexton', 'Independent', 'independent', 1461, 37.11, true),
  (:wid, 'Naz Islam', 'Naz Islam', 'Conservative', 'conservative', 1279, 32.49, false),
  (:wid, 'Iain Raymond', 'Iain Raymond', 'Labour', 'labour', 558, 14.17, false),
  (:wid, 'Malcolm Beecher', 'Malcolm Beecher', 'Green Party', 'green', 407, 10.34, false),
  (:wid, 'Caroline Nichols', 'Caroline Nichols', 'Liberal Democrats', 'liberal-democrats', 232, 5.89, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001463', 'gss', 'Ashtead', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12262/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Christopher Townsend', 'Christopher Townsend', 'Ashtead Independents', 'ashtead-independents', 2908, 59.14, true),
  (:wid, 'Marion Bridgen', 'Marion Bridgen', 'Conservative', 'conservative', 1092, 22.21, false),
  (:wid, 'Colette ''t Hart', 'Colette ''t Hart', 'Liberal Democrats', 'liberal-democrats', 361, 7.34, false),
  (:wid, 'Izzy Tod', 'Izzy Tod', 'Green Party', 'green', 285, 5.8, false),
  (:wid, 'Susan Gilchrist', 'Susan Gilchrist', 'Labour', 'labour', 271, 5.51, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001469', 'gss', 'Caterham Hill', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12297/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Jeremy Webster', 'Jeremy Webster', 'Conservative', 'conservative', 1913, 43.64, true),
  (:wid, 'Chris Botten', 'Chris Botten', 'Liberal Democrats', 'liberal-democrats', 1819, 41.49, false),
  (:wid, 'Robin Clements', 'Robin Clements', 'Labour', 'labour', 434, 9.9, false),
  (:wid, 'Helena Windsor', 'Helena Windsor', 'Independent', 'independent', 218, 4.97, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001477', 'gss', 'Earlswood and Reigate South', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12269/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Catherine Baart', 'Catherine Baart', 'Green Party', 'green', 1736, 44.56, true),
  (:wid, 'Barbara Thomson', 'Barbara Thomson', 'Conservative', 'conservative', 1612, 41.38, false),
  (:wid, 'Rex Giles', 'Rex Giles', 'Labour', 'labour', 548, 14.07, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001491', 'gss', 'Godalming South, Milford and Witley', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12308/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Paul Follows', 'Paul Follows', 'Liberal Democrats', 'liberal-democrats', 3044, 58.83, true),
  (:wid, 'Kirsty Walden', 'Kirsty Walden', 'Conservative', 'conservative', 1886, 36.45, false),
  (:wid, 'Zahida Zahoor', 'Zahida Zahoor', 'Labour', 'labour', 244, 4.72, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001493', 'gss', 'Goldsworth East and Horsell Village', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12312/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Lance Spencer', 'Lance Spencer', 'Liberal Democrats', 'liberal-democrats', 2252, 46.74, true),
  (:wid, 'Colin Kemp', 'Colin Kemp', 'Conservative', 'conservative', 2056, 42.67, false),
  (:wid, 'Michael Kelly', 'Michael Kelly', 'Labour', 'labour', 510, 10.59, false);
INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, 'E58001495', 'gss', 'Guildford North', 1, NULL, NULL, NULL, 'https://www.andrewteale.me.uk/leap/ward/12254/') RETURNING id AS wid \gset
INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES
  (:wid, 'Julia McShane', 'Julia McShane', 'Liberal Democrats', 'liberal-democrats', 1602, 44.16, true),
  (:wid, 'Chris O''Keeffe', 'Chris O''Keeffe', 'Conservative', 'conservative', 1283, 35.36, false),
  (:wid, 'Anne Rouse', 'Anne Rouse', 'Labour', 'labour', 743, 20.48, false);

DO $$ DECLARE e int; w int; c int; BEGIN
  SELECT count(*) INTO e FROM public.council_elections WHERE (council_gss_code, election_date) IN (('E10000030', '2021-05-06'::date));
  SELECT count(*) INTO w FROM public.council_election_wards x JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E10000030', '2021-05-06'::date));
  SELECT count(*) INTO c FROM public.council_election_candidates k JOIN public.council_election_wards x ON x.id = k.ward_id JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (('E10000030', '2021-05-06'::date));
  IF e <> 1 OR w <> 81 OR c <> 331 THEN RAISE EXCEPTION 'expected 1 elections, 81 wards, 331 candidates; found %, %, %', e, w, c; END IF; END $$;
SELECT y.council_gss_code, y.election_date, y.wards_contested, y.seats_contested, count(k.*) AS candidates FROM public.council_elections y JOIN public.council_election_wards x ON x.election_id = y.id JOIN public.council_election_candidates k ON k.ward_id = x.id WHERE (y.council_gss_code, y.election_date) IN (('E10000030', '2021-05-06'::date)) GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

COMMIT;
