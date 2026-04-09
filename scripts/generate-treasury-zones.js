const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const budgetDoc = fs.readFileSync('/tmp/budget-2025-ootlar.txt', 'utf8');
const existingContexts = fs.existsSync('/tmp/treasury-contexts-full2.json')
  ? JSON.parse(fs.readFileSync('/tmp/treasury-contexts-full2.json', 'utf8'))
  : {};

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

async function generateContext(zone) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are extracting current UK government policy information about "${zone}" from the official Budget 2025 document below.

Write 3-4 sentences explaining: what this policy area is, the current UK government position on it, any recent changes, and why it matters to ordinary people. Use only information from the document. If the document does not cover this topic, write what you know from the most recent UK government policy on this topic up to early 2026. Plain English only. No bullet points. No preamble. Just the paragraph.

Budget 2025 document:
${budgetDoc.slice(0, 80000)}`
    }]
  });
  return response.content[0].text.trim();
}

async function main() {
  console.log('Generating contexts for missing Treasury zones...\n');
  const output = { ...existingContexts };

  for (const zone of missingZones) {
    try {
      const context = await generateContext(zone);
      output[zone] = { content: context };
      console.log(`✓ ${zone}`);
      console.log(`  ${context.slice(0, 120)}...\n`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.log(`✗ ${zone}: ${err.message}`);
    }
  }

  fs.writeFileSync('/tmp/treasury-contexts-full2.json', JSON.stringify(output, null, 2));
  console.log('Saved to /tmp/treasury-contexts-full2.json');
}

main();
