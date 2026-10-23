process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyContactData() {
  // Check total rows
  const { count } = await supabase
    .from('mp_contact')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total contact records:', count);
  
  // Get sample with actual data
  const { data } = await supabase
    .from('mp_contact')
    .select('*')
    .not('twitter', 'is', null)
    .limit(3);
  
  console.log('\nSample records with Twitter:', JSON.stringify(data, null, 2));
}

verifyContactData();
