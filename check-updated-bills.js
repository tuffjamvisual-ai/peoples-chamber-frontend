process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkUpdated() {
  const { data, error } = await supabase
    .from('bill')
    .select('id, title, commons_ayes, commons_noes, commons_division_title')
    .not('commons_division_id', 'is', null);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nBills with Commons vote data (${data.length}):\n`);
  data.forEach(bill => {
    console.log(`Bill #${bill.id}: ${bill.title}`);
    console.log(`  Commons: ${bill.commons_ayes} Ayes, ${bill.commons_noes} Noes`);
    console.log(`  Division: ${bill.commons_division_title}\n`);
  });
}

checkUpdated();
