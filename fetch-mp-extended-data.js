const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function fetchMPExtendedData() {
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
  
  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    
    try {
      console.log(`[${i + 1}/${mps.length}] ${mp.name}...`);
      
      // Fetch contact info
      const contactResponse = await fetch(
        `https://members-api.parliament.uk/api/Members/${mp.member_id}/Contact`
      );
      
      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        const contacts = contactData.value || [];
        
        // Extract useful contact info
        let email = null;
        let phone = null;
        let website = null;
        let twitter = null;
        
        contacts.forEach(contact => {
          if (contact.email) email = contact.email;
          if (contact.phone) phone = contact.phone;
          if (contact.type === 'Website' && contact.line1) website = contact.line1;
          if (contact.type === 'X (formerly Twitter)' && contact.line1) twitter = contact.line1;
        });
        
        // Save contact info (simple insert, not upsert)
        if (email || phone || website || twitter) {
          const { error: insertError } = await supabase
            .from('mp_contact')
            .insert({
              member_id: mp.member_id,
              contact_type: 'primary',
              email,
              phone,
              website,
              twitter
            });
          
          if (insertError) {
            console.log(`  ⚠️  Contact insert error: ${insertError.message}`);
          }
        }
      }
      
      // Fetch biography
      const bioResponse = await fetch(
        `https://members-api.parliament.uk/api/Members/${mp.member_id}/Biography`
      );
      
      if (bioResponse.ok) {
        const bioData = await bioResponse.json();
        const bio = bioData.value || {};
        
        // Save biography (upsert on member_id which has unique constraint)
        await supabase
          .from('mp_biography')
          .upsert({
            member_id: mp.member_id,
            representations: bio.representations || [],
            government_posts: bio.governmentPosts || [],
            opposition_posts: bio.oppositionPosts || [],
            committee_memberships: bio.committeeMemberships || [],
            party_history: bio.partyAffiliations || []
          }, { onConflict: 'member_id' });
      }
      
      successCount++;
      console.log(`  ✅ Saved`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`✅ Success: ${successCount} MPs`);
  console.log(`❌ Errors: ${errorCount}`);
}

fetchMPExtendedData();
