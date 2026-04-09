const fs = require('fs');

const missingZones = [
  'Fuel Duty', 'Alcohol & Tobacco Duty', 'Air Passenger Duty',
  'Insurance Premium Tax', 'Climate Change Levy', 'Bank Levy',
  'Windfall Taxes', 'Departmental Budgets', 'Public Sector Pay',
  'Foreign Aid Budget', 'NHS Funding Allocation', 'Defence Budget',
  'Welfare Budget', 'Government Borrowing', 'Gilt Market',
  'Charter for Budget Responsibility', 'Quantitative Easing',
  'Financial Regulation', 'Payment Systems', 'Insurance Industry',
  'Consumer Credit', 'Open Banking', 'Stock Market Regulation',
  'Pension Funds Regulation', 'Productivity', 'Green Finance',
  'Industrial Strategy Funding', 'Financial Services', 'Financial Sanctions',
  'Economic Crime & Money Laundering', 'G7 & IMF', 'Ukraine Financial Support',
  'International Development Finance', 'NatWest Government Shareholding',
  'Post Office Financial Services', 'Customs & Excise',
];

async function safeJson(res) {
  const text = await res.text();
  if (text.trim().startsWith('<')) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function fetchLatest(zone) {
  try {
    const query = encodeURIComponent(zone);
    const url = `https://www.gov.uk/api/search.json?q=${query}&filter_organisations=hm-treasury&order=updated&count=3&fields=title,description,link,public_timestamp`;
    const res = await fetch(url);
    const data = await safeJson(res);
    if (!data) return '';
    const results = data.results || [];
    if (results.length === 0) return '';
    const top = results[0];
    if (!top.link) return top.description || '';

    const contentRes = await fetch(`https://www.gov.uk/api/content${top.link}`);
    const contentData = await safeJson(contentRes);
    if (!contentData) return top.description || '';

    const parts = contentData.details?.parts || [];
    if (parts.length > 0) {
      return parts.map(p => {
        const text = (p.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return `${p.title}: ${text}`;
      }).join(' ').slice(0, 3000);
    }

    const body = contentData.details?.body || contentData.details?.introduction || contentData.description || top.description || '';
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch (err) {
    return '';
  }
}

async function main() {
  console.log('Fetching missing Treasury zones from GOV.UK...\n');
  const existing = fs.existsSync('/tmp/treasury-contexts-full2.json')
    ? JSON.parse(fs.readFileSync('/tmp/treasury-contexts-full2.json', 'utf8'))
    : {};

  for (const zone of missingZones) {
    const content = await fetchLatest(zone);
    existing[zone] = { content };
    console.log(`${content.length > 100 ? '✓' : '✗'} ${zone} (${content.length} chars)`);
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync('/tmp/treasury-contexts-full2.json', JSON.stringify(existing, null, 2));
  console.log('\nUpdated /tmp/treasury-contexts-full2.json');
}

main();
