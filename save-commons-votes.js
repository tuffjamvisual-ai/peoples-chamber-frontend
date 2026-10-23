process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function saveDivisionData() {
  console.log('Fetching bills with parliament_id...');
  
  // Get bills that have parliament_id
  const { data: bills } = await supabase
    .from('bill')
    .select('id, parliament_id, title')
    .not('parliament_id', 'is', null)
    .limit(200);
  
  if (!bills || bills.length === 0) {
    console.log('No bills with parliament_id found');
    return;
  }
  
  console.log(`Found ${bills.length} bills with parliament_id`);
  console.log('Fetching division data from UK Parliament API...');
  
  let matched = 0;
  
  for (const bill of bills) {
    try {
      // Fetch divisions for this bill
      const url = `https://bills-api.parliament.uk/api/v1/Bills/${bill.parliament_id}/Divisions`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        // Use the first (most recent) division
        const division = data.items[0];
        
        await supabase
          .from('bill')
          .update({
            commons_ayes: division.ayeCount || 0,
            commons_noes: division.noeCount || 0,
            commons_division_id: division.divisionId,
            commons_division_title: division.title,
            commons_vote_date: division.date
          })
          .eq('id', bill.id);
        
        matched++;
        console.log(`✓ #${bill.id}: ${bill.title.substring(0, 40)}... → ${division.ayeCount} Ayes, ${division.noeCount} Noes`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      // Skip errors silently
    }
  }
  
  console.log(`\n✓ Successfully saved ${matched} bills with Commons votes!`);
}

saveDivisionData();
