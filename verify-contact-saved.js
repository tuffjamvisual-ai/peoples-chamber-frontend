const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
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
