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
  console.log('Processing all divisions (this will take 3-5 minutes)...\n');
  
  let processedDivisions = 0;
  let processedVotes = 0;
  let rebellionsFound = 0;
  let errors = 0;
  const startTime = Date.now();
  
  for (const divisionId of uniqueDivisions) {
    try {
      const response = await fetch(`https://commonsvotes-api.parliament.uk/data/division/${divisionId}.json`);
      
      if (!response.ok) {
        errors++;
        continue;
      }
      
      const division = await response.json();
      const { data: votes } = await supabase.from('mp_division_votes').select('id, member_id, vote_type').eq('division_id', divisionId);
      
      if (!votes || votes.length === 0) continue;
      
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
        if (isRebellion) rebellionsFound++;
      }
      
      processedDivisions++;
      
      if (processedDivisions % 5 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (processedDivisions / elapsed * 60).toFixed(1);
        const remaining = ((uniqueDivisions.length - processedDivisions) / (processedDivisions / elapsed) / 60).toFixed(1);
        console.log(`[${processedDivisions}/${uniqueDivisions.length}] ${rebellionsFound} rebellions | ${rate}/min | ~${remaining}min left`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
  console.log(`⏱️  Time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
}

calculateRebellions();
