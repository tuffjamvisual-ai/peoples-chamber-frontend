-- Migration: M1 — add entry_type to programme_timeline
-- Applied: 2026-09-25
-- Purpose: classify each timeline entry by kind so the UI can show a label badge
--          and future queries can filter by type (e.g. "show only progress_updates").
--
-- Design decisions:
--   - Nullable, no DEFAULT. Existing rows and cron-inserted rows stay NULL until
--     explicitly set; the CHECK only fires when a non-null value is written.
--   - Values mirror the editorial lifecycle: announcement → target → revisions
--     → progress updates → terminal states (withdrawn or completed).

ALTER TABLE public.programme_timeline
  ADD COLUMN entry_type text
    CHECK (entry_type IN (
      'first_announced',
      'target_set',
      'target_revised',
      'deadline_changed',
      'progress_update',
      'policy_withdrawn',
      'completed'
    ));
