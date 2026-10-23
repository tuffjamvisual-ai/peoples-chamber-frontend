process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplanation(poll) {
  const prompt = `You are helping UK citizens understand a political poll question.

Poll Question: ${poll.question}
Topic: ${poll.constituency}

Write a SHORT neutral explainer (3-4 sentences) that:
1. Explains the background/context of this issue
2. Summarises the main argument FOR voting Yes
3. Summarises the main argument FOR voting No

Be balanced, factual and write for a general adult audience. Do not take sides.

Return ONLY a JSON object:
{
  "explainer": "..."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = message.content[0].text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    return json.explainer;
  } catch (error) {
    console.error('Error for poll ' + poll.id + ':', error.message);
    return null;
  }
}

async function run() {
  console.log('=== GENERATING POLL EXPLAINERS ===\n');

  const { data: polls } = await supabase.from('polls').select('id, question, constituency');
  console.log('Found ' + polls.length + ' polls\n');

  for (const poll of polls) {
    console.log('Processing: ' + poll.question.substring(0, 50) + '...');
    const explainer = await generateExplanation(poll);
    if (explainer) {
      await supabase.from('polls').update({ explainer }).eq('id', poll.id);
      console.log('  Done\n');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.log('=== COMPLETE ===');
}

run().catch(console.error);
