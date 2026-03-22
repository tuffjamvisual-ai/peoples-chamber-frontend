// Test what data we can get from Parliament API for one MP
async function testMPData() {
  const testMemberId = 4514; // Diane Abbott's member ID
  
  console.log('Fetching detailed MP data...\n');
  
  // 1. Member details
  const memberResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}`
  );
  const memberData = await memberResponse.json();
  
  console.log('=== AVAILABLE DATA ===\n');
  console.log('Name:', memberData.value.nameDisplayAs);
  console.log('Full name:', memberData.value.nameFullTitle);
  console.log('Party:', memberData.value.latestParty?.name);
  console.log('Constituency:', memberData.value.latestHouseMembership?.membershipFrom);
  console.log('\nHouse Memberships (terms):');
  memberData.value.houseMemberships?.forEach(term => {
    console.log(`  ${term.membershipFrom || 'Unknown'}: ${term.membershipStartDate} to ${term.membershipEndDate || 'present'}`);
  });
  
  console.log('\n=== CONTACT INFO ===');
  const contactResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/Contact`
  );
  const contactData = await contactResponse.json();
  console.log(JSON.stringify(contactData.value, null, 2));
  
  console.log('\n=== DONE ===');
}

testMPData().catch(console.error);
