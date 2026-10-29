-- 2026-10-29b: the editorials table holds every EditorialEntry field (owner's approval, 29 Oct 2026, "go stage A").
-- Stage A only: the site still reads articles from the code (lib/editorials); this completes the database copy so a
-- later stage can read from it. New columns only, all nullable except unpublished; no existing column is changed.
-- Written by scripts/sync-editorials-to-db.ts; checked by scripts/checks/editorials-db-roundtrip.ts.
-- Undo: 2026-10-29b-UNDO.sql (drops these columns only).
--
-- Field to column, new columns marked *:
--   slug slug · headline headline · standfirst standfirst · summary summary · publishedAt published_at ·
--   authorByline author_byline · kind kind · kicker kicker · body body_json (and body_text, the plain text) ·
--   relatedDeptSlugs related_dept_slugs · relatedMemberIds related_member_ids · relatedBillIds related_bill_ids ·
--   opinion opinion* · heroImage hero_image* · heroAlt hero_alt* · evidence evidence* (the whole object, with
--   lastChecked exactly as written) and last_checked* (that date parsed, for queries) · updateNote update_note* ·
--   relatedProgrammeSlugs related_programme_slugs* · explore explore* · readNext read_next* ·
--   topic membership (lib/topics.ts editorialSlugs) topic_slugs* · UNPUBLISHED_EDITORIALS unpublished* ·
--   updated_at* (when the row's content last changed).

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.editorials
  ADD COLUMN opinion                 boolean,
  ADD COLUMN hero_image              text,
  ADD COLUMN hero_alt                text,
  ADD COLUMN evidence                jsonb,
  ADD COLUMN last_checked            date,
  ADD COLUMN update_note             jsonb,
  ADD COLUMN related_programme_slugs text[],
  ADD COLUMN explore                 jsonb,
  ADD COLUMN read_next               text[],
  ADD COLUMN topic_slugs             text[],
  ADD COLUMN unpublished             boolean NOT NULL DEFAULT false,
  ADD COLUMN updated_at              timestamptz;

COMMENT ON COLUMN public.editorials.evidence IS 'EditorialEntry.evidence as written in the code (recordsReviewed, contacted, response, lastChecked).';
COMMENT ON COLUMN public.editorials.last_checked IS 'evidence.lastChecked parsed to a date (it is written either as 2026-10-29 or as 29 October 2026).';
COMMENT ON COLUMN public.editorials.topic_slugs IS 'Topics that list this piece in lib/topics.ts editorialSlugs, in topic order.';
COMMENT ON COLUMN public.editorials.updated_at IS 'When the sync last changed this row''s content (not set when a sync writes the same content again).';

COMMIT;
