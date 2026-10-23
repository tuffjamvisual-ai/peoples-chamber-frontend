process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncBills() {
  console.log('Starting bill sync from Parliament API...');
  
  let page = 0;
  let hasMore = true;
  let totalProcessed = 0;
  let totalWithdrawn = 0;
  
  while (hasMore) {
    const skip = page * 20;
    const apiUrl = `https://bills-api.parliament.uk/api/v1/Bills?Skip=${skip}&Take=20`;
    
    console.log(`Fetching page ${page + 1} (skip ${skip})...`);
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const bill of data.items) {
        // Determine the actual current stage
        let currentStage = bill.currentStage?.description || 'Unknown';
        
        // If bill is withdrawn, override the stage
        if (bill.billWithdrawn) {
          currentStage = 'Withdrawn';
          totalWithdrawn++;
        } else if (bill.isAct) {
          currentStage = 'Royal Assent';
        }
        
        // Update the bill in database
        const { error } = await supabase
          .from('bill')
          .update({
            current_stage: currentStage,
            bill_withdrawn: bill.billWithdrawn || null,
            is_act: bill.isAct || false,
            last_update: bill.lastUpdate || null,
            introduced_session_id: bill.introducedSessionId || null
          })
          .eq('parliament_id', bill.billId);
        
        if (error) {
          console.error(`Error updating bill ${bill.billId}:`, error.message);
        }
        
        totalProcessed++;
        
        if (totalProcessed % 100 === 0) {
          console.log(`Processed ${totalProcessed} bills (${totalWithdrawn} withdrawn)...`);
        }
      }
      
      page++;
      
      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error fetching bills:', error.message);
      hasMore = false;
    }
  }
  
  console.log('\n=== SYNC COMPLETE ===');
  console.log(`Total bills processed: ${totalProcessed}`);
  console.log(`Bills marked as withdrawn: ${totalWithdrawn}`);
  console.log(`Bills updated with correct status: ${totalProcessed}`);
}

syncBills().catch(console.error);
