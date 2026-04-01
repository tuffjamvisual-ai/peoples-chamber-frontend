import type { DepartmentMeta } from '../types';

const meta: DepartmentMeta = {
  slug: 'treasury',
  name: 'HM Treasury',
  shortName: 'Treasury',
  minister: 'Rachel Reeves',
  ministerParty: 'labour',
  ministerPhoto: 'https://members-api.parliament.uk/api/Members/4611/Thumbnail',
  controlZones: [
    'Income Tax', 'National Insurance', 'VAT', 'Corporation Tax', 'Capital Gains Tax',
    'Inheritance Tax', 'Stamp Duty', 'Fuel Duty', 'Alcohol & Tobacco Duty', 'Business Rates',
    'Air Passenger Duty', 'Vehicle Excise Duty', 'Insurance Premium Tax', 'Climate Change Levy',
    'Bank Levy', 'Apprenticeship Levy', 'IR35 & Self-Employment Tax', 'Non-Dom Tax Rules',
    'Windfall Taxes', 'Tax Avoidance & Evasion', 'Child Benefit & Tax Credits',
    'The Budget', 'Spending Review', 'Departmental Budgets', 'Public Sector Pay',
    'Foreign Aid Budget', 'NHS Funding Allocation', 'Defence Budget', 'Welfare Budget',
    'Pensions', 'State Pension Age', 'Auto-Enrolment', 'Pension Tax Relief',
    'National Debt', 'Government Borrowing', 'Gilt Market', 'Debt Management Office',
    'OBR & Fiscal Rules', 'Charter for Budget Responsibility', 'Quantitative Easing',
    'Banks', 'Financial Regulation', 'Financial Conduct Authority', 'Bank of England',
    'Payment Systems', 'Insurance Industry', 'Consumer Credit', 'Open Banking',
    'Financial Inclusion', 'Stock Market Regulation', 'Pension Funds Regulation',
    'Inflation', 'Cost of Living', 'Mortgage Rules', 'Economic Growth', 'Productivity',
    'National Wealth Fund', 'UK Infrastructure Bank', 'Green Finance',
    'Industrial Strategy Funding', 'Crypto & Digital Money', 'Financial Services',
    'Financial Sanctions', 'Economic Crime & Money Laundering', 'G7 & IMF',
    'Ukraine Financial Support', 'International Development Finance',
    'National Savings & Investments', 'Royal Mint & Coinage',
    'NatWest Government Shareholding', 'Post Office Financial Services',
    'HMRC Oversight', 'Customs & Excise',
  ],
  description: 'The Ultimate Power Centre. Controls the nation\'s finances — every other department answers to the Treasury for money.',
  streetContext: 'With inflation at 2.3%, national debt at 93% of GDP and energy bills still high, most people feel they are working harder for less. The tax trap — frozen thresholds dragging millions into higher rates — is the biggest grievance on the street right now.'
};

export default meta;
