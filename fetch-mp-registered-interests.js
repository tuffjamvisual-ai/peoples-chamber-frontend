const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function fetchRegisteredInterests() {
  console.log('Fetching all MPs...\n');
  
  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, name')
    .eq('current_member', true);
  
  if (error) {
    console.error('Error fetching MPs:', error);
    return;
  }
  
  console.log(`Found ${mps.length} MPs\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let totalInterests = 0;
  
  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    
    try {
      console.log(`[${i + 1}/${mps.length}] ${mp.name}...`);
      
      const response = await fetch(
        `https://members-api.parliament.uk/api/Members/${mp.member_id}/RegisteredInterests`
      );
      
      if (!response.ok) {
        console.log(`  ⚠️  API error`);
        errorCount++;
        continue;
      }
      
      const data = await response.json();
      const categories = data.value || [];
      
      if (categories.length === 0) {
        console.log(`  ℹ️  No registered interests`);
        successCount++;
        continue;
      }
      
      // Process each category
      let mpInterestCount = 0;
      
      for (const category of categories) {
        for (const interest of category.interests || []) {
          const interestRecord = {
            member_id: mp.member_id,
            category_id: category.id,
            category_name: category.name,
            category_sort_order: category.sortOrder,
            interest_id: interest.id,
            interest_text: interest.interest,
            created_when: interest.createdWhen,
            last_amended_when: interest.lastAmendedWhen,
            is_correction: interest.isCorrection,
            child_interests: interest.childInterests || []
          };
          
          const { error: insertError } = await supabase
            .from('mp_registered_interests')
            .upsert(interestRecord, { onConflict: 'member_id,interest_id' });
          
          if (!insertError) {
            mpInterestCount++;
            totalInterests++;
          }
        }
      }
      
      console.log(`  ✅ Saved ${mpInterestCount} interests`);
      successCount++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`✅ Success: ${successCount} MPs`);
  console.log(`💾 Total interests saved: ${totalInterests}`);
  console.log(`❌ Errors: ${errorCount}`);
}

fetchRegisteredInterests();
