-- Migration: D1 — policy_programmes and programme_timeline tables
-- Applied: 2026-09-24
-- Purpose: schema for the government memory / policy programme tracker feature.
--
-- Design decisions:
--   - actual_figure/actual_as_of are NOT on policy_programmes. All measured
--     progress lives in programme_timeline rows. The page derives "current figure"
--     from the most recent approved timeline entry. This keeps is_live as a
--     once-and-forever gate — the cron never sets it back to false.
--   - is_live / is_approved follow the same boolean-gate pattern as briefings.is_published:
--     the cron inserts with the gate = false and sets extraction_meta._needs_review = true;
--     a human flips the boolean in the Supabase table editor.
--   - slug UNIQUE already creates an index; no redundant CREATE INDEX on that column.

-- ── policy_programmes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.policy_programmes (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug             text        UNIQUE NOT NULL,
  name             text        NOT NULL,
  dept_slugs       text[]      NOT NULL DEFAULT '{}',
  status           text        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
  summary          text,
  started_date     date,

  -- political commitment: set at creation, rarely changed
  target_label     text,       -- e.g. "1.5 million new homes by 2030"
  target_figure    numeric,
  target_unit      text,       -- e.g. "homes", "patients waiting", "days"

  -- human-flip gate: once true, never reset to false by the extraction cron
  is_live          boolean     NOT NULL DEFAULT false,
  went_live_at     timestamptz,

  -- machine-side metadata, mirrors briefings.verification
  extraction_meta  jsonb,      -- { _needs_review, _extracted_by, _run_date }

  model            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_programmes_is_live_idx
  ON public.policy_programmes (is_live);

CREATE INDEX IF NOT EXISTS policy_programmes_dept_slugs_idx
  ON public.policy_programmes USING gin (dept_slugs);

ALTER TABLE public.policy_programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read live programmes"
  ON public.policy_programmes
  FOR SELECT
  USING (is_live = true);

-- ── programme_timeline ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.programme_timeline (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  programme_id    bigint      NOT NULL REFERENCES public.policy_programmes(id) ON DELETE CASCADE,
  entry_date      date        NOT NULL,
  title           text        NOT NULL,
  body            text,
  source_url      text,
  source_label    text,

  -- actual figure at this point in time; null for narrative-only entries
  figure_value    numeric,
  figure_unit     text,

  -- human-flip gate per entry, mirrors briefings.is_published
  is_approved     boolean     NOT NULL DEFAULT false,
  approved_at     timestamptz,

  -- machine-side metadata
  extraction_meta jsonb,      -- { _needs_review, _extracted_by, _run_date, _source_url }

  model           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS programme_timeline_programme_date_idx
  ON public.programme_timeline (programme_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS programme_timeline_is_approved_idx
  ON public.programme_timeline (is_approved);

ALTER TABLE public.programme_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read approved timeline entries"
  ON public.programme_timeline
  FOR SELECT
  USING (is_approved = true);
