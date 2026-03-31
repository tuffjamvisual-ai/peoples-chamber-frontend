import type { ControlZoneData } from '../types';

const incomeTax: ControlZoneData = {
  zone: 'Income Tax',
  context: 'The personal allowance has been frozen at £12,570 since 2021 and stays frozen until 2028. As wages rise with inflation, millions more people are dragged into paying tax or into higher rate bands — fiscal drag. By 2028, an extra 3.7 million people will be paying the 40% higher rate compared to 2021.',
  positions: [
    { partyId: 'labour', headline: 'Freeze thresholds until 2028 to raise revenue', position: 'Labour kept the frozen thresholds inherited from the Conservatives. The freeze effectively raises £25bn extra in tax without changing headline rates. Reeves argues this is necessary to fix the public finances. Critics say it punishes ordinary workers whose wages have risen with inflation.' },
    { partyId: 'conservative', headline: 'Unfreeze thresholds — end fiscal drag now', position: 'Conservatives froze thresholds in 2021 but now want to reverse the freeze and index thresholds to inflation. They argue fiscal drag is a dishonest stealth tax. Tax cuts not spending increases are the route to growth.' },
    { partyId: 'reform', headline: 'Raise the personal allowance to £20,000', position: 'Reform UK flagship policy — raise income tax threshold from £12,570 to £20,000, taking 7 million of the lowest paid workers out of income tax entirely. Funded by cutting government waste.' },
    { partyId: 'libdem', headline: 'Reverse the freeze and reform the system', position: 'Lib Dems want to immediately reverse the threshold freeze and restore annual uprating with inflation. They also want to review the 60% effective marginal rate trap hitting people earning between £100,000 and £125,140.' },
    { partyId: 'green', headline: 'Higher rates on higher earners — progressive system', position: 'Greens support reversing the freeze but want a more progressive system with higher rates on incomes over £100,000. The current system lets the very wealthy pay lower effective rates than middle earners.' },
    { partyId: 'snp', headline: 'Scottish rates differ — Westminster model failing workers', position: 'Scotland has its own income tax rates — starter 19%, basic 20%, intermediate 21%, higher 42%, top 47%. The SNP want full fiscal autonomy to set their own allowances too.' },
    { partyId: 'plaid', headline: 'Wales needs income tax powers to protect workers', position: 'Plaid Cymru want full income tax powers devolved to Wales. Welsh workers are disproportionately hit by the threshold freeze as Welsh wages are lower than the UK average.' },
    { partyId: 'yourparty', headline: 'Tax the rich properly — raise rates on top earners', position: 'Your Party wants a new 60% top rate on incomes over £150,000 and 70% over £500,000. The threshold freeze should be reversed immediately for those earning under £50,000.' },
    { partyId: 'dup', headline: 'NI workers need income tax relief not more burden', position: 'DUP want tax relief for Northern Ireland workers. Corporation tax powers for Stormont would help rebalance NI economy. Windsor Framework creates complications for some NI workers.' },
    { partyId: 'sinnfein', headline: 'All-island tax harmonisation would benefit workers', position: 'Sinn Féin argue Irish unity would allow tax harmonisation across the island. They oppose the threshold freeze as hitting the lowest paid hardest and want progressive reform.' },
    { partyId: 'sdlp', headline: 'Reverse the freeze — working people are squeezed', position: 'SDLP oppose the threshold freeze as a regressive stealth tax that hits ordinary working families hardest. They want progressive income tax reform.' },
    { partyId: 'alliance', headline: 'Pragmatic relief for squeezed workers', position: 'Alliance supports reversing the threshold freeze and reforming income tax to ensure ordinary workers keep more of what they earn.' },
    { partyId: 'tuv', headline: 'Cut taxes — government takes too much', position: 'TUV believe the state takes too large a share of workers earnings. They support raising thresholds and reducing the overall tax burden. The freeze is unacceptable.' },
    { partyId: 'uup', headline: 'Unfreeze thresholds and support working families', position: 'UUP support reversing the threshold freeze and making income tax fairer for ordinary working families in Northern Ireland.' },
    { partyId: 'restore', headline: 'Slash income tax — the state is too big', position: 'Restore Britain want to raise the personal allowance to £20,000 and eventually abolish income tax below £30,000. Radical tax cuts would unleash economic growth.' },
    { partyId: 'others', headline: 'UKIP: Raise threshold. Alba: Full Scottish fiscal control.', position: 'UKIP want to raise the personal allowance and simplify the tax system. Alba want full fiscal autonomy for Scotland including control over income tax thresholds.' },
  ]
};

export default incomeTax;
