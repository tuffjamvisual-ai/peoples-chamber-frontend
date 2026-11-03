-- 2026-11-03d: MPs' staff interests (owner's brief, 3 Nov 2026). Creates public.mp_staff_interests, one row per entry in
-- the House of Commons register of interests of MPs' staff and per MP the staff member works for, filled by the weekly
-- sync (app/api/sync-staff-interests, scripts/sync-staff-interests.js, lib/staff-interests.js) from Parliament's
-- interests API (newest CommonsStaff register; Open Parliament Licence v3.0).
-- Owner's decisions: no staff names are stored or shown (the register publishes job titles only since January 2026, and
-- the sub item "Name" fields are never read); a councillor role is stored as "Councillor", with the council as the
-- organisation, never the ward.
-- Read only for the site, as mp_conduct_findings: row level security on with a SELECT policy for everyone; anon and
-- authenticated get nothing; service_role (the sync) may read and write.
-- New table, so there are no existing rows to back up. Undo: 2026-11-03d-mp-staff-interests-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03d-mp-staff-interests.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.mp_staff_interests') IS NOT NULL THEN
    RAISE EXCEPTION 'mp_staff_interests already exists';
  END IF;
END $$;

CREATE TABLE public.mp_staff_interests (
  id                   bigserial PRIMARY KEY,
  interest_id          integer NOT NULL,          -- the register entry's Id in the interests API
  member_id            integer NOT NULL,          -- the MP the staff member works for (Mnis Id)
  register_id          integer NOT NULL,          -- the register the entry was last seen in
  register_date        date,                      -- that register's publication date
  category             text NOT NULL CHECK (category IN ('employment', 'gift', 'visit')),
  job_title            text,                      -- the staff member's job for this MP; never a name
  description          text,                      -- employment: the role ("Councillor" for any councillor role);
                                                  -- gift: what was given; visit: the purpose
  organisation         text,                      -- employment: the payer; gift and visit: the source
  payer_is_consultancy boolean,                   -- employment only
  country              text,                      -- visit only
  start_date           date,                      -- employment and visit start; gift: date received
  end_date             date,
  registered_date      date,
  link                 text,                      -- the entry in the interests API
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interest_id, member_id)
);
CREATE INDEX mp_staff_interests_member_idx ON public.mp_staff_interests (member_id);

ALTER TABLE public.mp_staff_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mp staff interests" ON public.mp_staff_interests FOR SELECT TO public USING (true);
REVOKE ALL ON public.mp_staff_interests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_staff_interests TO service_role;
REVOKE ALL ON SEQUENCE public.mp_staff_interests_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.mp_staff_interests_id_seq TO service_role;

COMMIT;
