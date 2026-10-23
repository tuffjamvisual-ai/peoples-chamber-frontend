process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDivisions() {
  // Check total votes
  const { count } = await supabase
    .from('mp_division_votes')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total votes in table:', count);
  
  // Get sample votes
  const { data: samples } = await supabase
    .from('mp_division_votes')
    .select('*')
    .limit(5);
  
  console.log('\nSample votes:', JSON.stringify(samples, null, 2));
}

checkDivisions();
