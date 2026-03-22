async function testFullMPData() {
  const testMemberId = 4514; // Diane Abbott
  
  const memberResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}`
  );
  const memberData = await memberResponse.json();
  
  console.log('=== HOUSE MEMBERSHIPS ===');
  if (memberData.value.houseMemberships) {
    console.log(JSON.stringify(memberData.value.houseMemberships, null, 2));
  } else {
    console.log('No houseMemberships found');
  }
  
  console.log('\n=== BIOGRAPHY ===');
  const bioResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/Biography`
  );
  const bioData = await bioResponse.json();
  console.log(JSON.stringify(bioData.value, null, 2));
}

testFullMPData().catch(console.error);
