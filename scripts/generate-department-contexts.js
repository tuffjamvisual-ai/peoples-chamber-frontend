const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const departments = [
  { slug: 'treasury', name: 'HM Treasury', topics: 'income tax, national insurance, inflation, cost of living, national debt, economic growth, mortgages, banking' },
  { slug: 'home-office', name: 'Home Office', topics: 'immigration, small boats, policing, crime, drugs, counter-terrorism' },
  { slug: 'health', name: 'Health & Social Care', topics: 'NHS, waiting lists, doctors pay, mental health, social care, dentists' },
  { slug: 'energy', name: 'Energy Security & Net Zero', topics: 'energy bills, gas prices, electricity, wind farms, nuclear, net zero, oil and gas' },
  { slug: 'education', name: 'Education', topics: 'schools, teachers, university fees, student loans, childcare, SATs' },
  { slug: 'work-pensions', name: 'Work & Pensions', topics: 'universal credit, benefits, PIP disability, state pension, winter fuel, job centres' },
  { slug: 'transport', name: 'Transport', topics: 'trains, railways, potholes, roads, buses, HS2, smart motorways' },
  { slug: 'environment', name: 'Environment (DEFRA)', topics: 'sewage, water companies, farming, air quality, animal welfare' },
  { slug: 'business-trade', name: 'Business & Trade', topics: 'workers rights, minimum wage, trade deals, high street, post office, small business' },
  { slug: 'science-tech', name: 'Science, Innovation & Tech', topics: 'AI, broadband, social media, cyber security, digital ID' },
  { slug: 'housing', name: 'Housing & Communities', topics: 'house building, renting, council tax, planning, green belt, leasehold' },
  { slug: 'justice', name: 'Justice', topics: 'courts, prisons, sentencing, legal aid, probation, ECHR' },
  { slug: 'defence', name: 'Defence', topics: 'army, navy, RAF, nuclear submarines, veterans, war spending, NATO, Ukraine, Iran' },
  { slug: 'culture', name: 'Culture, Media & Sport', topics: 'BBC, gambling, football, tourism, arts funding, broadcasting' },
  { slug: 'cabinet-office', name: 'Cabinet Office', topics: 'civil service, voting rules, digital ID, electoral reform, MP ethics' },
  { slug: 'foreign-office', name: 'Foreign & Commonwealth', topics: 'Iran, Middle East, Ukraine, foreign aid, embassies, trade diplomacy' },
  { slug: 'attorney-general', name: 'Attorney General', topics: 'government legal advice, serious fraud, prosecution, rule of law' },
  { slug: 'scotland-office', name: 'Scotland Office', topics: 'Scottish devolution, Scottish Parliament, union, independence' },
  { slug: 'wales-office', name: 'Wales Office', topics: 'Welsh devolution, Senedd, Welsh economy, union' },
  { slug: 'northern-ireland-office', name: 'Northern Ireland Office', topics: 'Stormont, Good Friday Agreement, Windsor Framework, NI Assembly' },
  { slug: 'commons-leader', name: 'Leader of the Commons', topics: 'parliamentary schedule, bills debated, MP conduct, Commons business' },
  { slug: 'lords-leader', name: 'Leader of the Lords', topics: 'House of Lords reform, hereditary peers, Lords business' },
  { slug: 'advocate-general', name: 'Advocate General for Scotland', topics: 'Scottish law, devolution legal issues' },
  { slug: 'ukef', name: 'UK Export Finance', topics: 'British exports, trade finance, overseas investment' },
];

async function generateContext(dept) {
  console.log(`Generating context for ${dept.name}...`);
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for the latest UK news about ${dept.name} covering: ${dept.topics}. Then write a 3-4 sentence street view paragraph for a UK politics app. Plain English, what ordinary people are experiencing right now. No specific dates or months — use currently or right now. Return ONLY the paragraph.`
      }]
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim();

    return text;
  } catch (error) {
    console.error(`Error for ${dept.slug}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Starting department context generation...');
  for (const dept of departments) {
    const context = await generateContext(dept);
    if (context) {
      const { error } = await supabase
        .from('department_context')
        .upsert({ slug: dept.slug, street_context: context, generated_at: new Date().toISOString() }, { onConflict: 'slug' });
      if (error) {
        console.error(`Failed to save ${dept.slug}:`, error.message);
      } else {
        console.log(`✓ ${dept.name} saved`);
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('Done!');
}

main();
