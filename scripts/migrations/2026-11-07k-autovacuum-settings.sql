-- Applied on the owner's yes, 7 Nov 2026 (AB3; proposed in AB2, "Claude outputs/autovacuum-2026-11-07/findings.md").
-- Per table autovacuum settings for the ten large tables that syncs insert into or update. The server defaults (vacuum when dead
-- rows pass 20 per cent of the table, analyse at 10 per cent, insert vacuum at 20 per cent) left mp_division_votes with 116,451 dead
-- rows and no vacuum for three weeks (its trigger was about 232,000) and parliament_written_questions with an out of date
-- visibility map (74,584 heap fetches on a new index-only scan). Archive tables loaded once (register_archive_*,
-- historic_commons_votes, pmqs_archive_exchanges, government_grants) are left on the defaults.
-- Table settings only; no data changes. Each ALTER takes a brief SHARE UPDATE EXCLUSIVE lock (reads and writes go on).
-- Undo: 2026-11-07k-autovacuum-settings-UNDO.sql.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
-- Over 500,000 rows, synced daily: vacuum at 2 per cent dead, analyse at 1 per cent changed, insert vacuum at 2 per cent new rows.
ALTER TABLE public.mp_division_votes                 SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01, autovacuum_vacuum_insert_scale_factor = 0.02);
ALTER TABLE public.mp_expenses_detail                SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01, autovacuum_vacuum_insert_scale_factor = 0.02);
-- 150,000 to 300,000 rows, upserted daily; read by index-only scans (written questions): the same.
ALTER TABLE public.parliament_written_questions      SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01, autovacuum_vacuum_insert_scale_factor = 0.02);
ALTER TABLE public.hansard_contributions             SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01, autovacuum_vacuum_insert_scale_factor = 0.02);
ALTER TABLE public.contract_notices                  SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01, autovacuum_vacuum_insert_scale_factor = 0.02);
-- Smaller tables updated often: vacuum at 5 per cent dead, analyse at 2 per cent changed.
ALTER TABLE public.petition_constituency_signatures  SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.council_crime_stats               SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.political_donations               SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.press_releases                    SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.government_contracts              SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
COMMIT;
-- Then, read only, after a few minutes: SELECT relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables WHERE relname IN (...);
-- the tables already over their new trigger (contract_notices, mp_expenses_detail, council_crime_stats, government_contracts,
-- press_releases, petition_constituency_signatures, political_donations) should show an autovacuum within minutes.
