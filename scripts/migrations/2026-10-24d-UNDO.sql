-- 2026-10-24d UNDO: restores the 2026-10-24c Background timeline for Irene Campbell (member_id 5145) only, as it was
-- before 2026-10-24d-background-5145-fix.sql (7 entries, copied from 2026-10-24c-background-pilot.sql). No other row changes.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE bt_before ON COMMIT DROP AS
SELECT member_id, md5(to_jsonb(b)::text) AS h FROM public.mp_biography b WHERE member_id <> 5145;

UPDATE public.mp_biography SET background_timeline = $bt$[{"phase": "education", "start": null, "end": null, "title": "Secondary school", "organisation": "Auchenharvie Academy, Saltcoats", "detail": null, "source": {"title": "Wikipedia: Irene Campbell", "url": "https://en.wikipedia.org/wiki/Irene_Campbell"}}, {"phase": "career", "start": null, "end": null, "title": "Began working life in London", "organisation": null, "detail": "She moved to London in the 1980s, when jobs were scarce in North Ayrshire.", "source": {"title": "Hansard: maiden speech, 6 November 2024", "url": "https://hansard.parliament.uk/commons/2024-11-06/debates/DBE9C141-29E1-4666-B0D1-CF616C409D66/BudgetResolutions"}}, {"phase": "career", "start": null, "end": null, "title": "Business analyst and project manager", "organisation": "Civil service", "detail": null, "source": {"title": "Arran Banner: Irene is Labour general election candidate (19 January 2024)", "url": "https://www.arranbanner.co.uk/2024/01/19/irene-is-labour-general-election-candidate/"}}, {"phase": "career", "start": null, "end": null, "title": "Senior roles, including programme management", "organisation": "NHS", "detail": null, "source": {"title": "LabourList: Labour parliamentary candidate selections", "url": "https://labourlist.org/2024/06/our-rolling-list-of-labour-parliamentary-candidate-selections/"}}, {"phase": "career", "start": "2009-06", "end": "2020-11", "title": "Board member, later chair", "organisation": "North Ayrshire Women's Aid", "detail": null, "source": {"title": "Companies House: North Ayrshire Women's Aid (SC357590) officers", "url": "https://find-and-update.company-information.service.gov.uk/company/SC357590/officers"}}, {"phase": "career", "start": null, "end": "present", "title": "Founder member and chair", "organisation": "SPLASH, Saltcoats outdoor pool campaign", "detail": "An unpaid role.", "source": {"title": "UK Parliament: Register of Members' Financial Interests, Irene Campbell", "url": "https://members.parliament.uk/member/5145/registeredinterests"}}, {"phase": "politics", "start": "2024-01", "end": "2024-07", "title": "Labour candidate, North Ayrshire and Arran", "organisation": "Scottish Labour", "detail": null, "source": {"title": "Arran Banner: Irene is Labour general election candidate (19 January 2024)", "url": "https://www.arranbanner.co.uk/2024/01/19/irene-is-labour-general-election-candidate/"}}]$bt$ WHERE member_id = 5145;

DO $$ BEGIN
  IF (SELECT jsonb_array_length(background_timeline) FROM public.mp_biography WHERE member_id = 5145) IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION '5145 was not restored';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mp_biography b JOIN bt_before o USING (member_id) WHERE md5(to_jsonb(b)::text) IS DISTINCT FROM o.h) THEN
    RAISE EXCEPTION 'a row other than 5145 changed';
  END IF;
END $$;

COMMIT;
