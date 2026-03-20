async function testBillAPI() {
  const parliamentId = 1025; // Bank of England bill
  
  console.log(`Testing parliament_id: ${parliamentId}\n`);
  
  const response = await fetch(`https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}`);
  const data = await response.json();
  
  console.log('Bill title:', data.shortTitle);
  console.log('\nFull response (first 2000 chars):');
  console.log(JSON.stringify(data, null, 2).substring(0, 2000));
}

testBillAPI();
