const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function calculateRebellions() {
  console.log('Fetching all MPs...');
  const { data: allMPs } = await supabase.from('mps').select('member_id, party');
  const mpPartyMap = {};
  allMPs?.forEach(mp => { mpPartyMap[mp.member_id] = mp.party; });
  console.log(`✅ Loaded ${Object.keys(mpPartyMap).length} MPs\n`);
  
  const { data: bills } = await supabase.from('bill').select('commons_division_id').not('commons_division_id', 'is', null);
  const uniqueDivisions = [...new Set(bills?.map(b => b.commons_division_id).filter(id => id))];
  console.log(`Found ${uniqueDivisions.length} divisions\n`);
  
  let processedDivisions = 0;
  let processedVotes = 0;
  let rebellionsFound = 0;
  let errors = 0;
  
  // Process only first 5 divisions to test
  for (const divisionId of uniqueDivisions.slice(0, 5)) {
    console.log(`\n[${processedDivisions + 1}] Division ${divisionId}...`);
    
    try {
      console.log('  Fetching API...');
      const response = await fetch(`https://commonsvotes-api.parliament.uk/data/division/${divisionId}.json`);
      
      if (!response.ok) {
        console.log(`  ❌ API ${response.status}`);
        errors++;
        continue;
      }
      
      console.log('  Parsing JSON...');
      const division = await response.json();
      
      console.log('  Fetching votes...');
      const { data: votes } = await supabase.from('mp_division_votes').select('id, member_id, vote_type').eq('division_id', divisionId);
      console.log(`  Got ${votes?.length || 0} votes`);
      
      if (!votes || votes.length === 0) continue;
      
      console.log('  Processing votes...');
      let votesInThisDivision = 0;
      
      for (const vote of votes) {
        const mpParty = mpPartyMap[vote.member_id];
        if (!mpParty) continue;
        
        const partyAyes = division.Ayes.filter(v => v.Party === mpParty).length;
        const partyNoes = division.Noes.filter(v => v.Party === mpParty).length;
        
        if (partyAyes === 0 && partyNoes === 0) continue;
        
        const partyMajorityVote = partyAyes > partyNoes ? 'aye' : 'no';
        const isRebellion = vote.vote_type !== partyMajorityVote && mpParty !== 'Independent';
        
        await supabase.from('mp_division_votes').update({ is_rebellion: isRebellion }).eq('id', vote.id);
        
        processedVotes++;
        votesInThisDivision++;
        if (isRebellion) rebellionsFound++;
        
        if (votesInThisDivision % 100 === 0) {
          console.log(`    ${votesInThisDivision} votes processed...`);
        }
      }
      
      console.log(`  ✅ Done: ${votesInThisDivision} votes, ${rebellionsFound} total rebellions`);
      processedDivisions++;
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n=== DONE (first 5 divisions only) ===');
  console.log(`✅ Processed: ${processedDivisions} divisions`);
  console.log(`✅ Updated: ${processedVotes} votes`);
  console.log(`⚠️  Rebellions found: ${rebellionsFound}`);
}

calculateRebellions();
