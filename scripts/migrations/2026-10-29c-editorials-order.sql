-- 2026-10-29c: the editorials table keeps the order the code lists pieces in (owner's approval, 29 Oct 2026, option 1).
-- Pages sort by date and keep this order for pieces with the same date, so reading from the database needs it to give
-- the same pages. Both columns nullable; nothing else changes. Written by scripts/sync-editorials-to-db.ts; checked by
-- scripts/checks/editorials-db-roundtrip.ts. Undo: 2026-10-29c-UNDO.sql.
--   registry_order   position of the piece in lib/editorials/index.ts (the published registry), from 0
--   topic_positions  its position in each topic's editorialSlugs (lib/topics.ts), for example {"housing": 12}

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.editorials
  ADD COLUMN registry_order  int,
  ADD COLUMN topic_positions jsonb;

COMMENT ON COLUMN public.editorials.registry_order IS 'Position in the lib/editorials/index.ts registry (published pieces, from 0); breaks date ties as the code does.';
COMMENT ON COLUMN public.editorials.topic_positions IS 'Position within each topic''s editorialSlugs in lib/topics.ts, as {"topic-slug": index}.';

COMMIT;
