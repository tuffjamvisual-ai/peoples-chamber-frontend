-- Early Day Motions (EDMs) + every MP signature on them.
--
-- Source: UK Parliament Oral Questions and Motions API
-- (oralquestionsandmotions-api.parliament.uk), no API key, live-verified
-- 2026-10-11: 4,086 EDMs tabled since the 4 July 2024 general election.
--
-- /EarlyDayMotion/{id} returns a Sponsors array holding EVERY signature:
-- SponsoringOrder 1-6 are the motion's sponsors (1 = primary sponsor, who
-- normally tabled it), 7+ are supporters, and withdrawn signatures carry
-- IsWithdrawn = true and SponsoringOrder = null. Verified against
-- edm.parliament.uk for EDM 62415 "Ban trophy hunting imports": 124
-- entries = 6 sponsors + 117 further supporters + 1 withdrawn.
--
-- member_id is the UK Parliament member id (MnisId), the same id as
-- mps.member_id.
--
-- signature_count = non-withdrawn signatures, computed from the Sponsors
-- array. source_sponsors_count is the list endpoint's SponsorsCount (which
-- includes withdrawn entries), stored only so the daily sync can spot
-- motions whose signatures changed without re-fetching all of them.
--
-- status: 'published' or 'withdrawn' (the API's own two statuses; the
-- list endpoint returns them as 0 / 1).
--
-- Size estimate: ~4,100 motions, roughly 60-100k signature rows,
-- ~10-15 MB including indexes.

CREATE TABLE IF NOT EXISTS public.early_day_motions (
  id                        integer PRIMARY KEY,   -- API Id (used in edm.parliament.uk URLs)
  uin                       integer,
  uin_with_suffix           text,                  -- e.g. "849" or "849A1" for amendments
  title                     text NOT NULL,
  motion_text               text,                  -- plain text as published
  date_tabled               date NOT NULL,
  status                    text NOT NULL,         -- 'published' | 'withdrawn'
  status_date               timestamptz,
  primary_sponsor_id        integer,               -- member id
  amendment_to_motion_id    integer,               -- set when this is an amendment to another EDM
  is_prayer                 boolean NOT NULL DEFAULT false, -- prays against a negative statutory instrument
  statutory_instrument_title text,
  signature_count           integer NOT NULL,      -- non-withdrawn signatures
  source_sponsors_count     integer,               -- list endpoint SponsorsCount (change detection only)
  synced_at                 timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edms_primary_sponsor_date
  ON public.early_day_motions (primary_sponsor_id, date_tabled DESC);

CREATE INDEX IF NOT EXISTS idx_edms_synced_at
  ON public.early_day_motions (synced_at);

CREATE TABLE IF NOT EXISTS public.early_day_motion_signatures (
  edm_id            integer NOT NULL REFERENCES public.early_day_motions (id) ON DELETE CASCADE,
  member_id         integer NOT NULL,
  member_name       text NOT NULL,
  party             text,
  sponsoring_order  integer,                       -- 1 = primary sponsor, 2-6 sponsors, 7+ supporters; NULL if withdrawn
  signed_at         timestamptz,
  is_withdrawn      boolean NOT NULL DEFAULT false,
  withdrawn_at      timestamptz,
  PRIMARY KEY (edm_id, member_id)
);

-- MP profile query: an MP's signatures, newest first.
CREATE INDEX IF NOT EXISTS idx_edm_signatures_member_signed
  ON public.early_day_motion_signatures (member_id, signed_at DESC);

-- Read-only public access via the anon key; writes go through the
-- service-role client, which bypasses RLS.
ALTER TABLE public.early_day_motions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.early_day_motion_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "early_day_motions_anon_read"
  ON public.early_day_motions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "early_day_motion_signatures_anon_read"
  ON public.early_day_motion_signatures
  FOR SELECT
  TO anon
  USING (true);
