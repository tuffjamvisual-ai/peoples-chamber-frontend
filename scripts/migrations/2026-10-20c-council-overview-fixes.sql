-- Council Overview fixes (owner's approval, 20 Oct 2026). Rehearse with ROLLBACK first (run-overview-rehearsal.sql).
--   chief_exec: 5 rows had Wikipedia's footnote glued to the name; now the name plus "(joint chief executive)", checked
--     against each council's Wikipedia infobox on 20 Oct 2026. Harlow's "None (post abolished in 2026)" becomes a note
--     (chief_exec_note), not a name. South Holland stays "Rob Barlow", as its infobox has it.
--   New columns chief_exec_note, chief_exec_source_url, chief_exec_checked_on: every chief_exec came from the council's
--     Wikipedia article (scripts/backfill-council-chief-exec.js, run 1 Oct 2026); the 7 rows above were checked 20 Oct 2026.
--   website_url: the 6 http addresses become https (NI Direct's council list confirms the 4 NI domains).
--   description: 7 described an election, a disambiguation page or the place; now the lead of the article in each
--     council's wikipedia_url (read 20 Oct 2026).
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.councils_overview_backup_20261020a') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='councils' AND column_name IN ('chief_exec_note','chief_exec_source_url','chief_exec_checked_on')) THEN RAISE EXCEPTION 'columns already exist'; END IF;
END $$;

CREATE TABLE public.councils_overview_backup_20261020a AS SELECT slug, chief_exec, website_url, description FROM public.councils;
ALTER TABLE public.councils_overview_backup_20261020a ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.councils
  ADD COLUMN chief_exec_note text,
  ADD COLUMN chief_exec_source_url text CHECK (chief_exec_source_url ~ '^https://en\.wikipedia\.org/wiki/'),
  ADD COLUMN chief_exec_checked_on date;
COMMENT ON COLUMN public.councils.chief_exec_note IS 'Shown in place of a name where there is no chief executive (e.g. post abolished)';
COMMENT ON COLUMN public.councils.chief_exec_source_url IS 'Where chief_exec (or chief_exec_note) was read: the council''s Wikipedia article';
COMMENT ON COLUMN public.councils.chief_exec_checked_on IS 'When chief_exec was last read from its source';

-- chief executives
UPDATE public.councils SET chief_exec = $q$Robert Barlow (joint chief executive)$q$ WHERE slug = 'boston' AND chief_exec LIKE $q$Robert BarlowJoint chief executive of%$q$;
UPDATE public.councils SET chief_exec = $q$Robert Barlow (joint chief executive)$q$ WHERE slug = 'east-lindsey' AND chief_exec LIKE $q$Robert BarlowJoint chief executive of%$q$;
UPDATE public.councils SET chief_exec = $q$Adrianna Partridge (joint chief executive)$q$ WHERE slug = 'south-oxfordshire' AND chief_exec LIKE $q$Adrianna PartridgeServes as joint%$q$;
UPDATE public.councils SET chief_exec = $q$Adrianna Partridge (joint chief executive)$q$ WHERE slug = 'vale-of-white-horse' AND chief_exec LIKE $q$Adrianna PartridgeServes as joint%$q$;
UPDATE public.councils SET chief_exec = $q$Tim Clegg (joint chief executive)$q$ WHERE slug = 'cannock-chase' AND chief_exec LIKE $q$Tim CleggJoint chief executive with%$q$;
UPDATE public.councils SET chief_exec = NULL, chief_exec_note = 'Post abolished in 2026' WHERE slug = 'harlow' AND chief_exec = 'None (post abolished in 2026)';
UPDATE public.councils SET chief_exec_source_url = wikipedia_url, chief_exec_checked_on = DATE '2026-10-01' WHERE chief_exec IS NOT NULL OR chief_exec_note IS NOT NULL;
UPDATE public.councils SET chief_exec_checked_on = DATE '2026-10-20' WHERE slug IN ('boston', 'east-lindsey', 'south-oxfordshire', 'vale-of-white-horse', 'cannock-chase', 'south-holland', 'harlow');

-- websites
UPDATE public.councils SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE slug = 'derry-city-and-strabane' AND website_url LIKE 'http://%';
UPDATE public.councils SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE slug = 'fermanagh-and-omagh' AND website_url LIKE 'http://%';
UPDATE public.councils SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE slug = 'mid-ulster' AND website_url LIKE 'http://%';
UPDATE public.councils SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE slug = 'newry-mourne-and-down' AND website_url LIKE 'http://%';
UPDATE public.councils SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE slug = 'antrim-and-newtownabbey' AND website_url LIKE 'http://%';
UPDATE public.councils SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE slug = 'lisburn-and-castlereagh' AND website_url LIKE 'http://%';

-- descriptions
UPDATE public.councils SET description = $q$Carmarthenshire County Council (Welsh: Cyngor Sir Gâr or Cyngor Sir Gaerfyrddin) is the local authority for the county of Carmarthenshire, one of the principal areas of Wales. The council is based at County Hall in Carmarthen. There have been two bodies called Carmarthenshire County Council. The first existed from 1889 until 1974, and the current one was created in 1996.$q$ WHERE slug = 'carmarthenshire' AND description LIKE $q$The fifth election to Carmarthenshire%$q$;
UPDATE public.councils SET description = $q$Conwy County Borough Council (Welsh: Cyngor Bwrdeistref Sirol Conwy) is the local authority for the county borough of Conwy, one of the principal areas of Wales.$q$ WHERE slug = 'conwy' AND description LIKE $q$The 2012 Conwy County Council election%$q$;
UPDATE public.councils SET description = $q$Rhondda Cynon Taf County Borough Council (Welsh: Cyngor Bwrdeistref Sirol Rhondda Cynon Taf) is the local authority for the county borough of Rhondda Cynon Taf, one of the principal areas of Wales. The council headquarters are at the Llys Cadwyn development in Pontypridd.$q$ WHERE slug = 'rhondda-cynon-taf' AND description LIKE $q$The 2017 Rhondda Cynon Taf%$q$;
UPDATE public.councils SET description = $q$Dorset Council is the local authority for the non-metropolitan county of Dorset in England. It is a unitary authority, being a district council which also performs the functions of a county council. The non-metropolitan county is smaller than the ceremonial county of Dorset, which also includes Bournemouth, Christchurch and Poole. The council was created in 2019 when local government across Dorset was reorganised. The council has been under Liberal Democrat majority control since the 2024 election. It is based at County Hall in Dorchester.$q$ WHERE slug = 'dorset' AND description LIKE $q$Dorset Council may refer to%$q$;
UPDATE public.councils SET description = $q$Greenwich London Borough Council, also known as Greenwich Council or the Council of the Royal Borough of Greenwich, is the local authority for the Royal Borough of Greenwich in Greater London, England. The council is responsible for providing a range of services within the borough. The council has been under Labour majority control since 1971. It meets at Woolwich Town Hall and has its main offices at the Woolwich Centre opposite.$q$ WHERE slug = 'greenwich' AND description LIKE $q$Greenwich Council may refer to%$q$;
UPDATE public.councils SET description = $q$Cannock Chase is a local government district in Staffordshire, England. It is named after and covers a large part of Cannock Chase, a designated National Landscape. The council is based in the town of Cannock. The district also contains the towns of Hednesford and Rugeley, as well as a number of villages and surrounding rural areas. The district borders South Staffordshire to the west, the Borough of Stafford to the north, Lichfield District to the east, and the Metropolitan Borough of Walsall to the south.$q$ WHERE slug = 'cannock-chase' AND description LIKE $q$Cannock Chase is a designated Area%$q$;
UPDATE public.councils SET description = $q$The Council of the Isles of Scilly (Cornish: Konsel Syllan) is a sui generis local government authority covering the Isles of Scilly in Cornwall, England. It is one of two local authorities in Cornwall, the other being the mainland Cornwall Council. It is currently made up of 16 councillors, all independents. The council was created in 1891. It meets at the Old Wesleyan Chapel and has its main offices at the Isles of Scilly Town Hall, both in Hugh Town on the main island of St Mary's.$q$ WHERE slug = 'isles-of-scilly' AND description LIKE $q$The Isles of Scilly are a small archipelago%$q$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.councils c JOIN public.councils_overview_backup_20261020a b USING (slug) WHERE c.chief_exec IS DISTINCT FROM b.chief_exec;
  IF n <> 6 THEN RAISE EXCEPTION 'expected 6 chief_exec changes, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils c JOIN public.councils_overview_backup_20261020a b USING (slug) WHERE c.website_url IS DISTINCT FROM b.website_url;
  IF n <> 6 THEN RAISE EXCEPTION 'expected 6 website changes, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils c JOIN public.councils_overview_backup_20261020a b USING (slug) WHERE c.description IS DISTINCT FROM b.description;
  IF n <> 7 THEN RAISE EXCEPTION 'expected 7 description changes, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils WHERE chief_exec IS NOT NULL;
  IF n <> 346 THEN RAISE EXCEPTION 'expected 346 chief executives, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils WHERE chief_exec_source_url IS NOT NULL;
  IF n <> 347 THEN RAISE EXCEPTION 'expected 347 sourced rows (346 names and Harlow''s note), found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils WHERE chief_exec_checked_on = DATE '2026-10-20';
  IF n <> 7 THEN RAISE EXCEPTION 'expected 7 rows checked today, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils WHERE website_url LIKE 'http://%';
  IF n <> 0 THEN RAISE EXCEPTION 'expected no http websites, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils;
  IF n <> 382 THEN RAISE EXCEPTION 'expected 382 councils, found %', n; END IF;
END $$;

COMMIT;

-- Step 2 (20 Oct 2026, after step 1 had run): no doubled scheme in councils.website_url ("https://http://",
-- "http://http", "https://https"). A report of "https://http://www.midulstercouncil.org/" was checked: no row had one
-- (all 382 addresses are a single https://), so the expected count is 0. Step 1 above refuses to run twice (its backup
-- table exists), so run this step on its own:
--   sed -n '/^-- Step 2/,$p' scripts/migrations/2026-10-20c-council-overview-fixes.sql > /tmp/step2.sql
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.councils WHERE website_url ~* '^https?://https?(://|:/|//|\.)';
  IF n <> 0 THEN RAISE EXCEPTION 'expected 0 doubled schemes, found %', n; END IF;
END $$;
UPDATE public.councils SET website_url = regexp_replace(website_url, '^(https?://)+(https?://)', 'https://', 'i')
  WHERE website_url ~* '^https?://https?://';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.councils WHERE website_url !~ '^https://[^/:]+(/|$)';
  IF n <> 0 THEN RAISE EXCEPTION 'expected every website to be a single https:// address, found % that are not', n; END IF;
  SELECT count(*) INTO n FROM public.councils WHERE slug IN ('derry-city-and-strabane', 'fermanagh-and-omagh', 'mid-ulster', 'newry-mourne-and-down')
    AND website_url IN ('https://www.derrystrabane.com/', 'https://www.fermanaghomagh.com/', 'https://www.midulstercouncil.org/', 'https://www.newrymournedown.org/');
  IF n <> 4 THEN RAISE EXCEPTION 'expected the 4 NI Direct addresses, found %', n; END IF;
END $$;
COMMIT;
