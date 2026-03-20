async function testBillAPI() {
  const parliamentId = 1025;
  
  const response = await fetch(`https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}`);
  const data = await response.json();
  
  console.log('Bill:', data.shortTitle);
  console.log('\nChecking currentStage structure...');
  console.log('currentStage:', JSON.stringify(data.currentStage, null, 2));
  
  console.log('\n\nSearching for divisions in the data...');
  const fullJson = JSON.stringify(data, null, 2);
  
  if (fullJson.includes('division')) {
    console.log('Found "division" in response!');
    const divisionIndex = fullJson.toLowerCase().indexOf('division');
    console.log('\nContext around "division":');
    console.log(fullJson.substring(Math.max(0, divisionIndex - 200), divisionIndex + 500));
  } else {
    console.log('No "division" found in the response');
  }
}

testBillAPI();
