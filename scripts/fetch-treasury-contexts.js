const zones = [
  'Corporation Tax', 'Capital Gains Tax', 'Inheritance Tax', 'Stamp Duty',
  'Fuel Duty', 'Alcohol & Tobacco Duty', 'Business Rates', 'Air Passenger Duty',
  'Vehicle Excise Duty', 'Insurance Premium Tax', 'Climate Change Levy',
  'Bank Levy', 'Apprenticeship Levy', 'IR35 & Self-Employment Tax',
  'Non-Dom Tax Rules', 'Windfall Taxes', 'Tax Avoidance & Evasion',
  'Child Benefit & Tax Credits', 'Spending Review', 'Departmental Budgets',
  'Public Sector Pay', 'Foreign Aid Budget', 'NHS Funding Allocation',
  'Defence Budget', 'Welfare Budget', 'State Pension Age', 'Auto-Enrolment',
  'Pension Tax Relief', 'Government Borrowing', 'Gilt Market',
  'Debt Management Office', 'OBR & Fiscal Rules', 'Charter for Budget Responsibility',
  'Quantitative Easing', 'Financial Regulation', 'Financial Conduct Authority',
  'Bank of England', 'Payment Systems', 'Insurance Industry', 'Consumer Credit',
  'Open Banking', 'Financial Inclusion', 'Stock Market Regulation',
  'Pension Funds Regulation', 'Productivity', 'National Wealth Fund',
  'UK Infrastructure Bank', 'Green Finance', 'Industrial Strategy Funding',
  'Financial Services', 'Financial Sanctions', 'Economic Crime & Money Laundering',
  'G7 & IMF', 'Ukraine Financial Support', 'International Development Finance',
  'National Savings & Investments', 'Royal Mint & Coinage',
  'NatWest Government Shareholding', 'Post Office Financial Services',
  'HMRC Oversight', 'Customs & Excise',
];

async function fetchGovukContext(zone) {
  const query = encodeURIComponent(zone);
  const url = `https://www.gov.uk/api/search.json?q=${query}&filter_organisations=hm-treasury&count=3&fields=title,description,link`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) return null;
    return results.map(r => `${r.title}: ${r.description || ''}`).join(' | ');
  } catch {
    return null;
  }
}

async function main() {
  console.log('Fetching GOV.UK context for Treasury zones...\n');
  const output = {};

  for (const zone of zones) {
    const context = await fetchGovukContext(zone);
    output[zone] = context;
    console.log(`✓ ${zone}`);
    console.log(`  ${context?.slice(0, 120) || 'No results found'}\n`);
    await new Promise(r => setTimeout(r, 300));
  }

  const fs = require('fs');
  fs.writeFileSync('/tmp/treasury-contexts.json', JSON.stringify(output, null, 2));
  console.log('\nSaved to /tmp/treasury-contexts.json');
}

main();
