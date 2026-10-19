-- Council leaders with their source (John's decisions, 19 Oct 2026): the role as shown on the page, the date the
-- leader took office, where it was read, when, and the council's own page where it confirms an elected mayor.
-- leader_name and leader_party are kept; scripts/import-council-leaders.js fills all eight fields together.
-- leader_name is NULL with leader_source_url set where the council's own page confirms the post is vacant.
--   leader_role               'Leader of the council', 'Co-leaders', 'Directly elected mayor', 'City Mayor',
--                             'Chairman of the Policy and Resources Committee', 'Chair of the council' (Isles of Scilly),
--                             or for Northern Ireland the civic head with its own title,
--                             e.g. 'Mayor (civic, elected annually)'
--   leader_since              the date the leader took office, when the source gives a full date
--   leader_since_text         the source's own wording when it gives only part of a date ("1994", "March 2020")
--   leader_source_url         the page the leader was read from (the council's Wikipedia article)
--   leader_checked_on         the date that page was read
--   leader_second_source_url  the council's own page naming the leader (elected mayors), when its robots.txt allows
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'councils'
     AND column_name IN ('leader_role', 'leader_since', 'leader_since_text', 'leader_source_url', 'leader_checked_on', 'leader_second_source_url');
  IF n <> 0 THEN RAISE EXCEPTION 'expected none of the new columns to exist, found %', n; END IF;
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'councils'
     AND column_name IN ('leader_name', 'leader_party');
  IF n <> 2 THEN RAISE EXCEPTION 'expected leader_name and leader_party, found % of them', n; END IF;
END $$;

ALTER TABLE public.councils
  ADD COLUMN leader_role text,
  ADD COLUMN leader_since date,
  ADD COLUMN leader_since_text text CHECK (leader_since_text IS NULL OR leader_since IS NULL),
  ADD COLUMN leader_source_url text CHECK (leader_source_url ~ '^https://'),
  ADD COLUMN leader_checked_on date,
  ADD COLUMN leader_second_source_url text CHECK (leader_second_source_url ~ '^https://');

COMMENT ON COLUMN public.councils.leader_role IS 'The leader''s role as shown on the page, e.g. Leader of the council, Directly elected mayor, Mayor (civic, elected annually); leader_name NULL with a source means the post is vacant';
COMMENT ON COLUMN public.councils.leader_since IS 'Date the leader took office, when the source gives a full date';
COMMENT ON COLUMN public.councils.leader_since_text IS 'The source''s wording when it gives only part of a date, e.g. 1994 or March 2020';
COMMENT ON COLUMN public.councils.leader_source_url IS 'Page the leader was read from (the council''s Wikipedia article)';
COMMENT ON COLUMN public.councils.leader_checked_on IS 'Date leader_source_url was read';
COMMENT ON COLUMN public.councils.leader_second_source_url IS 'The council''s own page naming the leader, where its robots.txt allows (elected mayors)';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'councils'
     AND column_name IN ('leader_role', 'leader_since', 'leader_since_text', 'leader_source_url', 'leader_checked_on', 'leader_second_source_url');
  IF n <> 6 THEN RAISE EXCEPTION 'expected 6 new columns, found %', n; END IF;
  SELECT count(*) INTO n FROM public.councils;
  IF n <> 382 THEN RAISE EXCEPTION 'expected 382 councils, found %', n; END IF;
END $$;

COMMIT;
