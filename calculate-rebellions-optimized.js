process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
