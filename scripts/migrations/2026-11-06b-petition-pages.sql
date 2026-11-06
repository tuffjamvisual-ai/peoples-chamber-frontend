-- Applied to production on 6 Nov 2026 at 10:22:22 GMT, on the owner's yes.
-- Petition pages (owner, backlog item 15a). Five new empty columns on public.petitions; no existing column or row changes.
-- government_response_details  the response in full: government_response.details from the petition's JSON. The table holds
--                              only the summary, 200 characters at most.
-- government_response_on       government_response.responded_on, the date of the response held. It differs from
--                              government_response_at on 82 of 418 petitions: usually by a day, and where the Petitions
--                              Committee asked for a revised response it is the later date (700035: first given
--                              6 Dec 2024, responded_on 29 Jan 2025).
-- checked_at                   when the sync last read this petition: the date of its count, and which closed petition to
--                              read next. updated_at and synced_at move only when something changed.
-- debate_overview              debate.overview: the Petitions Committee's note, for now only 750050, "decided not to schedule a debate".
-- debate_outcome_at            debate_outcome_at: when the debate outcome or that note was published. Held for all 76 with a debate record.
-- New nullable columns with no default rewrite nothing, so the lock is held only for the catalogue change.
-- Reads and writes of the table go through the service role, whose table level grants cover new columns.
-- Backup first: "Claude outputs/backups/petitions-before-2026-11-06.csv" and
-- "petition-constituency-signatures-before-2026-11-06.csv.gz". Undo: 2026-11-06b-petition-pages-UNDO.sql
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.petitions
  ADD COLUMN government_response_details text,
  ADD COLUMN government_response_on date,
  ADD COLUMN checked_at timestamptz,
  ADD COLUMN debate_overview text,
  ADD COLUMN debate_outcome_at timestamptz;
COMMIT;
