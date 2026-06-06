import type { ControlZoneData } from '../types';

const nationalDebt: ControlZoneData = {
  zone: 'National Debt',
  context: 'UK national debt stands at 93% of GDP — around £2.8 trillion. It has nearly tripled since 2006. The government pays over £100bn/year in debt interest. The OBR projects debt will peak at 96% of GDP in 2028-29. Labour fiscal rules require debt to be falling as a share of GDP by the end of the parliament.',
  positions: [
    { partyId: 'labour', headline: 'Debt falling as share of GDP — fiscal rules working', position: 'Labour fiscal rules require public sector net debt to be falling as a share of GDP by 2029-30. The March 2026 OBR forecast confirms the government is on course. Critics note the target is weak — debt rising in cash terms before stabilising as a share of GDP.' },
    { partyId: 'conservative', headline: 'Labour made debt worse — £100bn interest is unacceptable', position: 'Conservatives argue Labour spending decisions have made the debt situation worse. The £100bn annual interest bill is a fiscal emergency. A Conservative government would have tighter fiscal rules requiring absolute debt reduction.' },
    { partyId: 'reform', headline: 'Slash spending — debt is a burden on future generations', position: 'Reform UK view the national debt as a moral issue — loading debt onto future generations is wrong. They want to balance the current budget within one parliament and begin reducing debt in cash terms.' },
    { partyId: 'libdem', headline: 'Investment not austerity — debt must be managed not slashed', position: 'Lib Dems argue attempting to rapidly reduce debt through spending cuts causes more economic damage than the debt itself. Public investment — even if it temporarily increases debt — pays for itself through growth.' },
    { partyId: 'green', headline: 'Green investment reduces debt long term', position: 'Greens argue the cost of climate inaction will cost far more than investing now. Their fiscal framework treats green investment as separate from current spending.' },
    { partyId: 'snp', headline: 'Scotland would have lower debt — independence the answer', position: 'SNP argue an independent Scotland would have a more manageable debt position. Scotland North Sea revenues and lower defence spending would improve the fiscal position.' },
    { partyId: 'plaid', headline: 'Wales unfairly burdened by UK debt choices', position: 'Plaid argue Wales has little control over debt decisions made in Westminster but pays the price through reduced public spending. Full fiscal powers would let Wales manage its own debt.' },
    { partyId: 'yourparty', headline: 'Cancel illegitimate debt — invest in people', position: 'Your Party argue much of the national debt was created by bailing out banks in 2008 — illegitimate debt that should be cancelled or restructured. Oppose austerity to reduce debt.' },
    { partyId: 'dup', headline: 'NI should not bear UK debt burden it did not create', position: 'DUP argue Northern Ireland public services are being squeezed by UK-wide debt decisions. NI fiscal position should be assessed separately reflecting its unique economic circumstances.' },
    { partyId: 'sinnfein', headline: 'Debt from capitalism failures — restructure and invest', position: 'Sinn Féin argue the UK national debt largely reflects costs of banking bailouts and political choices they oppose. They oppose austerity to reduce debt and support public investment.' },
    { partyId: 'sdlp', headline: 'Debt management must not lead to NI service cuts', position: 'SDLP oppose using debt reduction as justification for cutting NI public services which are already underfunded.' },
    { partyId: 'alliance', headline: 'Responsible debt management without austerity', position: 'Alliance support responsible fiscal management but oppose austerity that damages public services. They want debt stabilised as a share of GDP through growth and careful spending prioritisation.' },
    { partyId: 'tuv', headline: 'Balance the budget — debt is generational theft', position: 'TUV view national debt as fundamentally wrong — forcing future generations to pay for current consumption. They support a balanced budget requirement and significant public spending cuts.' },
    { partyId: 'uup', headline: 'Sustainable debt management that protects NI services', position: 'UUP want the national debt managed sustainably without cuts to NI public services. They support economic growth as the primary route to debt reduction.' },
    { partyId: 'restore', headline: 'Eliminate deficit first — then tackle the debt mountain', position: 'Restore Britain would first eliminate the annual deficit through spending cuts then begin reducing the debt stock. The £100bn annual interest bill is the most compelling argument for radical spending reduction.' },
    { partyId: 'others', headline: 'UKIP: Balance budget in one term. Alba: Scotland share of debt post independence.', position: 'UKIP want to balance the budget within five years through spending cuts. Alba argue post independence Scotland would take a proportional share of UK debt but have lower ongoing borrowing needs.' },
  ]
};

export default nationalDebt;
