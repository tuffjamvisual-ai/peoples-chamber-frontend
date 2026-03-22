const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function fetchAllCurrentMPs() {
  console.log('Fetching ALL current MPs from UK Parliament API with pagination...\n');
  
  try {
    let allMembers = [];
    let skip = 0;
    const take = 20; // API returns 20 per page
    let hasMore = true;
    
    // Fetch all pages
    while (hasMore) {
      console.log(`Fetching page starting at ${skip}...`);
      
      const response = await fetch(
        `https://members-api.parliament.uk/api/Members/Search?House=1&IsCurrentMember=true&skip=${skip}&take=${take}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const members = data.items || [];
      
      if (members.length === 0) {
        hasMore = false;
      } else {
        allMembers = allMembers.concat(members);
        console.log(`  Got ${members.length} MPs (total so far: ${allMembers.length})`);
        skip += take;
        
        // Wait 200ms between page requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`\n✅ Total MPs fetched: ${allMembers.length}\n`);
    console.log('Now fetching detailed info for each MP...\n');
    
    // Fetch detailed info for each MP
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allMembers.length; i++) {
      const member = allMembers[i].value;
      const memberId = member.id;
      
      try {
        // Fetch full details for this MP
        const detailResponse = await fetch(
          `https://members-api.parliament.uk/api/Members/${memberId}`
        );
        
        if (!detailResponse.ok) {
          console.log(`⚠️  Skipping MP ${memberId} - API error`);
          errorCount++;
          continue;
        }
        
        const detailData = await detailResponse.json();
        const mpData = detailData.value;
        
        // Extract latest party (current party affiliation)
        const latestParty = mpData.latestParty || {};
        
        // Get party colour
        let partyColour = '#808080'; // Default grey
        const partyColours = {
          'Labour': '#E4003B',
          'Conservative': '#0087DC',
          'Liberal Democrat': '#FAA61A',
          'Scottish National Party': '#FDF38E',
          'Green Party': '#6AB023',
          'Plaid Cymru': '#005B54',
          'Democratic Unionist Party': '#D46A4C',
          'Sinn Féin': '#326760',
          'Social Democratic and Labour Party': '#2AA82C',
          'Alliance': '#F6CB2F',
          'Independent': '#808080'
        };
        partyColour = partyColours[latestParty.name] || partyColour;
        
        // Get constituency
        const latestHouseMembership = mpData.latestHouseMembership || {};
        const membershipFrom = latestHouseMembership.membershipFrom || '';
        
        // Build MP record
        const mpRecord = {
          member_id: memberId,
          name: mpData.nameFullTitle || mpData.nameDisplayAs,
          display_name: mpData.nameDisplayAs,
          list_as: mpData.nameListAs,
          party: latestParty.name || null,
          party_colour: partyColour,
          party_abbreviation: latestParty.abbreviation || null,
          constituency: membershipFrom,
          photo_url: mpData.thumbnailUrl || null,
          current_member: true,
          gender: mpData.gender || null,
          start_date: latestHouseMembership.membershipStartDate || null,
        };
        
        // Insert into Supabase
        const { error } = await supabase
          .from('mps')
          .upsert(mpRecord, { onConflict: 'member_id' });
        
        if (error) {
          console.log(`❌ Error saving ${mpRecord.name}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          console.log(`✅ [${successCount}/${allMembers.length}] ${mpRecord.name} (${mpRecord.party})`);
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`❌ Error processing MP ${memberId}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n=== DONE ===');
    console.log(`✅ Successfully saved: ${successCount} MPs`);
    console.log(`❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the script
fetchAllCurrentMPs();
