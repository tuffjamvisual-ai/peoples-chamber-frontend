-- /news/<slug> looked releases up with gov_url ILIKE '%/<slug>', a scan of every row (45k)
-- with no usable index. Near the 3 s limit a slow scan returned nothing, the page answered
-- 404, and that 404 was cached: the link crawl of 16 Oct 2026 found a release linked from
-- /departments/environment returning 404 live but 200 locally. This adds the slug as a stored
-- column (the same rule as lib/govUrlSlug.ts, lower-cased) with an index.

\set ON_ERROR_STOP on
ALTER TABLE public.press_releases
  ADD COLUMN IF NOT EXISTS news_slug text
  GENERATED ALWAYS AS (
    lower(regexp_replace(
      regexp_replace(split_part(split_part(coalesce(gov_url, ''), '?', 1), '#', 1), '^.*/([^/]+)/*$', '\1'),
      '[^A-Za-z0-9-]', '', 'g'))
  ) STORED;
CREATE INDEX IF NOT EXISTS press_releases_news_slug_idx ON public.press_releases (news_slug);
SELECT news_slug, gov_url FROM public.press_releases WHERE news_slug = 'new-pioneering-certificates-to-help-homeowners-cut-flood-risk';
SELECT count(*) AS rows, count(*) FILTER (WHERE news_slug = '' OR news_slug IS NULL) AS without_slug FROM public.press_releases;
