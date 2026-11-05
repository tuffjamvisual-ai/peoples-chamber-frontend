-- Applied to production on 5 Nov 2026, committed by 21:05:02 GMT, on the owner's yes.
-- PMQs archive, 1961 to 2024 (owner, 5 Nov 2026). Four new tables; no existing table is touched, and there is no foreign
-- key to mps, because most of the archive's Parliament ids are not in it. Public read only. The data is loaded by
-- scripts/load-pmqs-archive.py, which runs this file and the load in one transaction, so this file alone leaves empty tables.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.pmqs_archive_sessions (
  "date" date PRIMARY KEY,
  prime_minister_as_named text,
  exchanges integer NOT NULL,
  source text NOT NULL,
  note text
);

CREATE TABLE public.pmqs_archive_exchanges (
  "date" date NOT NULL REFERENCES public.pmqs_archive_sessions ("date"),
  item_order integer NOT NULL,
  attributed_to text,
  parlparse_speaker_id text,
  member_id integer,
  member_id_confidence text,
  contribution_text text NOT NULL,
  parlparse_text text NOT NULL,
  display_source text NOT NULL,
  source text NOT NULL,
  PRIMARY KEY ("date", item_order)
);

CREATE TABLE public.pmqs_archive_people (
  parlparse_speaker_id text PRIMARY KEY,
  parlparse_person_id text,
  name text,
  parliament_member_id integer,
  confidence text,
  how_matched text,
  speeches integer,
  most_common_printed_name text,
  historic_hansard_url text
);

CREATE TABLE public.pmqs_library_totals (
  prime_minister text PRIMARY KEY,
  in_office_from date,
  in_office_to date,
  library_total integer,
  library_attended integer,
  library_missed integer,
  our_sessions integer,
  difference integer,
  note text
);

ALTER TABLE public.pmqs_archive_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmqs_archive_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmqs_archive_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmqs_library_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY pmqs_archive_sessions_public_read ON public.pmqs_archive_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pmqs_archive_exchanges_public_read ON public.pmqs_archive_exchanges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pmqs_archive_people_public_read ON public.pmqs_archive_people FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pmqs_library_totals_public_read ON public.pmqs_library_totals FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.pmqs_archive_sessions, public.pmqs_archive_exchanges, public.pmqs_archive_people, public.pmqs_library_totals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pmqs_archive_sessions, public.pmqs_archive_exchanges, public.pmqs_archive_people, public.pmqs_library_totals TO anon, authenticated;
GRANT ALL ON public.pmqs_archive_sessions, public.pmqs_archive_exchanges, public.pmqs_archive_people, public.pmqs_library_totals TO service_role;

COMMIT;
