process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplainer(poll) {
  const prompt = `Write a 3-sentence explainer for a UK public opinion poll. Exactly 3 sentences.

Poll: ${poll.question}
Topic: ${poll.constituency}

Sentence 1: Why this is a real problem right now — one key fact that shows the scale of the issue.
Sentence 2: Why YES voters think this specific solution will fix it — what changes for ordinary people.
Sentence 3: Why NO voters agree there's a problem but think this solution is wrong — and what ALTERNATIVE they'd prefer instead. The No argument must offer a different solution, not just say "it won't work."

Critical rule: Both sides must acknowledge the problem is real. The debate is about the BEST SOLUTION, not whether there is a problem.

Plain English. Direct. 60-80 words total. No jargon.

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
  console.log('=== REGENERATING POLL EXPLAINERS V7 ===\n');
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
