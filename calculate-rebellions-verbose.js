const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function calculateRebellions() {
  console.log('Calculating rebellions for all votes...\n');
  
  const { data: bills } = await supabase
    .from('bill')
    .select('commons_division_id')
    .not('commons_division_id', 'is', null);
  
  const uniqueDivisions = [...new Set(bills?.map(b => b.commons_division_id).filter(id => id))];
  
  console.log(`Found ${uniqueDivisions.length} unique divisions\n`);
  
  let processedDivisions = 0;
  let processedVotes = 0;
  let rebellionsFound = 0;
  let errors = 0;
  
  for (const divisionId of uniqueDivisions) {
    console.log(`\nProcessing division ${divisionId}...`);
    
    try {
      // Fetch division data from API
      console.log(`  Fetching from API...`);
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/division/${divisionId}.json`
      );
      
      if (!response.ok) {
        console.log(`  ❌ API error (${response.status})`);
        errors++;
        continue;
      }
      
      const division = await response.json();
      console.log(`  ✅ API data received`);
      
      // Get all votes for this division
      console.log(`  Fetching votes from database...`);
      const { data: votes } = await supabase
        .from('mp_division_votes')
        .select('id, member_id, vote_type')
        .eq('division_id', divisionId);
      
      console.log(`  Found ${votes?.length || 0} votes`);
      
      if (!votes || votes.length === 0) {
        continue;
      }
      
      // Process votes in batches
      let votesProcessed = 0;
      for (const vote of votes) {
        const { data: mp } = await supabase
          .from('mps')
          .select('party')
          .eq('member_id', vote.member_id)
          .single();
        
        if (!mp || !mp.party) continue;
        
        const partyAyes = division.Ayes.filter(v => v.Party === mp.party).length;
        const partyNoes = division.Noes.filter(v => v.Party === mp.party).length;
        
        if (partyAyes === 0 && partyNoes === 0) continue;
        
        const partyMajorityVote = partyAyes > partyNoes ? 'aye' : 'no';
        const isRebellion = vote.vote_type !== partyMajorityVote && mp.party !== 'Independent';
        
        await supabase
          .from('mp_division_votes')
          .update({ is_rebellion: isRebellion })
          .eq('id', vote.id);
        
        processedVotes++;
        votesProcessed++;
        if (isRebellion) rebellionsFound++;
      }
      
      console.log(`  ✅ Updated ${votesProcessed} votes (${rebellionsFound} total rebellions)`);
      
      processedDivisions++;
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`✅ Processed: ${processedDivisions} divisions`);
  console.log(`✅ Updated: ${processedVotes} votes`);
  console.log(`⚠️  Rebellions found: ${rebellionsFound}`);
  console.log(`📊 Rebellion rate: ${processedVotes > 0 ? ((rebellionsFound/processedVotes)*100).toFixed(2) : 0}%`);
  console.log(`❌ Errors: ${errors}`);
}

calculateRebellions();
