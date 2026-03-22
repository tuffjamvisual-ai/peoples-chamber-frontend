const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function fetchVotingRecords() {
  console.log('Fetching bills with division data...\n');
  
  // Get all bills that have division IDs
  const { data: bills, error } = await supabase
    .from('bill')
    .select('id, commons_division_id, commons_division_title, title')
    .not('commons_division_id', 'is', null);
  
  if (error) {
    console.error('Error fetching bills:', error);
    return;
  }
  
  console.log(`Found ${bills.length} bills with division data\n`);
  
  let processedCount = 0;
  let errorCount = 0;
  let totalVotesSaved = 0;
  
  for (const bill of bills) {
    try {
      console.log(`[${processedCount + 1}/${bills.length}] Fetching division ${bill.commons_division_id}...`);
      
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/division/${bill.commons_division_id}.json`
      );
      
      if (!response.ok) {
        console.log(`  ⚠️  API error for division ${bill.commons_division_id}`);
        errorCount++;
        continue;
      }
      
      const divisionData = await response.json();
      
      // Process Ayes
      const ayeVotes = divisionData.Ayes.map(mp => ({
        member_id: mp.MemberId,
        division_id: bill.commons_division_id,
        vote_type: 'aye',
        bill_id: bill.id,
        division_date: divisionData.Date,
        division_title: divisionData.Title
      }));
      
      // Process Noes
      const noVotes = divisionData.Noes.map(mp => ({
        member_id: mp.MemberId,
        division_id: bill.commons_division_id,
        vote_type: 'no',
        bill_id: bill.id,
        division_date: divisionData.Date,
        division_title: divisionData.Title
      }));
      
      const allVotes = [...ayeVotes, ...noVotes];
      
      // Save to database
      const { error: insertError } = await supabase
        .from('mp_division_votes')
        .upsert(allVotes, { onConflict: 'member_id,division_id' });
      
      if (insertError) {
        console.log(`  ❌ Error saving votes: ${insertError.message}`);
        errorCount++;
      } else {
        totalVotesSaved += allVotes.length;
        console.log(`  ✅ Saved ${allVotes.length} votes (${divisionData.AyeCount} ayes, ${divisionData.NoCount} noes)`);
        processedCount++;
      }
      
      // Rate limiting - wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`✅ Processed: ${processedCount} divisions`);
  console.log(`💾 Total votes saved: ${totalVotesSaved}`);
  console.log(`❌ Errors: ${errorCount}`);
}

fetchVotingRecords();
