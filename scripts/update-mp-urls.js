const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://nwnsvnbudmfkhhwcjwwr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw');

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
