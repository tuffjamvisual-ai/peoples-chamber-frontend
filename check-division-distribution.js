process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
