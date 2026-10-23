process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importVotes() {
  console.log('=== IMPORTING SEED VOTES ===');
  console.log('Matching bills by TITLE (not bill_id)');
  console.log('Reducing all votes by 8%\n');
  
  const bills = JSON.parse(fs.readFileSync('bill_votes.json', 'utf8'));
  console.log(`Bills to process: ${bills.length}\n`);
  
  let successful = 0;
  let failed = 0;
  let notFound = 0;
  
  for (const bill of bills) {
    // Find bill by exact title match
    const { data: matchedBill, error: findError } = await supabase
      .from('bill')
      .select('id, title')
      .eq('title', bill.title)
      .single();
    
    if (findError || !matchedBill) {
      notFound++;
      continue;
    }
    
    // Reduce votes by 8%
    const supportVotes = Math.round(bill.support * 0.92);
    const opposeVotes = Math.round(bill.oppose * 0.92);
    
    // Update vote counts using matched database id
    const { error } = await supabase
      .from('bill')
      .update({
        vote_count_yes: supportVotes,
        vote_count_no: opposeVotes,
        vote_count_abstain: 0
      })
      .eq('id', matchedBill.id);
    
    if (error) {
      console.log(`✗ Failed: ${bill.title}`);
      failed++;
    } else {
      successful++;
      if (successful % 100 === 0) {
        console.log(`Progress: ${successful} matched and updated...`);
      }
    }
  }
  
  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Successfully matched and updated: ${successful}`);
  console.log(`Not found in database: ${notFound}`);
  console.log(`Failed to update: ${failed}`);
}

importVotes().catch(console.error);
