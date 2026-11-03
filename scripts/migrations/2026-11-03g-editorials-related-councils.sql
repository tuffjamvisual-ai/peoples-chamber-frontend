-- 2026-11-03g: related councils on reports (owner's brief, 3 Nov 2026). Adds editorials.related_council_slugs (text[],
-- empty by default, like related_dept_slugs) and fills it for the 16 reports with HIGH matches in
-- "Claude outputs/report-council-links.csv" (30 links to 28 councils: the council's full official name, or
-- "<place> Council" / "City Council" / "County Council" naming exactly one council). REVIEW rows are not used. No
-- report's text changes. The editorials index and council pages read this list together with councils linked in the
-- body text (lib/editorials/council-slugs.ts).
-- Guards (RAISE): every report slug exists exactly once and is published; every council slug exists exactly once.
-- Backup: "Claude outputs/editorials-related-councils-backup-2026-11-03.json" (the 16 rows before; the column is new).
-- Undo: 2026-11-03g-editorials-related-councils-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03g-editorials-related-councils.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['fxdep4e6wh', 'bmcgmghjcz', 'xm7co0hssx', 'qm4n9mxw7r', 'k9m4qxw7n2', 'ten-worst-performing-councils-england', 'fcndv9yadp', '0qcn1ofw7f', 'y9aa644amu', 'upk2tz9zw9', 'cq4r8vn2mp', 'hx7n4qw2mk', 'tn4k7mxw9r', 'as6k2mwx9q', '0w7zrd55z9', 'hm4q9xk2ta']::text[] LOOP
    SELECT count(*) INTO n FROM editorials WHERE slug = r AND NOT unpublished;
    IF n <> 1 THEN RAISE EXCEPTION 'report % found % times published (expected exactly 1)', r, n; END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['bedford', 'birmingham', 'bristol', 'cherwell', 'cornwall', 'derby', 'devon', 'dorset', 'east-sussex', 'kirklees', 'lewes', 'luton', 'manchester', 'northumberland', 'nottingham', 'nottinghamshire', 'oldham', 'pembrokeshire', 'rother', 'rotherham', 'rugby', 'rutland', 'shropshire', 'slough', 'tower-hamlets', 'wealden', 'west-devon', 'west-suffolk']::text[] LOOP
    SELECT count(*) INTO n FROM councils WHERE slug = r;
    IF n <> 1 THEN RAISE EXCEPTION 'council % found % times (expected exactly 1)', r, n; END IF;
  END LOOP;
END $$;

ALTER TABLE editorials ADD COLUMN IF NOT EXISTS related_council_slugs text[] NOT NULL DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS editorials_related_council_slugs_idx ON editorials USING gin (related_council_slugs);
UPDATE editorials SET related_council_slugs = ARRAY['kirklees']::text[] WHERE slug = 'fxdep4e6wh';
UPDATE editorials SET related_council_slugs = ARRAY['manchester']::text[] WHERE slug = 'bmcgmghjcz';
UPDATE editorials SET related_council_slugs = ARRAY['rotherham']::text[] WHERE slug = 'xm7co0hssx';
UPDATE editorials SET related_council_slugs = ARRAY['rugby']::text[] WHERE slug = 'qm4n9mxw7r';
UPDATE editorials SET related_council_slugs = ARRAY['cherwell', 'west-suffolk']::text[] WHERE slug = 'k9m4qxw7n2';
UPDATE editorials SET related_council_slugs = ARRAY['slough']::text[] WHERE slug = 'ten-worst-performing-councils-england';
UPDATE editorials SET related_council_slugs = ARRAY['derby']::text[] WHERE slug = 'fcndv9yadp';
UPDATE editorials SET related_council_slugs = ARRAY['bedford']::text[] WHERE slug = '0qcn1ofw7f';
UPDATE editorials SET related_council_slugs = ARRAY['luton']::text[] WHERE slug = 'y9aa644amu';
UPDATE editorials SET related_council_slugs = ARRAY['tower-hamlets']::text[] WHERE slug = 'upk2tz9zw9';
UPDATE editorials SET related_council_slugs = ARRAY['nottinghamshire', 'east-sussex', 'west-devon', 'wealden', 'rother', 'nottingham', 'rutland', 'lewes', 'devon', 'bristol', 'dorset']::text[] WHERE slug = 'cq4r8vn2mp';
UPDATE editorials SET related_council_slugs = ARRAY['oldham']::text[] WHERE slug = 'hx7n4qw2mk';
UPDATE editorials SET related_council_slugs = ARRAY['cornwall']::text[] WHERE slug = 'tn4k7mxw9r';
UPDATE editorials SET related_council_slugs = ARRAY['shropshire']::text[] WHERE slug = 'as6k2mwx9q';
UPDATE editorials SET related_council_slugs = ARRAY['northumberland', 'pembrokeshire', 'birmingham', 'nottingham']::text[] WHERE slug = '0w7zrd55z9';
UPDATE editorials SET related_council_slugs = ARRAY['cherwell']::text[] WHERE slug = 'hm4q9xk2ta';

COMMIT;
