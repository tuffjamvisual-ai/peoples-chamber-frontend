const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw'
);

function cleanBillTitle(title) {
  // Remove common suffixes that might not match
  return title
    .replace(/\s+Bill$/i, '')
    .replace(/\s+Act$/i, '')
    .replace(/\s*\[HL\]$/i, '')
    .replace(/\s*\(.*?\)$/g, '')
    .trim();
}

async function searchForDivision(billTitle) {
  const searches = [
    billTitle,                           // Full title
    cleanBillTitle(billTitle),           // Without "Bill"
    billTitle.split(' ').slice(0, 5).join(' '), // First 5 words
    billTitle.split(' ').slice(0, 3).join(' ')  // First 3 words
  ];
  
  for (const term of searches) {
    if (!term || term.length < 3) continue;
    
    try {
      const response = await fetch(
        `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=${encodeURIComponent(term)}&queryParameters.take=5`
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Find best match - prefer exact title matches
        for (const division of data) {
          if (division.Title && division.Title.toLowerCase().includes(cleanBillTitle(billTitle).toLowerCase())) {
            return division;
          }
        }
        // If no exact match, return first result
        return data[0];
      }
    } catch (e) {
      continue;
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  return null;
}

async function processBills() {
  console.log('Starting comprehensive bill processing...\n');
  
  // Get bills without vote data
  const { data: bills, error } = await supabase
    .from('bill')
    .select('id, title, current_stage')
    .is('commons_division_id', null)
    .eq('status', 'Active')
    .order('id', { ascending: true })
    .limit(500);
  
  if (error) {
    console.error('Database error:', error);
    return;
  }
  
  console.log(`Processing ${bills.length} bills...\n`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    const progress = `[${i + 1}/${bills.length}]`;
    
    console.log(`${progress} Bill #${bill.id}: ${bill.title.substring(0, 50)}...`);
    
    try {
      const division = await searchForDivision(bill.title);
      
      if (division && (division.AyeCount > 0 || division.NoCount > 0)) {
        console.log(`  ✓ ${division.AyeCount} Ayes, ${division.NoCount} Noes`);
        
        const { error: updateError } = await supabase
          .from('bill')
          .update({
            commons_ayes: division.AyeCount || 0,
            commons_noes: division.NoCount || 0,
            commons_division_id: division.DivisionId,
            commons_division_title: division.Title,
            commons_vote_date: division.Date
          })
          .eq('id', bill.id);
        
        if (updateError) {
          console.log(`  ✗ Update failed: ${updateError.message}`);
          errors++;
        } else {
          updated++;
        }
      } else {
        console.log(`  - No vote found`);
        notFound++;
      }
    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
      errors++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 600));
    
    // Progress update every 50 bills
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${bills.length} processed ---`);
      console.log(`Updated: ${updated}, Not found: ${notFound}, Errors: ${errors}\n`);
    }
  }
  
  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total processed: ${bills.length}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`No votes found: ${notFound}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nTo process more bills, run this script again.`);
}

processBills();
