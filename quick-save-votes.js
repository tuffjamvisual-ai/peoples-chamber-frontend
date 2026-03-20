const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function searchDivision(billTitle) {
  const term = billTitle.replace(/\s+Bill$/i, '').replace(/\s*\[HL\]$/i, '').trim();
  
  try {
    const response = await fetch(
      `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=${encodeURIComponent(term)}&queryParameters.take=3`
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data[0]; // Return first match
    }
  } catch (e) {
    return null;
  }
  
  return null;
}

async function quickSave() {
  // Only check bills from stages that typically have votes
  const { data: bills } = await supabase
    .from('bill')
    .select('id, title')
    .is('commons_division_id', null)
    .in('current_stage', ['Royal Assent', '3rd reading', 'Report stage', 'Committee stage'])
    .limit(200);
  
  console.log(`Checking ${bills.length} bills likely to have votes...\n`);
  
  let saved = 0;
  
  for (const bill of bills) {
    const division = await searchDivision(bill.title);
    
    if (division && (division.AyeCount > 0 || division.NoCount > 0)) {
      await supabase
        .from('bill')
        .update({
          commons_ayes: division.AyeCount,
          commons_noes: division.NoCount,
          commons_division_id: division.DivisionId,
          commons_division_title: division.Title,
          commons_vote_date: division.Date
        })
        .eq('id', bill.id);
      
      saved++;
      console.log(`✓ #${bill.id}: ${bill.title.substring(0, 45)}... → ${division.AyeCount} Ayes, ${division.NoCount} Noes`);
    }
    
    await new Promise(r => setTimeout(r, 150)); // Rate limit
  }
  
  console.log(`\n✓ Saved ${saved} bills with Commons votes!`);
}

quickSave();
