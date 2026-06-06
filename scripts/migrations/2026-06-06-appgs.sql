-- Migration: APPG (All-Party Parliamentary Group) data
-- Date: 2026-06-06
--
-- Source: mySociety/appg-membership GitHub repo, syncing one JSON per APPG.
-- Three tables: the group itself, its officers (MP-keyed), and its
-- registered funders/benefits. Officers and funders are the cross-
-- reference layer: an MP officers APPG X, which is funded by Y, who
-- has a policy interest in Z.

BEGIN;

CREATE TABLE IF NOT EXISTS appgs (
  slug                text PRIMARY KEY,
  title               text NOT NULL,
  purpose             text,
  category            text,
  parliament          text DEFAULT 'uk',
  secretariat         text,
  secretariat_url     text,
  registered_contact  text,
  registrable_benefits text,
  agm_date            date,
  reporting_year      text,
  next_reporting_deadline date,
  website_url         text,
  website_status      text,
  categories          text[],
  source_url          text,
  scraped_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appg_officers (
  id          bigserial PRIMARY KEY,
  appg_slug   text REFERENCES appgs(slug) ON DELETE CASCADE,
  member_id   integer,
  name_at_time text NOT NULL,
  party       text,
  role        text,
  removed     boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_appg_officers_member ON appg_officers (member_id);
CREATE INDEX IF NOT EXISTS idx_appg_officers_slug ON appg_officers (appg_slug);
CREATE UNIQUE INDEX IF NOT EXISTS appg_officers_uniq
  ON appg_officers (appg_slug, member_id, role)
  WHERE member_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS appg_funders (
  id            bigserial PRIMARY KEY,
  appg_slug     text REFERENCES appgs(slug) ON DELETE CASCADE,
  source        text NOT NULL,
  description   text,
  value_band    text,
  received_date date,
  registered_date date,
  benefit_type  text
);
CREATE INDEX IF NOT EXISTS idx_appg_funders_slug ON appg_funders (appg_slug);

COMMIT;
