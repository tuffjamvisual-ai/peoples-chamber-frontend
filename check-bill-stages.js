const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function checkStages() {
  const { data, error } = await supabase
    .from('bill')
    .select('current_stage')
    .eq('status', 'Active');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const stages = {};
  data.forEach(bill => {
    const stage = bill.current_stage || 'Unknown';
    stages[stage] = (stages[stage] || 0) + 1;
  });
  
  console.log('Bill stages breakdown:\n');
  Object.entries(stages)
    .sort((a, b) => b[1] - a[1])
    .forEach(([stage, count]) => {
      console.log(`${count.toString().padStart(4)} bills - ${stage}`);
    });
  
  console.log(`\nTotal: ${data.length} bills`);
}

checkStages();
