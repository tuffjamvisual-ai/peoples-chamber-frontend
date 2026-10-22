-- 2026-10-22c: hyphen rule for MP biographies (owner's approval, 22 Oct 2026). Open Govt's own text drops hyphens
-- except names, official titles and bodies, document codes, quotations and URLs. Of the 558 written biographies only
-- one ordinary hyphen was found in the biography text: "As post-Holocaust envoy" (member 5115) becomes
-- "post Holocaust" (the official title "Special Envoy for Post-Holocaust Issues" keeps its hyphen). Source titles quote
-- other publishers' headlines and are left as written. Biographies are hidden on the site (bio_visible false).
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.mp_biography_hyphen_backup_20261022') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
END $$;

CREATE TABLE public.mp_biography_hyphen_backup_20261022 AS
  SELECT member_id, political_bio, now() AS backed_up_at FROM public.mp_biography WHERE member_id = 5115;
ALTER TABLE public.mp_biography_hyphen_backup_20261022 ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.mp_biography_hyphen_backup_20261022;
  IF n <> 1 THEN RAISE EXCEPTION 'backup has % rows, expected 1', n; END IF;
END $$;

UPDATE public.mp_biography SET political_bio = $bio$Jon Pearce entered Parliament in July 2024 after Labour gained High Peak from the Conservatives with a majority of 7,908.

His rise was rapid for a first term MP. He joined the Science, Innovation and Technology Committee, where he took part in inquiries into artificial intelligence, digital government, science diplomacy and harmful online algorithms.

In September 2025, Keir Starmer appointed him as one of the parliamentary private secretaries serving No 10. A PPS is an unpaid political aide rather than a minister, but the appointment placed Pearce close to the prime minister and required loyalty to the government.

Pearce’s promotion followed his work as parliamentary chair of Labour Friends of Israel, a position he took in September 2024.

In January 2026, the government appointed him UK Special Envoy for Post-Holocaust Issues, with responsibility for advising on Holocaust education, remembrance, research and restitution.

What he stands for

Pearce’s politics combine support for public investment and workers’ rights with strong backing for Israel’s security and a negotiated two state settlement.

He supported bringing passenger rail services into public ownership and used his maiden speech during the relevant bill to connect railway nationalisation with employment security and regional investment.

On Israel and Palestine, he described Labour Friends of Israel as committed to a two state solution. In Commons interventions, he supported security for Israel, statehood and security for Palestinians, the return of Israeli hostages and civil society peacebuilding.

His record places greater emphasis on Israeli security, antisemitism and coexistence initiatives than on applying direct pressure to the Israeli government. He criticised Hamas repeatedly and promoted an international fund supporting Israeli and Palestinian peace projects.

What he actually delivered

Pearce’s clearest local result came through transport. After campaigning for support for High Peak students travelling to colleges in Greater Manchester, he announced with the East Midlands mayor that eligible students would receive free bus travel. The scheme was a defined benefit for local students, although the mayoral authority rather than Pearce controlled the transport funding and implementation.

His campaigning on NHS dentistry produced less measurable change. He repeatedly described High Peak as an NHS “dental desert” and pressed ministers on the dental contract and access to appointments.

Those interventions kept local access before ministers, but there is no evidence that Pearce personally secured a new dental contract, a specified number of appointments or a completed expansion of NHS dental capacity.

His select committee work also exposed questions around government use of technology, including Palantir’s role in NHS data systems and the capacity of central government to manage digital transformation. Those inquiries belonged to the committee collectively and cannot be treated as his personal delivery.

As post Holocaust envoy, Pearce acquired a defined public role, but the appointment itself was not an achievement. The available record establishes his remit, not a completed change in restitution, education or international policy attributable to him.

Political character and capability

Pearce has operated as a leadership loyalist and policy advocate rather than an independent parliamentary insurgent. His move from select committee work and Labour Friends of Israel into No 10 showed that Starmer valued his reliability, political judgement and ability to communicate with Jewish organisations.

His strongest completed result was local and practical: helping secure free college bus travel for students crossing the boundary into Greater Manchester. His national record consisted largely of advocacy, committee scrutiny and trusted political appointments.

Pearce has shown that he can gain access, build relationships and represent defined causes. He has not shown that he can run a department or deliver a large national programme. His rise was supported by political confidence from the leadership, while the evidence for broad administrative capability remained thin.$bio$
WHERE member_id = 5115 AND political_bio = $bio$Jon Pearce entered Parliament in July 2024 after Labour gained High Peak from the Conservatives with a majority of 7,908.

His rise was rapid for a first term MP. He joined the Science, Innovation and Technology Committee, where he took part in inquiries into artificial intelligence, digital government, science diplomacy and harmful online algorithms.

In September 2025, Keir Starmer appointed him as one of the parliamentary private secretaries serving No 10. A PPS is an unpaid political aide rather than a minister, but the appointment placed Pearce close to the prime minister and required loyalty to the government.

Pearce’s promotion followed his work as parliamentary chair of Labour Friends of Israel, a position he took in September 2024.

In January 2026, the government appointed him UK Special Envoy for Post-Holocaust Issues, with responsibility for advising on Holocaust education, remembrance, research and restitution.

What he stands for

Pearce’s politics combine support for public investment and workers’ rights with strong backing for Israel’s security and a negotiated two state settlement.

He supported bringing passenger rail services into public ownership and used his maiden speech during the relevant bill to connect railway nationalisation with employment security and regional investment.

On Israel and Palestine, he described Labour Friends of Israel as committed to a two state solution. In Commons interventions, he supported security for Israel, statehood and security for Palestinians, the return of Israeli hostages and civil society peacebuilding.

His record places greater emphasis on Israeli security, antisemitism and coexistence initiatives than on applying direct pressure to the Israeli government. He criticised Hamas repeatedly and promoted an international fund supporting Israeli and Palestinian peace projects.

What he actually delivered

Pearce’s clearest local result came through transport. After campaigning for support for High Peak students travelling to colleges in Greater Manchester, he announced with the East Midlands mayor that eligible students would receive free bus travel. The scheme was a defined benefit for local students, although the mayoral authority rather than Pearce controlled the transport funding and implementation.

His campaigning on NHS dentistry produced less measurable change. He repeatedly described High Peak as an NHS “dental desert” and pressed ministers on the dental contract and access to appointments.

Those interventions kept local access before ministers, but there is no evidence that Pearce personally secured a new dental contract, a specified number of appointments or a completed expansion of NHS dental capacity.

His select committee work also exposed questions around government use of technology, including Palantir’s role in NHS data systems and the capacity of central government to manage digital transformation. Those inquiries belonged to the committee collectively and cannot be treated as his personal delivery.

As post-Holocaust envoy, Pearce acquired a defined public role, but the appointment itself was not an achievement. The available record establishes his remit, not a completed change in restitution, education or international policy attributable to him.

Political character and capability

Pearce has operated as a leadership loyalist and policy advocate rather than an independent parliamentary insurgent. His move from select committee work and Labour Friends of Israel into No 10 showed that Starmer valued his reliability, political judgement and ability to communicate with Jewish organisations.

His strongest completed result was local and practical: helping secure free college bus travel for students crossing the boundary into Greater Manchester. His national record consisted largely of advocacy, committee scrutiny and trusted political appointments.

Pearce has shown that he can gain access, build relationships and represent defined causes. He has not shown that he can run a department or deliver a large national programme. His rise was supported by political confidence from the leadership, while the evidence for broad administrative capability remained thin.$bio$;

DO $$ DECLARE changed int; remaining int; BEGIN
  SELECT count(*) INTO changed FROM public.mp_biography WHERE member_id = 5115 AND political_bio LIKE '%As post Holocaust envoy%';
  IF changed <> 1 THEN RAISE EXCEPTION 'expected 1 updated biography, found %', changed; END IF;
  SELECT count(*) INTO remaining FROM public.mp_biography WHERE member_id = 5115 AND political_bio LIKE '%post-Holocaust envoy%';
  IF remaining <> 0 THEN RAISE EXCEPTION 'old wording still present'; END IF;
  IF (SELECT count(*) FROM public.mp_biography WHERE member_id = 5115 AND political_bio LIKE '%Post-Holocaust Issues%') <> 1 THEN
    RAISE EXCEPTION 'official title changed'; END IF;
  RAISE NOTICE 'ok: 1 biography updated';
END $$;
COMMIT;
