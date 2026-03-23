const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function testFocusCoverage() {
  console.log('Testing Focus data coverage across MPs...\n');
  
  // Get 20 random MPs
  const { data: mps } = await supabase
    .from('mps')
    .select('member_id, name')
    .eq('current_member', true)
    .limit(20);
  
  let withFocus = 0;
  let withoutFocus = 0;
  const samples = [];
  
  for (const mp of mps || []) {
    try {
      const response = await fetch(
        `https://members-api.parliament.uk/api/Members/${mp.member_id}/Focus`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.value && data.value.length > 0) {
          withFocus++;
          if (samples.length < 3) {
            samples.push({ name: mp.name, focus: data.value });
          }
        } else {
          withoutFocus++;
        }
      } else {
        withoutFocus++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      withoutFocus++;
    }
  }
  
  console.log('=== RESULTS ===');
  console.log(`✅ MPs with Focus data: ${withFocus}/${mps?.length || 0}`);
  console.log(`❌ MPs without Focus data: ${withoutFocus}/${mps?.length || 0}`);
  console.log(`📊 Coverage: ${Math.round((withFocus / (mps?.length || 1)) * 100)}%`);
  
  console.log('\n=== SAMPLES ===');
  samples.forEach(sample => {
    console.log(`\n${sample.name}:`);
    console.log(JSON.stringify(sample.focus, null, 2));
  });
}

testFocusCoverage();
