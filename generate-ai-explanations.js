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
  const prompt = `You are helping UK citizens understand a parliamentary bill in simple language.

Bill Title: ${bill.title}
Description: ${bill.description}
Current Stage: ${bill.current_stage}
Sponsor: ${bill.sponsor_name} (${bill.sponsor_party})

Generate THREE short explanations (each 2-3 sentences maximum):

1. SUPPORT: What does a vote to support this bill mean? What would happen if it passes?
2. OPPOSE: What does a vote to oppose this bill mean? What concerns might people have?
3. SUMMARY: In plain language, what does this bill actually do?

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
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;
    
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const explanations = JSON.parse(jsonMatch[0]);
    
    return {
      support: explanations.support,
      oppose: explanations.oppose,
      summary: explanations.summary,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens
    };
    
  } catch (error) {
    console.error(`Error generating explanation for bill ${bill.id}:`, error.message);
    return null;
  }
}

async function generateAllExplanations() {
  console.log('=== AI EXPLANATION GENERATOR ===\n');
  
  const { data: bills, error } = await supabase
    .from('bill')
    .select('id, parliament_id, title, description, current_stage, sponsor_name, sponsor_party')
    .is('ai_generated', false)
    .not('current_stage', 'eq', 'Withdrawn')
    .not('current_stage', 'eq', 'Royal Assent')
    .order('id', { ascending: true })
    .limit(3200);
  
  if (error) {
    console.error('Error fetching bills:', error);
    return;
  }
  
  console.log(`Found ${bills.length} bills needing explanations\n`);
  
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (const bill of bills) {
    console.log(`Processing ${processed + 1}/${bills.length}: ${bill.title.substring(0, 60)}...`);
    
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
        console.error(`  ✗ Database error: ${updateError.message}`);
      }
    } else {
      failed++;
    }
    
    processed++;
    
    if (processed % 10 === 0) {
      const inputCost = (totalInputTokens / 1000000) * 0.25;
      const outputCost = (totalOutputTokens / 1000000) * 1.25;
      const totalCost = inputCost + outputCost;
      console.log(`  Progress: ${successful} successful, ${failed} failed, Cost so far: $${totalCost.toFixed(4)}\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const inputCost = (totalInputTokens / 1000000) * 0.25;
  const outputCost = (totalOutputTokens / 1000000) * 1.25;
  const totalCost = inputCost + outputCost;
  
  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Total bills processed: ${processed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Input tokens: ${totalInputTokens.toLocaleString()}`);
  console.log(`Output tokens: ${totalOutputTokens.toLocaleString()}`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);
}

generateAllExplanations().catch(console.error);
