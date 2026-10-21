-- Contract histories (owner's approval, 21 Oct 2026): contract_notices holds one row per
-- published Find a Tender notice, per contract (or award) in it, per value type, so a contract page can show
-- the award, each change (old -> new), a termination and its final value without adding different kinds of
-- value together. government_contracts is unchanged; the daily route writes both.
--
-- value_type:
--   estimated          tender / planning value (tender.value, lots[].value)
--   contract           awarded or signed contract value (awards[].value / contracts[].value)
--   change_new         value after a change (contracts[].value on a notice with amendments, or UK10)
--   change_old         value before a change: stated in the change notice. Older-rules notices give it only in
--                      the wording ("from the original value of £X"), so value_from_text marks a parsed figure.
--   final              final value on a termination notice (contracts[].implementation.finalValue, UK11)
--   framework_maximum  value of a framework or dynamic market (tender.techniques.hasFrameworkAgreement): the
--                      most that may be spent through it by every supplier, potential value, not spending.
-- A notice with no value at all still gets one row (value_type 'none'), so the history lists it.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$ BEGIN
  IF to_regclass('public.contract_notices') IS NOT NULL THEN RAISE EXCEPTION 'contract_notices already exists'; END IF;
END $$;

CREATE TABLE public.contract_notices (
  id                bigserial PRIMARY KEY,
  ocid              text        NOT NULL,              -- procurement: ocds-h6vhtk-xxxxxx
  release_id        text        NOT NULL,              -- OCDS release id, e.g. 077370-2026
  notice_id         text,                              -- Find a Tender notice number (today the same as release_id)
  notice_type       text,                              -- UK1 to UK17 where given (Procurement Act 2023 notices)
  tags              text[]      NOT NULL DEFAULT '{}', -- OCDS tags: award, contract, contractAmendment, contractTermination, ...
  published_at      timestamptz NOT NULL,              -- release.date
  contract_key      text        NOT NULL DEFAULT '',   -- contracts[].id, else 'award:' || awards[].id, else '' (notice-level)
  award_id          text,
  title             text,                              -- contract title, else tender title
  buyer_name        text,
  buyer_slug        text,                              -- same kebab rule as government_contracts.dept_slug
  suppliers         jsonb       NOT NULL DEFAULT '[]', -- [{"name": ..., "id": ...}] every supplier, not only the first
  is_framework      boolean     NOT NULL DEFAULT false,
  value             numeric,
  currency          text,
  value_type        text        NOT NULL DEFAULT 'none' CHECK (value_type IN ('estimated','contract','change_new','change_old','final','framework_maximum','none')),
  value_from_text   boolean     NOT NULL DEFAULT false, -- change_old parsed from the change wording
  change_description text,
  change_reason     text,                              -- amendments[].rationale
  termination_reason text,                             -- contracts[].statusDetails on a termination
  end_date          date,                              -- contracts[].implementation.endDate, else period.endDate
  status            text,                              -- contract or award status on this notice
  source_url        text        NOT NULL,              -- the notice on Find a Tender
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ocid, release_id, contract_key, value_type)
);
CREATE INDEX contract_notices_ocid_idx ON public.contract_notices (ocid, published_at);
CREATE INDEX contract_notices_published_idx ON public.contract_notices (published_at DESC);
CREATE INDEX contract_notices_suppliers_idx ON public.contract_notices USING gin (suppliers jsonb_path_ops);

-- Public read only: anon and signed-in users may read; only the service role (the sync) writes.
ALTER TABLE public.contract_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_notices_read ON public.contract_notices FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.contract_notices FROM anon, authenticated;
GRANT SELECT ON public.contract_notices TO anon, authenticated;
REVOKE ALL ON SEQUENCE public.contract_notices_id_seq FROM anon, authenticated;
COMMENT ON TABLE public.contract_notices IS 'One row per Find a Tender notice, contract and value type, for contract histories (migration 2026-10-21k)';

DO $$ BEGIN
  IF has_table_privilege('anon', 'public.contract_notices', 'INSERT') THEN RAISE EXCEPTION 'anon can write'; END IF;
  IF NOT has_table_privilege('anon', 'public.contract_notices', 'SELECT') THEN RAISE EXCEPTION 'anon cannot read'; END IF;
  IF NOT has_table_privilege('service_role', 'public.contract_notices', 'INSERT') THEN RAISE EXCEPTION 'service_role cannot write'; END IF;
END $$;
COMMIT;
