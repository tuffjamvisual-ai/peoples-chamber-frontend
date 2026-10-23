process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
