process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplainer(poll) {
  const prompt = `Write a 3-sentence explainer for a UK public opinion poll. Exactly 3 sentences, no more.

Poll: ${poll.question}
Topic: ${poll.constituency}

Sentence 1: Why this issue matters right now — one key fact or recent event that puts it in context.
Sentence 2: The strongest honest reason to vote YES — real and human, not political spin.
Sentence 3: The strongest honest reason to vote NO — a genuine concern or risk worth considering.

Plain English. Direct. Balanced. Treat the reader as an intelligent adult. Roughly 60-80 words total.

Return ONLY JSON: { "explainer": "..." }`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
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
  console.log('=== REGENERATING POLL EXPLAINERS V6 ===\n');
  const { data: polls } = await supabase.from('polls').select('id, question, constituency');
  console.log('Found ' + polls.length + ' polls\n');

  for (const poll of polls) {
    console.log('Poll: ' + poll.question.substring(0, 50) + '...');
    const explainer = await generateExplainer(poll);
    if (explainer) {
      await supabase.from('polls').update({ explainer }).eq('id', poll.id);
      console.log('  ' + explainer + '\n');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.log('=== COMPLETE ===');
}

run().catch(console.error);
