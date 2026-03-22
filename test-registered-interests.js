async function testRegisteredInterests() {
  const testMemberId = 1423; // Test with an MP
  
  console.log('Testing Registered Interests API...\n');
  
  // Try the registered interests endpoint
  const response = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/RegisteredInterests`
  );
  
  console.log('Response status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('\nAvailable data:', JSON.stringify(data, null, 2).substring(0, 1000));
  } else {
    console.log('No registered interests endpoint available');
  }
}

testRegisteredInterests().catch(console.error);
