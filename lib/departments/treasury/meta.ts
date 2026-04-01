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
  streetContext: 'With inflation at 2.3%, national debt at 93% of GDP and energy bills still high, most people feel they are working harder for less. The tax trap — frozen thresholds dragging millions into higher rates — is the biggest grievance on the street right now.'
};

export default meta;
