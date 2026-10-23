process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkParliamentIds() {
  const { data, error } = await supabase
    .from('bill')
    .select('id, title, parliament_id')
    .not('parliament_id', 'is', null)
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Bills with parliament_id:\n`);
  data.forEach(bill => {
    console.log(`Bill #${bill.id}: ${bill.title}`);
    console.log(`  parliament_id: ${bill.parliament_id}\n`);
  });
}

checkParliamentIds();
