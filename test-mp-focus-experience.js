async function testFocusAndExperience() {
  const testMemberId = 172; // Diane Abbott
  
  // Test Focus
  console.log('=== FOCUS ===');
  const focusResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/Focus`
  );
  const focusData = await focusResponse.json();
  console.log(JSON.stringify(focusData.value, null, 2));
  
  // Test Experience
  console.log('\n=== EXPERIENCE ===');
  const expResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/Experience`
  );
  const expData = await expResponse.json();
  console.log(JSON.stringify(expData.value, null, 2));
  
  // Test Written Questions (just count)
  console.log('\n=== WRITTEN QUESTIONS ===');
  const wqResponse = await fetch(
    `https://members-api.parliament.uk/api/Members/${testMemberId}/WrittenQuestions`
  );
  const wqData = await wqResponse.json();
  console.log('Total written questions:', wqData.value?.length || 0);
  if (wqData.value?.length > 0) {
    console.log('Sample:', JSON.stringify(wqData.value[0], null, 2).substring(0, 500));
  }
}

testFocusAndExperience();
