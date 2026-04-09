const fs = require('fs');

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

async function fetchFullContent(zone) {
  // Search for top result
  const query = encodeURIComponent(zone);
  const searchUrl = `https://www.gov.uk/api/search.json?q=${query}&filter_organisations=hm-treasury&count=1&fields=title,description,link`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const topResult = searchData.results?.[0];
  if (!topResult?.link) return { zone, title: '', content: '' };

  // Fetch full content via GOV.UK content API
  const contentUrl = `https://www.gov.uk/api/content${topResult.link}`;
  const contentRes = await fetch(contentUrl);
  if (!contentRes.ok) return { zone, title: topResult.title, content: topResult.description || '' };
  const contentData = await contentRes.json();

  // Extract text from body
  const body = contentData.details?.body || 
               contentData.details?.introduction || 
               contentData.details?.summary || 
               topResult.description || '';

  // Strip HTML tags
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    zone,
    title: topResult.title,
    link: topResult.link,
    content: text.slice(0, 3000),
  };
}

async function main() {
  console.log('Fetching full GOV.UK content for Treasury zones...\n');
  const output = {};

  for (const zone of zones) {
    try {
      const result = await fetchFullContent(zone);
      output[zone] = result;
      console.log(`✓ ${zone} — ${result.title}`);
      console.log(`  ${result.content.slice(0, 120)}...\n`);
    } catch (err) {
      console.log(`✗ ${zone}: ${err.message}`);
      output[zone] = { zone, title: '', content: '' };
    }
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync('/tmp/treasury-contexts-full.json', JSON.stringify(output, null, 2));
  console.log('\nSaved to /tmp/treasury-contexts-full.json');
}

main();
