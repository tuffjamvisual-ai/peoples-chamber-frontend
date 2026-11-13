-- 2026-11-13a-t1-updated-notes-UNDO: T1-UPDATED (owner approved 13 Nov 2026, database edit; DECISIONS.md 13 Nov 2026 item 1).
-- Undo: puts each first line back (body_json block 0 and body_text with its blank line) and empties update_note.
-- Guard: each row holds exactly the note the migration wrote and no longer starts with the line; exactly 3 rows change.
-- Rehearse with -v end=ROLLBACK, run with -v end=COMMIT.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE t1_upd (slug text PRIMARY KEY, line text NOT NULL, d text NOT NULL, note text NOT NULL) ON COMMIT DROP;
INSERT INTO t1_upd VALUES
  ('k9m4qxw7n2', 'Updated 24 October 2026 with the Bicester and Barnham applications, the reduced Barnham capacity and the latest on Linton-on-Ouse.', '2026-10-24', 'Added the Bicester and Barnham applications, the reduced Barnham capacity and the latest on Linton-on-Ouse.'),
  ('rm9x2qk7v4', 'Updated 24 October 2026. This report was first published on 12 July 2026, when Hollie Ridley had announced her departure and no successor had been chosen.', '2026-10-24', 'This report was first published on 12 July 2026, when Hollie Ridley had announced her departure and no successor had been chosen.'),
  ('ten-worst-performing-councils-england', 'Updated 5 November 2026 with Slough''s Ofsted inspection and the commissioners'' eighth report, the withdrawal of the Essex reorganisation decision, and government debt support for Woking and Thurrock.', '2026-11-05', 'Added Slough''s Ofsted inspection and the commissioners'' eighth report, the withdrawal of the Essex reorganisation decision, and government debt support for Woking and Thurrock.');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials e JOIN t1_upd t ON t.slug = e.slug
    WHERE e.update_note = jsonb_build_array(jsonb_build_object('date', t.d, 'text', t.note))
      AND e.body_json->0->>'text' IS DISTINCT FROM t.line AND left(e.body_text, length(t.line)) <> t.line;
  IF n <> 3 THEN RAISE EXCEPTION 'T1-UPDATED UNDO: % of 3 reports in the migrated state', n; END IF;
  UPDATE editorials e SET
      update_note = NULL,
      body_json = jsonb_build_array(jsonb_build_object('text', t.line, 'type', 'bioLine')) || e.body_json,
      body_text = t.line || E'\n\n' || e.body_text
    FROM t1_upd t
    WHERE e.slug = t.slug AND e.update_note = jsonb_build_array(jsonb_build_object('date', t.d, 'text', t.note));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'T1-UPDATED UNDO: % reports changed (expected 3)', n; END IF;
  RAISE NOTICE 'T1-UPDATED UNDO: 3 reports restored';
END $$;

:end;
