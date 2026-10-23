process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSaved() {
  const { data: bills, count } = await supabase
    .from('bill')
    .select('id, title, commons_ayes, commons_noes, commons_division_title', { count: 'exact' })
    .not('commons_division_id', 'is', null)
    .limit(10);
  
  console.log(`\nTotal bills with Commons votes: ${count}\n`);
  
  if (bills && bills.length > 0) {
    console.log('Sample bills:');
    bills.forEach(bill => {
      console.log(`  #${bill.id}: ${bill.title.substring(0, 50)}...`);
      console.log(`    → ${bill.commons_ayes} Ayes, ${bill.commons_noes} Noes`);
    });
  }
}

checkSaved();
