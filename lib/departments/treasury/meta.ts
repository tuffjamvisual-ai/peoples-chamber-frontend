import type { DepartmentMeta } from '../types';

const meta: DepartmentMeta = {
  slug: 'treasury',
  name: 'HM Treasury',
  shortName: 'Treasury',
  minister: 'Rachel Reeves',
  ministerParty: 'labour',
  ministerPhoto: 'https://members-api.parliament.uk/api/Members/4611/Thumbnail',
  controlZones: ['Income Tax', 'National Insurance', 'VAT', 'The Budget', 'Pensions', 'Banks', 'Inflation', 'Cost of Living', 'National Debt', 'Economic Growth', 'Crypto & Digital Money', 'Mortgage Rules'],
  description: 'The Ultimate Power Centre. Controls the nation\'s finances — every other department answers to the Treasury for money.',
  streetContext: 'With inflation at 2.3%, national debt at 93% of GDP and energy bills still high, most people feel they are working harder for less. The tax trap — frozen thresholds dragging millions into higher rates — is the biggest grievance on the street right now.',
  currentIssues: [
    { title: 'The Tax Trap', description: 'Frozen income tax thresholds since 2021 mean 3.7 million more people will pay higher rate tax by 2028. Treasury calls it fiscal drag. The public calls it a stealth tax.', hot: true },
    { title: 'Energy Bill Support', description: 'Middle East conflict pushing gas prices up again. Treasury deciding whether to reinstate household energy support payments. Average annual bill still £1,738.', hot: true },
    { title: 'Mortgage Squeeze', description: 'Reeves meeting banks to ensure support for families struggling with mortgage payments. Bank Rate at 3.75%.', hot: false },
    { title: 'Crypto Regulation', description: 'New rules for cryptoassets coming in 2026. Treasury wants UK as global digital finance hub while cracking down on £1bn+ annual crypto fraud.', hot: false },
  ],
};

export default meta;
