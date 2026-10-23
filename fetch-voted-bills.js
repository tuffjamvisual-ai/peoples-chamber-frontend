process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getBillWithVotes(parliamentId) {
  try {
    const response = await fetch(`https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}`);
    if (!response.ok) return null;
    const billData = await response.json();
    
    // Check if bill has any Commons divisions
    const stages = billData.currentStage?.stageStages || [];
    for (const stage of stages) {
      if (stage.house === 1 && stage.divisions && stage.divisions.length > 0) {
        const division = stage.divisions[stage.divisions.length - 1];
        if (division.ayeCount > 0 || division.noCount > 0) {
          return {
            ayes: division.ayeCount || 0,
            noes: division.noCount || 0,
            divisionId: division.divisionId,
            title: division.title
          };
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchOnlyVotedBills() {
  console.log('Fetching bills from database...');
  const { data: bills, error } = await supabase.from('bill').select('id, title, parliament_id').not('parliament_id', 'is', null).is('commons_division_id', null).eq('status', 'Active').limit(200);
  if (error) { console.error('Error:', error); return; }
  
  console.log(`Checking ${bills.length} bills for votes...\n`);
  let updated = 0;
  let skipped = 0;
  
  for (const bill of bills) {
    const division = await getBillWithVotes(bill.parliament_id);
    
    if (division) {
      console.log(`Bill #${bill.id}: ${bill.title.substring(0, 60)}`);
      console.log(`  ${division.ayes} Ayes, ${division.noes} Noes`);
      
      await supabase.from('bill').update({
        commons_ayes: division.ayes,
        commons_noes: division.noes,
        commons_division_id: division.divisionId,
        commons_division_title: division.title
      }).eq('id', bill.id);
      
      updated++;
      console.log(`  Updated\n`);
    } else {
      skipped++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  
  console.log(`\n=== Results ===`);
  console.log(`Bills with votes found: ${updated}`);
  console.log(`Bills without votes: ${skipped}`);
}

fetchOnlyVotedBills();
