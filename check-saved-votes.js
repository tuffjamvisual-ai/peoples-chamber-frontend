const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
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
