async function testVotesAPI() {
  const billTitle = "Bank of England";
  
  console.log(`Searching Commons Votes API for: "${billTitle}"\n`);
  
  const url = `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=${encodeURIComponent(billTitle)}&queryParameters.take=5`;
  
  console.log('URL:', url, '\n');
  
  const response = await fetch(url);
  const data = await response.json();
  
  console.log(`Found ${data.length} divisions\n`);
  
  if (data.length > 0) {
    console.log('First division:');
    console.log(JSON.stringify(data[0], null, 2).substring(0, 1000));
  }
}

testVotesAPI();
