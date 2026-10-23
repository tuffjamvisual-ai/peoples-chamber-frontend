process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplainer(poll) {
  const prompt = `You write for a UK street-level politics app. Give people the real facts so they can make up their own mind.

Poll: ${poll.question}
Topic: ${poll.constituency}

Write exactly 3 sentences of pure factual context. No YES/NO framing whatsoever. No "YES voters say" or "NO voters think" or "some people believe."

Just answer these 3 things plainly:
1. What is the actual problem? Give a hard fact.
2. What has been tried or what is the current situation?
3. Why does this matter for ordinary people right now?

Straight facts. Plain English. Like a knowledgeable mate, not a politician. 50-70 words max.

Return ONLY JSON: { "explainer": "..." }`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
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
  console.log('=== FINAL POLL EXPLAINERS ===\n');
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
