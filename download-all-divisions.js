const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function downloadAllDivisions() {
  console.log('Downloading ALL 2,239 divisions from Commons API...\n');
  
  const allDivisions = [];
  const totalDivisions = 2239;
  const batchSize = 200;
  
  for (let skip = 0; skip < totalDivisions; skip += batchSize) {
    console.log(`Fetching divisions ${skip}-${skip + batchSize}...`);
    
    try {
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=&queryParameters.skip=${skip}&queryParameters.take=${batchSize}`
      );
      const data = await response.json();
      allDivisions.push(...data);
      console.log(`  Got ${data.length} divisions (Total: ${allDivisions.length})`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n✓ Downloaded ${allDivisions.length} total divisions\n`);
  
  // Now match to YOUR bills
  console.log('Matching divisions to your bills...\n');
  
  const { data: bills } = await supabase
    .from('bill')
    .select('id, title')
    .is('commons_division_id', null)
    .eq('status', 'Active');
  
  let matched = 0;
  
  for (const bill of bills) {
    const billTitleLower = bill.title.toLowerCase()
      .replace(/\s+bill$/i, '')
      .replace(/\s+act$/i, '')
      .replace(/\s*\[hl\]$/i, '');
    
    // Find matching division
    const match = allDivisions.find(div => 
      div.Title && div.Title.toLowerCase().includes(billTitleLower.substring(0, 30))
    );
    
    if (match && (match.AyeCount > 0 || match.NoCount > 0)) {
      await supabase.from('bill').update({
        commons_ayes: match.AyeCount,
        commons_noes: match.NoCount,
        commons_division_id: match.DivisionId,
        commons_division_title: match.Title,
        commons_vote_date: match.Date
      }).eq('id', bill.id);
      
      matched++;
      console.log(`✓ Bill #${bill.id}: ${bill.title.substring(0, 40)}... → ${match.AyeCount} Ayes, ${match.NoCount} Noes`);
    }
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Total divisions downloaded: ${allDivisions.length}`);
  console.log(`Bills matched: ${matched}`);
}

downloadAllDivisions();
