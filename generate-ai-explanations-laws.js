const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicApiKey) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable not set!');
  console.log('\nRun this command first:');
  console.log('export ANTHROPIC_API_KEY="your-api-key-here"');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: anthropicApiKey });

async function generateExplanation(bill) {
  const prompt = `You are helping UK citizens understand a parliamentary Act (law) in simple language.

Act Title: ${bill.title}
Description: ${bill.description}
Sponsor: ${bill.sponsor_name || 'Unknown'} (${bill.sponsor_party || 'Unknown'})

Generate THREE short explanations (each 2-3 sentences maximum):

1. SUPPORT: What does supporting this Act mean? What does it do for the public?
2. OPPOSE: What concerns might people have about this Act?
3. SUMMARY: In plain language, what does this Act actually do?

Keep it simple, factual, and non-partisan. Write at a Year 10 reading level.

Format your response as JSON:
{
  "support": "...",
  "oppose": "...",
  "summary": "..."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const explanations = JSON.parse(jsonMatch[0]);
    return {
      support: explanations.support,
      oppose: explanations.oppose,
      summary: explanations.summary,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens
    };
  } catch (error) {
    console.error(`Error for bill ${bill.id}:`, error.message);
    return null;
  }
}

async function generateLawExplanations() {
  console.log('=== AI EXPLANATION GENERATOR FOR LAWS ===\n');

  const allLaws = [];
  let rangeStart = 0;
  const rangeSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('bill')
      .select('id, title, description, current_stage, sponsor_name, sponsor_party')
      .eq('is_act', true)
      .is('plain_summary', null)
      .range(rangeStart, rangeStart + rangeSize - 1);

    if (error) { console.error('Error fetching laws:', error); break; }
    if (!data || data.length === 0) { hasMore = false; break; }
    allLaws.push(...data);
    if (data.length < rangeSize) hasMore = false;
    else rangeStart += rangeSize;
  }

  console.log(`Found ${allLaws.length} laws needing explanations\n`);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const bill of allLaws) {
    console.log(`Processing ${processed + 1}/${allLaws.length}: ${bill.title.substring(0, 60)}...`);

    const result = await generateExplanation(bill);

    if (result) {
      const { error: updateError } = await supabase
        .from('bill')
        .update({
          support_explanation: result.support,
          oppose_explanation: result.oppose,
          plain_summary: result.summary,
          ai_generated: true
        })
        .eq('id', bill.id);

      if (!updateError) {
        successful++;
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
      } else {
        failed++;
        console.error(`  DB error: ${updateError.message}`);
      }
    } else {
      failed++;
    }

    processed++;

    if (processed % 10 === 0) {
      const cost = ((totalInputTokens / 1000000) * 0.25) + ((totalOutputTokens / 1000000) * 1.25);
      console.log(`  Progress: ${successful} done, ${failed} failed, Cost: $${cost.toFixed(4)}\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const cost = ((totalInputTokens / 1000000) * 0.25) + ((totalOutputTokens / 1000000) * 1.25);
  console.log('\n=== COMPLETE ===');
  console.log(`Processed: ${processed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total cost: $${cost.toFixed(4)}`);
}

generateLawExplanations().catch(console.error);
