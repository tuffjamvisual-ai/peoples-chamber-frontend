const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
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
