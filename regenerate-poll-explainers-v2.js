process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplainer(poll) {
  const prompt = `You write for a raw, street-level UK politics app. Your job is to capture how REAL people actually feel — not how politicians or BBC journalists talk about it.

Poll: ${poll.question}
Topic: ${poll.constituency}

Write 2-3 sentences MAX. Rules:
- Start with the gut reaction most people have ("Most people are furious about...", "People are sick of...", "Everyone's asking...")
- One sentence for why people vote YES — make it feel real, not political
- One sentence for why people vote NO — make it feel real, not political
- Use plain everyday language. Short punchy sentences. No jargon. No "on the one hand..."
- Sound like someone down the pub who actually knows what they're talking about

Return ONLY JSON:
{
  "explainer": "..."
}`;

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
  console.log('=== REGENERATING POLL EXPLAINERS V2 ===\n');
  const { data: polls } = await supabase.from('polls').select('id, question, constituency');
  console.log('Found ' + polls.length + ' polls\n');

  for (const poll of polls) {
    console.log('Poll: ' + poll.question.substring(0, 50) + '...');
    const explainer = await generateExplainer(poll);
    if (explainer) {
      await supabase.from('polls').update({ explainer }).eq('id', poll.id);
      console.log('  ' + explainer.substring(0, 80) + '...\n');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.log('=== COMPLETE ===');
}

run().catch(console.error);
