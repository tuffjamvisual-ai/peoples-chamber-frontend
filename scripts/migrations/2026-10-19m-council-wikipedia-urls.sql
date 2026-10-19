-- Corrects 15 councils.wikipedia_url values that point at a past election, a disambiguation page or the place,
-- not the council's own article (found while checking council leaders, 19 Oct 2026). Each new URL was fetched
-- (/wiki/ page) and has the council's own infobox (Infobox legislature) with labelled entries: a leader, or for
-- the Isles of Scilly (no leader post) its Chair (John's decision, 19 Oct 2026).
-- Each row is changed only if it still holds the old URL; the old values are kept in councils_wikipedia_url_backup_20261019m.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE url_fix (slug text PRIMARY KEY, old_url text NOT NULL, new_url text NOT NULL) ON COMMIT DROP;
INSERT INTO url_fix VALUES
  ('carmarthenshire',     'https://en.wikipedia.org/wiki/2012_Carmarthenshire_County_Council_election',          'https://en.wikipedia.org/wiki/Carmarthenshire_County_Council'),
  ('clackmannanshire',    'https://en.wikipedia.org/wiki/Clackmannanshire',                                      'https://en.wikipedia.org/wiki/Clackmannanshire_Council'),
  ('conwy',               'https://en.wikipedia.org/wiki/2012_Conwy_County_Borough_Council_election',            'https://en.wikipedia.org/wiki/Conwy_County_Borough_Council'),
  ('dorset',              'https://en.wikipedia.org/wiki/Dorset_Council',                                        'https://en.wikipedia.org/wiki/Dorset_Council_(UK)'),
  ('gateshead',           'https://en.wikipedia.org/wiki/Metropolitan_Borough_of_Gateshead',                     'https://en.wikipedia.org/wiki/Gateshead_Council'),
  ('greenwich',           'https://en.wikipedia.org/wiki/Greenwich_Council',                                     'https://en.wikipedia.org/wiki/Greenwich_London_Borough_Council'),
  ('newport',             'https://en.wikipedia.org/wiki/Newport_Council',                                       'https://en.wikipedia.org/wiki/Newport_City_Council'),
  ('rhondda-cynon-taf',   'https://en.wikipedia.org/wiki/2017_Rhondda_Cynon_Taf_County_Borough_Council_election', 'https://en.wikipedia.org/wiki/Rhondda_Cynon_Taf_County_Borough_Council'),
  ('sandwell',            'https://en.wikipedia.org/wiki/Sandwell',                                              'https://en.wikipedia.org/wiki/Sandwell_Metropolitan_Borough_Council'),
  ('scottish-borders',    'https://en.wikipedia.org/wiki/Scottish_Borders',                                      'https://en.wikipedia.org/wiki/Scottish_Borders_Council'),
  ('south-tyneside',      'https://en.wikipedia.org/wiki/South_Tyneside',                                        'https://en.wikipedia.org/wiki/South_Tyneside_Council'),
  ('tameside',            'https://en.wikipedia.org/wiki/Tameside',                                              'https://en.wikipedia.org/wiki/Tameside_Metropolitan_Borough_Council'),
  ('walsall',             'https://en.wikipedia.org/wiki/Metropolitan_Borough_of_Walsall',                       'https://en.wikipedia.org/wiki/Walsall_Council'),
  ('west-dunbartonshire', 'https://en.wikipedia.org/wiki/West_Dunbartonshire',                                   'https://en.wikipedia.org/wiki/West_Dunbartonshire_Council'),
  ('isles-of-scilly',     'https://en.wikipedia.org/wiki/Isles_of_Scilly',                                       'https://en.wikipedia.org/wiki/Council_of_the_Isles_of_Scilly');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM url_fix;
  IF n <> 15 THEN RAISE EXCEPTION 'expected 15 fixes listed, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils c JOIN url_fix f ON f.slug = c.slug AND c.wikipedia_url = f.old_url;
  IF n <> 15 THEN RAISE EXCEPTION 'expected 15 councils still holding the old URL, found %', n; END IF;
  -- no other council already uses one of the new URLs
  SELECT count(*) INTO n FROM public.councils c JOIN url_fix f ON c.wikipedia_url = f.new_url;
  IF n <> 0 THEN RAISE EXCEPTION 'a new URL is already used by % council(s)', n; END IF;
END $$;

CREATE TABLE public.councils_wikipedia_url_backup_20261019m AS
  SELECT c.slug, c.wikipedia_url FROM public.councils c JOIN url_fix f ON f.slug = c.slug;

UPDATE public.councils c SET wikipedia_url = f.new_url
  FROM url_fix f WHERE f.slug = c.slug AND c.wikipedia_url = f.old_url;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.councils_wikipedia_url_backup_20261019m;
  IF n <> 15 THEN RAISE EXCEPTION 'expected 15 rows backed up, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils c JOIN url_fix f ON f.slug = c.slug AND c.wikipedia_url = f.new_url;
  IF n <> 15 THEN RAISE EXCEPTION 'expected 15 councils with the new URL, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils;
  IF n <> 382 THEN RAISE EXCEPTION 'expected 382 councils, found %', n; END IF;
END $$;

SELECT c.slug, b.wikipedia_url AS old_url, c.wikipedia_url AS new_url
  FROM public.councils c JOIN public.councils_wikipedia_url_backup_20261019m b ON b.slug = c.slug ORDER BY 1;

COMMIT;
