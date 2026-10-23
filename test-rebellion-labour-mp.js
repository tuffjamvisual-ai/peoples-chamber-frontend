process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
