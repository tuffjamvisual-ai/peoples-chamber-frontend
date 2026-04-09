const fs = require('fs');

const zoneUrls = {
  'Corporation Tax': '/corporation-tax',
  'Capital Gains Tax': '/capital-gains-tax',
  'Inheritance Tax': '/inheritance-tax',
  'Stamp Duty': '/stamp-duty-land-tax',
  'Fuel Duty': '/fuel-duty',
  'Alcohol & Tobacco Duty': '/alcohol-duties-guide',
  'Business Rates': '/introduction-to-business-rates',
  'Air Passenger Duty': '/what-is-air-passenger-duty',
  'Vehicle Excise Duty': '/vehicle-tax-rate-tables',
  'Insurance Premium Tax': '/insurance-premium-tax',
  'Climate Change Levy': '/climate-change-levy',
  'Bank Levy': '/guidance/bank-levy',
  'Apprenticeship Levy': '/guidance/pay-apprenticeship-levy',
  'IR35 & Self-Employment Tax': '/guidance/understanding-off-payroll-working-ir35',
  'Non-Dom Tax Rules': '/tax-foreign-income',
  'Windfall Taxes': '/guidance/check-if-youre-eligible-for-the-energy-profits-levy',
  'Tax Avoidance & Evasion': '/guidance/tax-avoidance-an-introduction',
  'Child Benefit & Tax Credits': '/child-benefit',
  'Spending Review': '/government/collections/spending-review-2025',
  'Departmental Budgets': '/government/collections/public-spending-statistics',
  'Public Sector Pay': '/government/collections/public-sector-pay',
  'Foreign Aid Budget': '/government/collections/uk-aid',
  'NHS Funding Allocation': '/government/collections/nhs-pay-and-conditions',
  'Defence Budget': '/government/collections/uk-defence-spending',
  'Welfare Budget': '/government/collections/welfare-spending',
  'State Pension Age': '/state-pension-age',
  'Auto-Enrolment': '/workplace-pensions',
  'Pension Tax Relief': '/tax-on-your-private-pension',
  'Government Borrowing': '/government/collections/public-sector-finances',
  'Gilt Market': '/guidance/gilt-market',
  'Debt Management Office': '/government/organisations/uk-debt-management-office',
  'OBR & Fiscal Rules': '/government/organisations/office-for-budget-responsibility',
  'Charter for Budget Responsibility': '/government/publications/charter-for-budget-responsibility-autumn-2024-update',
  'Quantitative Easing': '/government/publications/asset-purchase-facility',
  'Financial Regulation': '/guidance/financial-services-regulatory-initiatives-forum',
  'Financial Conduct Authority': '/government/organisations/financial-conduct-authority',
  'Bank of England': '/government/organisations/bank-of-england',
  'Payment Systems': '/guidance/payment-systems-regulation',
  'Insurance Industry': '/guidance/insurance-supervision',
  'Consumer Credit': '/consumer-credit',
  'Open Banking': '/guidance/open-banking',
  'Financial Inclusion': '/government/publications/financial-inclusion-strategy',
  'Stock Market Regulation': '/guidance/uk-listings-review',
  'Pension Funds Regulation': '/guidance/pension-fund-investment',
  'Productivity': '/government/collections/uk-productivity',
  'National Wealth Fund': '/government/organisations/national-wealth-fund',
  'UK Infrastructure Bank': '/government/organisations/uk-infrastructure-bank',
  'Green Finance': '/government/collections/green-finance',
  'Industrial Strategy Funding': '/government/collections/industrial-strategy',
  'Financial Services': '/government/collections/financial-services',
  'Financial Sanctions': '/financial-sanctions-guidance',
  'Economic Crime & Money Laundering': '/guidance/money-laundering-regulations',
  'G7 & IMF': '/government/collections/g7-finance-ministers',
  'Ukraine Financial Support': '/government/collections/uk-support-for-ukraine',
  'International Development Finance': '/government/organisations/british-international-investment',
  'National Savings & Investments': '/government/organisations/ns-i',
  'Royal Mint & Coinage': '/government/organisations/royal-mint',
  'NatWest Government Shareholding': '/guidance/natwest-share-sale',
  'Post Office Financial Services': '/government/collections/post-office',
  'HMRC Oversight': '/government/organisations/hm-revenue-customs',
  'Customs & Excise': '/guidance/customs-procedures-if-the-uk-leaves-the-eu-with-no-deal',
};

async function fetchContent(zone, path) {
  try {
    const res = await fetch(`https://www.gov.uk/api/content${path}`);
    if (!res.ok) return '';
    const data = await res.json();

    // Try parts first (guide format)
    const parts = data.details?.parts || [];
    if (parts.length > 0) {
      return parts.map(p => {
        const text = (p.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return `${p.title}: ${text}`;
      }).join(' ').slice(0, 3000);
    }

    // Try body
    const body = data.details?.body || data.details?.introduction || data.description || '';
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch {
    return '';
  }
}

async function main() {
  console.log('Fetching full GOV.UK content for Treasury zones...\n');
  const output = {};

  for (const [zone, path] of Object.entries(zoneUrls)) {
    const content = await fetchContent(zone, path);
    output[zone] = { path, content };
    console.log(`${content ? '✓' : '✗'} ${zone} (${content.length} chars)`);
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync('/tmp/treasury-contexts-full2.json', JSON.stringify(output, null, 2));
  console.log('\nSaved to /tmp/treasury-contexts-full2.json');
}

main();
