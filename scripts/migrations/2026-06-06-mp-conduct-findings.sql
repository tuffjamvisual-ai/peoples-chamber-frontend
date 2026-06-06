-- Migration: mp_conduct_findings
-- Date: 2026-06-06
--
-- Standards Commissioner cases + Standards Committee findings scraped from
-- parliament.uk. One row per published finding; idempotent on case_ref.

BEGIN;

CREATE TABLE IF NOT EXISTS mp_conduct_findings (
  id                bigserial PRIMARY KEY,
  member_id         integer,
  mp_name_at_time   text NOT NULL,
  case_ref          text,
  opened_date       date,
  closed_date       date,
  source            text,                -- 'commissioner' | 'standards_committee'
  outcome           text,                -- 'upheld' | 'partially_upheld' | 'not_upheld' | 'rectified' | 'no_finding'
  rule_breached     text,
  summary           text,
  penalty           text,
  url               text,
  source_published  date,
  scraped_at        timestamptz DEFAULT now()
);

-- Idempotency key — re-scraping a case overwrites rather than duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS mp_conduct_findings_case_ref_uniq
  ON mp_conduct_findings (case_ref)
  WHERE case_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mp_conduct_findings_member
  ON mp_conduct_findings (member_id);

CREATE INDEX IF NOT EXISTS idx_mp_conduct_findings_outcome
  ON mp_conduct_findings (outcome);

COMMIT;
