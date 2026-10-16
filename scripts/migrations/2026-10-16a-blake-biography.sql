-- Rachel Blake (member 5257): biography rewritten after a fact-check on 16 October 2026.
-- The old text named Nickie Aiken as the Conservative she defeated (Parliament's result:
-- Tim Barnes), described her as City Minister "now" (she held the post 14 May to 21 July
-- 2026), listed a committee she left in October 2025, and carried unsupported wording.
-- Applies only if the old text is still in place, so a later edit is never overwritten.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE public.mp_biography
     SET political_bio = $bio$Rachel Blake was elected Labour and Co-operative MP for Cities of London and Westminster on 4 July 2024 with 15,302 votes (39.0 per cent), a majority of 2,708 over the Conservative candidate, Tim Barnes. She succeeded the Conservative MP Nickie Aiken.

Born in Manchester, she graduated from Corpus Christi College, Cambridge in 2001 and took a master's degree in social policy at the London School of Economics. She worked as a policy adviser at HM Treasury under Gordon Brown, including on Kate Barker's Review of Land Use Planning, published in December 2006, and managed the East London Housing Partnership from 2009 to 2013. She was elected to Tower Hamlets Council for Bow East in May 2014, joined its cabinet in July 2015 and was deputy mayor from 2018 to 2022, standing down as a councillor in July 2024 after her election to Parliament. She was vice-chair of the Labour Housing Group from 2022 to 2024 and has campaigned for tighter regulation of short-term lets in London.

In Parliament she sat on the Treasury Committee from October 2024 to October 2025 and on the public bill committees for the Renters' Rights Bill, the Finance Bill and the Pension Schemes Bill. She has been a member of the Members Estimate Committee since September 2024, and of the House of Commons Commission and the Restoration and Renewal Client Board from September 2024 to May 2026 and again from September 2026.

From 14 May to 21 July 2026 she was Economic Secretary to the Treasury, the minister responsible for financial services. Treasury announcements issued under her name in that period included the start of the new rules for Buy-Now, Pay-Later lending, which came into force on 15 July 2026, and a review of access to banking services launched on 8 June 2026.$bio$,
         bio_sources = $src$[
  {"title": "UK Parliament: 2024 general election result, Cities of London and Westminster", "url": "https://members.parliament.uk/constituency/3987/election/422", "supports": "Votes, share, majority and the Conservative candidate, Tim Barnes"},
  {"title": "UK Parliament Members API: Rachel Blake biography", "url": "https://members-api.parliament.uk/api/Members/5257/Biography", "supports": "Government post and committee memberships with dates"},
  {"title": "GOV.UK: Rachel Blake MP", "url": "https://www.gov.uk/government/people/rachel-blake", "supports": "Economic Secretary to the Treasury, 14 May to 21 July 2026, and announcements issued under her name"},
  {"title": "Westminster Labour: Rachel Blake elected for Cities of London and Westminster (5 July 2024)", "url": "https://westminsterlabour.org.uk/issues/community/2024/07/05/rachel-blake-elected-for-cities-of-london-westminster", "supports": "Tower Hamlets councillor from 2014, deputy mayor from 2018, Treasury policy adviser under Gordon Brown"},
  {"title": "Wikipedia: Rachel Blake (secondary source)", "url": "https://en.wikipedia.org/wiki/Rachel_Blake", "supports": "Birthplace, education, Barker Review, East London Housing Partnership, Tower Hamlets cabinet and Labour Housing Group dates, short-term lets campaigning"}
]$src$::jsonb,
         bio_last_reviewed = DATE '2026-10-16',
         bio_review_reason = NULL,
         bio_review_flagged_at = NULL
   WHERE member_id = 5257
     AND political_bio LIKE '%defeating Conservative Nickie Aiken%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Rachel Blake biography not updated (% rows): the old text is no longer in place', n;
  END IF;
END $$;

COMMIT;
