const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function clearVotingRecords() {
  console.log('Clearing existing voting records...\n');
  
  const { error } = await supabase
    .from('mp_division_votes')
    .delete()
    .neq('id', 0); // Delete all records
  
  if (error) {
    console.log('Error clearing records:', error);
  } else {
    console.log('✅ All voting records cleared');
    console.log('Now ready to re-fetch all voting data\n');
  }
}

clearVotingRecords();
