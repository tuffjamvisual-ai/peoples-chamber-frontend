const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

async function searchDivisionForBill(billTitle) {
  try {
    // Search UK Parliament Commons Votes API
    const searchTerm = billTitle.split(' ').slice(0, 3).join(' ');
    const response = await fetch(
      `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=${encodeURIComponent(searchTerm)}&queryParameters.take=5`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    // Return the most recent division
    return data[0];
  } catch (error) {
    console.error(`Error searching for: ${billTitle}`, error.message);
    return null;
  }
}

async function updateBillWithDivision(billId, division) {
  try {
    const { error } = await supabase
      .from('bill')
      .update({
        commons_ayes: division.AyeCount || 0,
        commons_noes: division.NoCount || 0,
        commons_division_id: division.DivisionId,
        commons_division_title: division.Title,
        commons_vote_date: division.Date
      })
      .eq('id', billId);
    
    if (error) {
      console.error(`Error updating bill ${billId}:`, error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error updating bill ${billId}:`, error.message);
    return false;
  }
}

async function fetchCommonsVotes() {
  console.log('Fetching bills from database...');
  
  const { data: bills, error } = await supabase
    .from('bill')
    .select('id, title, parliament_id')
    .eq('status', 'Active')
    .is('commons_division_id', null)
    .limit(50);
  
  if (error) {
    console.error('Error fetching bills:', error.message);
    return;
  }
  
  console.log(`Found ${bills.length} bills without Commons vote data`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const bill of bills) {
    console.log(`\nSearching for: ${bill.title.substring(0, 50)}...`);
    
    const division = await searchDivisionForBill(bill.title);
    
    if (division) {
      console.log(`✓ Found: ${division.Title}`);
      console.log(`  Ayes: ${division.AyeCount}, Noes: ${division.NoCount}`);
      
      const success = await updateBillWithDivision(bill.id, division);
      if (success) {
        updated++;
        console.log(`  ✓ Updated bill #${bill.id}`);
      }
    } else {
      notFound++;
      console.log(`✗ No division found`);
    }
    
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Total processed: ${bills.length}`);
}

fetchCommonsVotes();
