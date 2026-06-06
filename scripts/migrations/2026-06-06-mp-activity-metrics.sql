-- Migration: mp_activity_metrics
-- Date: 2026-06-06
--
-- Pre-aggregated engagement metrics per MP, recomputed on a schedule.
-- Lives in its own table so the MP profile cold render does one indexed
-- lookup rather than a heavy on-the-fly aggregate of mp_division_votes.

BEGIN;

CREATE TABLE IF NOT EXISTS mp_activity_metrics (
  member_id            integer PRIMARY KEY REFERENCES mps(member_id),
  divisions_voted      integer DEFAULT 0,    -- distinct divisions this MP voted in (current Parliament)
  divisions_total      integer DEFAULT 0,    -- total commons divisions in current Parliament
  attendance_pct       numeric(5,2),         -- divisions_voted / divisions_total * 100
  rebellions_total     integer DEFAULT 0,    -- whip rebellions (current Parliament)
  rebellion_rate_pct   numeric(5,2),         -- rebellions_total / divisions_voted * 100
  speeches_year        integer,              -- last 12 months — populated from members-api in a later pass
  questions_year       integer,              -- last 12 months — same
  refreshed_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_activity_metrics_attendance
  ON mp_activity_metrics (attendance_pct DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_mp_activity_metrics_rebellions
  ON mp_activity_metrics (rebellions_total DESC NULLS LAST);

COMMIT;
