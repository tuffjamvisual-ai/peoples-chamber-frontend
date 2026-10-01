-- Leader name cleanup — NULL out Wikidata artefacts and non-name values.
--
-- Targets six rows where leader_name was set by the Wikidata backfill but
-- contains no real person name:
--
--   'Alternative - Sec. 31'   — Wikidata blank-node fallback (hyphen-minus variant)
--   'Alternative – Sec. 31'   — same fallback, en-dash variant (east-cambridgeshire)
--   Wikidata blank-node URI   — Epsom and Ewell; Wikidata returned a raw IRI
--   'Totnes'                  — South Hams; a place name leaked in instead of a person
--
-- Explicitly excluded: 'Vacant' (Calderdale) — legitimately leaderless at last sync.
--
-- Conservative write: sets leader_name = NULL only. Does not touch leader_party
-- or any other column.

-- ===== PREVIEW: rows this will update =====
SELECT slug, name AS council_name, leader_name, leader_party
FROM councils
WHERE leader_name IN (
  'Alternative - Sec. 31',
  'Alternative – Sec. 31',
  'http://www.wikidata.org/.well-known/genid/b23feb19a64c615c26c995bf5f98182c',
  'Totnes'
)
ORDER BY leader_name, slug;

-- ===== UPDATE =====
BEGIN;

UPDATE councils
SET leader_name = NULL
WHERE leader_name IN (
  'Alternative - Sec. 31',
  'Alternative – Sec. 31',
  'http://www.wikidata.org/.well-known/genid/b23feb19a64c615c26c995bf5f98182c',
  'Totnes'
);

COMMIT;

-- ===== VERIFY: no bad names remain =====
SELECT slug, name AS council_name, leader_name, leader_party
FROM councils
WHERE leader_name IS NOT NULL
  AND leader_name NOT SIMILAR TO '%[A-Za-z]+ [A-Za-z]%'
ORDER BY leader_name;
