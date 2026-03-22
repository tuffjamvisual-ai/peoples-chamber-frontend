async function testVotingData() {
  // Test getting voting data for a specific division
  const testDivisionId = 248322; // A recent division
  
  console.log('Fetching division details...\n');
  
  const divisionResponse = await fetch(
    `https://commonsvotes-api.parliament.uk/data/division/${testDivisionId}.json`
  );
  const divisionData = await divisionResponse.json();
  
  console.log('=== DIVISION INFO ===');
  console.log('Title:', divisionData.Title);
  console.log('Date:', divisionData.Date);
  console.log('Total Ayes:', divisionData.AyeCount);
  console.log('Total Noes:', divisionData.NoCount);
  
  console.log('\n=== SAMPLE AYES (first 3) ===');
  divisionData.Ayes.slice(0, 3).forEach(mp => {
    console.log(`${mp.Name} (${mp.Party}) - Member ID: ${mp.MemberId}`);
  });
  
  console.log('\n=== SAMPLE NOES (first 3) ===');
  divisionData.Noes.slice(0, 3).forEach(mp => {
    console.log(`${mp.Name} (${mp.Party}) - Member ID: ${mp.MemberId}`);
  });
  
  console.log('\n=== DONE ===');
}

testVotingData().catch(console.error);
