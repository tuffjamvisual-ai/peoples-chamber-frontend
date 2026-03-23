const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function checkDivisions() {
  // Count votes by division
  const { data: voteCounts } = await supabase
    .from('mp_division_votes')
    .select('division_id')
    .limit(1000);
  
  const divisionCounts = voteCounts?.reduce((acc, vote) => {
    acc[vote.division_id] = (acc[vote.division_id] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Divisions with vote counts:');
  Object.entries(divisionCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([divId, count]) => {
      console.log(`  Division ${divId}: ${count} votes`);
    });
  
  console.log(`\nTotal unique divisions: ${Object.keys(divisionCounts || {}).length}`);
  console.log(`Total votes checked: ${voteCounts?.length}`);
}

checkDivisions();
