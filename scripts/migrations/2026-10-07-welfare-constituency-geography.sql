-- Migration: welfare constituency geography (council/county lookup)
-- Date: 2026-10-07
--
-- Supports the standalone welfare search: typing a postcode, a
-- constituency name, OR a council/county name and getting to the right
-- constituency page. Postcode and constituency-name matching already
-- work via /api/find-mp's pattern; this table adds the missing piece —
-- which council(s) and county/unitary authority each Westminster
-- constituency sits in — so a county/council search can resolve to the
-- list of constituencies inside it.
--
-- SOURCE: ONS "Ward to Westminster Parliamentary Constituency to LAD to
-- CTYUA (May 2025) Lookup in the UK". Columns used: PCON24CD/PCON24NM
-- (constituency — same July-2024 boundary vintage already used for
-- mps.constituency_gss_code), LAD25CD/LAD25NM (council), CTYUA25CD/
-- CTYUA25NM (county/unitary authority — this is what a "county" search
-- actually matches against). The source lookup is ward-level; this
-- table is deduplicated to one row per distinct (constituency, council)
-- pair, since a search only needs "which council(s) is this
-- constituency in", not the ward detail.
--
-- SCOPE: Great Britain only (England, Wales, Scotland), matching the
-- welfare tool's own DWP Stat-Xplore coverage. Northern Ireland rows
-- from the source lookup are not imported — NI's welfare data comes
-- from a different system entirely and isn't part of this feature.
--
-- KNOWN CAVEAT: England is partway through local government
-- reorganisation (new unitary councils replacing some county/district
-- structures through 2026-2027). The LAD25 codes in the May 2025 source
-- lookup may not all match an existing row in the councils table if
-- councils.gss_code was seeded from an earlier LAD vintage. The backfill
-- script reports any council_gss_code that doesn't match the councils
-- table rather than failing — county_name/council_name are stored
-- directly from the ONS source either way, so the search still works
-- even where the councils-table link doesn't resolve; only the "link
-- through to the existing council page" convenience is affected.
--
-- No RLS — public reference geography, same as councils and the other
-- welfare_* tables.

BEGIN;

CREATE TABLE IF NOT EXISTS public.welfare_constituency_geography (
  id                    bigserial PRIMARY KEY,
  constituency_gss_code text NOT NULL,
  council_gss_code      text NOT NULL,       -- LAD code from the ONS source (LAD25CD)
  council_name          text NOT NULL,
  county_gss_code        text,                -- CTYUA code (CTYUA25CD) — null for the handful of areas with no county tier above the council
  county_name            text,
  source_release_id     bigint REFERENCES public.welfare_source_releases (id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- A constituency only rarely spans more than one council (mostly where
-- ward boundaries were split across the 2024 constituency review), so
-- this is a small table, but it's genuinely many-to-many, not 1:1 —
-- hence a composite uniqueness constraint rather than a single-column
-- primary key on constituency_gss_code.
CREATE UNIQUE INDEX IF NOT EXISTS welfare_constituency_geography_uniq
  ON public.welfare_constituency_geography (constituency_gss_code, council_gss_code);

CREATE INDEX IF NOT EXISTS idx_welfare_constituency_geography_constituency
  ON public.welfare_constituency_geography (constituency_gss_code);

-- The search needs to go the other way too: "Kent" -> every
-- constituency in it. Matching is done on the normalised name in
-- application code (same norm() convention as /api/find-mp), so a
-- plain index on the raw name is enough to make that lookup fast
-- without needing a generated/normalised column.
CREATE INDEX IF NOT EXISTS idx_welfare_constituency_geography_county_name
  ON public.welfare_constituency_geography (county_name);

CREATE INDEX IF NOT EXISTS idx_welfare_constituency_geography_council_name
  ON public.welfare_constituency_geography (council_name);

-- Disable RLS — public reference geography, consistent with the other
-- welfare_* tables (see 2026-10-06 migration).
ALTER TABLE public.welfare_constituency_geography DISABLE ROW LEVEL SECURITY;

COMMIT;
