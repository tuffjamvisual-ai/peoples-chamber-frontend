const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function calculateRebellions() {
  console.log('Calculating rebellions for all votes...\n');
  
  // Fetch ALL MPs once (not per vote!)
  console.log('Fetching all MPs...');
  const { data: allMPs } = await supabase
    .from('mps')
    .select('member_id, party');
  
  const mpPartyMap = {};
  allMPs?.forEach(mp => {
    mpPartyMap[mp.member_id] = mp.party;
  });
  
  console.log(`✅ Loaded ${Object.keys(mpPartyMap).length} MPs\n`);
  
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
    try {
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/division/${divisionId}.json`
      );
      
      if (!response.ok) {
        errors++;
        continue;
      }
      
      const division = await response.json();
      
      const { data: votes } = await supabase
        .from('mp_division_votes')
        .select('id, member_id, vote_type')
        .eq('division_id', divisionId);
      
      if (!votes || votes.length === 0) continue;
      
      // Batch update array
      const updates = [];
      
      for (const vote of votes) {
        const mpParty = mpPartyMap[vote.member_id];
        if (!mpParty) continue;
        
        const partyAyes = division.Ayes.filter(v => v.Party === mpParty).length;
        const partyNoes = division.Noes.filter(v => v.Party === mpParty).length;
        
        if (partyAyes === 0 && partyNoes === 0) continue;
        
        const partyMajorityVote = partyAyes > partyNoes ? 'aye' : 'no';
        const isRebellion = vote.vote_type !== partyMajorityVote && mpParty !== 'Independent';
        
        updates.push({ id: vote.id, is_rebellion: isRebellion });
        
        processedVotes++;
        if (isRebellion) rebellionsFound++;
      }
      
      // Batch update in chunks of 100
      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100);
        for (const update of chunk) {
          await supabase
            .from('mp_division_votes')
            .update({ is_rebellion: update.is_rebellion })
            .eq('id', update.id);
        }
      }
      
      processedDivisions++;
      if (processedDivisions % 10 === 0) {
        console.log(`[${processedDivisions}/${uniqueDivisions.length}] ${rebellionsFound} rebellions found`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
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
