const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
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
