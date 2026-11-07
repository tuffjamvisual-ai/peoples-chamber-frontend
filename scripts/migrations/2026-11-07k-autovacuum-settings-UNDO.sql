-- UNDO for 2026-11-07k-autovacuum-settings.sql: returns the ten tables to the server's autovacuum defaults.
-- RESET changes table settings only; no data changes. Each ALTER takes a brief SHARE UPDATE EXCLUSIVE lock (reads and writes go on).
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.mp_division_votes                 RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_insert_scale_factor);
ALTER TABLE public.mp_expenses_detail                RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_insert_scale_factor);
ALTER TABLE public.parliament_written_questions      RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_insert_scale_factor);
ALTER TABLE public.hansard_contributions             RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_insert_scale_factor);
ALTER TABLE public.contract_notices                  RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_insert_scale_factor);
ALTER TABLE public.petition_constituency_signatures  RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE public.council_crime_stats               RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE public.political_donations               RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE public.press_releases                    RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE public.government_contracts              RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
COMMIT;
