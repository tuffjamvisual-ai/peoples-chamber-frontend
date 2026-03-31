import type { ControlZoneData } from '../types';

const pensions: ControlZoneData = {
  zone: 'Pensions',
  context: 'The State Pension costs £124bn/year protected by the triple lock — rising each year by the highest of inflation, earnings growth or 2.5%. Pension age is 66 rising to 67 by 2028. 12 million people receive the State Pension. The winter fuel payment was cut by Labour in 2024 then partially restored after political backlash.',
  positions: [
    { partyId: 'labour', headline: 'Triple lock maintained — winter fuel partially restored', position: 'Labour kept the triple lock. The winter fuel payment was cut in 2024 causing massive political backlash and was subsequently restored to all pensioners earning under £35,000. Auto-enrolment being extended to younger workers.' },
    { partyId: 'conservative', headline: 'Restore winter fuel to all — triple lock sacred', position: 'Conservatives want the winter fuel payment restored in full to all pensioners regardless of income. Triple lock must be maintained. Oppose any increase in pension age beyond 67.' },
    { partyId: 'reform', headline: 'Triple lock plus — pensioners earned their retirement', position: 'Reform UK support the triple lock and want to go further with a triple lock plus guaranteeing the state pension rises faster than inflation. Full restoration of winter fuel payment to all.' },
    { partyId: 'libdem', headline: 'Triple lock plus — raise pension above inflation', position: 'Lib Dems support a triple lock plus that would raise the state pension above inflation until it reaches a decent living wage level. Full restoration of winter fuel payment.' },
    { partyId: 'green', headline: 'Raise state pension to living wage — end pensioner poverty', position: 'Greens want the state pension raised to the level of the Real Living Wage. Full restoration of winter fuel payment. Scrap pension age increases.' },
    { partyId: 'snp', headline: 'Scotland pensioners deserve better — restore winter fuel', position: 'SNP strongly oppose the winter fuel cut and want full restoration. Scottish Government has used its own funds to partially compensate. An independent Scotland would have a more generous pension system.' },
    { partyId: 'plaid', headline: 'Welsh pensioners hit by winter fuel cut in cold climate', position: 'Plaid want full restoration of the winter fuel payment. Welsh pensioners are disproportionately hit by energy costs due to poor housing stock and cold climate.' },
    { partyId: 'yourparty', headline: 'Raise pensions — end pensioner poverty now', position: 'Your Party want the state pension raised to £250/week. Full restoration of winter fuel payment to all. Create a National Care Service so pensioners do not have to sell homes to fund care.' },
    { partyId: 'dup', headline: 'Restore winter fuel — NI pensioners hit hardest', position: 'DUP strongly oppose the winter fuel cut. Northern Ireland pensioners face unique challenges — higher heating costs and lower average pension savings. Full restoration essential.' },
    { partyId: 'sinnfein', headline: 'All-Ireland pension system would benefit everyone', position: 'Sinn Féin want an all-Ireland approach to pension reform. The Republic has a more generous contributory pension. Full restoration of winter fuel payment in the interim.' },
    { partyId: 'sdlp', headline: 'Restore winter fuel — protect NI pensioners', position: 'SDLP strongly support restoring the winter fuel payment in full. NI pensioners have lower average savings and face higher energy costs.' },
    { partyId: 'alliance', headline: 'Protect pensioners — restore winter fuel payment', position: 'Alliance support restoring the winter fuel payment to all pensioners and want pension reform to ensure a decent retirement for all.' },
    { partyId: 'tuv', headline: 'Restore winter fuel — pensioners are being betrayed', position: 'TUV strongly oppose the winter fuel cut as a betrayal of pensioners who worked and paid in all their lives. Triple lock must be protected.' },
    { partyId: 'uup', headline: 'Protect pensioners — restore winter fuel for all', position: 'UUP want the winter fuel payment fully restored. The triple lock should be maintained and pension age should not be increased further.' },
    { partyId: 'restore', headline: 'Protect pensioners who paid in — triple lock sacred', position: 'Restore Britain consider protecting pensioners non-negotiable. Full winter fuel restoration. Triple lock maintained. Those who worked and contributed deserve security in retirement.' },
    { partyId: 'others', headline: 'UKIP: Protect triple lock. Alba: Independent Scottish pension.', position: 'UKIP support the triple lock and want a review of the pension age timetable. Alba want an independent Scotland to have its own pension system with a higher state pension.' },
  ]
};

export default pensions;
