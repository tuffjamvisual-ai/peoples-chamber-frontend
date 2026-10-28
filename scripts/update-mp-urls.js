process.loadEnvFile(`${__dirname}/../.env.local`); // the Supabase key lives in .env.local, never in this file
if (!process.env.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY missing from .env.local');
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://nwnsvnbudmfkhhwcjwwr.supabase.co', process.env.SUPABASE_SECRET_KEY);

async function run() {
  const { data: mps } = await s.from('mps').select('id, member_id, photo_url').eq('current_member', true);
  let updated = 0;
  for (const mp of mps) {
    if (!mp.photo_url || mp.photo_url.includes('supabase')) continue;
    const newUrl = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co/storage/v1/object/public/photos/mps/' + mp.member_id + '.jpg';
    const { error } = await s.from('mps').update({ photo_url: newUrl }).eq('id', mp.id);
    if (error) console.log('Error:', error.message);
    else updated++;
  }
  console.log('Updated:', updated);
}
run();
