const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function downloadAllDivisions() {
  console.log('Downloading ALL divisions from Commons API...\n');
  
  const allDivisions = [];
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`Fetching batch starting at ${skip}...`);
    
    try {
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=&queryParameters.skip=${skip}&queryParameters.take=25`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        allDivisions.push(...data);
        console.log(`  Got ${data.length} divisions (Total so far: ${allDivisions.length})`);
        skip += 25;
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
      hasMore = false;
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log(`\n✓ Downloaded ${allDivisions.length} total divisions\n`);
  
  // Match to bills
  console.log('Matching divisions to your bills...\n');
  
  const { data: bills } = await supabase
    .from('bill')
    .select('id, title')
    .is('commons_division_id', null)
    .eq('status', 'Active');
  
  console.log(`Checking ${bills.length} bills...\n`);
  
  let matched = 0;
  
  for (const bill of bills) {
    const billTitleClean = bill.title
      .toLowerCase()
      .replace(/\s+bill$/i, '')
      .replace(/\s+act$/i, '')
      .replace(/\s*\[hl\]$/i, '')
      .replace(/\s*\(.*?\)$/g, '')
      .trim();
    
    const match = allDivisions.find(div => {
      if (!div.Title) return false;
      const divTitle = div.Title.toLowerCase();
      return divTitle.includes(billTitleClean.substring(0, 20)) || 
             billTitleClean.includes(div.Title.substring(0, 20).toLowerCase());
    });
    
    if (match && (match.AyeCount > 0 || match.NoCount > 0)) {
      await supabase.from('bill').update({
        commons_ayes: match.AyeCount,
        commons_noes: match.NoCount,
        commons_division_id: match.DivisionId,
        commons_division_title: match.Title,
        commons_vote_date: match.Date
      }).eq('id', bill.id);
      
      matched++;
      if (matched <= 50) {
        console.log(`✓ #${bill.id}: ${bill.title.substring(0, 35)}... → ${match.AyeCount} Ayes, ${match.NoCount} Noes`);
      }
    }
  }
  
  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total divisions downloaded: ${allDivisions.length}`);
  console.log(`Total bills matched: ${matched}`);
}

downloadAllDivisions();
