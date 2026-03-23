const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function calculateRebellions() {
  console.log('Calculating rebellions for all votes...\n');
  
  // Get all bills with division IDs (this is the source of truth)
  const { data: bills } = await supabase
    .from('bill')
    .select('commons_division_id')
    .not('commons_division_id', 'is', null);
  
  const uniqueDivisions = [...new Set(bills?.map(b => b.commons_division_id).filter(id => id))];
  
  console.log(`Found ${uniqueDivisions.length} unique divisions from bills table\n`);
  
  let processedDivisions = 0;
  let processedVotes = 0;
  let rebellionsFound = 0;
  let errors = 0;
  
  for (const divisionId of uniqueDivisions) {
    try {
      // Fetch division data from API
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/division/${divisionId}.json`
      );
      
      if (!response.ok) {
        console.log(`⚠️  Division ${divisionId} - API error (${response.status})`);
        errors++;
        continue;
      }
      
      const division = await response.json();
      
      // Get all votes for this division
      const { data: votes } = await supabase
        .from('mp_division_votes')
        .select('id, member_id, vote_type')
        .eq('division_id', divisionId);
      
      if (!votes || votes.length === 0) {
        console.log(`  Division ${divisionId}: No votes found in database`);
        continue;
      }
      
      // Process each vote
      for (const vote of votes) {
        // Get MP's party
        const { data: mp } = await supabase
          .from('mps')
          .select('party')
          .eq('member_id', vote.member_id)
          .single();
        
        if (!mp || !mp.party) continue;
        
        // Count how this MP's party voted
        const partyAyes = division.Ayes.filter(v => v.Party === mp.party).length;
        const partyNoes = division.Noes.filter(v => v.Party === mp.party).length;
        
        // Skip if party didn't vote
        if (partyAyes === 0 && partyNoes === 0) continue;
        
        // Determine party majority vote
        const partyMajorityVote = partyAyes > partyNoes ? 'aye' : 'no';
        
        // Check if this is a rebellion
        const isRebellion = vote.vote_type !== partyMajorityVote && mp.party !== 'Independent';
        
        // Update the vote record
        const { error: updateError } = await supabase
          .from('mp_division_votes')
          .update({ is_rebellion: isRebellion })
          .eq('id', vote.id);
        
        if (!updateError) {
          processedVotes++;
          if (isRebellion) rebellionsFound++;
        }
      }
      
      processedDivisions++;
      if (processedDivisions % 10 === 0) {
        console.log(`[${processedDivisions}/${uniqueDivisions.length}] Processed - ${rebellionsFound} rebellions found so far`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.log(`❌ Error processing division ${divisionId}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`✅ Processed: ${processedDivisions} divisions`);
  console.log(`✅ Updated: ${processedVotes} votes`);
  console.log(`⚠️  Rebellions found: ${rebellionsFound}`);
  console.log(`📊 Rebellion rate: ${((rebellionsFound/processedVotes)*100).toFixed(2)}%`);
  console.log(`❌ Errors: ${errors}`);
}

calculateRebellions();
