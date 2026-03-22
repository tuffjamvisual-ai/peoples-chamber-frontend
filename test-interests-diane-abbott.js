async function testRegisteredInterests() {
  const testMemberId = 172; // Diane Abbott - long-serving MP
  
  console.log('Testing Registered Interests for Diane Abbott...\n');
  
  const response = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/RegisteredInterests`
  );
  
  console.log('Response status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('\nNumber of interests:', data.value?.length || 0);
    if (data.value && data.value.length > 0) {
      console.log('\nFirst interest:', JSON.stringify(data.value[0], null, 2));
    } else {
      console.log('\nNo registered interests found');
    }
  }
}

testRegisteredInterests().catch(console.error);
