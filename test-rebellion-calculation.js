const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function testRebellionData() {
  console.log('Testing if we can calculate rebellions...\n');
  
  // Get Diane Abbott's votes
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', 172)
    .single();
  
  const { data: votes } = await supabase
    .from('mp_division_votes')
    .select('*')
    .eq('member_id', 172)
    .limit(5);
  
  console.log(`MP: ${mp.name} (${mp.party})\n`);
  
  // For each vote, fetch the division to see party breakdown
  for (const vote of votes || []) {
    try {
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/division/${vote.division_id}.json`
      );
      
      if (response.ok) {
        const division = await response.json();
        
        // Count how their party voted
        const partyAyes = division.Ayes.filter(v => v.Party === mp.party).length;
        const partyNoes = division.Noes.filter(v => v.Party === mp.party).length;
        
        const partyMajorityVote = partyAyes > partyNoes ? 'aye' : 'no';
        const isRebellion = vote.vote_type !== partyMajorityVote;
        
        console.log(`Division: ${vote.division_title}`);
        console.log(`  MP voted: ${vote.vote_type.toUpperCase()}`);
        console.log(`  Party (${mp.party}) voted: ${partyAyes} ayes, ${partyNoes} noes (majority: ${partyMajorityVote.toUpperCase()})`);
        console.log(`  Rebellion: ${isRebellion ? 'YES ⚠️' : 'No'}\n`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`Error processing division ${vote.division_id}\n`);
    }
  }
}

testRebellionData();
