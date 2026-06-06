import type { ControlZoneData } from '../types';

const vat: ControlZoneData = {
  zone: 'VAT',
  context: 'VAT at 20% raises around £170bn/year. The standard rate has been 20% since 2011. Key debates: Labour applied VAT to private school fees from January 2025, calls to cut VAT on energy bills, and whether to reduce VAT on home renovations and repairs.',
  positions: [
    { partyId: 'labour', headline: 'VAT on private schools — fund state education', position: 'Labour applied 20% VAT to private school fees from January 2025, raising an estimated £1.6bn/year to fund 6,500 new state school teachers.' },
    { partyId: 'conservative', headline: 'Scrap VAT on private schools — damaging state sector', position: 'Conservatives oppose VAT on private schools and pledge to reverse it. The revenue raised is being eaten up by costs of absorbing displaced pupils into state schools.' },
    { partyId: 'reform', headline: 'Scrap VAT on private schools — parental choice matters', position: 'Reform UK would reverse the VAT on private school fees immediately. Parents who pay school fees are saving the state money and should be supported not punished.' },
    { partyId: 'libdem', headline: 'Keep VAT on private schools, cut VAT on home repairs', position: 'Lib Dems support VAT on private schools. They want to cut VAT on home repairs and maintenance from 20% to 5% to encourage home improvement and support the building trades.' },
    { partyId: 'green', headline: 'Keep VAT on private schools, scrap VAT on insulation', position: 'Greens support VAT on private schools. They want VAT scrapped on home insulation, heat pumps and energy efficiency measures to accelerate the green transition.' },
    { partyId: 'snp', headline: 'VAT powers should be devolved to Scotland', position: 'The SNP want VAT powers devolved to Scotland to set appropriate rates for Scottish circumstances including Scotland independent schools which have different charitable status.' },
    { partyId: 'plaid', headline: 'Support VAT on private schools, cut VAT on essentials', position: 'Plaid Cymru support VAT on private schools and want VAT cut on essential goods — particularly food, children clothing and energy — to help Welsh families.' },
    { partyId: 'yourparty', headline: 'Keep VAT on private schools, cut VAT on food', position: 'Your Party support VAT on private schools and want to examine whether private healthcare should also pay VAT.' },
    { partyId: 'dup', headline: 'VAT on private schools affecting NI integrated schools', position: 'DUP are concerned that VAT on private school fees is affecting Northern Ireland integrated schools sector which provides cross community education. Want exemptions for integrated and faith schools.' },
    { partyId: 'sinnfein', headline: 'Tax private education — invest in public schools', position: 'Sinn Féin support taxing private education through VAT and want the revenue reinvested in state schools.' },
    { partyId: 'sdlp', headline: 'Support VAT on private schools with NI safeguards', position: 'SDLP support VAT on private schools in principle but want safeguards for NI integrated education sector.' },
    { partyId: 'alliance', headline: 'Protect NI integrated schools from VAT impact', position: 'Alliance want any VAT on private schools to protect Northern Ireland integrated education sector which plays a unique role in cross community reconciliation.' },
    { partyId: 'tuv', headline: 'Scrap VAT on private schools — attack on freedom', position: 'TUV strongly oppose VAT on private schools as an attack on parental choice and religious freedom. In Northern Ireland where faith schools are important this policy is particularly damaging.' },
    { partyId: 'uup', headline: 'Reverse VAT on private schools — damaging NI schools', position: 'UUP want VAT on private schools reversed arguing it has damaged Northern Ireland independent school sector including schools with strong community ties.' },
    { partyId: 'restore', headline: 'Scrap VAT on private schools and cut VAT broadly', position: 'Restore Britain want VAT on private schools reversed and would consider cutting the standard VAT rate to 15% to stimulate consumer spending.' },
    { partyId: 'others', headline: 'UKIP: Cut VAT to 15%. Alba: Full VAT control for Scotland.', position: 'UKIP want to reduce the standard VAT rate to 15% post Brexit. Alba want VAT powers devolved to Scotland.' },
  ]
};

export default vat;
