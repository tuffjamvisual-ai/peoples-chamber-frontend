const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function testApproach1() {
  console.log('APPROACH 1: Using Bills API publications endpoint\n');
  const response = await fetch('https://bills-api.parliament.uk/api/v1/Bills/1025/Publications');
  const data = await response.json();
  console.log('Publications data:', JSON.stringify(data, null, 2).substring(0, 800));
}

async function testApproach2() {
  console.log('\n\nAPPROACH 2: Using Bills API stages endpoint\n');
  const response = await fetch('https://bills-api.parliament.uk/api/v1/Bills/1025/Stages');
  const data = await response.json();
  console.log('Stages data:', JSON.stringify(data, null, 2).substring(0, 1500));
}

async function testApproach3() {
  console.log('\n\nAPPROACH 3: Commons Votes API - get all recent divisions\n');
  const response = await fetch('https://commonsvotes-api.parliament.uk/data/divisions.json?queryParameters.skip=0&queryParameters.take=10');
  const data = await response.json();
  console.log(`Found ${data.length} divisions`);
  if (data.length > 0) {
    console.log('\nFirst division structure:');
    console.log(JSON.stringify(data[0], null, 2).substring(0, 600));
  }
}

async function testApproach4() {
  console.log('\n\nAPPROACH 4: Check if divisions have bill references\n');
  const response = await fetch('https://commonsvotes-api.parliament.uk/data/division/198.json');
  const data = await response.json();
  console.log('Full division data:', JSON.stringify(data, null, 2).substring(0, 1000));
}

async function runTests() {
  await testApproach1();
  await testApproach2();
  await testApproach3();
  await testApproach4();
  
  console.log('\n\n=== ANALYSIS ===');
  console.log('Looking for the best way to match bills to divisions...');
}

runTests();
