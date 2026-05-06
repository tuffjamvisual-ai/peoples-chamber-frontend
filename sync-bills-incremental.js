const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(supabaseUrl, supabaseKey, { realtime: { transport: ws } });

async function syncBillsIncremental() {
  console.log('=== INCREMENTAL BILL SYNC ===');
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const { data: lastBill } = await supabase
    .from('bill')
    .select('last_update')
    .order('last_update', { ascending: false })
    .limit(1)
    .single();
  
  const lastSync = lastBill?.last_update || '2024-01-01';
  const updatedSinceDate = new Date(lastSync);
  updatedSinceDate.setHours(updatedSinceDate.getHours() - 1);
  
  console.log(`Fetching bills updated since: ${updatedSinceDate.toISOString()}\n`);
  
  let page = 0;
  let hasMore = true;
  let totalUpdated = 0;
  let totalAdded = 0;
  
  while (hasMore) {
    const skip = page * 20;
    const apiUrl = `https://bills-api.parliament.uk/api/v1/Bills?Skip=${skip}&Take=20&UpdatedSince=${updatedSinceDate.toISOString()}`;
    
    console.log(`Fetching page ${page + 1}...`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const bill of data.items) {
      const billData = {
        parliament_id: bill.billId,
        title: bill.shortTitle || 'Untitled Bill',
        long_title: bill.longTitle || null,
        description: bill.summary || 'No description available',
        category: bill.billTypeId === 1 ? 'Public' : bill.billTypeId === 2 ? 'Private' : 'Hybrid',
        status: bill.currentStage?.description || 'Unknown',
        current_stage: bill.currentStage?.stageName || null,
        stage_date: bill.currentStage?.stageDate || null,
        sponsor_name: bill.sponsors?.[0]?.member?.name || null,
        sponsor_party: bill.sponsors?.[0]?.member?.party || null,
        sponsor_constituency: bill.sponsors?.[0]?.member?.memberFrom || null,
        originating_house: bill.originatingHouse === 1 ? 'Commons' : 'Lords',
        is_defeated: bill.isDefeated || false,
        bill_withdrawn: bill.billWithdrawn || null,
        is_act: bill.isAct || false,
        last_update: bill.lastUpdate || new Date().toISOString(),
        introduced_session_id: bill.introducedSessionId || null
      };
      
      const { data: existing } = await supabase
        .from('bill')
        .select('id')
        .eq('parliament_id', bill.billId)
        .single();
      
      if (existing) {
        await supabase
          .from('bill')
          .update(billData)
          .eq('parliament_id', bill.billId);
        totalUpdated++;
        console.log(`✓ Updated: ${billData.title}`);
      } else {
        await supabase
          .from('bill')
          .insert(billData);
        totalAdded++;
        console.log(`+ Added: ${billData.title}`);
      }
    }
    
    page++;
  }
  
  console.log('\n=== SYNC COMPLETE ===');
  console.log(`Bills updated: ${totalUpdated}`);
  console.log(`Bills added: ${totalAdded}`);
  console.log(`Total processed: ${totalUpdated + totalAdded}`);
}

syncBillsIncremental().catch(console.error);
