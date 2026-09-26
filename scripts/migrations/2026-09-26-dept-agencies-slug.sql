-- Add slug column to dept_agencies, backfill from URL path, and index.
-- All 205 existing rows match https://www.gov.uk/government/organisations/<slug>;
-- regexp_replace extracts the final path segment as the slug.
-- Index is non-unique: 5 agencies are cross-departmental (same slug under 2 dept_slugs),
-- which is valid data. The layout query uses .limit(1) to handle those gracefully.

ALTER TABLE public.dept_agencies ADD COLUMN slug text;

UPDATE public.dept_agencies
  SET slug = regexp_replace(url, '^.*/government/organisations/', '')
  WHERE url LIKE '%/government/organisations/%';

CREATE INDEX idx_dept_agencies_slug ON public.dept_agencies(slug);
