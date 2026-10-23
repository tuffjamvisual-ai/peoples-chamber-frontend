process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkStages() {
  const { data, error } = await supabase
    .from('bill')
    .select('current_stage')
    .eq('status', 'Active');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const stages = {};
  data.forEach(bill => {
    const stage = bill.current_stage || 'Unknown';
    stages[stage] = (stages[stage] || 0) + 1;
  });
  
  console.log('Bill stages breakdown:\n');
  Object.entries(stages)
    .sort((a, b) => b[1] - a[1])
    .forEach(([stage, count]) => {
      console.log(`${count.toString().padStart(4)} bills - ${stage}`);
    });
  
  console.log(`\nTotal: ${data.length} bills`);
}

checkStages();
