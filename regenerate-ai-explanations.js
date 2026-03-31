const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplanation(bill) {
  const prompt = `You are helping UK citizens understand a parliamentary bill in clear, informative language.

Bill Title: ${bill.title}
Description: ${bill.description}

Generate THREE structured explanations:

1. SUMMARY: 3-4 sentences explaining what this bill does in plain English. Be specific about the key measures.

2. SUPPORT: Write 3-4 bullet points explaining what supporting this bill means. Each bullet should be a specific, concrete benefit or argument. Start each with a dash.

3. OPPOSE: Write 3-4 bullet points explaining what opposing this bill means. Each bullet should be a specific concern or argument against. Start each with a dash.

Be informative, balanced, and specific. Avoid vague language. Write for an informed adult.

Format as JSON:
{
  "summary": "...",
  "support": "...",
  "oppose": "..."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const explanations = JSON.parse(jsonMatch[0]);

    return {
      support: explanations.support,
      oppose: explanations.oppose,
      summary: explanations.summary,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens
    };
  } catch (error) {
    console.error('Error for bill ' + bill.id + ':', error.message);
    return null;
  }
}

async function regenerateAll() {
  console.log('=== REGENERATING ALL AI EXPLANATIONS ===\n');

  const allBills = [];
  let rangeStart = 0;
  const rangeSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('bill')
      .select('id, title, description')
      .range(rangeStart, rangeStart + rangeSize - 1);

    if (error) { console.error('Fetch error:', error); break; }
    if (!data || data.length === 0) { hasMore = false; break; }
    allBills.push(...data);
    if (data.length < rangeSize) hasMore = false;
    else rangeStart += rangeSize;
  }

  console.log('Total bills to process: ' + allBills.length + '\n');

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const bill of allBills) {
    process.stdout.write('Processing ' + (processed + 1) + '/' + allBills.length + ': ' + bill.title.substring(0, 50) + '...\n');

    const result = await generateExplanation(bill);

    if (result) {
      const { error } = await supabase
        .from('bill')
        .update({
          support_explanation: result.support,
          oppose_explanation: result.oppose,
          plain_summary: result.summary,
          ai_generated: true
        })
        .eq('id', bill.id);

      if (!error) {
        successful++;
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
      } else {
        failed++;
      }
    } else {
      failed++;
    }

    processed++;

    if (processed % 50 === 0) {
      const cost = ((totalInputTokens / 1000000) * 0.25) + ((totalOutputTokens / 1000000) * 1.25);
      console.log('  --- Progress: ' + successful + ' done, ' + failed + ' failed, Cost: $' + cost.toFixed(4) + ' ---\n');
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const cost = ((totalInputTokens / 1000000) * 0.25) + ((totalOutputTokens / 1000000) * 1.25);
  console.log('\n=== COMPLETE ===');
  console.log('Processed: ' + processed);
  console.log('Successful: ' + successful);
  console.log('Failed: ' + failed);
  console.log('Total cost: $' + cost.toFixed(4));
}

regenerateAll().catch(console.error);
