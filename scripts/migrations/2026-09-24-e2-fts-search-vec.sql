-- Migration: E2 — search_vec FTS columns on press_releases, briefings, bill, mps,
--            and a new materialized view for commons_divisions_titled FTS.
-- Applied: 2026-09-24
-- Purpose: add generated stored tsvector columns following the editorials.search_vec
--          pattern from E1. Each column is GIN-indexed so @@ queries hit the index.
--
-- commons_divisions_titled is a VIEW over the 1.14M-row mp_division_votes table.
-- Generated columns are not supported on views, and backfilling a stored column
-- on the base table would lock 1.14M rows. Instead, we create a materialized view
-- commons_divisions_fts (mirroring the sitemap_divisions pattern from
-- 2026-09-14-sitemap-matviews-and-refresh.sql) — the view already deduplicates
-- to one row per (division_date_only, division_number), so the mat view is
-- compact (~2376 rows). Refresh after bulk vote imports with:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.commons_divisions_fts;

-- ── press_releases ─────────────────────────────────────────────────────────────

ALTER TABLE public.press_releases
  ADD COLUMN IF NOT EXISTS search_vec tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      title                        || ' ' ||
      coalesce(description, '')    || ' ' ||
      coalesce(body,        '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS press_releases_fts_idx
  ON public.press_releases USING gin (search_vec);

-- ── briefings ──────────────────────────────────────────────────────────────────

ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS search_vec tsvector GENERATED ALWAYS AS (
    to_tsvector('english', headline || ' ' || body)
  ) STORED;

CREATE INDEX IF NOT EXISTS briefings_fts_idx
  ON public.briefings USING gin (search_vec);

-- ── bill ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.bill
  ADD COLUMN IF NOT EXISTS search_vec tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title)
  ) STORED;

CREATE INDEX IF NOT EXISTS bill_fts_idx
  ON public.bill USING gin (search_vec);

-- ── mps ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.mps
  ADD COLUMN IF NOT EXISTS search_vec tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(display_name,  '') || ' ' ||
      coalesce(constituency,  '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS mps_fts_idx
  ON public.mps USING gin (search_vec);

-- ── commons_divisions_titled FTS ───────────────────────────────────────────────
-- View-backed; mat view deduplicates to ~2376 rows at one row per
-- (division_date_only, division_number) — same grain as the view itself.
-- Unique index enables CONCURRENT refresh without locking readers.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.commons_divisions_fts AS
  SELECT
    division_date_only,
    division_number,
    division_title,
    to_tsvector('english', coalesce(division_title, '')) AS search_vec
  FROM public.commons_divisions_titled;

CREATE UNIQUE INDEX IF NOT EXISTS commons_divisions_fts_pk_idx
  ON public.commons_divisions_fts (division_date_only, division_number);

CREATE INDEX IF NOT EXISTS commons_divisions_fts_search_idx
  ON public.commons_divisions_fts USING gin (search_vec);

GRANT SELECT ON public.commons_divisions_fts TO anon;
