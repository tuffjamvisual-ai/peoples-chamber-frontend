-- 2026-11-13a-t1-updated-notes-CHECK: T1-UPDATED (owner approved 13 Nov 2026, database edit; DECISIONS.md 13 Nov 2026 item 1).
-- Read only. One row per report: migrated (note written, line gone from both bodies, line found 0 times in body_text) or before
-- (line first in both, found exactly once, no note), with block and character counts.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
-- The three rows as an inline list (a read-only transaction cannot create a temp table).
WITH t1_upd (slug, line, d, note) AS (VALUES
  ('k9m4qxw7n2', 'Updated 24 October 2026 with the Bicester and Barnham applications, the reduced Barnham capacity and the latest on Linton-on-Ouse.', '2026-10-24', 'Added the Bicester and Barnham applications, the reduced Barnham capacity and the latest on Linton-on-Ouse.'),
  ('rm9x2qk7v4', 'Updated 24 October 2026. This report was first published on 12 July 2026, when Hollie Ridley had announced her departure and no successor had been chosen.', '2026-10-24', 'This report was first published on 12 July 2026, when Hollie Ridley had announced her departure and no successor had been chosen.'),
  ('ten-worst-performing-councils-england', 'Updated 5 November 2026 with Slough''s Ofsted inspection and the commissioners'' eighth report, the withdrawal of the Essex reorganisation decision, and government debt support for Woking and Thurrock.', '2026-11-05', 'Added Slough''s Ofsted inspection and the commissioners'' eighth report, the withdrawal of the Essex reorganisation decision, and government debt support for Woking and Thurrock.'))
SELECT e.slug,
  CASE WHEN e.update_note = jsonb_build_array(jsonb_build_object('date', t.d, 'text', t.note)) AND e.body_json->0->>'text' IS DISTINCT FROM t.line
            AND position(t.line in e.body_text) = 0 THEN 'migrated'
       WHEN e.update_note IS NULL AND e.body_json->0->>'text' = t.line AND left(e.body_text, length(t.line) + 2) = t.line || E'\n\n'
            AND (length(e.body_text) - length(replace(e.body_text, t.line, ''))) / length(t.line) = 1 THEN 'before'
       ELSE 'UNEXPECTED' END AS state,
  jsonb_array_length(e.body_json) AS blocks, length(e.body_text) AS chars, e.update_note::text AS update_note,
  left(e.body_json->0->>'text', 70) AS first_block
FROM editorials e JOIN t1_upd t ON t.slug = e.slug ORDER BY e.slug;
ROLLBACK;
