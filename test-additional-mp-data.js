async function testAdditionalData() {
  const testMemberId = 172; // Diane Abbott
  
  console.log('Testing additional MP data endpoints...\n');
  
  // Test various endpoints
  const endpoints = [
    'Addresses',
    'Focus',
    'Experience',
    'Maiden',
    'Subjects',
    'QualifiedCommittee',
    'ElectoralHistory',
    'WrittenQuestions'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(
        `https://members-api.parliament.uk/api/Members/${testMemberId}/${endpoint}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}:`, data.value?.length || 'Available');
      } else {
        console.log(`❌ ${endpoint}: Not available (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Error`);
    }
  }
}

testAdditionalData();
