-- UK Parliament petitions + signatures by constituency.
--
-- Source: petition.parliament.uk JSON (Open Government Licence v3.0).
-- Each petition's own JSON (/petitions/<id>.json) carries
-- signatures_by_constituency: [{ name, ons_code, mp, signature_count }],
-- keyed by 2024-boundary ONS codes (E14/W07/S14/N05...), which join
-- directly to mps.constituency_gss_code.
--
-- THRESHOLD: only petitions that reached 10,000 signatures (the point at
-- which the government must respond) are stored. This is stated to
-- readers on the MP profile's Petitions tab, so the threshold must stay
-- in sync with PETITION_SIGNATURE_THRESHOLD in
-- scripts/import-petitions.js and app/api/sync-petitions/route.ts.
--
-- Coverage: current Parliament only (the live petitions site; earlier
-- Parliaments' petitions are on a separate archive site and are not
-- imported).
--
-- Size check before adding (2026-10-11): database 1,231 MB on the Pro
-- plan (8 GB included). Estimated ~750 petitions x up to 650
-- constituencies = ~490k rows in petition_constituency_signatures,
-- roughly 50-70 MB including indexes.

CREATE TABLE IF NOT EXISTS public.petitions (
  id                             bigint PRIMARY KEY,   -- petition.parliament.uk id
  action                         text NOT NULL,        -- the petition's title
  background                     text,
  additional_details             text,
  state                          text NOT NULL,        -- 'open' | 'closed' (as reported by source)
  signature_count                integer NOT NULL,     -- total, all signers worldwide
  uk_constituency_signature_count integer,             -- sum of signatures_by_constituency
  constituency_count             smallint,             -- constituencies with >= 1 signature
  source_created_at              timestamptz,
  opened_at                      timestamptz,
  closed_at                      timestamptz,
  response_threshold_reached_at  timestamptz,
  government_response_at         timestamptz,
  government_response_summary    text,
  debate_threshold_reached_at    timestamptz,
  scheduled_debate_date          date,
  debated_on                     date,
  debate_transcript_url          text,
  debate_video_url               text,
  departments                    jsonb,                -- [{ acronym, name, url }]
  topics                         jsonb,
  url                            text NOT NULL,        -- public petition page
  source_updated_at              timestamptz,          -- attributes.updated_at from source
  synced_at                      timestamptz NOT NULL DEFAULT now(),
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_petitions_state
  ON public.petitions (state);

CREATE INDEX IF NOT EXISTS idx_petitions_signature_count
  ON public.petitions (signature_count DESC);

CREATE TABLE IF NOT EXISTS public.petition_constituency_signatures (
  petition_id            bigint NOT NULL REFERENCES public.petitions (id) ON DELETE CASCADE,
  constituency_gss_code  text NOT NULL,
  constituency_name      text NOT NULL,
  signature_count        integer NOT NULL,
  -- Rank of this constituency among all constituencies for this petition
  -- (1 = most signatures). Ties share a rank (standard competition
  -- ranking: 1, 2, 2, 4).
  rank_in_petition       smallint NOT NULL,
  -- This constituency's share of the petition's UK-constituency total,
  -- as a percentage (e.g. 0.4123 = 0.4123%).
  share_of_petition_pct  numeric(8,4),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (petition_id, constituency_gss_code)
);

-- MP profile query: "petitions most signed in this constituency".
CREATE INDEX IF NOT EXISTS idx_petition_const_sigs_gss_count
  ON public.petition_constituency_signatures (constituency_gss_code, signature_count DESC);

-- Read-only public access via the anon key; writes go through the
-- service-role client (supabaseAdmin), which bypasses RLS. Same pattern
-- as 2026-09-24-editorials.sql.
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_constituency_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "petitions_anon_read"
  ON public.petitions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "petition_constituency_signatures_anon_read"
  ON public.petition_constituency_signatures
  FOR SELECT
  TO anon
  USING (true);
