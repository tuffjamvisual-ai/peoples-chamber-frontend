process.loadEnvFile(`${__dirname}/../.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: ministers, error } = await s.from('dept_ministers').select('id, photo_url');
  if (error) { console.log('Fetch error:', error.message); return; }
  console.log('Total ministers:', ministers.length);
  let updated = 0;
  for (const m of ministers) {
    const url = m.photo_url || '';
    if (!url || url.includes('supabase')) continue;
    const newUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co/storage/v1/object/public/photos/ministers/' + m.id + '.jpg';
    const { error: updateError } = await s.from('dept_ministers').update({ photo_url: newUrl }).eq('id', m.id);
    if (updateError) console.log('Error:', updateError.message);
    else updated++;
  }
  console.log('Updated:', updated);
}
run();
