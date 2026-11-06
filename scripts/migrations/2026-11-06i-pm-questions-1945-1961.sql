-- Applied to production on 6 Nov 2026 at 22:59:53 GMT, with its data, on the owner's yes, after a rehearsal ending in ROLLBACK; every check after matched.
-- Questions to the Prime Minister, 1945 to 1961 (owner's yes, 6 Nov 2026), as "Claude outputs/pmqs-pre1961/load-plan.md" sets out. Three new tables, separate from
-- pmqs_archive_*, none of which change: these are individual questions, not PMQs sessions, and never join a session count. No foreign key to mps. Public read only.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.pm_question_people_1945_1961 (
  person_slug text PRIMARY KEY,
  full_name text NOT NULL,          -- Historic Hansard's name
  person_url text NOT NULL,
  member_id integer,                -- the 12 safe matches only
  rows_spoken integer NOT NULL,
  names_as_printed text NOT NULL    -- up to 6 forms, separated by " | "
);

CREATE TABLE public.pm_questions_1945_1961 (
  question_id integer PRIMARY KEY,
  date date NOT NULL,               -- the true date
  date_in_api date,                 -- the original; null for Historic Hansard only
  date_corrected text NOT NULL,     -- yes or no
  date_status text NOT NULL,
  prime_minister text NOT NULL,     -- by true date
  period_label text,                -- "The 3.15 p.m. experiment", Tuesdays and Thursdays only, or null
  asker_as_printed text NOT NULL,
  asker_person_url text,
  asker_member_id integer,
  question_number text,
  by_private_notice text NOT NULL,  -- yes or no
  section text NOT NULL,
  exchange_id text NOT NULL,        -- several questions can share one exchange
  exchange_rows integer NOT NULL,
  question text NOT NULL,
  answerer_as_printed text NOT NULL,
  answerer_person_url text,
  answerer_member_id integer,
  answered_by text NOT NULL,        -- Prime Minister, someone else, or not recorded
  answer_first_contribution text,
  found_in text NOT NULL,           -- both, Historic Hansard only, or Hansard API only
  text_from text NOT NULL,
  hansard_reference text,           -- null on the 5 from the Hansard API only
  historic_hansard_url text         -- null on the 5 from the Hansard API only
);
CREATE INDEX pm_questions_1945_1961_date_idx ON public.pm_questions_1945_1961 (date);
CREATE INDEX pm_questions_1945_1961_exchange_idx ON public.pm_questions_1945_1961 (exchange_id);

CREATE TABLE public.pm_question_exchange_rows_1945_1961 (
  exchange_id text NOT NULL,
  row_order integer NOT NULL,       -- 1, 2, 3 with no gaps: always order by exchange_id, then this
  kind text NOT NULL,               -- question, first_answer, follow_on, procedural or printed_text
  speaker_as_printed text,
  person_slug text REFERENCES public.pm_question_people_1945_1961 (person_slug),
  person_url text,
  member_id integer,
  question_number text,
  text text NOT NULL,
  text_from text NOT NULL,
  historic_hansard_url text,
  PRIMARY KEY (exchange_id, row_order)
);
CREATE INDEX pm_question_exchange_rows_1945_1961_person_idx ON public.pm_question_exchange_rows_1945_1961 (person_slug);

ALTER TABLE public.pm_question_people_1945_1961 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_questions_1945_1961 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_question_exchange_rows_1945_1961 ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_question_people_1945_1961_public_read ON public.pm_question_people_1945_1961 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pm_questions_1945_1961_public_read ON public.pm_questions_1945_1961 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pm_question_exchange_rows_1945_1961_public_read ON public.pm_question_exchange_rows_1945_1961 FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.pm_question_people_1945_1961, public.pm_questions_1945_1961, public.pm_question_exchange_rows_1945_1961 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pm_question_people_1945_1961, public.pm_questions_1945_1961, public.pm_question_exchange_rows_1945_1961 TO anon, authenticated;
COMMIT;
