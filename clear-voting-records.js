process.loadEnvFile(`${__dirname}/.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clearVotingRecords() {
  console.log('Clearing existing voting records...\n');
  
  const { error } = await supabase
    .from('mp_division_votes')
    .delete()
    .neq('id', 0); // Delete all records
  
  if (error) {
    console.log('Error clearing records:', error);
  } else {
    console.log('✅ All voting records cleared');
    console.log('Now ready to re-fetch all voting data\n');
  }
}

clearVotingRecords();
