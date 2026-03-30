const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncLaws() {
  console.log('=== LAWS SYNC STARTED ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  let page = 0;
  let hasMore = true;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalAdded = 0;

  while (hasMore) {
    const skip = page * 20;
    const apiUrl = `https://bills-api.parliament.uk/api/v1/Bills?Skip=${skip}&Take=20`;

    console.log(`Fetching page ${page + 1}...`);

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        hasMore = false;
        break;
      }

      for (const bill of data.items) {
        if (!bill.isAct) continue;

        const sponsor = bill.sponsors?.[0];
        const sponsorMember = sponsor?.member;

        const { data: existing } = await supabase
          .from('bill')
          .select('id')
          .eq('parliament_id', bill.billId)
          .single();

        const billData = {
          parliament_id: bill.billId,
          title: bill.shortTitle,
          long_title: bill.longTitle || bill.shortTitle,
          description: bill.longTitle || bill.shortTitle,
          category: 'Other',
          current_stage: 'Royal Assent',
          stage_date: bill.currentStage?.stageSittings?.[0]?.date || null,
          sponsor_name: sponsorMember?.name || null,
          sponsor_party: sponsorMember?.party || null,
          sponsor_party_colour: sponsorMember?.partyColour || null,
          sponsor_photo: sponsorMember?.memberPhoto || null,
          sponsor_constituency: sponsorMember?.memberFrom || null,
          originating_house: bill.originatingHouse || null,
          is_defeated: bill.isDefeated || false,
          bill_withdrawn: bill.billWithdrawn || null,
          is_act: true,
          last_update: bill.lastUpdate || null,
          introduced_session_id: bill.introducedSessionId || null
        };

        if (existing) {
          const { error } = await supabase
            .from('bill')
            .update(billData)
            .eq('parliament_id', bill.billId);
          if (!error) {
            totalUpdated++;
            console.log(`  ✓ UPDATED: ${bill.shortTitle}`);
          }
        } else {
          const { error } = await supabase
            .from('bill')
            .insert(billData);
          if (!error) {
            totalAdded++;
            console.log(`  ✓ NEW: ${bill.shortTitle}`);
          }
        }

        totalProcessed++;
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('Error:', error.message);
      hasMore = false;
    }
  }

  console.log('\n=== LAWS SYNC COMPLETE ===');
  console.log(`Laws processed: ${totalProcessed}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`New: ${totalAdded}`);
  console.log(`Completed: ${new Date().toISOString()}`);
}

syncLaws().catch(console.error);
