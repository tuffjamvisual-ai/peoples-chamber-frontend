-- Adds the fact-checked written biography for Sagal Abdi-Wali (member 5484), MP for Holborn and St Pancras
-- from 8 Oct 2026. Only writes if she has no written biography yet, so it never overwrites one.
-- The biography row itself was created by the roster sync on 12 Oct 2026.
DO $do$
DECLARE n int;
BEGIN
  UPDATE public.mp_biography
     SET political_bio = $b$Sagal Abdi-Wali entered Parliament after building her political career in Camden, where she worked in the council's housing department, served as cabinet member for housing and became leader of the council.

Her record before Westminster centres on housing administration, community work and local Labour politics. Some changes were completed during her time in office. Others remain plans whose effects cannot yet be measured.

Abdi-Wali arrived in Britain as a child refugee from Somalia and, after a short period in Walthamstow, grew up in Gospel Oak. Before becoming a councillor she worked in Camden Council's housing department, served as a school governor and joined community projects in the borough. She was chair of the Holborn and St Pancras Constituency Labour Party from 2019.

She was elected to Camden Council for Camden Square ward in 2022 and became Cabinet Member for Better Homes in May 2024. Her responsibilities included council homes and estates, repairs and maintenance, landlord services, tenant and leaseholder participation and standards in privately rented housing.

Labour councillors chose her as leader after the May 2026 elections, and she took office on 20 May 2026 as Camden's first Black woman council leader. Labour retained control but lost 17 seats compared with 2022, leaving it with 30 of 55, two more than the 28 needed for a majority. The Greens rose from one seat to 11, and the previous Labour leader, Richard Olszewski, lost his seat.

In Camden Square, Abdi-Wali received 890 votes. The second Labour candidate received 848 and the leading Green candidate 830.

She was subsequently selected as Labour's candidate in the Holborn and St Pancras by-election following Keir Starmer's departure from Parliament. Abdi-Wali won 12,292 votes, 45.2 per cent of those cast. Green Party leader Zack Polanski finished second with 8,928 votes, or 32.8 per cent. Labour's majority was 3,364, compared with 11,572 at the 2024 general election. Turnout fell from 54.1 to 38.8 per cent.

Abdi-Wali has identified housing, homelessness, opportunities for young people and community cohesion as her principal concerns. She has also called for Thames Water to be brought into public ownership. Her housing interest predates her election: she has linked it to her family's experience of refugee and temporary accommodation and to her later work inside Camden's housing system.

As council leader she added welfare support, community safety, food security and the redevelopment of Euston to her stated priorities. Camden said she would lead its work to obtain new homes and jobs from the HS2 terminus and the surrounding development. Most of these commitments had not produced outcomes attributable to her leadership before her election to Parliament.

In January 2025, while Abdi-Wali held the housing portfolio, Camden's cabinet approved a five-year housing investment strategy running to 2030. It is often described as £670 million secured for social housing. The council's own documents describe a £670 million plan for spending on existing council homes, of which about £370 million was funded, leaving a £300 million gap. The cabinet approved an additional £350 million for maintaining existing homes, of which up to £265 million was expected to come from selling empty, small or otherwise unsuitable properties with substantial repair costs. Delivery runs to 2030, so the number of homes improved and the proceeds from sales are not yet known.

The same strategy included plans to buy another 280 family-sized homes, adding to 307 already purchased, funded by releasing a similar number of smaller or unsuitable council homes. Camden said this would provide suitable accommodation for more than 100 overcrowded families. At the time, more than 8,000 people were on the housing waiting list.

In November 2024 the Housing Ombudsman published a special investigation into Camden's landlord services. It began in November 2023, before Abdi-Wali became housing lead, and examined cases that largely predated her appointment. It found a maladministration rate for repairs of 91 per cent in the cases considered, compared with 73 per cent nationally. The Ombudsman identified poor record-keeping, repairs that stalled without explanation, failures to follow up inspections and a lack of policy on reasonable adjustments for vulnerable residents. It also described a defensive complaints culture and documents with dismissive tones. Her responsibility was the council's response.

In March 2026 she approved a repairs policy setting out service standards. Emergency cases, including severe damp and mould or a complete loss of heating, hot water, drinking water or electricity, were to be attended and made safe within 24 hours. The decision paper said the policy consolidated existing practice and would help the council meet legal timeframes, including under Awaab's Law, which had taken effect in October 2025.

Camden's performance figures for 2024/25 moved in both directions. Six per cent of its council homes failed the Decent Homes Standard, against a London median of 6.9 per cent, and Camden said the number failing had fallen by a third. Overall tenant satisfaction was 71 per cent against a London median of 61 per cent, and satisfaction with repairs was 64.5 per cent against 64 per cent. Satisfaction with the time taken to complete repairs was 58.4 per cent against 63 per cent. Satisfaction with complaint handling was 28.3 per cent, slightly above the London median of 27 per cent. Camden answered 89.3 per cent of first-stage complaints on time but only 52.8 per cent of escalated complaints, against a London median of 73 per cent, and said most escalations happened because work promised at the first stage had not been done.

Camden approved a 4.8 per cent council rent increase for 2026/27 while she held the housing portfolio, expected to raise between £8.1 million and £10.4 million, with a further £1 million from higher service charges. The council said 72 per cent of tenants would have the increases covered wholly or partly by housing benefit. An additional £3 million was allocated to meeting the requirements of Awaab's Law. The decision increased the money available for housing while raising charges for tenants not fully protected by benefits.

Her period as council leader before entering Parliament was too short to measure progress on Euston, youth employment, housing delivery or council finances, so those policies are commitments rather than completed achievements. She entered Parliament through the October 2026 by-election, and her Westminster record is still too limited for conclusions about her legislative priorities, voting independence or effectiveness as a constituency MP.$b$
   WHERE member_id = 5484 AND (political_bio IS NULL OR political_bio = '');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Expected to update 1 row for member 5484, updated %', n;
  END IF;
  RAISE NOTICE 'Biography added for Sagal Abdi-Wali';
END
$do$;
