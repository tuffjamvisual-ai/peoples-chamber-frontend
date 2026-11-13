-- 2026-11-13a-t1-updated-notes: T1-UPDATED (owner approved 13 Nov 2026, database edit; DECISIONS.md 13 Nov 2026 item 1).
-- The "Updated <date> ..." first line of three reports moves word for word into editorials.update_note, the same
-- format as the other three reports with notes ([{"date": "YYYY-MM-DD", "text": "..."}], the text being the words after "Updated <date>"),
-- and that first line (the opening bioLine block of body_json, and the same line plus its blank line at the start of body_text) is
-- removed. Nothing else in the text changes. search_vec is generated from body_text. No triggers on editorials.
-- Reports: ten-worst-performing-councils-england (5 Nov 2026), rm9x2qk7v4 and k9m4qxw7n2 (24 Oct 2026).
-- Guard (RAISE): each report's first body_json block is a bioLine holding exactly the line, it is the only bioLine, body_text starts with
-- the line and a blank line exactly once, update_note is empty; exactly 3 rows change.
-- Backup: "Claude outputs/t1-updated-backup-2026-11-13.json" (the 3 rows' slug, published_at, update_note, body_json, body_text, before).
-- Undo: 2026-11-13a-t1-updated-notes-UNDO.sql. Check (read only): 2026-11-13a-t1-updated-notes-CHECK.sql.
-- Rehearse: psql "$DATABASE_URL" -v end=ROLLBACK -f scripts/migrations/2026-11-13a-t1-updated-notes.sql
-- Run:      psql "$DATABASE_URL" -v end=COMMIT   -f scripts/migrations/2026-11-13a-t1-updated-notes.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE t1_upd (slug text PRIMARY KEY, line text NOT NULL, d text NOT NULL, note text NOT NULL) ON COMMIT DROP;
INSERT INTO t1_upd VALUES
  ('k9m4qxw7n2', 'Updated 24 October 2026 with the Bicester and Barnham applications, the reduced Barnham capacity and the latest on Linton-on-Ouse.', '2026-10-24', 'with the Bicester and Barnham applications, the reduced Barnham capacity and the latest on Linton-on-Ouse.'),
  ('rm9x2qk7v4', 'Updated 24 October 2026. This report was first published on 12 July 2026, when Hollie Ridley had announced her departure and no successor had been chosen.', '2026-10-24', 'This report was first published on 12 July 2026, when Hollie Ridley had announced her departure and no successor had been chosen.'),
  ('ten-worst-performing-councils-england', 'Updated 5 November 2026 with Slough''s Ofsted inspection and the commissioners'' eighth report, the withdrawal of the Essex reorganisation decision, and government debt support for Woking and Thurrock.', '2026-11-05', 'with Slough''s Ofsted inspection and the commissioners'' eighth report, the withdrawal of the Essex reorganisation decision, and government debt support for Woking and Thurrock.');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM editorials e JOIN t1_upd t ON t.slug = e.slug
    WHERE e.body_json->0->>'type' = 'bioLine' AND e.body_json->0->>'text' = t.line
      AND (SELECT count(*) FROM jsonb_array_elements(e.body_json) b WHERE b->>'type' = 'bioLine') = 1
      AND left(e.body_text, length(t.line) + 2) = t.line || E'\n\n'
      AND (length(e.body_text) - length(replace(e.body_text, t.line, ''))) / length(t.line) = 1
      AND (e.update_note IS NULL OR e.update_note = '[]'::jsonb);
  IF n <> 3 THEN RAISE EXCEPTION 'T1-UPDATED: % of 3 reports hold the expected first line and no update note', n; END IF;
  UPDATE editorials e SET
      update_note = jsonb_build_array(jsonb_build_object('date', t.d, 'text', t.note)),
      body_json = e.body_json - 0,
      body_text = substr(e.body_text, length(t.line) + 3)
    FROM t1_upd t
    WHERE e.slug = t.slug AND e.body_json->0->>'text' = t.line AND left(e.body_text, length(t.line) + 2) = t.line || E'\n\n';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'T1-UPDATED: % reports changed (expected 3)', n; END IF;
  RAISE NOTICE 'T1-UPDATED: 3 reports changed';
END $$;

:end;
