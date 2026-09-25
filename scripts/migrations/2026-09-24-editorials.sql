-- Migration: editorials table
-- Applied: 2026-09-24
-- Purpose: mirror hand-authored editorials from lib/editorials/ into Postgres
--          so department/member/bill pages can query which investigations
--          mention them (via related_dept_slugs, related_member_ids,
--          related_bill_ids). Populated by scripts/sync-editorials-to-db.ts
--          which runs as a Vercel prebuild step on production deploys only.

CREATE TABLE IF NOT EXISTS public.editorials (
  slug                text                     PRIMARY KEY,
  headline            text                     NOT NULL,
  standfirst          text                     NOT NULL,
  published_at        date                     NOT NULL,
  author_byline       text                     NOT NULL,
  kind                text,                    -- NULL = investigation, 'briefing' = briefing
  kicker              text,
  body_text           text,                    -- plain-text extraction (input to search_vec)
  body_json           jsonb,                   -- full Block[] for future rendering
  related_dept_slugs  text[]      NOT NULL DEFAULT '{}',
  related_member_ids  integer[]   NOT NULL DEFAULT '{}',
  related_bill_ids    integer[]   NOT NULL DEFAULT '{}',
  synced_at           timestamp with time zone NOT NULL DEFAULT now(),
  -- Generated stored tsvector; index this column directly rather than
  -- repeating the expression in every query.
  search_vec          tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(headline,   '') || ' ' ||
      coalesce(standfirst, '') || ' ' ||
      coalesce(body_text,  '')
    )
  ) STORED
);

-- GIN indexes for array membership queries (B3 and future member/bill tabs)
CREATE INDEX IF NOT EXISTS editorials_related_dept_slugs_idx
  ON public.editorials USING gin (related_dept_slugs);

CREATE INDEX IF NOT EXISTS editorials_related_member_ids_idx
  ON public.editorials USING gin (related_member_ids);

CREATE INDEX IF NOT EXISTS editorials_related_bill_ids_idx
  ON public.editorials USING gin (related_bill_ids);

-- Sorted listing
CREATE INDEX IF NOT EXISTS editorials_published_at_idx
  ON public.editorials (published_at DESC);

-- Filter investigations vs briefings
CREATE INDEX IF NOT EXISTS editorials_kind_idx
  ON public.editorials (kind);

-- Full-text search: index the stored generated column directly
CREATE INDEX IF NOT EXISTS editorials_fts_idx
  ON public.editorials USING gin (search_vec);

ALTER TABLE public.editorials ENABLE ROW LEVEL SECURITY;

-- Anon read: needed for B3 dept-page tab and any future public queries
CREATE POLICY "editorials_anon_read"
  ON public.editorials
  FOR SELECT
  TO anon
  USING (true);

-- service_role bypasses RLS automatically; no explicit write policy needed.
