async function getAllDivisions() {
  console.log('Testing if we can get ALL divisions from Commons Votes API...\n');
  
  // Test 1: Get total count
  console.log('1. Getting total divisions count:');
  try {
    const response = await fetch('https://commonsvotes-api.parliament.uk/data/divisions.json/searchTotalResults?queryParameters.searchTerm=');
    const total = await response.json();
    console.log(`✓ Total divisions available: ${total}\n`);
  } catch (e) {
    console.log('✗ Failed:', e.message);
  }
  
  // Test 2: Try to get divisions without search term
  console.log('2. Getting divisions without search filter:');
  try {
    const response = await fetch('https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=&queryParameters.skip=0&queryParameters.take=100');
    const data = await response.json();
    console.log(`✓ Got ${data.length} divisions`);
    console.log('\nSample divisions:');
    data.slice(0, 5).forEach(d => {
      console.log(`  - ${d.Title} (${d.AyeCount} Ayes, ${d.NoCount} Noes)`);
    });
  } catch (e) {
    console.log('✗ Failed:', e.message);
  }
  
  console.log('\n=== SOLUTION ===');
  console.log('If we can fetch ALL divisions, we can:');
  console.log('1. Get all divisions from Commons API');
  console.log('2. Search YOUR bills to match division titles');
  console.log('3. Much faster and more accurate!');
}

getAllDivisions();
