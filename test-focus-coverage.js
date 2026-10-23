process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
