import type { ControlZoneData } from '../types';

const budget: ControlZoneData = {
  zone: 'The Budget',
  context: 'The Chancellor presents a Budget usually once a year. The October 2024 Budget was Labour first in 14 years and raised £40bn in taxes — the largest rise in 30 years. The Spring 2026 OBR forecast confirmed borrowing falling to £133bn and inflation at 2.3%. The next full Budget is expected autumn 2026.',
  positions: [
    { partyId: 'labour', headline: 'Tough but necessary — fixing the public finances', position: 'Labour October 2024 Budget raised £40bn. Reeves blamed a £22bn black hole left by the Conservatives. Spring 2026 OBR shows the plan working — borrowing falling, inflation down to 2.3%. But living standards are still squeezed and the NI rise is causing job losses.' },
    { partyId: 'conservative', headline: 'Labour black hole was exaggerated — Budget damaged economy', position: 'Conservatives dispute the £22bn black hole narrative. The October 2024 Budget damaged business confidence, caused redundancies through the NI rise and broke Labour manifesto promises on no tax rises.' },
    { partyId: 'reform', headline: 'Slash spending — cut taxes — grow the economy', position: 'Reform UK would cut government spending by £50bn through cutting the civil service, ending foreign aid and scrapping diversity programmes, using savings to cut taxes.' },
    { partyId: 'libdem', headline: 'Fairer Budget — wealth taxes not stealth taxes', position: 'Lib Dems want a Budget that raises revenue from wealth — a 1% annual wealth tax on assets over £10m — rather than stealth taxes on ordinary workers.' },
    { partyId: 'green', headline: 'Green Budget — invest in the future or pay more later', position: 'Greens want a Budget that treats climate investment as essential infrastructure. A Green Budget would raise £70bn through wealth taxes and invest it in the green transition.' },
    { partyId: 'snp', headline: 'Scottish Budget constrained by Westminster decisions', position: 'SNP argue Westminster Budget decisions are passed down to Scotland through reduced block grant. Full fiscal autonomy would let Scotland set its own priorities.' },
    { partyId: 'plaid', headline: 'Welsh Budget starved by Westminster — needs fair funding', position: 'Plaid argue Wales is systematically underfunded through the Barnett formula. A fair needs-based funding formula would give Wales an extra £4bn/year.' },
    { partyId: 'yourparty', headline: 'Reverse austerity — invest in people not debt reduction', position: 'Your Party want a Budget that prioritises public investment over deficit reduction. The OBR fiscal rules are ideologically driven. End austerity now.' },
    { partyId: 'dup', headline: 'Budget must include NI package to address unique costs', position: 'DUP want each Budget to include a specific NI financial package recognising the unique costs imposed by the Windsor Framework.' },
    { partyId: 'sinnfein', headline: 'Westminster Budget priorities do not serve Ireland', position: 'Sinn Féin argue that Westminster Budget priorities — particularly defence spending increases — do not reflect the needs of Irish communities.' },
    { partyId: 'sdlp', headline: 'Budget must address NI specific needs', position: 'SDLP want Budget decisions to properly account for Northern Ireland unique circumstances — higher poverty rates, legacy of conflict costs and Windsor Framework burdens.' },
    { partyId: 'alliance', headline: 'Budget should invest in NI economy and reconciliation', position: 'Alliance want Budget spending to reflect NI potential as a unique dual-access economy. Investment in skills, infrastructure and cross-community projects.' },
    { partyId: 'tuv', headline: 'Budget must end two-tier treatment of Northern Ireland', position: 'TUV argue the Budget must address economic unfairness imposed on NI through the Windsor Framework. NI should receive the same fiscal treatment as any other UK region.' },
    { partyId: 'uup', headline: 'Budget investment needed for NI economic potential', position: 'UUP want Budget investment in Northern Ireland infrastructure, skills and economic development. NI unique position should be an asset reflected in the Budget.' },
    { partyId: 'restore', headline: 'Emergency Budget to cut state and restore growth', position: 'Restore Britain would call an emergency Budget to reverse Labour tax rises, cut government spending by 20% and signal a new era of economic freedom.' },
    { partyId: 'others', headline: 'UKIP: Slash spending Budget. Alba: Independence for fiscal control.', position: 'UKIP want a Budget that dramatically cuts public spending. Alba argue only independence gives Scotland fiscal control to have a Budget that truly serves Scottish needs.' },
  ]
};

export default budget;
