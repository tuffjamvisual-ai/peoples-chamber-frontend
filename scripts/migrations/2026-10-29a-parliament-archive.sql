-- 2026-10-29a: empty archive tables for Parliament written questions and Commons spoken contributions (owner's
-- approval, 29 Oct 2026, "go archive"). Step 1 only: tables, indexes and security. No backfill, sync or cron here, and
-- no existing table is changed. Undo: 2026-10-29a-UNDO.sql (drops these three tables only).
-- Secured like every table since the Phase 2 lock down (2026-10-28j): row level security on, no policies, nothing
-- granted to anon or authenticated, so only the server key (service role) can read or write them.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- a. Written questions (Commons and Lords), from the Questions and Statements API.
CREATE TABLE public.parliament_written_questions (
  id                  bigint PRIMARY KEY,            -- the Questions API question id
  uin                 text NOT NULL,
  house               text NOT NULL,
  date_tabled         date,
  date_answered       date,
  asking_member_id    int,
  answering_member_id int,
  answering_body_id   int,
  answering_body      text,
  heading             text,
  question_text       text,
  answer_text         text,                          -- plain text
  answer_html         text,
  is_withdrawn        boolean,
  url                 text,
  fetched_at          timestamptz NOT NULL DEFAULT now(),
  search              tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(heading, '') || ' ' || coalesce(question_text, '') || ' ' || coalesce(answer_text, ''))
  ) STORED
);
CREATE INDEX parliament_written_questions_search_idx ON public.parliament_written_questions USING gin (search);
CREATE INDEX parliament_written_questions_member_date_idx ON public.parliament_written_questions (asking_member_id, date_tabled DESC);
CREATE INDEX parliament_written_questions_date_idx ON public.parliament_written_questions (date_tabled DESC);
CREATE UNIQUE INDEX parliament_written_questions_house_uin_date_key ON public.parliament_written_questions (house, uin, date_tabled);
COMMENT ON TABLE public.parliament_written_questions IS
  'Written questions and answers, Commons and Lords. Source: UK Parliament Questions and Statements API (questions-statements-api.parliament.uk). Contains Parliamentary information licensed under the Open Parliament Licence v3.0.';

-- b. Commons spoken contributions, from the Hansard API.
CREATE TABLE public.hansard_contributions (
  ext_id            text PRIMARY KEY,                -- the Hansard contribution id
  member_id         int,
  house             text NOT NULL,
  sitting_date      date NOT NULL,
  debate_title      text,
  debate_section    text,
  debate_ext_id     text,
  contribution_text text,
  url               text,
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  search            tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(debate_title, '') || ' ' || coalesce(contribution_text, ''))
  ) STORED
);
CREATE INDEX hansard_contributions_search_idx ON public.hansard_contributions USING gin (search);
CREATE INDEX hansard_contributions_member_date_idx ON public.hansard_contributions (member_id, sitting_date DESC);
CREATE INDEX hansard_contributions_date_idx ON public.hansard_contributions (sitting_date DESC);
COMMENT ON TABLE public.hansard_contributions IS
  'Commons spoken contributions. Source: UK Parliament Hansard API (hansard-api.parliament.uk). Contains Parliamentary information licensed under the Open Parliament Licence v3.0.';

-- c. Where each archive backfill or sync has got to.
CREATE TABLE public.parliament_archive_sync_state (
  source      text PRIMARY KEY,
  cursor      jsonb,
  rows_done   bigint DEFAULT 0,
  last_run_at timestamptz,
  last_error  text,
  finished_at timestamptz
);
COMMENT ON TABLE public.parliament_archive_sync_state IS
  'Progress of the Parliament archive backfills and syncs (parliament_written_questions, hansard_contributions). Sources: UK Parliament Questions and Statements API and Hansard API, under the Open Parliament Licence v3.0.';

-- d. Row level security on, no policies, nothing granted to the public roles.
ALTER TABLE public.parliament_written_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hansard_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliament_archive_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parliament_written_questions, public.hansard_contributions, public.parliament_archive_sync_state FROM anon, authenticated;

COMMIT;
