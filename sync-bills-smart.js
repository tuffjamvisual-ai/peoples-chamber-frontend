process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncBillsSmart() {
  console.log('=== SMART BILL SYNC STARTED ===');
  console.log(`Time: ${new Date().toISOString()}\n`);
  console.log('Strategy: Sync active bills (not withdrawn, not Acts) + recently updated\n');
  
  let page = 0;
  let hasMore = true;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalAdded = 0;
  let totalSkipped = 0;
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
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
        const billLastUpdate = bill.lastUpdate ? new Date(bill.lastUpdate) : null;
        
        // SMART FILTER: Only process if:
        // 1. NOT withdrawn AND NOT an Act (still active), OR
        // 2. Updated in last 90 days (catches recent changes)
        const shouldSync = 
          (!bill.billWithdrawn && !bill.isAct) ||
          (billLastUpdate && billLastUpdate > ninetyDaysAgo);
        
        if (!shouldSync) {
          totalSkipped++;
          continue;
        }
        
        // Determine current stage
        let currentStage = bill.currentStage?.description || 'Unknown';
        if (bill.billWithdrawn) {
          currentStage = 'Withdrawn';
        } else if (bill.isAct) {
          currentStage = 'Royal Assent';
        }
        
        // Get sponsor info
        const sponsor = bill.sponsors?.[0];
        const sponsorMember = sponsor?.member;
        
        // Check if bill exists
        const { data: existing } = await supabase
          .from('bill')
          .select('id')
          .eq('parliament_id', bill.billId)
          .single();
        
        const billData = {
          parliament_id: bill.billId,
          title: bill.shortTitle,
          long_title: bill.longTitle || bill.shortTitle,
          description: bill.summary || bill.longTitle || bill.shortTitle,
          category: 'Other',
          current_stage: currentStage,
          stage_date: bill.currentStage?.stageSittings?.[0]?.date || null,
          sponsor_name: sponsorMember?.name || null,
          sponsor_party: sponsorMember?.party || null,
          sponsor_party_colour: sponsorMember?.partyColour || null,
          sponsor_photo: sponsorMember?.memberPhoto || null,
          sponsor_constituency: sponsorMember?.memberFrom || null,
          originating_house: bill.originatingHouse || null,
          is_defeated: bill.isDefeated || false,
          bill_withdrawn: bill.billWithdrawn || null,
          is_act: bill.isAct || false,
          last_update: bill.lastUpdate || null,
          introduced_session_id: bill.introducedSessionId || null
        };
        
        if (existing) {
          const { error } = await supabase
            .from('bill')
            .update(billData)
            .eq('parliament_id', bill.billId);
          
          if (!error) totalUpdated++;
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
        
        if (totalProcessed % 50 === 0) {
          console.log(`  Progress: ${totalProcessed} processed, ${totalSkipped} skipped...`);
        }
      }
      
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error:', error.message);
      hasMore = false;
    }
  }
  
  console.log('\n=== SMART SYNC COMPLETE ===');
  console.log(`Bills processed: ${totalProcessed}`);
  console.log(`Bills skipped (inactive/old): ${totalSkipped}`);
  console.log(`New bills added: ${totalAdded}`);
  console.log(`Existing bills updated: ${totalUpdated}`);
  console.log(`Completed: ${new Date().toISOString()}`);
}

syncBillsSmart().catch(console.error);
