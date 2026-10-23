process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkContactData() {
  const { data, error } = await supabase
    .from('mp_contact')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Sample contact records:', JSON.stringify(data, null, 2));
  }
}

checkContactData();
