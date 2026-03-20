async function testDifferentEndpoints() {
  console.log('Testing different Commons Votes API endpoints...\n');
  
  // Test 1: Search endpoint (we know this works)
  console.log('1. Search endpoint:');
  try {
    const response = await fetch('https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=Finance&queryParameters.take=3');
    const data = await response.json();
    console.log(`✓ Works! Found ${data.length} divisions`);
    console.log('Sample:', data[0].Title, '- Ayes:', data[0].AyeCount, 'Noes:', data[0].NoCount);
  } catch (e) {
    console.log('✗ Failed:', e.message);
  }
  
  // Test 2: Try searchTotalResults
  console.log('\n2. SearchTotalResults endpoint:');
  try {
    const response = await fetch('https://commonsvotes-api.parliament.uk/data/divisions.json/searchTotalResults?queryParameters.searchTerm=Finance');
    const data = await response.json();
    console.log(`✓ Total results available: ${data}`);
  } catch (e) {
    console.log('✗ Failed:', e.message);
  }
  
  // Test 3: Try getting divisions by date
  console.log('\n3. Divisions by date range:');
  try {
    const response = await fetch('https://commonsvotes-api.parliament.uk/data/divisions.json/groupedbyparty?queryParameters.startDate=2024-01-01&queryParameters.endDate=2024-12-31&queryParameters.take=5');
    const data = await response.json();
    console.log('✓ Works! Response:', JSON.stringify(data).substring(0, 200));
  } catch (e) {
    console.log('✗ Failed:', e.message);
  }
  
  // Test 4: Check the Swagger/OpenAPI docs
  console.log('\n4. Checking API documentation structure...');
  console.log('Commons Votes API Swagger: https://commonsvotes-api.parliament.uk/swagger/ui/index');
  
  console.log('\n=== SOLUTION ===');
  console.log('The SEARCH endpoint works perfectly.');
  console.log('We can search for bill titles and get vote counts.');
  console.log('\nThe challenge: Matching 3,865 bill titles to divisions.');
  console.log('Many bills never get voted on, so will have no matches.');
}

testDifferentEndpoints();
