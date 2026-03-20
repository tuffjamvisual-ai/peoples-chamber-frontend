const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function getDivisionsForBill(parliamentId) {
  try {
    const response = await fetch(`https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}`);
    if (!response.ok) return null;
    const billData = await response.json();
    const stages = billData.currentStage?.stageStages || [];
    for (const stage of stages) {
      if (stage.house === 1 && stage.divisions && stage.divisions.length > 0) {
        const division = stage.divisions[stage.divisions.length - 1];
        return {
          ayes: division.ayeCount || 0,
          noes: division.noCount || 0,
          divisionId: division.divisionId,
          title: division.title || stage.description
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching bill ${parliamentId}:`, error.message);
    return null;
  }
}

async function fetchVotesById() {
  console.log('Fetching bills...');
  const { data: bills, error } = await supabase.from('bill').select('id, title, parliament_id').not('parliament_id', 'is', null).is('commons_division_id', null).eq('status', 'Active').limit(100);
  if (error) { console.error('Error:', error); return; }
  console.log(`Found ${bills.length} bills\n`);
  let updated = 0;
  let notFound = 0;
  for (const bill of bills) {
    console.log(`Bill #${bill.id}: ${bill.title.substring(0, 50)}...`);
    const division = await getDivisionsForBill(bill.parliament_id);
    if (division && (division.ayes > 0 || division.noes > 0)) {
      console.log(`  Found: ${division.ayes} Ayes, ${division.noes} Noes`);
      const { error: updateError } = await supabase.from('bill').update({commons_ayes: division.ayes, commons_noes: division.noes, commons_division_id: division.divisionId || bill.parliament_id, commons_division_title: division.title}).eq('id', bill.id);
      if (!updateError) { updated++; console.log(`  Updated\n`); }
    } else {
      notFound++;
      console.log(`  No vote\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log(`Updated: ${updated}, Not found: ${notFound}`);
}

fetchVotesById();
