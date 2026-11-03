-- 2026-11-03n: donation dates stored a day early, corrected (owner's yes, 3 Nov 2026). The Commission's search API sends
-- each date as UK midnight; lib/ec-donations.ts read it in UTC until 3 Nov 2026, so every date in British Summer Time
-- was stored as the day before. Compared with the Commission's own CSV of 1 Nov 2026
-- ("Claude outputs/registers/official-data-2026-11-01.zip"), 72254 rows had a date exactly one day early: accepted_date
-- 54124, reported_date 54618, received_date 51556. Only those columns change, and only where the stored date is still exactly
-- one day before the Commission's (checked again here). No other difference was found; 903 rows not in the CSV are
-- left as they are. The corrections are loaded from "Claude outputs/registers/history-2026-11-03/donation-date-fixes.csv".
-- Backup: "Claude outputs/backups/2026-11-03n-donation-dates-before.csv". Undo: ...-UNDO.sql.
-- Run from the repository root: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03n-donation-dates.sql
-- Then refresh organisation_index: SELECT refresh_organisation_index();
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE date_fix (id bigint, ec_ref text, accepted_date date, reported_date date, received_date date) ON COMMIT DROP;
\copy date_fix FROM 'Claude outputs/registers/history-2026-11-03/donation-date-fixes.csv' WITH (FORMAT csv, HEADER true)

DO $$
DECLARE n int; na int; np int; nc int;
BEGIN
  SELECT count(*) INTO n FROM date_fix;
  IF n <> 72254 THEN RAISE EXCEPTION 'refused: % corrections loaded, expected 72254', n; END IF;
  SELECT count(*) FILTER (WHERE f.accepted_date IS NOT NULL AND p.accepted_date = f.accepted_date - 1),
         count(*) FILTER (WHERE f.reported_date IS NOT NULL AND p.reported_date = f.reported_date - 1),
         count(*) FILTER (WHERE f.received_date IS NOT NULL AND p.received_date = (f.received_date - 1)::text)
    INTO na, np, nc FROM date_fix f JOIN public.political_donations p ON p.id = f.id AND p.ec_ref = f.ec_ref;
  IF (na, np, nc) <> (54124, 54618, 51556) THEN RAISE EXCEPTION 'refused: % accepted, % reported, % received still one day early, expected 54124, 54618, 51556', na, np, nc; END IF;

  UPDATE public.political_donations p
     SET accepted_date = CASE WHEN f.accepted_date IS NOT NULL AND p.accepted_date = f.accepted_date - 1 THEN f.accepted_date ELSE p.accepted_date END,
         reported_date = CASE WHEN f.reported_date IS NOT NULL AND p.reported_date = f.reported_date - 1 THEN f.reported_date ELSE p.reported_date END,
         received_date = CASE WHEN f.received_date IS NOT NULL AND p.received_date = (f.received_date - 1)::text THEN f.received_date::text ELSE p.received_date END
    FROM date_fix f
   WHERE p.id = f.id AND p.ec_ref = f.ec_ref;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 72254 THEN RAISE EXCEPTION 'refused: % rows updated, expected 72254', n; END IF;
END $$;

SELECT count(*) FILTER (WHERE p.accepted_date = f.accepted_date) AS accepted_now_right, count(*) FILTER (WHERE p.reported_date = f.reported_date) AS reported_now_right,
       count(*) FILTER (WHERE p.received_date = f.received_date::text) AS received_now_right
  FROM date_fix f JOIN public.political_donations p ON p.id = f.id;

COMMIT;
