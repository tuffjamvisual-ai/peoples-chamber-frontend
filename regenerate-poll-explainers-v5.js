const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateExplainer(poll) {
  const prompt = `You write for a UK public opinion app that helps people think for themselves. Your job is to give readers the real story — honest context, the strongest case on both sides, and the questions they should be asking before they vote.

Poll: ${poll.question}
Topic: ${poll.constituency}

Write 5-6 sentences structured like this:
- Sentence 1-2: Real background. What's the history and recent events that brought us here? Include specific facts that most people might not know but should. Don't shy away from uncomfortable truths on either side.
- Sentence 3: The strongest honest case for YES — the real human need, pain point or principle driving support. What problem does it solve?
- Sentence 4: The strongest honest case for NO — the genuine risk, unintended consequence or principled objection. What could go wrong or what are we giving up?
- Sentence 5: The critical thinking question — what should a switched-on person be asking before they decide? What's the thing the media isn't telling you, or the assumption both sides are making that might be wrong?
- Sentence 6 (optional): What's genuinely at stake long-term if this goes the wrong way.

Tone: Honest, direct, intelligent. Treat the reader as an adult who can handle complexity. No spin, no dumbing down, no false balance — but genuinely fair. Plain English. Short punchy sentences where possible.

Return ONLY JSON:
{
  "explainer": "..."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
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
  console.log('=== REGENERATING POLL EXPLAINERS V5 ===\n');
  const { data: polls } = await supabase.from('polls').select('id, question, constituency');
  console.log('Found ' + polls.length + ' polls\n');

  for (const poll of polls) {
    console.log('Poll: ' + poll.question.substring(0, 50) + '...');
    const explainer = await generateExplainer(poll);
    if (explainer) {
      await supabase.from('polls').update({ explainer }).eq('id', poll.id);
      console.log('  ' + explainer.substring(0, 120) + '...\n');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.log('=== COMPLETE ===');
}

run().catch(console.error);
