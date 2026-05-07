const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  SUPABASE_KEY,
  { realtime: { transport: ws } });

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
        content: `Search for the very latest UK news about ${dept.name} covering: ${dept.topics}. Find 3-4 specific current controversies, figures or issues that are happening right now. Then write a punchy 4-5 sentence street view paragraph for a UK politics app that: names the specific issues people are angry or worried about, includes specific figures where known (e.g. £1,738 energy bills, 3.7 million dragged into higher tax), explains the real impact on ordinary people, uses plain English anyone can understand, does NOT mention specific months or years. Return ONLY the paragraph, no intro or sign-off.`
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

// Refresh throttle: a department's "current controversies" street view
// is genuinely time-sensitive but daily regeneration is wasteful — politics
// rarely shifts inside a week. Default to weekly; --force overrides.
const MIN_REFRESH_HOURS = parseInt(process.env.MIN_REFRESH_HOURS || '168', 10);
const FORCE = process.argv.includes('--force');

async function main() {
  console.log(`Starting department context generation (refresh threshold: ${MIN_REFRESH_HOURS}h${FORCE ? ', --force' : ''})`);

  let recent = new Set();
  if (!FORCE) {
    const cutoff = new Date(Date.now() - MIN_REFRESH_HOURS * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('department_context')
      .select('slug, generated_at')
      .gte('generated_at', cutoff);
    if (error) {
      console.error('Could not check existing rows, proceeding without throttle:', error.message);
    } else {
      recent = new Set((data || []).map(r => r.slug));
      console.log(`Skipping ${recent.size} of ${departments.length} departments — refreshed within last ${MIN_REFRESH_HOURS}h.`);
    }
  }

  let generated = 0, skipped = 0, failed = 0;
  for (const dept of departments) {
    if (recent.has(dept.slug)) { skipped++; continue; }
    const context = await generateContext(dept);
    if (context) {
      const { error } = await supabase
        .from('department_context')
        .upsert({ slug: dept.slug, street_context: context, generated_at: new Date().toISOString() }, { onConflict: 'slug' });
      if (error) {
        console.error(`Failed to save ${dept.slug}:`, error.message);
        failed++;
      } else {
        console.log(`✓ ${dept.name} saved`);
        generated++;
      }
      await new Promise(r => setTimeout(r, 2000));
    } else {
      failed++;
    }
  }
  console.log(`Done. Generated ${generated}, skipped ${skipped}, failed ${failed}.`);
}

main();
