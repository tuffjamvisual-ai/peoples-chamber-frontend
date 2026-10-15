-- bill.status and bill.current_stage: allow stage names longer than 50 characters.
--
-- Parliament's longest stage name is "Consideration of Commons amendments and / or reasons"
-- (52 characters). The bills sync stores it in status, and the stage sync in current_stage;
-- a varchar(50) column rejected the whole row (bill 4004, the Diego Garcia Military Base and
-- British Indian Ocean Territory Bill, on 15 October). Changing to text keeps every value.

\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.bill ALTER COLUMN status TYPE text;
ALTER TABLE public.bill ALTER COLUMN current_stage TYPE text;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'bill' AND column_name = 'status') <> 'text'
     OR (SELECT data_type FROM information_schema.columns WHERE table_name = 'bill' AND column_name = 'current_stage') <> 'text' THEN
    RAISE EXCEPTION 'bill.status / bill.current_stage not text';
  END IF;
END $$;

COMMIT;
