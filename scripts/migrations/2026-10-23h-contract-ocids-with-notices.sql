-- 2026-10-23h: contract_ocids_with_notices (23 Oct 2026). Read only.
-- The government contracts list (/transparency/contracts) links an entry's title to /contracts/<ocid> only when that
-- OCID has rows in contract_notices. A page shows up to 100 entries, and one framework OCID can hold over 10,000
-- notices, so a plain select of contract_notices.ocid for a page's OCIDs is cut off at the API's 1,000 row limit (it
-- returned 1 of 78 OCIDs on page one), and aggregates are switched off for the API. This function answers the
-- question in one call per page: for each OCID given (at most 200), one indexed lookup on contract_notices_ocid_idx.
-- SECURITY INVOKER, so it reads contract_notices under the caller's own SELECT grant and RLS policy, as the
-- /contracts/[ocid] page already does. Input over 200 OCIDs is truncated to the first 200. Undo: 2026-10-23h-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regprocedure('public.contract_ocids_with_notices(text[])') IS NOT NULL THEN
    RAISE EXCEPTION 'contract_ocids_with_notices already exists';
  END IF;
END $$;

CREATE FUNCTION public.contract_ocids_with_notices(p_ocids text[])
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT o.ocid
  FROM (SELECT DISTINCT unnest(p_ocids[1:200]) AS ocid) o
  WHERE o.ocid IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.contract_notices cn WHERE cn.ocid = o.ocid)
$$;

COMMENT ON FUNCTION public.contract_ocids_with_notices(text[]) IS
  'Of the OCIDs given (first 200), those with at least one row in contract_notices. Read only. 2026-10-23h.';

REVOKE ALL ON FUNCTION public.contract_ocids_with_notices(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contract_ocids_with_notices(text[]) TO anon, authenticated, service_role;

DO $$ BEGIN
  IF NOT has_function_privilege('anon', 'public.contract_ocids_with_notices(text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon cannot run contract_ocids_with_notices';
  END IF;
  IF (SELECT provolatile FROM pg_proc WHERE oid = 'public.contract_ocids_with_notices(text[])'::regprocedure) <> 's' THEN
    RAISE EXCEPTION 'contract_ocids_with_notices is not STABLE';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.contract_ocids_with_notices(text[])'::regprocedure) THEN
    RAISE EXCEPTION 'contract_ocids_with_notices is SECURITY DEFINER';
  END IF;
  -- EXECUTE for anon, authenticated and service_role only, besides the owner; nothing for PUBLIC.
  IF EXISTS (SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
             WHERE p.oid = 'public.contract_ocids_with_notices(text[])'::regprocedure
               AND a.grantee <> p.proowner
               AND a.grantee NOT IN ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)) THEN
    RAISE EXCEPTION 'contract_ocids_with_notices is granted to another role';
  END IF;
END $$;

COMMIT;
