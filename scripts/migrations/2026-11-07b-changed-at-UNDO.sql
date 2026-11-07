-- UNDO for 2026-11-07b-changed-at.sql: removes both triggers, the function and both columns. No other data changed.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TRIGGER set_changed_at ON public.historic_commons_divisions;
DROP TRIGGER set_changed_at ON public.pmqs_archive_exchanges;
DROP FUNCTION public.set_changed_at();
ALTER TABLE public.historic_commons_divisions DROP COLUMN changed_at;
ALTER TABLE public.pmqs_archive_exchanges DROP COLUMN changed_at;
NOTIFY pgrst, 'reload schema';
COMMIT;
