process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDivisionAPI() {
  // Get a division ID from our database
  const { data: billWithDivision } = await supabase
    .from('bill')
    .select('commons_division_id, commons_division_title, title')
    .not('commons_division_id', 'is', null)
    .limit(1)
    .single();
  
  if (!billWithDivision) {
    console.log('No bills with division data found');
    return;
  }
  
  console.log('Testing with bill:', billWithDivision.title);
  console.log('Division ID:', billWithDivision.commons_division_id);
  console.log('Division Title:', billWithDivision.commons_division_title);
  console.log('\nFetching division data...\n');
  
  const divisionId = billWithDivision.commons_division_id;
  const response = await fetch(
    `https://commonsvotes-api.parliament.uk/data/division/${divisionId}.json`
  );
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    console.log('Error fetching division');
    return;
  }
  
  const data = await response.json();
  console.log('\nDivision data keys:', Object.keys(data));
  console.log('\nFull response:', JSON.stringify(data, null, 2).substring(0, 500));
}

testDivisionAPI().catch(console.error);
