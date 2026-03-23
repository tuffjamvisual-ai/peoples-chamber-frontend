const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
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
