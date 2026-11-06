-- Applied to production on 6 Nov 2026 at 15:01:52 GMT, with its data, on the owner's yes, committed 15:05:10 after a full rehearsal; 31 of 31 checks matched.
-- Commons votes, October 2004 to March 2016, and the Register of Members' Financial Interests, November 2000 to March 2024. Five new tables,
-- as "Claude outputs/twfy-inventory/load/load-plan.md" sets out, separate from mp_division_votes, commons_division_totals, mp_registered_interests
-- and mp_interests, none of which change. No foreign key to mps, because most of these members have no row there. Public read only.
-- Live attendance, rebellion and other MP figures keep reading mp_division_votes. No rebellion figures from this archive.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.historic_commons_divisions (
  external_id text PRIMARY KEY,
  hansard_division_id integer,
  division_date date NOT NULL,
  division_time text,
  division_number integer NOT NULL,
  title text NOT NULL,
  debate_section_ext_id text,
  ayes_official integer NOT NULL,   -- the official headline, as published, including -1
  noes_official integer NOT NULL,
  ayes_named integer NOT NULL,      -- counted from the list; tellers excluded
  noes_named integer NOT NULL,
  aye_tellers integer NOT NULL,
  noe_tellers integer NOT NULL,
  ayes_shown integer NOT NULL,      -- what pages show
  noes_shown integer NOT NULL,
  count_shown text NOT NULL,        -- 'official headline' or 'named list'; the label
  count_note text,                  -- the note for the 25; show it beside the count
  count_check text NOT NULL,
  votes_no_id integer NOT NULL,
  same_member_twice_same_side integer NOT NULL,
  evel_type text,
  evel_ayes text,
  evel_noes text,
  text_before text,
  text_after text,
  UNIQUE (division_date, division_number)
);

CREATE TABLE public.historic_commons_votes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  division_external_id text NOT NULL REFERENCES public.historic_commons_divisions (external_id),
  division_date date NOT NULL,
  division_number integer NOT NULL,
  side text NOT NULL,               -- 'aye' or 'no'
  side_as_published text NOT NULL,  -- never changed
  is_teller boolean NOT NULL,
  list_as text NOT NULL,            -- the printed name; always show it
  party_as_listed text,             -- not for rebellion figures
  hansard_member_id integer,        -- as published, including -1 and 0
  member_id integer,                -- the ID used; 8 null
  profile_link_id integer,          -- the fuller Lords record, for profile links, for 12 people
  id_method text,
  id_flag text
);
CREATE INDEX historic_commons_votes_member_date_idx ON public.historic_commons_votes (member_id, division_date);
CREATE INDEX historic_commons_votes_division_idx ON public.historic_commons_votes (division_external_id);

CREATE TABLE public.register_archive_editions (
  edition_date date PRIMARY KEY,
  twfy_file text NOT NULL,
  first_page_url_as_recorded text,
  file_bytes integer NOT NULL,
  members integer NOT NULL,
  members_with_id integer NOT NULL,
  members_without_id integer NOT NULL,
  item_rows integer NOT NULL,
  heading_rows integer NOT NULL,
  categories integer NOT NULL,
  repeated_identical_member_blocks_dropped integer NOT NULL
);

CREATE TABLE public.register_archive_entries (
  entry_id text PRIMARY KEY,
  person_id integer NOT NULL,       -- the archive's number for the person
  member_id integer,                -- 22 people blank
  profile_link_id integer,
  id_source text,
  id_confidence text,
  member_name text NOT NULL,        -- as in the archive; always show it
  category_type text,
  category_name text,
  subcategory text,
  row_kind text NOT NULL,           -- 'item' or 'heading'
  text text NOT NULL,               -- exact
  first_edition date NOT NULL,
  last_edition date NOT NULL,
  editions_count integer NOT NULL
);
CREATE INDEX register_archive_entries_member_idx ON public.register_archive_entries (member_id, first_edition);
CREATE INDEX register_archive_entries_person_idx ON public.register_archive_entries (person_id);

CREATE TABLE public.register_archive_entry_editions (
  edition_date date NOT NULL REFERENCES public.register_archive_editions (edition_date),
  member_person_id integer NOT NULL,
  member_order integer NOT NULL,
  block_order integer NOT NULL,     -- published order: always sort on this
  record_no integer NOT NULL,       -- 0 where the edition has no records
  entry_id text NOT NULL REFERENCES public.register_archive_entries (entry_id),
  PRIMARY KEY (edition_date, member_person_id, block_order)
);
CREATE INDEX register_archive_entry_editions_entry_idx ON public.register_archive_entry_editions (entry_id);

ALTER TABLE public.historic_commons_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historic_commons_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_archive_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_archive_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_archive_entry_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY historic_commons_divisions_public_read ON public.historic_commons_divisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY historic_commons_votes_public_read ON public.historic_commons_votes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY register_archive_editions_public_read ON public.register_archive_editions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY register_archive_entries_public_read ON public.register_archive_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY register_archive_entry_editions_public_read ON public.register_archive_entry_editions FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.historic_commons_divisions, public.historic_commons_votes, public.register_archive_editions, public.register_archive_entries, public.register_archive_entry_editions FROM anon, authenticated;
GRANT SELECT ON public.historic_commons_divisions, public.historic_commons_votes, public.register_archive_editions, public.register_archive_entries, public.register_archive_entry_editions TO anon, authenticated;
COMMIT;
