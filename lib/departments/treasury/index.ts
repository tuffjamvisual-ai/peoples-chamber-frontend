import type { DepartmentData } from '../types';
import meta from './meta';
import incomeTax from './income-tax';
import nationalInsurance from './national-insurance';
import vat from './vat';
import budget from './budget';
import pensions from './pensions';
import banks from './banks';
import inflation from './inflation';
import costOfLiving from './cost-of-living';
import nationalDebt from './national-debt';
import economicGrowth from './economic-growth';
import crypto from './crypto';
import mortgageRules from './mortgage-rules';

const treasury: DepartmentData = {
  ...meta,
  partyPositions: [
    { partyId: 'labour', headline: 'Stability first, growth second — but the stealth taxes are hurting', position: 'Rachel Reeves has committed to strict fiscal rules. Raised employer NI by 1.2% raising £15bn. Income tax thresholds frozen until 2028. March 2026 OBR shows inflation at 2.3% and borrowing at £133bn.' },
    { partyId: 'conservative', headline: 'Cut taxes, grow the economy — stop punishing work', position: 'Reverse the NI rise, unfreeze income tax thresholds, scrap net zero levies. Pro-growth deregulation agenda.' },
    { partyId: 'reform', headline: 'Raise the tax threshold to £20,000 — give workers their money back', position: 'Raise personal allowance to £20,000. Abolish inheritance tax. Cut corporation tax. Slash £50bn in government waste.' },
    { partyId: 'libdem', headline: 'Wealth tax on the super-rich — make the system fair', position: 'Wealth tax on assets over £10m. Windfall tax on banks. Reverse threshold freeze. Reform business rates.' },
    { partyId: 'green', headline: 'Tax the rich, fund the future', position: 'Comprehensive wealth tax. Financial transaction tax. End fossil fuel subsidies. Progressive taxation.' },
    { partyId: 'snp', headline: 'Full fiscal powers for Scotland', position: 'Full fiscal autonomy. Oppose austerity. Scottish sovereign wealth fund. Rejoin EU single market.' },
    { partyId: 'plaid', headline: 'Wales is being short-changed', position: 'Needs-based funding formula. Welsh borrowing powers. Oppose NI rise. Windfall taxes on energy.' },
    { partyId: 'yourparty', headline: 'Tax the billionaires, nationalise the banks', position: 'Wealth tax on assets over £1m. Nationalise banks. Close £90bn tax avoidance loopholes. National Investment Bank.' },
    { partyId: 'dup', headline: 'NI needs its own economic deal', position: 'Devolved corporation tax. Windsor Framework compensation. Special economic zone for NI.' },
    { partyId: 'sinnfein', headline: 'All-Ireland economy — unity would transform both economies', position: 'Irish unity single economic space. Corporation tax harmonisation. Progressive reform. End austerity.' },
    { partyId: 'sdlp', headline: 'Investment not austerity — NI needs proper economic strategy', position: 'More NI investment. Oppose cuts. cross border economic cooperation. Progressive tax system.' },
    { partyId: 'alliance', headline: 'Pragmatic economics — what works for people in NI', position: 'Investment in NI tech and green industries. Windsor Framework opportunities. Progressive taxation.' },
    { partyId: 'tuv', headline: 'One UK economy — no special deals', position: 'Scrap Windsor Framework. Same fiscal treatment for NI as rest of UK. Cut taxes. Balanced budget.' },
    { partyId: 'uup', headline: 'Practical unionism — make the economic union work', position: 'Resolve Windsor Framework pragmatically. NI infrastructure investment. Devolved fiscal powers for Stormont.' },
    { partyId: 'restore', headline: 'Cut taxes, cut the state, give people their money back', position: 'Raise threshold to £20,000. Abolish stamp duty. Cut corporation tax to 15%. 30% state reduction.' },
    { partyId: 'others', headline: 'UKIP, Alba and others', position: 'UKIP: Raise threshold, slash spending, post Brexit deregulation. Alba: Scottish fiscal independence and sovereign wealth fund.' },
  ],
  controlZonePositions: [
    incomeTax,
    nationalInsurance,
    vat,
    budget,
    pensions,
    banks,
    inflation,
    costOfLiving,
    nationalDebt,
    economicGrowth,
    crypto,
    mortgageRules,
  ],
};

export default treasury;
