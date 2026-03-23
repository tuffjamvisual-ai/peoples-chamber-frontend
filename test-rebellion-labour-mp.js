const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function testLabourRebellions() {
  console.log('Testing rebellions for a Labour MP...\n');
  
  // Get a Labour MP
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('party', 'Labour')
    .limit(1)
    .single();
  
  const { data: votes } = await supabase
    .from('mp_division_votes')
    .select('*')
    .eq('member_id', mp.member_id)
    .limit(10);
  
  console.log(`MP: ${mp.name} (${mp.party})\n`);
  
  let rebellions = 0;
  let totalVotes = 0;
  
  for (const vote of votes || []) {
    try {
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/division/${vote.division_id}.json`
      );
      
      if (response.ok) {
        const division = await response.json();
        
        const partyAyes = division.Ayes.filter(v => v.Party === mp.party).length;
        const partyNoes = division.Noes.filter(v => v.Party === mp.party).length;
        
        const partyMajorityVote = partyAyes > partyNoes ? 'aye' : 'no';
        const isRebellion = vote.vote_type !== partyMajorityVote;
        
        totalVotes++;
        if (isRebellion) rebellions++;
        
        if (isRebellion) {
          console.log(`⚠️  REBELLION: ${vote.division_title}`);
          console.log(`  MP voted: ${vote.vote_type.toUpperCase()}`);
          console.log(`  Party voted: ${partyAyes} ayes, ${partyNoes} noes (majority: ${partyMajorityVote.toUpperCase()})\n`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      // Skip errors
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Rebellions: ${rebellions}/${totalVotes} votes (${Math.round((rebellions/totalVotes)*100)}%)`);
}

testLabourRebellions();
